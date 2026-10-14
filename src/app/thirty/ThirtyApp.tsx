'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  BRAND_IDEA_KINDS, CLOSET_QUESTIONS, CORE_PHRASE, HOBBY_CATEGORIES, NIGHT_ASKS, NIGHT_JOURNAL_PROMPTS,
  SPIRAL_QUESTIONS, SPIRAL_REMINDERS, STUCK_MESSAGES, STUCK_STEPS, STYLE_WORDS, SUNDAY_RESET, WEEKLY_REFLECTION,
  type Energy, type Mode, type Part, type PlanItem, type Progress,
} from '@/lib/luna/thirtyDay'
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

function partForHour(h: number): Part {
  return h < 9 ? 'morning' : h < 17 ? 'work' : h < 21 ? 'after' : 'night'
}
function easternHour(): number {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(new Date())) % 24
}
const usd = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`

export function ThirtyApp() {
  const [b, setB] = useState<Bundle | null>(null)
  const [tab, setTab] = useState<Tab>('today')
  const [err, setErr] = useState('')
  const [open, setOpen] = useState<Part>(partForHour(easternHour()))

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

      {tab === 'today' && <Today key={b.dateKey} b={b} open={open} setOpen={setOpen} toggle={toggle} skip={skip} send={send} />}
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

function Today({ b, open, setOpen, toggle, skip, send }: { b: Bundle; open: Part; setOpen: (p: Part) => void; toggle: Toggle; skip: (id: string, v: boolean) => void; send: Send }) {
  const [top, setTop] = useState<string[]>(() => [0, 1, 2].map(i => b.day.top3[i]?.text ?? ''))
  const [more, setMore] = useState(false)
  const [editingTop, setEditingTop] = useState(false)

  const saveTop = (list: string[], done?: boolean[]) =>
    send({ action: 'top3', value: list.map((text, i) => ({ text, done: done ? done[i] : !!b.day.top3[i]?.done })) })
  const labels = ['Work / money', 'Personal / life', 'Creative / growth']
  const hour = easternHour()
  const isNight = hour >= 20

  return (
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
            <p className={styles.next}>{b.next.label}</p>
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
            <button className={`${styles.tab}`} style={{ marginTop: 10 }} onClick={() => setEditingTop(true)}>Edit my top 3</button>
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
              <div key={l} style={{ marginTop: i ? 10 : 0 }}>
                <span className={styles.time}>{i + 1}. {l}</span>
                <input className={styles.input} value={top[i]} placeholder="What matters most here?"
                  onChange={e => { const n = [...top]; n[i] = e.target.value; setTop(n) }} />
              </div>
            ))}
            <button className={styles.btn} style={{ marginTop: 12 }} disabled={!top.some(t => t.trim())}
              onClick={async () => { await saveTop(top); setEditingTop(false) }}>Save my top 3</button>
            <p className={styles.note}>Plan it once. Then come back and check each one off as you finish.</p>
          </>
        )}
      </section>

      <section className={styles.card}>
        <p className={styles.cardTitle}>Plan the day, then check it off</p>
        <PlanList b={b} noteKey="plan_outfit" label="Outfit" placeholder="Cream knit, black trousers, gold hoops" send={send} />
        <PlanList b={b} noteKey="plan_content" label="Content to capture" placeholder="Coffee pour, outfit in the mirror, sunset" send={send} />
        <PlanList b={b} noteKey="plan_creative" label="Creative block" placeholder="45 minutes on the tattoo flash sheet" send={send} />
        <PlanList b={b} noteKey="plan_errands" label="Errands + life admin" placeholder="Return package, groceries" send={send} />
      </section>

      {b.fridayPrompt && <FridayAsk send={send} text={b.fridayPrompt} />}

      <section className={styles.card}>
        <p className={styles.cardTitle}>Gym</p>
        <p className={styles.sub}>Gym this morning?</p>
        <div className={styles.seg} style={{ marginTop: 8 }}>
          <button className={`${styles.segBtn} ${b.day.gymToday === true ? styles.segOn : ''}`} onClick={() => send({ action: 'gym', value: true })}>Yes</button>
          <button className={`${styles.segBtn} ${b.day.gymToday === false ? styles.segOn : ''}`} onClick={() => send({ action: 'gym', value: false })}>No</button>
        </div>
      </section>

      {(['morning', 'work', 'after', 'night'] as Part[]).map(part => {
        const list = b.plan[part]
        if (list.length === 0) return null
        const done = list.filter(i => b.day.checks[i.id]).length
        const isOpen = open === part
        return (
          <section key={part} className={styles.card}>
            <button className={styles.row} style={{ width: '100%', background: 'none', border: 0, padding: 0, cursor: 'pointer', justifyContent: 'space-between', color: 'inherit' }}
              onClick={() => setOpen(isOpen ? (part === 'morning' ? 'work' : 'morning') : part)}>
              <span className={styles.cardTitle} style={{ margin: 0 }}>{PART_LABEL[part]}</span>
              <span className={styles.small}>{done}/{list.length}</span>
            </button>
            {isOpen && (
              <div style={{ marginTop: 8 }}>
                {list.map(i => {
                  const on = !!b.day.checks[i.id]
                  const skipped = !!b.day.skips[i.id]
                  return (
                    <div key={i.id} className={styles.check} onClick={() => !skipped && toggle(i.id, !on)}>
                      <div className={`${styles.box} ${on ? styles.boxOn : ''}`}>{on ? '✓' : ''}</div>
                      <div className={`${styles.checkText} ${on || skipped ? styles.checkDone : ''}`}>
                        {i.time && <span className={styles.time}>{i.time}</span>}
                        {i.label}{i.core && <span className={styles.core}>core</span>}
                        {i.detail && <span className={styles.time} style={{ marginTop: 2 }}>{i.detail}</span>}
                        {i.skippable && (
                          <span className={styles.rowWrap} style={{ marginTop: 8 }} onClick={e => e.stopPropagation()}>
                            {skipped ? (
                              <>
                                <span className={styles.small}>Skipped tonight. That’s okay.</span>
                                <button className={styles.tab} onClick={() => skip(i.id, false)}>Undo</button>
                              </>
                            ) : (
                              <>
                                <button className={`${styles.tab} ${on ? styles.tabOn : ''}`} onClick={() => toggle(i.id, !on)}>Done</button>
                                <button className={styles.tab} onClick={() => skip(i.id, true)}>Not feeling it</button>
                              </>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}

      <section className={styles.card}>
        <p className={styles.cardTitle}>Tonight: {b.theme.block}</p>
        <p className={styles.detail}>DONE means: {b.theme.done}</p>
        {b.theme.options.length > 0 && <p className={styles.small}>{b.theme.options.join(' · ')}</p>}
      </section>

      <Quick b={b} send={send} />

      {isNight || more ? <NightWrap b={b} send={send} /> : (
        <button className={`${styles.btn} ${styles.btnQuiet}`} style={{ marginTop: 14, width: '100%' }} onClick={() => setMore(true)}>
          Plan tomorrow + night journal
        </button>
      )}

      <Unusual b={b} send={send} />
    </>
  )
}

function PlanList({ b, noteKey, label, placeholder, send, date }: {
  b: Bundle; noteKey: string; label: string; placeholder: string; send: Send; date?: string
}) {
  type Row = { t: string; d: boolean }
  const parse = (raw?: string): Row[] => { try { const v = JSON.parse(raw ?? '[]'); return Array.isArray(v) ? v : [] } catch { return [] } }
  const [rows, setRows] = useState<Row[]>(() => parse(b.day.notes[noteKey]))
  const [text, setText] = useState('')
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
          <div className={`${styles.checkText} ${r.d ? styles.checkDone : ''}`} onClick={() => save(rows.map((x, k) => (k === i ? { ...x, d: !x.d } : x)))}>{r.t}</div>
          <button className={styles.tab} style={{ minHeight: 36, padding: '4px 10px' }} aria-label="Remove" onClick={() => save(rows.filter((_, k) => k !== i))}>✕</button>
        </div>
      ))}
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

function Quick({ b, send }: { b: Bundle; send: Send }) {
  const s = b.day.stats
  const [fav, setFav] = useState(b.day.notes.outfit_fav ?? '')
  const [wrong, setWrong] = useState(b.day.notes.outfit_wrong ?? '')
  const [win, setWin] = useState(b.day.notes.private_win ?? '')
  const rating = s.outfit_rating ?? 0
  return (
    <>
      <section className={styles.card}>
        <p className={styles.cardTitle}>Reflect: content today</p>
        <div className={styles.grid2}>
          <Stepper label="Clips" value={s.clips ?? 0} onChange={n => send({ action: 'stat', key: 'clips', set: n })} />
          <Stepper label="Edited" value={s.edited ?? 0} onChange={n => send({ action: 'stat', key: 'edited', set: n })} />
          <Stepper label="Posted" value={s.posted ?? 0} onChange={n => send({ action: 'stat', key: 'posted', set: n })} />
          <Stepper label="Ideas" value={s.ideas ?? 0} onChange={n => send({ action: 'stat', key: 'ideas', set: n })} />
        </div>
        <p className={styles.note}>Capture is not edit is not post. You do not have to publish everything.</p>
      </section>

      <section className={styles.card}>
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
      </section>

      <section className={styles.card}>
        <p className={styles.cardTitle}>One private win</p>
        <input className={styles.input} value={win} onChange={e => setWin(e.target.value)}
          onBlur={() => win.trim() && send({ action: 'note', key: 'private_win', value: win.trim() })}
          placeholder="Something only you will know" />
      </section>
    </>
  )
}

function NightWrap({ b, send }: { b: Bundle; send: Send }) {
  const tomorrow = useMemo(() => {
    const [y, m, d] = b.dateKey.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d + 1, 12)).toISOString().slice(0, 10)
  }, [b.dateKey])
  const [t, setT] = useState(['', '', ''])
  const [first, setFirst] = useState(b.day.notes.tomorrow_first_priority ?? '')
  const [ans, setAns] = useState<string[]>(NIGHT_JOURNAL_PROMPTS.map((_, i) => b.day.notes[`journal_${i}`] ?? ''))
  const [eod, setEod] = useState(b.day.notes.eod_summary ?? '')
  const [tb, setTb] = useState<Bundle | null>(null)
  useEffect(() => {
    let live = true
    fetch(`/api/thirty?date=${tomorrow}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (live && d && !d.setupNeeded) setTb(d) })
      .catch(() => {})
    return () => { live = false }
  }, [tomorrow])
  return (
    <>
      <section className={styles.card}>
        <p className={styles.cardTitle}>Plan tomorrow, then check it off tomorrow</p>
        {tb ? (
          <>
            <PlanList b={tb} date={tomorrow} noteKey="plan_outfit" label="Outfit" placeholder="What are you wearing?" send={send} />
            <PlanList b={tb} date={tomorrow} noteKey="plan_content" label="Content to capture" placeholder="Shots you want tomorrow" send={send} />
            <PlanList b={tb} date={tomorrow} noteKey="plan_creative" label="Creative block" placeholder="What are you making?" send={send} />
            <PlanList b={tb} date={tomorrow} noteKey="plan_errands" label="Errands + life admin" placeholder="Anything to handle" send={send} />
          </>
        ) : <p className={styles.sub}>Loading tomorrow…</p>}
      </section>
      <section className={styles.card}>
        <p className={styles.cardTitle}>Prepare tomorrow</p>
        <p className={styles.sub}>Gym tomorrow morning?</p>
        <div className={styles.seg} style={{ margin: '8px 0 12px' }}>
          <button className={styles.segBtn} onClick={() => send({ action: 'gym', value: true }, tomorrow)}>Yes</button>
          <button className={styles.segBtn} onClick={() => send({ action: 'gym', value: false }, tomorrow)}>No</button>
        </div>
        <span className={styles.time}>Tomorrow’s first work priority</span>
        <input className={styles.input} value={first} onChange={e => setFirst(e.target.value)}
          onBlur={() => send({ action: 'note', key: 'tomorrow_first_priority', value: first })} placeholder="The first thing at 9" />
        <span className={styles.time} style={{ marginTop: 12 }}>Tomorrow’s top 3</span>
        {t.map((v, i) => (
          <input key={i} className={styles.input} style={{ marginTop: 6 }} value={v} placeholder={['Work / money', 'Personal / life', 'Creative / growth'][i]}
            onChange={e => { const n = [...t]; n[i] = e.target.value; setT(n) }}
            onBlur={() => send({ action: 'top3', value: t.map(text => ({ text })) }, tomorrow)} />
        ))}
        <p className={styles.note}>Also settle: {NIGHT_ASKS.slice(1).join(' · ')}</p>
      </section>
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

// ---------------------------------------------------------------- WEEK

function Week({ b, toggle, send }: { b: Bundle; toggle: Toggle; send: Send }) {
  const isSunday = new Date(b.dateKey + 'T12:00:00Z').getUTCDay() === 0
  const [ans, setAns] = useState<string[]>(WEEKLY_REFLECTION.map((_, i) => b.day.notes[`refl_${i}`] ?? ''))
  const week = [
    ['Monday', 'Create', 'Artist Zoe'], ['Tuesday', 'Closet + Money', 'Style / Sell / Finances'], ['Wednesday', 'Content + Brand', 'Content Zoe'],
    ['Thursday', 'Body + Beauty', 'Body / Beauty Zoe'], ['Friday', 'Social + Fun', 'Life Zoe'], ['Saturday', 'Explore + Create', 'Explore Zoe'], ['Sunday', 'Full Reset', 'Reset'],
  ]
  const fridays = b.items.filter(i => i.kind === 'social' && i.data.friday === true)
  return (
    <>
      <section className={styles.card}>
        <p className={styles.cardTitle}>Weekly rotation</p>
        {week.map(([d, n, blk]) => (
          <div key={d} className={styles.item}><b>{d}</b> · {n}<span className={styles.time}>{blk}</span></div>
        ))}
        {fridays[0] && <p className={styles.note}>Friday plan: {String(fridays[0].data.plan ?? '')}</p>}
      </section>

      <section className={styles.card}>
        <p className={styles.cardTitle}>This week’s balance</p>
        {HOBBY_CATEGORIES.map(h => (
          <div key={h.id} className={styles.check} onClick={() => {
            if (!b.weekHits[h.id]) send({ action: 'item_add', kind: 'hobby', data: { category: h.id } })
          }}>
            <div className={`${styles.box} ${b.weekHits[h.id] ? styles.boxOn : ''}`}>{b.weekHits[h.id] ? '✓' : ''}</div>
            <div className={styles.checkText}>{h.label}<span className={styles.time}>{h.ideas}</span></div>
          </div>
        ))}
        <p className={styles.note}>Tap a category when you’ve done it this week.</p>
      </section>

      <section className={styles.card}>
        <p className={styles.cardTitle}>Sunday reset{isSunday ? ' · today' : ''}</p>
        {SUNDAY_RESET.map((t, i) => {
          const id = `reset_${i}`
          const on = !!b.day.checks[id]
          return (
            <div key={id} className={styles.check} onClick={() => isSunday && toggle(id, !on)} style={{ opacity: isSunday ? 1 : 0.6 }}>
              <div className={`${styles.box} ${on ? styles.boxOn : ''}`}>{on ? '✓' : ''}</div>
              <div className={`${styles.checkText} ${on ? styles.checkDone : ''}`}>{t}</div>
            </div>
          )
        })}
        {!isSunday && <p className={styles.note}>This checklist unlocks on Sunday.</p>}
      </section>

      {isSunday && (
        <section className={styles.card}>
          <p className={styles.cardTitle}>Weekly reflection</p>
          {WEEKLY_REFLECTION.map((q, i) => (
            <div key={q} style={{ marginTop: i ? 10 : 0 }}>
              <span className={styles.time}>{q}</span>
              <input className={styles.input} value={ans[i]} onChange={e => { const n = [...ans]; n[i] = e.target.value; setAns(n) }}
                onBlur={() => send({ action: 'note', key: `refl_${i}`, value: ans[i] })} />
            </div>
          ))}
        </section>
      )}
    </>
  )
}

// ---------------------------------------------------------------- CLOSET

const CLOSET_FLOW: { id: string; label: string }[] = [
  { id: 'keep', label: 'Keep' }, { id: 'sell', label: 'Sell' }, { id: 'donate', label: 'Donate' }, { id: 'maybe', label: 'Maybe' },
]

function Closet({ b, send }: { b: Bundle; send: Send }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState<Record<string, string>>({})
  const items = b.items.filter(i => i.kind === 'closet')
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
      </section>
      <section className={styles.card}>
        <p className={styles.cardTitle}>{items.length ? 'Your pieces' : 'Nothing sorted yet'}</p>
        {items.map(it => {
          const st = it.status ?? 'maybe'
          return (
            <div key={it.id} className={styles.item}>
              <div className={styles.row} style={{ justifyContent: 'space-between' }}>
                <b>{String(it.data.name ?? 'Piece')}</b><span className={styles.pill}>{st}{st === 'sold' && it.amount ? ` · ${usd(Number(it.amount))}` : ''}</span>
              </div>
              <div className={styles.rowWrap} style={{ marginTop: 8 }}>
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
        {combos.map(c => <div key={c.id} className={styles.item}>{String(c.data.text)}</div>)}
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
        {ideas.map(i => <div key={i.id} className={styles.item}>{String(i.data.text)}</div>)}
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
        {notes.map(n => <div key={n.id} className={styles.item}>{String(n.data.text)}</div>)}
      </section>
    </>
  )
}

// ---------------------------------------------------------------- HOME

function Home({ b, toggle, send }: { b: Bundle; toggle: Toggle; send: Send }) {
  const [t, setT] = useState('')
  const logs = b.items.filter(i => i.kind === 'home')
  const on = !!b.day.checks.home_reset
  return (
    <>
      <section className={styles.card}>
        <p className={styles.cardTitle}>Week {b.home.week} zone</p>
        <p className={styles.big} style={{ margin: 0 }}>{b.home.zone}</p>
        <p className={styles.sub}>{b.home.focus}</p>
        <p className={styles.note}>Declutter · clean surfaces · fresh sheets · clothes put away · good scent · good lighting · release anything that feels like old energy.</p>
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
        {logs.slice(0, 15).map(l => <div key={l.id} className={styles.item}>{String(l.data.text)}<span className={styles.time}>{l.date_key} · {String(l.data.zone ?? '')}</span></div>)}
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
              <div key={i.id} className={styles.item}>
                <div className={styles.row} style={{ justifyContent: 'space-between' }}>
                  <span>{String(i.data.text)}</span>
                  <button className={`${styles.tab}`} onClick={() => send({ action: 'item_delete', id: i.id })}>Remove</button>
                </div>
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
