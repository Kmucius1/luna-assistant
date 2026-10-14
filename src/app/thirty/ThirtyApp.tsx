'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  BRAND_IDEA_KINDS, CLOSET_QUESTIONS, CORE_PHRASE, HOBBY_CATEGORIES, NIGHT_ASKS, NIGHT_JOURNAL_PROMPTS,
  SPIRAL_QUESTIONS, SPIRAL_REMINDERS, STUCK_MESSAGES, STUCK_STEPS, STYLE_WORDS, SUNDAY_RESET, WEEKLY_REFLECTION,
  type Energy, type Mode, type Part, type PlanItem, type Progress,
} from '@/lib/luna/thirtyDay'
import { suggestions, type SuggestCtx, type SuggestKind } from '@/lib/luna/thirtySuggestions'
import styles from './thirty.module.css'

interface Item { id: string; kind: string; status: string | null; amount: number | null; data: Record<string, unknown>; date_key: string | null }
interface Hist { date_key: string; energy?: Energy | null; checks?: Record<string, boolean>; stats?: Record<string, number>; notes?: Record<string, string> }
interface Bundle {
  setupNeeded?: boolean
  dateKey: string; dayNumber: number; phase: 'before' | 'active' | 'review' | 'after'; totalDays: number; reviewDate: string
  theme: { name: string; block: string; done: string; options: string[] }
  day: {
    energy: Energy; mode: Mode; gymToday: boolean | null; gymTomorrow: boolean | null
    top3: { text: string; done?: boolean }[]; checks: Record<string, boolean>; skips: Record<string, boolean>
    stats: Record<string, number>; notes: Record<string, string>
    overrides: { offDay?: boolean; workUntil?: number; customEvening?: string; skipIds?: string[] }
  }
  plan: Record<Part, PlanItem[]>
  next: PlanItem | null
  carryover: string[]; tomorrowFirst: string
  progress: Progress; history: Hist[]; items: Item[]
  closet: { sorted: number; sell: number; photographed: number; listed: number; sold: number; earned: number }
  funds: { camera: number; upgrade: number; cameraTarget: number | null }
  weekHits: Record<string, boolean>; week: { start: string; end: string }
  home: { week: number; zone: string; focus: string }
  fridayPrompt: string | null
}

type Tab = 'today' | 'week' | 'closet' | 'style' | 'content' | 'money' | 'home' | 'brand' | 'progress'
const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Today' }, { id: 'week', label: 'Week' }, { id: 'closet', label: 'Closet' }, { id: 'style', label: 'Style' },
  { id: 'content', label: 'Content' }, { id: 'money', label: 'Money' }, { id: 'home', label: 'Home' },
  { id: 'brand', label: 'Brand' }, { id: 'progress', label: 'Progress' },
]
const PART_LABEL: Record<Part, string> = { morning: 'Morning', work: 'Workday', after: 'After work', night: 'Night' }

const usd = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`

export function ThirtyApp() {
  const [b, setB] = useState<Bundle | null>(null)
  const [tab, setTab] = useState<Tab>('today')
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/thirty', { cache: 'no-store' })
      if (!r.ok) throw new Error(String(r.status))
      setB(await r.json())
      setErr('')
    } catch { setErr('Could not load your day. Pull to refresh.') }
  }, [])
  useEffect(() => {
    const t = setTimeout(load, 0)
    return () => clearTimeout(t)
  }, [load])

  const send = useCallback(async (payload: Record<string, unknown>, date?: string) => {
    try {
      const r = await fetch('/api/thirty', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(date ? { ...payload, date } : payload),
      })
      if (!r.ok) setErr('That did not save. Try again.')
    } catch { setErr('That did not save. Try again.') }
    await load()
  }, [load])

  const toggle = useCallback((id: string, value: boolean) => {
    setB(prev => prev ? { ...prev, day: { ...prev.day, checks: { ...prev.day.checks, [id]: value } } } : prev)
    send({ action: 'check', id, value })
  }, [send])

  const skip = useCallback((id: string, value: boolean) => {
    setB(prev => prev ? { ...prev, day: { ...prev.day, skips: { ...prev.day.skips, [id]: value }, checks: value ? { ...prev.day.checks, [id]: false } : prev.day.checks } } : prev)
    send({ action: 'skip', id, value })
  }, [send])

  if (err && !b) return <Shell><p className={styles.sub}>{err}</p></Shell>
  if (!b) return <Shell><p className={styles.sub}>Opening your day…</p></Shell>
  if (b.setupNeeded) {
    return <Shell><div className={styles.card}><p className={styles.cardTitle}>One setup step</p>
      <p className={styles.sub}>The 30-day tables are not in the database yet. Run <b>supabase/luna_30day_schema.sql</b> once, then reload.</p></div></Shell>
  }

  const mode = b.day.mode
  if (mode === 'stuck') return <Shell><Stuck onExit={() => send({ action: 'mode', value: 'normal' })} /></Shell>
  if (mode === 'spiral') return <Shell><Spiral onExit={() => send({ action: 'mode', value: 'normal' })} /></Shell>

  return (
    <Shell>
      <header>
        <p className={styles.eyebrow}>
          {b.phase === 'before' ? 'Starts October 13' : b.phase === 'active' ? `Day ${b.dayNumber} of ${b.totalDays}` : '30-day review'}
        </p>
        <h1 className={styles.dayTitle}>{b.phase === 'active' ? `Day ${b.dayNumber} of ${b.totalDays}` : b.phase === 'before' ? 'Almost here' : 'Review day'}</h1>
        <p className={styles.sub}>{b.theme.name} · {b.theme.block}</p>
        <p className={styles.phrase}>{CORE_PHRASE}</p>
      </header>

      {err && <div className={styles.warn}>{err}</div>}

      <nav className={styles.tabs} aria-label="30-day sections">
        {TABS.map(t => (
          <button key={t.id} className={`${styles.tab} ${tab === t.id ? styles.tabOn : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </nav>

      {tab === 'today' && <Today key={b.dateKey} b={b} toggle={toggle} skip={skip} send={send} />}
      {tab === 'week' && <Week b={b} toggle={toggle} send={send} />}
      {tab === 'closet' && <Closet b={b} send={send} />}
      {tab === 'style' && <Style b={b} send={send} />}
      {tab === 'content' && <Content b={b} send={send} />}
      {tab === 'money' && <Money b={b} send={send} />}
      {tab === 'home' && <Home b={b} toggle={toggle} send={send} />}
      {tab === 'brand' && <Brand b={b} send={send} />}
      {tab === 'progress' && <ProgressTab b={b} />}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <AppLayout><div className={styles.page}>{children}</div></AppLayout>
}

type Send = (p: Record<string, unknown>, date?: string) => Promise<void>
type Toggle = (id: string, v: boolean) => void

// ---------------------------------------------------------------- TODAY

type Sub = 'overview' | 'morning' | 'work' | 'after' | 'night' | 'tomorrow'
const SUBS: { id: Sub; label: string }[] = [
  { id: 'overview', label: 'Overview' }, { id: 'morning', label: 'Morning' }, { id: 'work', label: 'Workday' },
  { id: 'after', label: 'After work' }, { id: 'night', label: 'Night' }, { id: 'tomorrow', label: 'Tomorrow' },
]

// Free-form notes for a section of the day. Saved when you tap away.
function SectionNotes({ b, noteKey, send, date, label = 'Notes' }: { b: Bundle; noteKey: string; send: Send; date?: string; label?: string }) {
  const [v, setV] = useState(b.day.notes[noteKey] ?? '')
  const [saved, setSaved] = useState(false)
  return (
    <section className={styles.card}>
      <p className={styles.cardTitle}>{label}</p>
      <textarea className={styles.area} value={v} placeholder="Anything you want to remember or get out of your head"
        onChange={e => { setV(e.target.value); setSaved(false) }}
        onBlur={async () => { await send({ action: 'note', key: noteKey, value: v }, date); setSaved(true) }} />
      {saved && <p className={styles.note}>Saved.</p>}
    </section>
  )
}

// One part of the day as a checklist. Every line can be checked, skipped,
// reworded, and you can add your own lines underneath.
function PartChecklist({ b, part, title, toggle, skip, send }: {
  b: Bundle; part: Part; title: string; toggle: Toggle; skip: (id: string, v: boolean) => void; send: Send
}) {
  const list = b.plan[part]
  const [editId, setEditId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const done = list.filter(i => b.day.checks[i.id] || b.day.skips[i.id]).length
  return (
    <>
      <section className={styles.card}>
        <p className={styles.cardTitle}>{title} · {done}/{list.length}</p>
        {list.length === 0 && <p className={styles.sub}>Nothing scheduled here today.</p>}
        {list.map(i => {
          const on = !!b.day.checks[i.id]
          const skipped = !!b.day.skips[i.id]
          const custom = b.day.notes[`label_${i.id}`]
          const label = custom || i.label
          return (
            <div key={i.id} className={styles.check} onClick={() => editId !== i.id && !skipped && toggle(i.id, !on)}>
              <div className={`${styles.box} ${on ? styles.boxOn : ''}`}>{on ? '✓' : ''}</div>
              <div className={`${styles.checkText} ${on || skipped ? styles.checkDone : ''}`}>
                {i.time && <span className={styles.time}>{i.time}</span>}
                {editId === i.id ? (
                  <span onClick={e => e.stopPropagation()}>
                    <input className={styles.input} autoFocus value={draft} onChange={e => setDraft(e.target.value)}
                      onBlur={() => { const t = draft.trim(); if (t !== label) send({ action: 'note', key: `label_${i.id}`, value: t === i.label ? '' : t }); setEditId(null) }}
                      onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
                  </span>
                ) : <>{label}{i.core && <span className={styles.core}>core</span>}</>}
                {i.detail && editId !== i.id && <span className={styles.time} style={{ marginTop: 2 }}>{i.detail}</span>}
                <span className={styles.rowWrap} style={{ marginTop: 8 }} onClick={e => e.stopPropagation()}>
                  {skipped ? (
                    <>
                      <span className={styles.small}>Skipped. That’s okay.</span>
                      <button className={styles.tab} onClick={() => skip(i.id, false)}>Undo</button>
                    </>
                  ) : (
                    <>
                      {i.skippable && <button className={styles.tab} onClick={() => skip(i.id, true)}>Not feeling it</button>}
                      <button className={styles.tab} onClick={() => { setDraft(label); setEditId(i.id) }}>Edit</button>
                    </>
                  )}
                </span>
              </div>
            </div>
          )
        })}
      </section>
      <section className={styles.card}>
        <p className={styles.cardTitle}>Add your own</p>
        <PlanList b={b} noteKey={`extra_${part}`} label="" placeholder="Something to add to this part of the day" send={send} />
      </section>
      <SectionNotes b={b} noteKey={`note_${part}`} send={send} />
    </>
  )
}

function Today({ b, toggle, skip, send }: { b: Bundle; toggle: Toggle; skip: (id: string, v: boolean) => void; send: Send }) {
  const [sub, setSub] = useState<Sub>('overview')
  const [top, setTop] = useState<string[]>(() => [0, 1, 2].map(i => b.day.top3[i]?.text ?? ''))
  const [editingTop, setEditingTop] = useState(false)

  const saveTop = (list: string[], done?: boolean[]) =>
    send({ action: 'top3', value: list.map((text, i) => ({ text, done: done ? done[i] : !!b.day.top3[i]?.done })) })
  const labels = ['Work / money', 'Personal / life', 'Creative / growth']
  const parts: Part[] = ['morning', 'work', 'after', 'night']
  const count = (p: Part) => {
    const l = b.plan[p]
    return { done: l.filter(i => b.day.checks[i.id] || b.day.skips[i.id]).length, total: l.length }
  }

  return (
    <>
      <nav className={styles.tabs} aria-label="Parts of the day" style={{ marginTop: 12 }}>
        {SUBS.map(t => (
          <button key={t.id} className={`${styles.tab} ${sub === t.id ? styles.tabOn : ''}`} onClick={() => setSub(t.id)}>{t.label}</button>
        ))}
      </nav>

      {sub === 'overview' && (
        <>
          <section className={styles.card}>
            <p className={styles.cardTitle}>Today’s energy</p>
            <div className={styles.seg}>
              {(['low', 'normal', 'high'] as Energy[]).map(e => (
                <button key={e} className={`${styles.segBtn} ${b.day.energy === e ? styles.segOn : ''}`}
                  onClick={() => send({ action: 'energy', value: e })}>{e[0].toUpperCase() + e.slice(1)}</button>
              ))}
            </div>
            {b.day.energy === 'low' && <p className={styles.note}>Low-energy day: the plan is trimmed to the essentials. It still counts.</p>}
          </section>

          <section className={styles.card}>
            <p className={styles.cardTitle}>What is Zoe doing next?</p>
            {b.next ? (
              <>
                <p className={styles.next}>{b.day.notes[`label_${b.next.id}`] || b.next.label}</p>
                {b.next.detail && <p className={styles.detail}>{b.next.detail}</p>}
                <div className={styles.rowWrap}>
                  <button className={styles.btn} onClick={() => toggle(b.next!.id, true)}>Done</button>
                  {b.next.skippable && (
                    <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => skip(b.next!.id, true)}>Not feeling it</button>
                  )}
                </div>
              </>
            ) : <p className={styles.next}>Everything for today is done. Rest is part of the plan.</p>}
            <div className={styles.rowWrap} style={{ marginTop: 14 }}>
              <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => send({ action: 'mode', value: 'stuck' })}>I’m stuck</button>
              <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => send({ action: 'mode', value: 'spiral' })}>I’m spiraling</button>
            </div>
          </section>

          <section className={styles.card}>
            <p className={styles.cardTitle}>Today’s top 3</p>
            {!editingTop && top.some(t => t.trim()) ? (
              <>
                {labels.map((l, i) => top[i].trim() ? (
                  <div key={l} className={styles.check} onClick={() => { const d = [0, 1, 2].map(k => !!b.day.top3[k]?.done); d[i] = !d[i]; saveTop(top, d) }}>
                    <div className={`${styles.box} ${b.day.top3[i]?.done ? styles.boxOn : ''}`}>{b.day.top3[i]?.done ? '✓' : ''}</div>
                    <div className={`${styles.checkText} ${b.day.top3[i]?.done ? styles.checkDone : ''}`}>
                      <span className={styles.time}>{l}</span>{top[i]}
                    </div>
                  </div>
                ) : null)}
                <button className={styles.tab} style={{ marginTop: 10 }} onClick={() => setEditingTop(true)}>Edit my top 3</button>
              </>
            ) : (
              <>
                {b.carryover.length > 0 && top.every(t => !t) && (
                  <p className={styles.note}>From yesterday, not finished: {b.carryover.join(' · ')}.</p>
                )}
                {b.tomorrowFirst && top[0] === '' && (
                  <button className={`${styles.btn} ${styles.btnQuiet}`} style={{ margin: '8px 0' }}
                    onClick={() => { const n = [...top]; n[0] = b.tomorrowFirst; setTop(n) }}>
                    Use last night’s first priority: {b.tomorrowFirst}
                  </button>
                )}
                {labels.map((l, i) => (
                  <div key={l} style={{ marginTop: i ? 14 : 0 }}>
                    <span className={styles.time}>{i + 1}. {l}</span>
                    <input className={styles.input} value={top[i]} placeholder="What matters most here?"
                      onChange={e => { const n = [...top]; n[i] = e.target.value; setTop(n) }} />
                    {!top[i].trim() && (
                      <SuggestChips b={b} kind={(['top_work', 'top_life', 'top_create'] as SuggestKind[])[i]} exclude={top}
                        onPick={t => { const n = [...top]; n[i] = t; setTop(n) }} />
                    )}
                  </div>
                ))}
                <button className={styles.btn} style={{ marginTop: 12 }} disabled={!top.some(t => t.trim())}
                  onClick={async () => { await saveTop(top); setEditingTop(false) }}>Save my top 3</button>
              </>
            )}
          </section>

          {b.fridayPrompt && <FridayAsk send={send} text={b.fridayPrompt} />}

          <section className={styles.card}>
            <p className={styles.cardTitle}>The day at a glance</p>
            {parts.map(p => {
              const c = count(p)
              if (c.total === 0) return null
              return (
                <button key={p} className={styles.check} style={{ width: '100%', background: 'none', borderLeft: 0, borderRight: 0, borderBottom: 0, color: 'inherit', textAlign: 'left' }}
                  onClick={() => setSub(p)}>
                  <div className={styles.checkText}>{PART_LABEL[p]}</div>
                  <span className={styles.small}>{c.done}/{c.total}</span>
                </button>
              )
            })}
            <p className={styles.note}>Tap a part of the day to open its checklist.</p>
          </section>

          <section className={styles.card}>
            <p className={styles.cardTitle}>Tonight: {b.theme.block}</p>
            <p className={styles.detail}>DONE means: {b.theme.done}</p>
          </section>

          <Unusual b={b} send={send} />
          <SectionNotes b={b} noteKey="note_overview" send={send} label="Notes for today" />
        </>
      )}

      {sub === 'morning' && (
        <>
          <section className={styles.card}>
            <p className={styles.cardTitle}>Gym this morning?</p>
            <div className={styles.seg}>
              <button className={`${styles.segBtn} ${b.day.gymToday === true ? styles.segOn : ''}`} onClick={() => send({ action: 'gym', value: true })}>Yes</button>
              <button className={`${styles.segBtn} ${b.day.gymToday === false ? styles.segOn : ''}`} onClick={() => send({ action: 'gym', value: false })}>No</button>
            </div>
          </section>
          <PartChecklist b={b} part="morning" title="Morning" toggle={toggle} skip={skip} send={send} />
          <section className={styles.card}>
            <p className={styles.cardTitle}>Plan the outfit</p>
            <PlanList b={b} noteKey="plan_outfit" label="" placeholder="Cream knit, black trousers, gold hoops" send={send} kind="outfit" />
          </section>
          <Quick b={b} send={send} show={['outfit', 'win']} />
        </>
      )}

      {sub === 'work' && (
        <PartChecklist b={b} part="work" title="Workday" toggle={toggle} skip={skip} send={send} />
      )}

      {sub === 'after' && (
        <>
          <PartChecklist b={b} part="after" title="After work" toggle={toggle} skip={skip} send={send} />
          <section className={styles.card}>
            <p className={styles.cardTitle}>Tonight: {b.theme.block}</p>
            <p className={styles.detail}>DONE means: {b.theme.done}</p>
            <PlanList b={b} noteKey="plan_block" label="My checklist for tonight" placeholder="Add your own" send={send} kind="block" />
          </section>
          <section className={styles.card}>
            <p className={styles.cardTitle}>Plan the rest</p>
            <PlanList b={b} noteKey="plan_content" label="Content to capture" placeholder="Coffee pour, sunset, outfit in the mirror" send={send} kind="content" when="pm" />
            <PlanList b={b} noteKey="plan_creative" label="Creative block" placeholder="45 minutes on the flash sheet" send={send} kind="creative" />
            <PlanList b={b} noteKey="plan_errands" label="Errands + life admin" placeholder="Return package, groceries" send={send} kind="errands" when="pm" />
          </section>
          <Quick b={b} send={send} show={['content']} />
        </>
      )}

      {sub === 'night' && (
        <>
          <PartChecklist b={b} part="night" title="Night" toggle={toggle} skip={skip} send={send} />
          <NightWrap b={b} send={send} mode="journal" />
          <Quick b={b} send={send} show={['outfit', 'win']} />
        </>
      )}

      {sub === 'tomorrow' && <NightWrap b={b} send={send} mode="tomorrow" />}
    </>
  )
}

function suggestCtx(b: Bundle): SuggestCtx {
  const keptPieces = b.items.filter(i => i.kind === 'closet' && i.status === 'keep').map(i => String(i.data.name ?? '')).filter(Boolean)
  const savedCombos = b.items.filter(i => i.kind === 'outfit_combo').map(i => String(i.data.text ?? '')).filter(Boolean)
  const repeatOutfits = b.history
    .filter(h => (h.stats?.outfit_rating ?? 0) >= 8 && h.notes?.outfit_fav)
    .map(h => String(h.notes!.outfit_fav))
  return { dateKey: b.dateKey, energy: b.day.energy, themeOptions: b.theme.options, keptPieces, savedCombos, repeatOutfits }
}

// Tappable ideas for a list. Refresh brings a different, still-logical set.
function SuggestChips({ b, kind, when = 'any', exclude, onPick }: {
  b: Bundle; kind: SuggestKind; when?: 'am' | 'pm' | 'any'; exclude: string[]; onPick: (t: string) => void
}) {
  const [seed, setSeed] = useState(0)
  const list = useMemo(
    () => suggestions(kind, suggestCtx(b), seed, exclude, 4, when),
    [b, kind, seed, exclude, when],
  )
  if (list.length === 0) return null
  return (
    <div style={{ marginTop: 10 }}>
      <span className={styles.time}>Ideas for you</span>
      <div className={styles.rowWrap}>
        {list.map(t => (
          <button key={t} type="button" className={styles.tab}
            style={{ whiteSpace: 'normal', textAlign: 'left', borderRadius: 16, lineHeight: 1.3, height: 'auto', padding: '10px 14px' }}
            onClick={() => onPick(t)}>+ {t}</button>
        ))}
      </div>
      <button type="button" className={styles.tab} style={{ marginTop: 8 }} onClick={() => setSeed(x => x + 1)}>Refresh ideas</button>
    </div>
  )
}

function PlanList({ b, noteKey, label, placeholder, send, date, kind, when }: {
  b: Bundle; noteKey: string; label: string; placeholder: string; send: Send; date?: string; kind?: SuggestKind; when?: 'am' | 'pm' | 'any'
}) {
  type Row = { t: string; d: boolean }
  const parse = (raw?: string): Row[] => { try { const v = JSON.parse(raw ?? '[]'); return Array.isArray(v) ? v : [] } catch { return [] } }
  const [rows, setRows] = useState<Row[]>(() => parse(b.day.notes[noteKey]))
  const [text, setText] = useState('')
  const [editing, setEditing] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const save = (next: Row[]) => {
    setRows(next)
    send({ action: 'note', key: noteKey, value: JSON.stringify(next) }, date)
  }
  const add = () => { if (text.trim()) { save([...rows, { t: text.trim(), d: false }]); setText('') } }
  return (
    <div style={{ marginTop: 14 }}>
      <span className={styles.time}>{label}</span>
      {rows.map((r, i) => (
        <div key={i} className={styles.check} style={{ padding: '8px 0' }}>
          <div className={`${styles.box} ${r.d ? styles.boxOn : ''}`} onClick={() => save(rows.map((x, k) => (k === i ? { ...x, d: !x.d } : x)))}>{r.d ? '✓' : ''}</div>
          {editing === i ? (
            <input className={styles.input} autoFocus value={draft} onChange={e => setDraft(e.target.value)}
              onBlur={() => { if (draft.trim()) save(rows.map((x, k) => (k === i ? { ...x, t: draft.trim() } : x))); setEditing(null) }}
              onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
          ) : (
            <div className={`${styles.checkText} ${r.d ? styles.checkDone : ''}`} onClick={() => save(rows.map((x, k) => (k === i ? { ...x, d: !x.d } : x)))}>{r.t}</div>
          )}
          <button className={styles.tab} style={{ minHeight: 36, padding: '4px 10px' }} aria-label="Edit" onClick={() => { setDraft(r.t); setEditing(i) }}>Edit</button>
          <button className={styles.tab} style={{ minHeight: 36, padding: '4px 10px' }} aria-label="Remove" onClick={() => save(rows.filter((_, k) => k !== i))}>✕</button>
        </div>
      ))}
      {kind && (
        <SuggestChips b={b} kind={kind} when={when} exclude={rows.map(r => r.t)}
          onPick={t => save([...rows, { t, d: false }])} />
      )}
      <div className={styles.row} style={{ marginTop: 6 }}>
        <input className={styles.input} value={text} placeholder={placeholder} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
        <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={add}>Add</button>
      </div>
    </div>
  )
}

function FridayAsk({ send, text }: { send: Send; text: string }) {
  const [v, setV] = useState('')
  return (
    <section className={styles.card}>
      <p className={styles.cardTitle}>Friday</p>
      <p className={styles.next}>{text}</p>
      <input className={styles.input} value={v} onChange={e => setV(e.target.value)} placeholder="Dinner, brunch, concert, solo date…" />
      <button className={styles.btn} style={{ marginTop: 10 }} disabled={!v.trim()}
        onClick={() => { send({ action: 'item_add', kind: 'social', data: { friday: true, plan: v.trim() } }); setV('') }}>Lock it in</button>
    </section>
  )
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className={styles.stat}>
      <div className={styles.statNum}>{value}</div>
      <div className={styles.statLbl}>{label}</div>
      <div className={styles.row} style={{ justifyContent: 'center', marginTop: 6 }}>
        <button className={`${styles.btn} ${styles.btnQuiet}`} style={{ padding: '6px 0', minHeight: 44, flex: 1 }} aria-label={`Less ${label}`} onClick={() => onChange(Math.max(0, value - 1))}>−</button>
        <button className={`${styles.btn} ${styles.btnQuiet}`} style={{ padding: '6px 0', minHeight: 44, flex: 1 }} aria-label={`More ${label}`} onClick={() => onChange(value + 1)}>+</button>
      </div>
    </div>
  )
}

function Quick({ b, send, show }: { b: Bundle; send: Send; show: ('content' | 'outfit' | 'win')[] }) {
  const s = b.day.stats
  const [fav, setFav] = useState(b.day.notes.outfit_fav ?? '')
  const [wrong, setWrong] = useState(b.day.notes.outfit_wrong ?? '')
  const [win, setWin] = useState(b.day.notes.private_win ?? '')
  const rating = s.outfit_rating ?? 0
  return (
    <>
      {show.includes('content') && (<section className={styles.card}>
        <p className={styles.cardTitle}>Reflect: content today</p>
        <div className={styles.grid2}>
          <Stepper label="Clips" value={s.clips ?? 0} onChange={n => send({ action: 'stat', key: 'clips', set: n })} />
          <Stepper label="Edited" value={s.edited ?? 0} onChange={n => send({ action: 'stat', key: 'edited', set: n })} />
          <Stepper label="Posted" value={s.posted ?? 0} onChange={n => send({ action: 'stat', key: 'posted', set: n })} />
          <Stepper label="Ideas" value={s.ideas ?? 0} onChange={n => send({ action: 'stat', key: 'ideas', set: n })} />
        </div>
        <p className={styles.note}>Capture is not edit is not post. You do not have to publish everything.</p>
      </section>)}

      {show.includes('outfit') && (<section className={styles.card}>
        <p className={styles.cardTitle}>Reflect: how the outfit felt</p>
        <div className={styles.rowWrap}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
            <button key={n} className={`${styles.tab} ${rating === n ? styles.tabOn : ''}`} style={{ minWidth: 44 }}
              onClick={() => send({ action: 'stat', key: 'outfit_rating', set: n })}>{n}</button>
          ))}
        </div>
        <input className={styles.input} style={{ marginTop: 10 }} value={fav} onChange={e => setFav(e.target.value)}
          onBlur={() => send({ action: 'note', key: 'outfit_fav', value: fav })} placeholder="Favorite element" />
        <input className={styles.input} style={{ marginTop: 8 }} value={wrong} onChange={e => setWrong(e.target.value)}
          onBlur={() => send({ action: 'note', key: 'outfit_wrong', value: wrong })} placeholder="What felt wrong" />
        <div className={styles.seg} style={{ marginTop: 10 }}>
          {[['yes', 'Wear again'], ['no', 'Not again']].map(([v, l]) => (
            <button key={v} className={`${styles.segBtn} ${b.day.notes.outfit_again === v ? styles.segOn : ''}`}
              onClick={() => send({ action: 'note', key: 'outfit_again', value: v })}>{l}</button>
          ))}
        </div>
        <p className={styles.note}>Getting ready is for you. This is your style data, not an audition.</p>
      </section>)}

      {show.includes('win') && (<section className={styles.card}>
        <p className={styles.cardTitle}>One private win</p>
        <input className={styles.input} value={win} onChange={e => setWin(e.target.value)}
          onBlur={() => win.trim() && send({ action: 'note', key: 'private_win', value: win.trim() })}
          placeholder="Something only you will know" />
      </section>)}
    </>
  )
}

function NightWrap({ b, send, mode }: { b: Bundle; send: Send; mode: 'tomorrow' | 'journal' }) {
  const tomorrow = useMemo(() => {
    const [y, m, d] = b.dateKey.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d + 1, 12)).toISOString().slice(0, 10)
  }, [b.dateKey])
  const [t, setT] = useState(['', '', ''])
  const [first, setFirst] = useState(b.day.notes.tomorrow_first_priority ?? '')
  const [ans, setAns] = useState<string[]>(NIGHT_JOURNAL_PROMPTS.map((_, i) => b.day.notes[`journal_${i}`] ?? ''))
  const [eod, setEod] = useState(b.day.notes.eod_summary ?? '')
  const [tb, setTb] = useState<Bundle | null>(null)
  const [gymTom, setGymTom] = useState<boolean | null>(null)
  const [gymSaved, setGymSaved] = useState(false)
  const touched = useRef(false)

  useEffect(() => {
    if (mode !== 'tomorrow') return
    let live = true
    fetch(`/api/thirty?date=${tomorrow}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!live || !d || d.setupNeeded) return
        setTb(d)
        // Never let a slow load overwrite what was just tapped.
        if (!touched.current) setGymTom(d.day.gymToday ?? null)
        setT(prev => (prev.every(x => !x) ? [0, 1, 2].map(i => d.day.top3?.[i]?.text ?? '') : prev))
      })
      .catch(() => {})
    return () => { live = false }
  }, [tomorrow, mode])

  const chooseGym = async (v: boolean) => {
    touched.current = true
    setGymTom(v)
    setGymSaved(false)
    await send({ action: 'gym', value: v }, tomorrow)
    setGymSaved(true)
  }

  if (mode === 'journal') {
    return (
      <>
        <section className={styles.card}>
          <p className={styles.cardTitle}>End of workday</p>
          <textarea className={styles.area} value={eod} onChange={e => setEod(e.target.value)}
            onBlur={() => send({ action: 'note', key: 'eod_summary', value: eod })} placeholder="EOD summary" />
        </section>
        <section className={styles.card}>
          <p className={styles.cardTitle}>Night journal</p>
          {NIGHT_JOURNAL_PROMPTS.map((p, i) => (
            <div key={p} style={{ marginTop: i ? 12 : 0 }}>
              <span className={styles.time}>{i + 1}. {p}</span>
              <textarea className={styles.area} value={ans[i]} onChange={e => { const n = [...ans]; n[i] = e.target.value; setAns(n) }}
                onBlur={() => send({ action: 'note', key: `journal_${i}`, value: ans[i] })} />
            </div>
          ))}
        </section>
        <SectionNotes b={b} noteKey="note_night_extra" send={send} label="More notes" />
      </>
    )
  }

  return (
    <>
      <section className={styles.card}>
        <p className={styles.cardTitle}>Gym tomorrow morning?</p>
        <div className={styles.rowWrap}>
          <button type="button" aria-pressed={gymTom === true}
            className={`${styles.btn} ${gymTom === true ? '' : styles.btnQuiet}`} style={{ flex: 1 }}
            onClick={() => chooseGym(true)}>Yes</button>
          <button type="button" aria-pressed={gymTom === false}
            className={`${styles.btn} ${gymTom === false ? '' : styles.btnQuiet}`} style={{ flex: 1 }}
            onClick={() => chooseGym(false)}>No</button>
        </div>
        {gymTom !== null && (
          <p className={styles.note}>
            {gymTom ? 'Gym tomorrow: wake at 6:00, out the door at 8:15.' : 'No gym tomorrow: wake at 6:30 and take it slow.'}
            {gymSaved ? ' Saved.' : ''}
          </p>
        )}
      </section>

      <section className={styles.card}>
        <p className={styles.cardTitle}>Tomorrow’s priorities</p>
        <span className={styles.time}>First work priority</span>
        <input className={styles.input} value={first} onChange={e => setFirst(e.target.value)}
          onBlur={() => send({ action: 'note', key: 'tomorrow_first_priority', value: first })} placeholder="The first thing at 9" />
        <span className={styles.time} style={{ marginTop: 12 }}>Top 3</span>
        {t.map((v, i) => (
          <div key={i} style={{ marginTop: 8 }}>
            <input className={styles.input} value={v} placeholder={['Work / money', 'Personal / life', 'Creative / growth'][i]}
              onChange={e => { const n = [...t]; n[i] = e.target.value; setT(n) }}
              onBlur={() => send({ action: 'top3', value: t.map(text => ({ text })) }, tomorrow)} />
            {tb && !v.trim() && (
              <SuggestChips b={tb} kind={(['top_work', 'top_life', 'top_create'] as SuggestKind[])[i]} exclude={t}
                onPick={x => { const n = [...t]; n[i] = x; setT(n); send({ action: 'top3', value: n.map(text => ({ text })) }, tomorrow) }} />
            )}
          </div>
        ))}
      </section>

      <section className={styles.card}>
        <p className={styles.cardTitle}>Plan it now, check it off tomorrow</p>
        {tb ? (
          <>
            <PlanList b={tb} date={tomorrow} noteKey="plan_outfit" label="Outfit" placeholder="What are you wearing?" send={send} kind="outfit" />
            <PlanList b={tb} date={tomorrow} noteKey="plan_content" label="Content to capture" placeholder="Shots you want tomorrow" send={send} kind="content" when="am" />
            <PlanList b={tb} date={tomorrow} noteKey="plan_creative" label="Creative block" placeholder="What are you making?" send={send} kind="creative" />
            <PlanList b={tb} date={tomorrow} noteKey="plan_errands" label="Errands + life admin" placeholder="Anything to handle" send={send} kind="errands" when="am" />
          </>
        ) : <p className={styles.sub}>Loading tomorrow…</p>}
        <p className={styles.note}>Also settle: {NIGHT_ASKS.slice(1).join(' · ')}</p>
      </section>

      {tb && <SectionNotes b={tb} noteKey="note_tomorrow" send={send} date={tomorrow} label="Notes for tomorrow" />}
    </>
  )
}

function Unusual({ b, send }: { b: Bundle; send: Send }) {
  const o = b.day.overrides
  const [ev, setEv] = useState(o.customEvening ?? '')
  const set = (patch: Partial<typeof o>) => send({ action: 'overrides', value: { ...o, ...patch } })
  return (
    <section className={styles.card}>
      <p className={styles.cardTitle}>Not a normal day?</p>
      <div className={styles.rowWrap}>
        <button className={`${styles.tab} ${o.offDay ? styles.tabOn : ''}`} onClick={() => set({ offDay: !o.offDay })}>No work today</button>
        {[18, 19, 20].map(h => (
          <button key={h} className={`${styles.tab} ${o.workUntil === h ? styles.tabOn : ''}`}
            onClick={() => set({ workUntil: o.workUntil === h ? undefined : h })}>Working until {h - 12} PM</button>
        ))}
      </div>
      <input className={styles.input} style={{ marginTop: 10 }} value={ev} onChange={e => setEv(e.target.value)}
        onBlur={() => set({ customEvening: ev.trim() || undefined })} placeholder="Different evening plan (dinner with family…)" />
      <p className={styles.note}>Staying late shifts the evening. It never counts as failing.</p>
    </section>
  )
}

// ---------------------------------------------------------------- MODES

function ModeNote({ mode, text, setText, saved, onSave }: { mode: 'stuck' | 'spiral'; text: string; setText: (t: string) => void; saved: boolean; onSave: () => void }) {
  return (
    <section className={styles.card}>
      <p className={styles.cardTitle}>Write it out, if you want</p>
      <textarea className={styles.area} value={text} onChange={e => setText(e.target.value)}
        placeholder={mode === 'stuck' ? 'What’s making this heavy right now?' : 'Get it out of your head and onto the page.'} />
      <div className={styles.row} style={{ marginTop: 10 }}>
        <button className={`${styles.btn} ${styles.btnQuiet}`} disabled={!text.trim()} onClick={onSave}>Save note</button>
        {saved && <span className={styles.small}>Saved.</span>}
      </div>
    </section>
  )
}

function useModeNote(mode: 'stuck' | 'spiral', extra?: () => string) {
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(false)
  const save = async (): Promise<void> => {
    const body = [text.trim(), extra?.() ?? ''].filter(Boolean).join('\n\n')
    if (!body) return
    try {
      await fetch('/api/thirty', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'item_add', kind: 'mode_note', data: { mode, text: body } }),
      })
      setSaved(true)
      setText('')
    } catch { /* the note stays in the box so nothing is lost */ }
  }
  return { text, setText, saved, save }
}

function Stuck({ onExit }: { onExit: () => void }) {
  const [i, setI] = useState(0)
  const [msg] = useState(() => STUCK_MESSAGES[Math.floor(Math.random() * STUCK_MESSAGES.length)])
  const note = useModeNote('stuck')
  const last = i >= STUCK_STEPS.length - 1
  const leave = async () => { await note.save(); onExit() }
  return (
    <div style={{ paddingTop: 12 }}>
      <p className={styles.eyebrow}>Step {i + 1}</p>
      <p className={styles.big}>{STUCK_STEPS[i]}</p>
      <button className={styles.btn} onClick={() => (last ? leave() : setI(i + 1))}>{last ? 'Back to my day' : 'Done'}</button>
      <button className={`${styles.btn} ${styles.btnQuiet}`} style={{ marginLeft: 10 }} onClick={leave}>Show my day</button>
      <section className={styles.card}>
        <p className={styles.cardTitle}>For you</p>
        <p className={styles.big} style={{ margin: 0, fontSize: 19 }}>{msg}</p>
      </section>
      <ModeNote mode="stuck" {...note} onSave={note.save} />
    </div>
  )
}

function Spiral({ onExit }: { onExit: () => void }) {
  const [i, setI] = useState(0)
  const [ans, setAns] = useState<string[]>(['', '', '', ''])
  const q = SPIRAL_QUESTIONS
  const [reminder] = useState(() => SPIRAL_REMINDERS[Math.floor(Math.random() * SPIRAL_REMINDERS.length)])
  const answers = () => q.map((question, k) => (ans[k].trim() ? `${question} ${ans[k].trim()}` : '')).filter(Boolean).join('\n')
  const note = useModeNote('spiral', answers)
  const done = i >= q.length
  const leave = async () => { await note.save(); onExit() }
  return (
    <div style={{ paddingTop: 12 }}>
      <p className={styles.eyebrow}>Facts first. Story second.</p>
      {!done ? (
        <>
          <p className={styles.big}>{q[i]}</p>
          <textarea className={styles.area} value={ans[i]} onChange={e => { const n = [...ans]; n[i] = e.target.value; setAns(n) }} />
          <button className={styles.btn} style={{ marginTop: 12 }} onClick={() => setI(i + 1)}>Next</button>
        </>
      ) : (
        <>
          <p className={styles.big}>{reminder}</p>
          <p className={styles.sub}>You do not need to solve this right now.</p>
          <button className={styles.btn} style={{ marginTop: 16 }} onClick={leave}>Back to your life</button>
        </>
      )}
      <button className={`${styles.btn} ${styles.btnQuiet}`} style={{ marginTop: 10 }} onClick={leave}>Skip, show my day</button>
      <section className={styles.card}>
        <p className={styles.cardTitle}>For you</p>
        <p className={styles.big} style={{ margin: 0, fontSize: 19 }}>{reminder}</p>
      </section>
      <ModeNote mode="spiral" {...note} onSave={note.save} />
    </div>
  )
}

// A saved list row that can be checked off. `done` lives on the item's data.
function DoneRow({ it, send, children }: { it: Item; send: Send; children: React.ReactNode }) {
  const done = it.data.done === true
  return (
    <div className={styles.check} onClick={() => send({ action: 'item_update', id: it.id, data: { done: !done } })}>
      <div className={`${styles.box} ${done ? styles.boxOn : ''}`}>{done ? '✓' : ''}</div>
      <div className={`${styles.checkText} ${done ? styles.checkDone : ''}`}>{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------- WEEK

function Week({ b, send }: { b: Bundle; toggle: Toggle; send: Send }) {
  const isSunday = new Date(b.dateKey + 'T12:00:00Z').getUTCDay() === 0
  const [ans, setAns] = useState<string[]>(WEEKLY_REFLECTION.map((_, i) => b.day.notes[`refl_${i}`] ?? ''))
  const dateOf = (offset: number) => {
    const [y, m, d] = b.week.start.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d + offset, 12)).toISOString().slice(0, 10)
  }
  const week = [
    ['Monday', 'Create', 'Artist Zoe'], ['Tuesday', 'Closet + Money', 'Style / Sell / Finances'], ['Wednesday', 'Content + Brand', 'Content Zoe'],
    ['Thursday', 'Body + Beauty', 'Body / Beauty Zoe'], ['Friday', 'Social + Fun', 'Life Zoe'], ['Saturday', 'Explore + Create', 'Explore Zoe'], ['Sunday', 'Full Reset', 'Reset'],
  ]
  const fridays = b.items.filter(i => i.kind === 'social' && i.data.friday === true)
  const dayDone = (date: string) => b.items.find(i => i.kind === 'day_done' && i.data.date === date)
  const hobby = (cat: string) => b.items.find(i => i.kind === 'hobby' && i.data.category === cat && (i.date_key ?? '') >= b.week.start && (i.date_key ?? '') <= b.week.end)
  const reset = (idx: number) => b.items.find(i => i.kind === 'reset' && i.data.week === b.week.start && i.data.idx === idx)
  const resetDone = SUNDAY_RESET.filter((_, i) => reset(i)).length
  return (
    <>
      <section className={styles.card}>
        <p className={styles.cardTitle}>This week’s main blocks</p>
        {week.map(([d, n, blk], i) => {
          const date = dateOf(i)
          const it = dayDone(date)
          return (
            <div key={d} className={styles.check} onClick={() => it
              ? send({ action: 'item_delete', id: it.id })
              : send({ action: 'item_add', kind: 'day_done', data: { date } }, date)}>
              <div className={`${styles.box} ${it ? styles.boxOn : ''}`}>{it ? '✓' : ''}</div>
              <div className={`${styles.checkText} ${it ? styles.checkDone : ''}`}>
                <b>{d}</b> · {n}<span className={styles.time}>{blk}{date === b.dateKey ? ' · today' : ''}</span>
              </div>
            </div>
          )
        })}
        {fridays[0] && <p className={styles.note}>Friday plan: {String(fridays[0].data.plan ?? '')}</p>}
      </section>

      <section className={styles.card}>
        <p className={styles.cardTitle}>This week’s balance</p>
        {HOBBY_CATEGORIES.map(h => {
          const hit = hobby(h.id)
          return (
            <div key={h.id} className={styles.check} onClick={() => hit
              ? send({ action: 'item_delete', id: hit.id })
              : send({ action: 'item_add', kind: 'hobby', data: { category: h.id } })}>
              <div className={`${styles.box} ${hit ? styles.boxOn : ''}`}>{hit ? '✓' : ''}</div>
              <div className={`${styles.checkText} ${hit ? styles.checkDone : ''}`}>{h.label}<span className={styles.time}>{h.ideas}</span></div>
            </div>
          )
        })}
        <p className={styles.note}>Tap to check off when you’ve done it. Tap again to undo.</p>
      </section>

      <section className={styles.card}>
        <p className={styles.cardTitle}>Sunday reset · {resetDone}/{SUNDAY_RESET.length}{isSunday ? ' · today' : ''}</p>
        {SUNDAY_RESET.map((t, i) => {
          const it = reset(i)
          return (
            <div key={t} className={styles.check} onClick={() => it
              ? send({ action: 'item_delete', id: it.id })
              : send({ action: 'item_add', kind: 'reset', data: { week: b.week.start, idx: i } })}>
              <div className={`${styles.box} ${it ? styles.boxOn : ''}`}>{it ? '✓' : ''}</div>
              <div className={`${styles.checkText} ${it ? styles.checkDone : ''}`}>{t}</div>
            </div>
          )
        })}
        <p className={styles.note}>Check things off any day this week. It starts fresh each week.</p>
      </section>

      <section className={styles.card}>
        <p className={styles.cardTitle}>Weekly reflection</p>
        {WEEKLY_REFLECTION.map((q, i) => (
          <div key={q} style={{ marginTop: i ? 10 : 0 }}>
            <span className={styles.time}>{q}</span>
            <input className={styles.input} value={ans[i]} onChange={e => { const n = [...ans]; n[i] = e.target.value; setAns(n) }}
              onBlur={() => send({ action: 'note', key: `refl_${i}`, value: ans[i] }, b.week.end)} />
          </div>
        ))}
      </section>
    </>
  )
}

// ---------------------------------------------------------------- CLOSET

const CLOSET_FLOW: { id: string; label: string }[] = [
  { id: 'keep', label: 'Keep' }, { id: 'sell', label: 'Sell' }, { id: 'donate', label: 'Donate' }, { id: 'maybe', label: 'Maybe' },
]

// Shrinks a camera/library photo to a small JPEG so it stays light to store and load.
async function shrinkImage(file: File, max = 720, quality = 0.72): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = () => rej(new Error('image'))
      i.src = url
    })
    const scale = Math.min(1, max / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * scale)
    c.height = Math.round(img.height * scale)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', quality)
  } finally { URL.revokeObjectURL(url) }
}

function Closet({ b, send }: { b: Bundle; send: Send }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState<Record<string, string>>({})
  const items = b.items.filter(i => i.kind === 'closet')
  const [busy, setBusy] = useState(false)
  const [photoMsg, setPhotoMsg] = useState('')
  const addPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setBusy(true); setPhotoMsg('')
    let ok = 0
    for (const f of Array.from(files).slice(0, 12)) {
      try {
        const photo = await shrinkImage(f)
        const r = await fetch('/api/thirty', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'item_add', kind: 'closet', status: 'maybe', data: { name: name.trim() || 'New piece', photo } }),
        })
        if (r.ok) ok++
      } catch { /* skip this one */ }
    }
    setName('')
    setBusy(false)
    setPhotoMsg(ok ? `Added ${ok} piece${ok === 1 ? '' : 's'} with photos.` : 'Could not add that photo. Try again.')
    await send({ action: 'noop' }).catch(() => {})
  }
  const addPhotoTo = async (id: string, file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      const photo = await shrinkImage(file)
      await send({ action: 'item_photo', id, photo })
    } finally { setBusy(false) }
  }
  const add = () => {
    if (!name.trim()) return
    send({ action: 'item_add', kind: 'closet', status: 'maybe', data: { name: name.trim() } })
    setName('')
  }
  return (
    <>
      <section className={styles.card}>
        <p className={styles.cardTitle}>Closet reset</p>
        <div className={styles.row}>
          {[['Sorted', b.closet.sorted], ['Photographed', b.closet.photographed], ['Listed', b.closet.listed], ['Sold', b.closet.sold]].map(([l, v]) => (
            <div key={String(l)} className={styles.stat}><div className={styles.statNum}>{v}</div><div className={styles.statLbl}>{l}</div></div>
          ))}
        </div>
        <p className={styles.sub} style={{ marginTop: 12 }}>Money made: <b>{usd(b.closet.earned)}</b></p>
        <p className={styles.note}>{CLOSET_QUESTIONS.join(' ')}</p>
      </section>
      <section className={styles.card}>
        <p className={styles.cardTitle}>Add a piece</p>
        <div className={styles.row}>
          <input className={styles.input} value={name} onChange={e => setName(e.target.value)} placeholder="Black satin slip dress"
            onKeyDown={e => e.key === 'Enter' && add()} />
          <button className={styles.btn} onClick={add}>Add</button>
        </div>
        <div className={styles.rowWrap} style={{ marginTop: 12 }}>
          <label className={`${styles.btn} ${styles.btnQuiet}`} style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
            Take photo
            <input type="file" accept="image/*" capture="environment" hidden disabled={busy}
              onChange={e => { addPhotos(e.target.files); e.target.value = '' }} />
          </label>
          <label className={`${styles.btn} ${styles.btnQuiet}`} style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
            Upload photos
            <input type="file" accept="image/*" multiple hidden disabled={busy}
              onChange={e => { addPhotos(e.target.files); e.target.value = '' }} />
          </label>
        </div>
        <p className={styles.note}>{busy ? 'Saving photos…' : photoMsg || 'Add a name first if you like, or just snap the photo. Pick several to add a batch.'}</p>
      </section>
      <section className={styles.card}>
        <p className={styles.cardTitle}>{items.length ? 'Your pieces' : 'Nothing sorted yet'}</p>
        {items.map(it => {
          const st = it.status ?? 'maybe'
          return (
            <div key={it.id} className={styles.item}>
              <div className={styles.row} style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                {it.data.hasPhoto === true && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/thirty/photo?id=${it.id}`} alt={String(it.data.name ?? 'Piece')}
                    style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 14, flex: 'none' }} />
                )}
                <b style={{ flex: 1 }}>{String(it.data.name ?? 'Piece')}</b><span className={styles.pill}>{st}{st === 'sold' && it.amount ? ` · ${usd(Number(it.amount))}` : ''}</span>
              </div>
              <div className={styles.rowWrap} style={{ marginTop: 8 }}>
                <label className={styles.tab} style={{ cursor: 'pointer' }}>
                  {it.data.hasPhoto === true ? 'New photo' : 'Add photo'}
                  <input type="file" accept="image/*" capture="environment" hidden
                    onChange={e => { addPhotoTo(it.id, e.target.files?.[0]); e.target.value = '' }} />
                </label>
                {CLOSET_FLOW.map(f => (
                  <button key={f.id} className={`${styles.tab} ${st === f.id ? styles.tabOn : ''}`}
                    onClick={() => send({ action: 'item_update', id: it.id, status: f.id })}>{f.label}</button>
                ))}
                {['sell', 'photographed', 'listed'].includes(st) && (
                  <button className={styles.tab} onClick={() => send({ action: 'item_update', id: it.id, status: st === 'sell' ? 'photographed' : st === 'photographed' ? 'listed' : 'sell' })}>
                    {st === 'sell' ? 'Mark photographed' : st === 'photographed' ? 'Mark listed' : 'Back to sell'}
                  </button>
                )}
              </div>
              {['listed', 'sold'].includes(st) && (
                <div className={styles.row} style={{ marginTop: 8 }}>
                  <input className={styles.input} inputMode="decimal" placeholder="Sold for $" value={price[it.id] ?? ''}
                    onChange={e => setPrice({ ...price, [it.id]: e.target.value })} />
                  <button className={styles.btn} onClick={() => {
                    const amt = Number(price[it.id])
                    if (Number.isFinite(amt) && amt >= 0) send({ action: 'item_update', id: it.id, status: 'sold', amount: amt })
                  }}>Sold</button>
                </div>
              )}
            </div>
          )
        })}
      </section>
    </>
  )
}

// ---------------------------------------------------------------- STYLE

function Style({ b, send }: { b: Bundle; send: Send }) {
  const rated = b.history.filter(h => (h.stats?.outfit_rating ?? 0) > 0)
  const avg = rated.length ? rated.reduce((s, h) => s + (h.stats?.outfit_rating ?? 0), 0) / rated.length : 0
  const again = b.history.filter(h => h.notes?.outfit_again === 'yes')
  const [word, setWord] = useState('')
  const [combo, setCombo] = useState('')
  const words = b.items.filter(i => i.kind === 'style_word')
  const combos = b.items.filter(i => i.kind === 'outfit_combo')
  return (
    <>
      <section className={styles.card}>
        <p className={styles.cardTitle}>Outfit data so far</p>
        <div className={styles.row}>
          <div className={styles.stat}><div className={styles.statNum}>{rated.length}</div><div className={styles.statLbl}>Rated</div></div>
          <div className={styles.stat}><div className={styles.statNum}>{rated.length ? avg.toFixed(1) : '—'}</div><div className={styles.statLbl}>Average</div></div>
          <div className={styles.stat}><div className={styles.statNum}>{again.length}</div><div className={styles.statLbl}>Wear again</div></div>
        </div>
        <p className={styles.note}>Aiming for: {STYLE_WORDS.join(' · ')}</p>
      </section>
      <section className={styles.card}>
        <p className={styles.cardTitle}>Favorite elements</p>
        {b.history.filter(h => h.notes?.outfit_fav).slice(-8).reverse().map(h => (
          <div key={h.date_key} className={styles.item}>{h.notes!.outfit_fav}<span className={styles.time}>{h.date_key} · {h.stats?.outfit_rating ?? '–'}/10</span></div>
        ))}
        {b.history.every(h => !h.notes?.outfit_fav) && <p className={styles.sub}>Log your outfit on Today and patterns show up here.</p>}
      </section>
      <section className={styles.card}>
        <p className={styles.cardTitle}>Strong combinations</p>
        <div className={styles.row}>
          <input className={styles.input} value={combo} onChange={e => setCombo(e.target.value)} placeholder="Cream knit + black trousers + gold hoops" />
          <button className={styles.btn} onClick={() => { if (combo.trim()) { send({ action: 'item_add', kind: 'outfit_combo', data: { text: combo.trim() } }); setCombo('') } }}>Save</button>
        </div>
        {combos.map(c => <DoneRow key={c.id} it={c} send={send}>{String(c.data.text)}</DoneRow>)}
      </section>
      <section className={styles.card}>
        <p className={styles.cardTitle}>Words for my evolving style</p>
        <div className={styles.row}>
          <input className={styles.input} value={word} onChange={e => setWord(e.target.value)} placeholder="One word" />
          <button className={styles.btn} onClick={() => { if (word.trim()) { send({ action: 'item_add', kind: 'style_word', data: { text: word.trim() } }); setWord('') } }}>Add</button>
        </div>
        <p className={styles.note}>{words.map(w => String(w.data.text)).join(' · ') || 'No words yet.'}</p>
      </section>
    </>
  )
}

// ---------------------------------------------------------------- CONTENT

function Content({ b, send }: { b: Bundle; send: Send }) {
  const p = b.progress
  const [idea, setIdea] = useState('')
  const ideas = b.items.filter(i => i.kind === 'content_idea')
  return (
    <>
      <section className={styles.card}>
        <p className={styles.cardTitle}>30-day content totals</p>
        <div className={styles.row}>
          {[['Captured', p.clips], ['Edited', p.edited], ['Posted', p.posted], ['Ideas', p.ideas]].map(([l, v]) => (
            <div key={String(l)} className={styles.stat}><div className={styles.statNum}>{v}</div><div className={styles.statLbl}>{l}</div></div>
          ))}
        </div>
        <p className={styles.note}>Capture often. Publish only what you love. One private win a day stays yours.</p>
      </section>
      <section className={styles.card}>
        <p className={styles.cardTitle}>Idea bank</p>
        <div className={styles.row}>
          <input className={styles.input} value={idea} onChange={e => setIdea(e.target.value)} placeholder="Hook, series, shot idea" />
          <button className={styles.btn} onClick={() => { if (idea.trim()) { send({ action: 'item_add', kind: 'content_idea', data: { text: idea.trim() } }); send({ action: 'stat', key: 'ideas', delta: 1 }); setIdea('') } }}>Save</button>
        </div>
        {ideas.map(i => <DoneRow key={i.id} it={i} send={send}>{String(i.data.text)}</DoneRow>)}
      </section>
    </>
  )
}

// ---------------------------------------------------------------- MONEY / CAMERA

function Money({ b, send }: { b: Bundle; send: Send }) {
  const [amt, setAmt] = useState('')
  const [fund, setFund] = useState<'upgrade' | 'camera'>('upgrade')
  const [target, setTarget] = useState(b.funds.cameraTarget ? String(b.funds.cameraTarget) : '')
  const [note, setNote] = useState('')
  const notes = b.items.filter(i => i.kind === 'camera_note')
  const pct = b.funds.cameraTarget ? Math.min(100, (b.funds.camera / b.funds.cameraTarget) * 100) : 0
  return (
    <>
      <section className={styles.card}>
        <p className={styles.cardTitle}>Zoe upgrade fund</p>
        <p className={styles.big} style={{ margin: 0 }}>{usd(b.funds.upgrade)}</p>
        <p className={styles.note}>Earned from selling: {usd(b.closet.earned)}. No impulse buys: wait 48 hours on anything new.</p>
      </section>
      <section className={styles.card}>
        <p className={styles.cardTitle}>Camera fund</p>
        <p className={styles.big} style={{ margin: 0 }}>{usd(b.funds.camera)}{b.funds.cameraTarget ? ` / ${usd(b.funds.cameraTarget)}` : ''}</p>
        {b.funds.cameraTarget ? <div className={styles.bar}><div className={styles.barFill} style={{ width: `${pct}%` }} /></div> : null}
        <div className={styles.row} style={{ marginTop: 10 }}>
          <input className={styles.input} inputMode="decimal" value={target} onChange={e => setTarget(e.target.value)} placeholder="Target $ (set after research)" />
          <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => send({ action: 'camera_target', value: Number(target) })}>Set</button>
        </div>
      </section>
      <section className={styles.card}>
        <p className={styles.cardTitle}>Add to a fund</p>
        <div className={styles.seg} style={{ marginBottom: 10 }}>
          <button className={`${styles.segBtn} ${fund === 'upgrade' ? styles.segOn : ''}`} onClick={() => setFund('upgrade')}>Upgrade</button>
          <button className={`${styles.segBtn} ${fund === 'camera' ? styles.segOn : ''}`} onClick={() => setFund('camera')}>Camera</button>
        </div>
        <div className={styles.row}>
          <input className={styles.input} inputMode="decimal" value={amt} onChange={e => setAmt(e.target.value)} placeholder="$ amount" />
          <button className={styles.btn} onClick={() => {
            const n = Number(amt)
            if (Number.isFinite(n) && n > 0) { send({ action: 'item_add', kind: 'fund_entry', amount: n, data: { fund } }); setAmt('') }
          }}>Add</button>
        </div>
      </section>
      <section className={styles.card}>
        <p className={styles.cardTitle}>Camera research notes</p>
        <p className={styles.sub}>What did you shoot, and where did your phone limit you? Low light, zoom, depth, audio, stabilization.</p>
        <div className={styles.row} style={{ marginTop: 10 }}>
          <input className={styles.input} value={note} onChange={e => setNote(e.target.value)} placeholder="Night shots came out grainy" />
          <button className={styles.btn} onClick={() => { if (note.trim()) { send({ action: 'item_add', kind: 'camera_note', data: { text: note.trim() } }); setNote('') } }}>Save</button>
        </div>
        {notes.map(n => <DoneRow key={n.id} it={n} send={send}>{String(n.data.text)}</DoneRow>)}
      </section>
    </>
  )
}

// ---------------------------------------------------------------- HOME

const ZONE_TASKS = ['Declutter', 'Clear and clean surfaces', 'Put everything back where it belongs', 'Fresh linens or towels', 'Scent and lighting', 'Release anything that feels like old energy']

function Home({ b, toggle, send }: { b: Bundle; toggle: Toggle; send: Send }) {
  const [t, setT] = useState('')
  const [newTask, setNewTask] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const seeded = useRef<number | null>(null)
  const logs = b.items.filter(i => i.kind === 'home')
  const tasks = b.items.filter(i => i.kind === 'home_task' && i.data.week === b.home.week && typeof i.data.text === 'string')
  const on = !!b.day.checks.home_reset

  // First visit each week: drop in the starter list once, then it is hers to edit.
  useEffect(() => {
    if (tasks.length > 0 || seeded.current === b.home.week) return
    seeded.current = b.home.week
    ;(async () => {
      for (const text of ZONE_TASKS) {
        await fetch('/api/thirty', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'item_add', kind: 'home_task', data: { week: b.home.week, text, done: false } }),
        }).catch(() => {})
      }
      await send({ action: 'noop' })
    })()
  }, [tasks.length, b.home.week, send])

  const doneCount = tasks.filter(x => x.data.done === true).length
  return (
    <>
      <section className={styles.card}>
        <p className={styles.cardTitle}>Week {b.home.week} zone</p>
        <p className={styles.big} style={{ margin: 0 }}>{b.home.zone}</p>
        <p className={styles.sub}>{b.home.focus}</p>
      </section>
      <section className={styles.card}>
        <p className={styles.cardTitle}>{b.home.zone} checklist · {doneCount}/{tasks.length}</p>
        {tasks.map(it => {
          const done = it.data.done === true
          return (
            <div key={it.id} className={styles.check}>
              <div className={`${styles.box} ${done ? styles.boxOn : ''}`}
                onClick={() => send({ action: 'item_update', id: it.id, data: { done: !done } })}>{done ? '✓' : ''}</div>
              {editId === it.id ? (
                <input className={styles.input} autoFocus value={draft} onChange={e => setDraft(e.target.value)}
                  onBlur={() => { if (draft.trim()) send({ action: 'item_update', id: it.id, data: { text: draft.trim() } }); setEditId(null) }}
                  onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
              ) : (
                <div className={`${styles.checkText} ${done ? styles.checkDone : ''}`}
                  onClick={() => send({ action: 'item_update', id: it.id, data: { done: !done } })}>{String(it.data.text)}</div>
              )}
              <button className={styles.tab} style={{ minHeight: 36, padding: '4px 10px' }} onClick={() => { setDraft(String(it.data.text)); setEditId(it.id) }}>Edit</button>
              <button className={styles.tab} style={{ minHeight: 36, padding: '4px 10px' }} aria-label="Remove" onClick={() => send({ action: 'item_delete', id: it.id })}>✕</button>
            </div>
          )
        })}
        <div className={styles.row} style={{ marginTop: 10 }}>
          <input className={styles.input} value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Add something for this zone"
            onKeyDown={e => { if (e.key === 'Enter' && newTask.trim()) { send({ action: 'item_add', kind: 'home_task', data: { week: b.home.week, text: newTask.trim(), done: false } }); setNewTask('') } }} />
          <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => {
            if (newTask.trim()) { send({ action: 'item_add', kind: 'home_task', data: { week: b.home.week, text: newTask.trim(), done: false } }); setNewTask('') }
          }}>Add</button>
        </div>
      </section>
      <section className={styles.card}>
        <p className={styles.cardTitle}>Daily 10–20 minute reset</p>
        <div className={styles.check} onClick={() => toggle('home_reset', !on)}>
          <div className={`${styles.box} ${on ? styles.boxOn : ''}`}>{on ? '✓' : ''}</div>
          <div className={`${styles.checkText} ${on ? styles.checkDone : ''}`}>Environment reset done</div>
        </div>
      </section>
      <section className={styles.card}>
        <p className={styles.cardTitle}>What I did</p>
        <div className={styles.row}>
          <input className={styles.input} value={t} onChange={e => setT(e.target.value)} placeholder="Cleared nightstand, new sheets" />
          <button className={styles.btn} onClick={() => { if (t.trim()) { send({ action: 'item_add', kind: 'home', data: { text: t.trim(), zone: b.home.zone } }); setT('') } }}>Log</button>
        </div>
        {logs.slice(0, 15).map(l => <DoneRow key={l.id} it={l} send={send}>{String(l.data.text)}<span className={styles.time}>{l.date_key} · {String(l.data.zone ?? '')}</span></DoneRow>)}
      </section>
    </>
  )
}

// ---------------------------------------------------------------- BRAND

function Brand({ b, send }: { b: Bundle; send: Send }) {
  const [kind, setKind] = useState(BRAND_IDEA_KINDS[0].id)
  const [text, setText] = useState('')
  const ideas = b.items.filter(i => i.kind === 'brand_idea')
  return (
    <>
      <section className={styles.card}>
        <p className={styles.cardTitle}>Clothing brand · discovery only</p>
        <p className={styles.sub}>No launching for 30 days. Collect, notice patterns, and decide on {b.reviewDate} whether it’s ready for development. Your daily outfit data feeds this.</p>
        <p className={styles.note}>{ideas.length} ideas saved.</p>
      </section>
      <section className={styles.card}>
        <p className={styles.cardTitle}>Add to the idea bank</p>
        <div className={styles.rowWrap} style={{ marginBottom: 10 }}>
          {BRAND_IDEA_KINDS.map(k => (
            <button key={k.id} className={`${styles.tab} ${kind === k.id ? styles.tabOn : ''}`} onClick={() => setKind(k.id)}>{k.label}</button>
          ))}
        </div>
        <div className={styles.row}>
          <input className={styles.input} value={text} onChange={e => setText(e.target.value)} placeholder="Idea" />
          <button className={styles.btn} onClick={() => { if (text.trim()) { send({ action: 'item_add', kind: 'brand_idea', data: { type: kind, text: text.trim() } }); setText('') } }}>Save</button>
        </div>
      </section>
      {BRAND_IDEA_KINDS.map(k => {
        const list = ideas.filter(i => i.data.type === k.id)
        if (!list.length) return null
        return (
          <section key={k.id} className={styles.card}>
            <p className={styles.cardTitle}>{k.label}</p>
            {list.map(i => (
              <div key={i.id} className={styles.row} style={{ justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}><DoneRow it={i} send={send}>{String(i.data.text)}</DoneRow></div>
                <button className={`${styles.tab}`} onClick={() => send({ action: 'item_delete', id: i.id })}>Remove</button>
              </div>
            ))}
          </section>
        )
      })}
    </>
  )
}

// ---------------------------------------------------------------- PROGRESS

function ProgressTab({ b }: { b: Bundle }) {
  const p = b.progress
  const n = Math.min(Math.max(b.dayNumber, 0), 30)
  const rows: [string, number][] = [
    ['Movement', p.movement], ['Getting ready', p.gettingReady], ['Outfit photos', p.outfitPhotos], ['Content capture', p.contentCapture],
    ['Creative activity', p.creative], ['Night prep', p.nightPrep], ['No-zero days', p.noZero],
  ]
  const start = b.history.length ? b.history[0].date_key : b.dateKey
  const byDate = new Map(b.history.map(h => [h.date_key, h]))
  const dayKey = (i: number) => {
    const [y, m, d] = '2026-10-13'.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d + i, 12)).toISOString().slice(0, 10)
  }
  void start
  return (
    <>
      <section className={styles.card}>
        <p className={styles.cardTitle}>Day {n} of 30</p>
        <div className={styles.dots}>
          {Array.from({ length: 30 }, (_, i) => {
            const k = dayKey(i)
            const h = byDate.get(k)
            const active = h && (Object.values(h.checks ?? {}).some(Boolean) || (h.stats?.clips ?? 0) > 0)
            return <div key={k} className={`${styles.dot} ${active ? styles.dotOn : ''} ${k === b.dateKey ? styles.dotNow : ''}`}>{i + 1}</div>
          })}
        </div>
        <p className={styles.note}>A quiet day still counts. Return at the next action.</p>
      </section>
      <section className={styles.card}>
        <p className={styles.cardTitle}>Progress</p>
        {rows.map(([l, v]) => (
          <div key={l}>
            <div className={styles.row} style={{ justifyContent: 'space-between' }}><span>{l}</span><span className={styles.small}>{v} / 30</span></div>
            <div className={styles.bar}><div className={styles.barFill} style={{ width: `${Math.min(100, (v / 30) * 100)}%` }} /></div>
          </div>
        ))}
      </section>
      {b.items.some(i => i.kind === 'mode_note') && (
        <section className={styles.card}>
          <p className={styles.cardTitle}>Notes you wrote</p>
          {b.items.filter(i => i.kind === 'mode_note').slice(0, 10).map(n => (
            <div key={n.id} className={styles.item}>
              <span className={styles.time}>{n.date_key} · {String(n.data.mode)}</span>
              <span style={{ whiteSpace: 'pre-wrap' }}>{String(n.data.text)}</span>
            </div>
          ))}
        </section>
      )}
      <section className={styles.card}>
        <p className={styles.cardTitle}>Totals</p>
        <div className={styles.row}>
          {[['Gym', p.gymSessions], ['Sorted', b.closet.sorted], ['Listed', b.closet.listed], ['Sold', b.closet.sold]].map(([l, v]) => (
            <div key={String(l)} className={styles.stat}><div className={styles.statNum}>{v}</div><div className={styles.statLbl}>{l}</div></div>
          ))}
        </div>
        <p className={styles.sub} style={{ marginTop: 12 }}>Earned {usd(b.closet.earned)} · Camera fund {usd(b.funds.camera)}</p>
        <p className={styles.sub}>Private wins: {p.privateWins}</p>
      </section>
    </>
  )
}
