import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ZOE_PANTRY_STAPLES, STAPLE_GROUPS_ORDER, type StapleGroup, type StapleStatus } from '@/lib/luna/pantryStaples'

export interface StapleWithStatus {
  id?: string
  name: string
  group: string
  category: string
  status: StapleStatus | null
  custom?: boolean
}

const GROUP_DEFAULT_CATEGORY: Record<StapleGroup, string> = {
  protein: 'protein', meals: 'pantry', breakfast: 'pantry', easy_backup: 'pantry',
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // staple_group/status may not exist yet if the migration hasn't been
    // run — fail soft to "no existing statuses" rather than erroring the
    // whole Sunday flow.
    let existing: { id: string; name: string; status: string | null; staple_group: string | null }[] = []
    try {
      const { data, error } = await supabase
        .from('food_pantry_items')
        .select('id, name, status, staple_group')
        .eq('user_id', user.id)
        .not('staple_group', 'is', null)
        .is('consumed_at', null)
      if (error) throw error
      existing = data ?? []
    } catch {
      existing = []
    }

    const byName = new Map(existing.map(r => [r.name.toLowerCase(), r]))
    const fixedNames = new Set(ZOE_PANTRY_STAPLES.map(s => s.name.toLowerCase()))
    const staples: StapleWithStatus[] = ZOE_PANTRY_STAPLES.map(s => ({
      name: s.name,
      group: s.group,
      category: s.category,
      status: (byName.get(s.name.toLowerCase())?.status as StapleStatus | null) ?? null,
    }))

    // Custom staples Zoe added herself from the Sunday check-in — same
    // tracking as the fixed list, just not baked into the shared master list.
    for (const row of existing) {
      if (fixedNames.has(row.name.toLowerCase())) continue
      staples.push({
        id: row.id,
        name: row.name,
        group: row.staple_group ?? 'easy_backup',
        category: GROUP_DEFAULT_CATEGORY[(row.staple_group as StapleGroup) ?? 'easy_backup'],
        status: row.status as StapleStatus | null,
        custom: true,
      })
    }

    return NextResponse.json({ staples })
  } catch (error) {
    console.error('[food/pantry/staples] GET error:', error)
    return NextResponse.json({ staples: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const name: string = typeof body.name === 'string' ? body.name.trim() : ''
    const group: StapleGroup = STAPLE_GROUPS_ORDER.includes(body.group) ? body.group : 'easy_backup'
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const category = GROUP_DEFAULT_CATEGORY[group]
    const storage = category === 'frozen' ? 'freezer' : category === 'pantry' ? 'pantry' : 'fridge'

    const { data, error } = await supabase
      .from('food_pantry_items')
      .insert({ user_id: user.id, name, category, storage, status: 'in_stock', staple_group: group, source: 'manual' })
      .select()
      .single()
    if (error) throw error

    return NextResponse.json({ staple: { id: data.id, name, group, category, status: 'in_stock', custom: true } })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[food/pantry/staples] POST error:', message)
    return NextResponse.json({ error: 'Could not add that item', detail: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const confirmed: Record<string, StapleStatus> = body.statuses ?? {}

    const { data: existingRows } = await supabase
      .from('food_pantry_items')
      .select('id, name')
      .eq('user_id', user.id)
      .not('staple_group', 'is', null)
      .is('consumed_at', null)

    const existingByName = new Map((existingRows ?? []).map((r: { id: string; name: string }) => [r.name.toLowerCase(), r.id]))
    const staplesByName = new Map(ZOE_PANTRY_STAPLES.map(s => [s.name.toLowerCase(), s]))

    for (const [name, status] of Object.entries(confirmed)) {
      const def = staplesByName.get(name.toLowerCase())
      const existingId = existingByName.get(name.toLowerCase())
      // A custom staple (added from the Sunday screen, not in the fixed
      // master list) already has a real row — just update its status.
      if (!def) {
        if (existingId) await supabase.from('food_pantry_items').update({ status }).eq('id', existingId).eq('user_id', user.id)
        continue
      }
      if (existingId) {
        await supabase.from('food_pantry_items').update({ status }).eq('id', existingId).eq('user_id', user.id)
      } else {
        await supabase.from('food_pantry_items').insert({
          user_id: user.id,
          name: def.name,
          category: def.category,
          storage: def.category === 'frozen' ? 'freezer' : def.category === 'pantry' || def.category === 'bakery_and_grains' ? 'pantry' : 'fridge',
          status,
          staple_group: def.group,
          source: 'manual',
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[food/pantry/staples] PATCH error:', message)
    return NextResponse.json({ error: 'Could not save your pantry check-in', detail: message }, { status: 500 })
  }
}
