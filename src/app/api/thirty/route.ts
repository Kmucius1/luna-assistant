import { NextRequest, NextResponse } from 'next/server'
import { OWNER_USER_ID } from '@/lib/owner'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { addDaysToKey, todayKey } from '@/lib/luna/today'
import {
  PROGRAM_REVIEW, PROGRAM_START, buildDay, computeProgress, dayNumber, fridayPrompt, homeZone,
  nextAction, nonNegotiables, programPhase, themeFor, weekHits, weekRange,
  type DayOverrides, type DayRecord, type Energy,
} from '@/lib/luna/thirtyDay'

export const dynamic = 'force-dynamic'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

async function resolveUserId(): Promise<string> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) return user.id
  } catch { /* fall through */ }
  return OWNER_USER_ID
}

function missingTable(err: { code?: string; message?: string } | null | undefined) {
  return !!err && (err.code === '42P01' || err.code === 'PGRST205' || /does not exist|schema cache/i.test(err.message ?? ''))
}

type Db = ReturnType<typeof createAdminClient>

async function loadDay(db: Db, userId: string, dateKey: string) {
  const { data, error } = await db.from('luna_30d_days').select('*').eq('user_id', userId).eq('date_key', dateKey).maybeSingle()
  return { row: data as Record<string, unknown> | null, error }
}

async function upsertDay(db: Db, userId: string, dateKey: string, patch: Record<string, unknown>) {
  const { row } = await loadDay(db, userId, dateKey)
  const next = { ...(row ?? {}), ...patch, user_id: userId, date_key: dateKey, updated_at: new Date().toISOString() }
  delete (next as Record<string, unknown>).id
  const { data, error } = await db.from('luna_30d_days').upsert(next, { onConflict: 'user_id,date_key' }).select().single()
  return { row: data as Record<string, unknown> | null, error }
}

export async function GET(req: NextRequest) {
  const db = createAdminClient()
  const userId = await resolveUserId()
  const q = req.nextUrl.searchParams.get('date')
  const dateKey = q && DATE_RE.test(q) ? q : todayKey()

  const prog = await db.from('luna_30d_program').select('*').eq('user_id', userId).maybeSingle()
  if (missingTable(prog.error)) return NextResponse.json({ setupNeeded: true })
  let program = prog.data as { start_date: string; review_date: string; camera_target: number | null } | null
  if (!program) {
    const ins = await db.from('luna_30d_program')
      .upsert({ user_id: userId, start_date: PROGRAM_START, review_date: PROGRAM_REVIEW }, { onConflict: 'user_id' }).select().single()
    program = (ins.data as typeof program) ?? { start_date: PROGRAM_START, review_date: PROGRAM_REVIEW, camera_target: null }
  }
  const start = program!.start_date

  const [{ row }, daysRes, itemsRes] = await Promise.all([
    loadDay(db, userId, dateKey),
    db.from('luna_30d_days').select('*').eq('user_id', userId).gte('date_key', start).order('date_key', { ascending: true }).limit(60),
    db.from('luna_30d_items').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1500),
  ])
  if (missingTable(daysRes.error) || missingTable(itemsRes.error)) return NextResponse.json({ setupNeeded: true })

  const days = (daysRes.data ?? []) as (DayRecord & Record<string, unknown>)[]
  const items = (itemsRes.data ?? []) as { id: string; kind: string; status: string | null; amount: number | null; data: Record<string, unknown>; date_key: string | null; created_at: string }[]

  const energy = ((row?.energy as Energy | null) ?? 'normal') as Energy
  const overrides = (row?.overrides ?? {}) as DayOverrides
  const gymToday = (row?.gym_today as boolean | null | undefined) ?? null
  const checks = (row?.checks ?? {}) as Record<string, boolean>
  const plan = buildDay({ dateKey, energy, gymToday, overrides })
  const n = dayNumber(dateKey, start)

  // Rollover: read yesterday, never touch it.
  const yKey = addDaysToKey(dateKey, -1)
  const yesterday = days.find(d => d.date_key === yKey)
  const carryover = (yesterday?.top3 ?? []).filter(t => t.text && !t.done).map(t => t.text)
  const tomorrowFirst = yesterday?.notes?.tomorrow_first_priority ?? ''

  const wk = weekRange(dateKey)
  const fridayPlan = items.some(i => i.kind === 'social' && i.data?.friday === true && (i.date_key ?? '') >= wk.start && (i.date_key ?? '') <= wk.end)
  const closet = {
    sorted: items.filter(i => i.kind === 'closet').length,
    sell: items.filter(i => i.kind === 'closet' && ['sell', 'photographed', 'listed'].includes(i.status ?? '')).length,
    photographed: items.filter(i => i.kind === 'closet' && ['photographed', 'listed', 'sold'].includes(i.status ?? '')).length,
    listed: items.filter(i => i.kind === 'closet' && ['listed', 'sold'].includes(i.status ?? '')).length,
    sold: items.filter(i => i.kind === 'closet' && i.status === 'sold').length,
    earned: items.filter(i => i.kind === 'closet' && i.status === 'sold').reduce((s, i) => s + Number(i.amount ?? 0), 0),
  }
  const fundDeposits = items.filter(i => i.kind === 'fund_entry')
  const camera = fundDeposits.filter(i => i.data?.fund === 'camera').reduce((s, i) => s + Number(i.amount ?? 0), 0)
  const upgrade = fundDeposits.filter(i => i.data?.fund !== 'camera').reduce((s, i) => s + Number(i.amount ?? 0), 0)

  return NextResponse.json({
    dateKey, dayNumber: n, phase: programPhase(n), totalDays: 30, reviewDate: program!.review_date,
    theme: themeFor(dateKey),
    day: {
      energy, mode: row?.mode ?? 'normal', gymToday, gymTomorrow: row?.gym_tomorrow ?? null,
      top3: row?.top3 ?? [], checks, stats: row?.stats ?? {}, notes: row?.notes ?? {}, overrides,
    },
    plan, nonNegotiables: nonNegotiables(plan).map(i => i.id),
    next: nextAction(plan, checks, Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(new Date())) % 24),
    carryover, tomorrowFirst,
    progress: computeProgress(days),
    history: days.map(d => ({ date_key: d.date_key, energy: d.energy, checks: d.checks, stats: d.stats, notes: d.notes })),
    items, closet,
    funds: { camera, upgrade, cameraTarget: program!.camera_target },
    weekHits: weekHits(items, wk.start, wk.end), week: wk,
    home: homeZone(n),
    fridayPrompt: fridayPrompt(dateKey, fridayPlan),
  })
}

export async function POST(req: NextRequest) {
  const db = createAdminClient()
  const userId = await resolveUserId()
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }) }

  const action = String(body.action ?? '')
  const dateKey = typeof body.date === 'string' && DATE_RE.test(body.date) ? body.date : todayKey()
  const { row } = await loadDay(db, userId, dateKey)
  const merge = (k: string) => ({ ...((row?.[k] as Record<string, unknown>) ?? {}) })

  let res: { error: { code?: string; message?: string } | null } = { error: null }
  switch (action) {
    case 'energy': {
      const v = body.value
      if (v !== 'low' && v !== 'normal' && v !== 'high') return NextResponse.json({ error: 'bad energy' }, { status: 400 })
      res = await upsertDay(db, userId, dateKey, { energy: v, mode: v === 'low' ? (row?.mode ?? 'normal') : row?.mode ?? 'normal' }); break
    }
    case 'mode': {
      const v = body.value
      if (v !== 'normal' && v !== 'stuck' && v !== 'spiral') return NextResponse.json({ error: 'bad mode' }, { status: 400 })
      res = await upsertDay(db, userId, dateKey, { mode: v }); break
    }
    case 'gym': {
      res = await upsertDay(db, userId, dateKey, { gym_today: body.value === true }); break
    }
    case 'top3': {
      const list = Array.isArray(body.value) ? body.value.slice(0, 3).map(t => ({ text: String((t as { text?: string }).text ?? '').slice(0, 200), done: !!(t as { done?: boolean }).done })) : []
      res = await upsertDay(db, userId, dateKey, { top3: list }); break
    }
    case 'check': {
      const id = String(body.id ?? '').slice(0, 60)
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      const checks = merge('checks'); if (body.value) checks[id] = true; else delete checks[id]
      res = await upsertDay(db, userId, dateKey, { checks }); break
    }
    case 'stat': {
      const key = String(body.key ?? '').slice(0, 40)
      if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })
      const stats = merge('stats')
      const cur = Number(stats[key] ?? 0)
      stats[key] = typeof body.set === 'number' ? body.set : Math.max(0, cur + Number(body.delta ?? 1))
      res = await upsertDay(db, userId, dateKey, { stats }); break
    }
    case 'note': {
      const key = String(body.key ?? '').slice(0, 40)
      if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })
      const notes = merge('notes'); notes[key] = String(body.value ?? '').slice(0, 2000)
      res = await upsertDay(db, userId, dateKey, { notes }); break
    }
    case 'overrides': {
      const o = (body.value ?? {}) as DayOverrides
      res = await upsertDay(db, userId, dateKey, { overrides: {
        offDay: !!o.offDay,
        workUntil: typeof o.workUntil === 'number' ? o.workUntil : undefined,
        customEvening: o.customEvening ? String(o.customEvening).slice(0, 160) : undefined,
        skipIds: Array.isArray(o.skipIds) ? o.skipIds.map(String).slice(0, 40) : [],
      } }); break
    }
    case 'camera_target': {
      const amount = Number(body.value)
      res = await db.from('luna_30d_program').upsert({ user_id: userId, camera_target: Number.isFinite(amount) ? amount : null }, { onConflict: 'user_id' }); break
    }
    case 'item_add': {
      const kind = String(body.kind ?? '').slice(0, 30)
      if (!kind) return NextResponse.json({ error: 'kind required' }, { status: 400 })
      res = await db.from('luna_30d_items').insert({
        user_id: userId, kind, status: body.status ? String(body.status).slice(0, 30) : null,
        amount: typeof body.amount === 'number' ? body.amount : null,
        data: typeof body.data === 'object' && body.data ? body.data : {}, date_key: dateKey,
      }); break
    }
    case 'item_update': {
      const id = String(body.id ?? '')
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (body.status !== undefined) patch.status = body.status ? String(body.status).slice(0, 30) : null
      if (typeof body.amount === 'number') patch.amount = body.amount
      if (typeof body.data === 'object' && body.data) patch.data = body.data
      res = await db.from('luna_30d_items').update(patch).eq('id', id).eq('user_id', userId); break
    }
    case 'item_delete': {
      res = await db.from('luna_30d_items').delete().eq('id', String(body.id ?? '')).eq('user_id', userId); break
    }
    default:
      return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  }

  if (res.error) {
    if (missingTable(res.error)) return NextResponse.json({ setupNeeded: true }, { status: 503 })
    console.error('[thirty] POST', action, res.error)
    return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
