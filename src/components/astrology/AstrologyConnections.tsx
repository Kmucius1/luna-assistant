'use client'

import { useEffect, useState } from 'react'
import { Plus, ChevronLeft } from 'lucide-react'

import { getSavedPeople, addSavedPerson, updateSavedPerson, type SavedPerson } from '@/lib/luna/savedPeople'
import { BIRTH_ZONES } from '@/lib/luna/birthTime'
import { plainAspectPhrase } from '@/lib/astrology'
import { AstrologyHero } from './AstrologyHero'
import styles from './AstrologyConnections.module.css'

const RELATIONSHIPS: SavedPerson['relationship'][] = ['Romantic', 'Friendship', 'Family', 'Business partner', 'Creative collaborator', 'Parent and child']

interface SynastryResult {
  categories: { emotionalConnection: number; communication: number; attraction: number; trustAndSupport: number }
  aspects: Array<{ a: string; b: string; type: string; orb: number; interpretation: string }>
  note: string
}

interface DayReading {
  day: string
  verdict: { label: string; key: string }
  ratings: {
    communication: { level: string; why: string[] }
    closeness: { level: string; why: string[] }
    space: { level: string; needsSpace: boolean; why: string[] }
  }
  moonUncertain: boolean
  mercuryRetrograde: boolean
  bestDay?: { day: string; label: string }
  connections: { text: string; strength: string }[]
  reading: {
    best_move?: { decision: string; headline: string; when: string; how: string }
    feeling_today?: string; feeling_clues?: string[]
    exact_words?: { situation: string; say: string }[]
    healthy_outcome?: string; deeper_talk?: string
    summary?: string; communication?: string; closeness?: string; space?: string; how_they_may_feel?: string
    how_to_approach?: string[]; what_to_say?: string[]; avoid?: string[]; if_it_goes_sideways?: string
  }
}

interface OutlookDay { iso: string; label: string; verdict: string; score: number; reasons: string[]; cautions: string[]; topSky: string[]; mercuryRetrograde: boolean }
interface Outlook {
  closer: OutlookDay[]; careful: OutlookDay[]
  lookFor: { closer: string[]; careful: string[]; always: string[] }
  moonUncertain: boolean; note: string
}

const LEVEL_LABEL: Record<string, string> = { great: 'Great', good: 'Good', neutral: 'Neutral', careful: 'Careful' }

function dayChips(): { iso: string; label: string }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i)
    return {
      iso: new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d),
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(d),
    }
  })
}

const CATEGORY_LABELS: Record<keyof SynastryResult['categories'], string> = {
  emotionalConnection: 'Emotional Connection',
  communication: 'Communication',
  attraction: 'Attraction',
  trustAndSupport: 'Trust & Support',
}

export function AstrologyConnections() {
  const [people, setPeople] = useState<SavedPerson[]>([])
  const [mode, setMode] = useState<'list' | 'add' | 'view'>('list')
  const [activePerson, setActivePerson] = useState<SavedPerson | null>(null)
  const [synastry, setSynastry] = useState<SynastryResult | null>(null)
  const [dayIso, setDayIso] = useState<string>(dayChips()[0].iso)
  const [dayReading, setDayReading] = useState<DayReading | null>(null)
  const [dayState, setDayState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [outlook, setOutlook] = useState<Outlook | null>(null)
  const [form, setForm] = useState({ name: '', relationship: 'Romantic' as SavedPerson['relationship'], birthDate: '', birthTime: '', birthLocation: '', birthTimezone: 'America/New_York', unknownTime: false })

  useEffect(() => { setPeople(getSavedPeople()) }, [])

  function save() {
    if (!form.name.trim() || !form.birthDate) return
    addSavedPerson({
      name: form.name.trim(),
      relationship: form.relationship,
      birthDate: form.birthDate,
      birthTime: form.unknownTime ? undefined : form.birthTime,
      birthLocation: form.birthLocation.trim() || undefined,
      birthTimezone: form.birthTimezone,
      timeAccuracy: form.unknownTime ? 'unknown' : form.birthTime ? 'exact' : 'unknown',
    })
    setPeople(getSavedPeople())
    setForm({ name: '', relationship: 'Romantic', birthDate: '', birthTime: '', birthLocation: '', birthTimezone: 'America/New_York', unknownTime: false })
    setMode('list')
  }

  async function loadDay(person: SavedPerson, iso: string, refresh = false) {
    setDayIso(iso)
    setDayReading(null)
    setDayState('loading')
    try {
      const res = await fetch('/api/astrology/connection-day', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: person.name, relationship: person.relationship, birthDate: person.birthDate, birthTime: person.birthTime, birthTimezone: person.birthTimezone, day: iso, refresh }),
      })
      if (!res.ok) throw new Error()
      setDayReading(await res.json())
      setDayState('idle')
    } catch { setDayState('error') }
  }

  async function openPerson(person: SavedPerson) {
    setActivePerson(person)
    setMode('view')
    setSynastry(null)
    setOutlook(null)
    fetch('/api/astrology/connection-outlook', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: person.name, birthDate: person.birthDate, birthTime: person.birthTime, birthTimezone: person.birthTimezone, days: 30 }),
    }).then(r => (r.ok ? r.json() : null)).then(d => { if (d) setOutlook(d) }).catch(() => {})
    loadDay(person, dayChips()[0].iso)
    try {
      const res = await fetch('/api/astrology/synastry', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ birthDate: person.birthDate, birthTime: person.birthTime, birthTimezone: person.birthTimezone }),
      })
      setSynastry(await res.json())
    } catch { setSynastry(null) }
  }

  if (mode === 'add') {
    return (
      <>
        <button type="button" onClick={() => setMode('list')} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', fontSize: 12, color: 'var(--astro-muted)', padding: 0, marginBottom: 4 }}><ChevronLeft size={14} /> Back</button>
        <div className={styles.form}>
          <label>Name</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Their name" />
          <label>Relationship</label>
          <select value={form.relationship} onChange={e => setForm(f => ({ ...f, relationship: e.target.value as SavedPerson['relationship'] }))}>
            {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <label>Birth Date</label>
          <input type="date" value={form.birthDate} onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, textTransform: 'none', fontWeight: 500 }}>
            <input type="checkbox" style={{ width: 'auto', minHeight: 'auto' }} checked={form.unknownTime} onChange={e => setForm(f => ({ ...f, unknownTime: e.target.checked }))} />
            I don&apos;t know their exact birth time
          </label>
          {!form.unknownTime && (<><label>Birth Time</label><input type="time" value={form.birthTime} onChange={e => setForm(f => ({ ...f, birthTime: e.target.value }))} /></>)}
          {!form.unknownTime && (
            <>
              <label>Time zone of the birth place</label>
              <select value={form.birthTimezone} onChange={e => setForm(f => ({ ...f, birthTimezone: e.target.value }))}>
                {BIRTH_ZONES.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
              </select>
            </>
          )}
          <label>Birth City (optional)</label>
          <input value={form.birthLocation} onChange={e => setForm(f => ({ ...f, birthLocation: e.target.value }))} placeholder="City, Country" />
          <button type="button" onClick={save} disabled={!form.name.trim() || !form.birthDate} className={styles.saveButton}>Save Person</button>
        </div>
      </>
    )
  }

  if (mode === 'view' && activePerson) {
    return (
      <>
        <button type="button" onClick={() => setMode('list')} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', fontSize: 12, color: 'var(--astro-muted)', padding: 0, marginBottom: 4 }}><ChevronLeft size={14} /> Back</button>
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <div className={styles.avatar} style={{ margin: '0 auto 8px', width: 52, height: 52, fontSize: 18 }}>{activePerson.name[0]}</div>
          <strong style={{ fontSize: 15, color: 'var(--astro-text)' }}>{activePerson.name}</strong>
          <p style={{ fontSize: 11.5, color: 'var(--astro-muted)', margin: '2px 0 0' }}>{activePerson.relationship} · Born {activePerson.birthDate}{activePerson.birthTime ? ` at ${activePerson.birthTime}` : ' (time unknown)'}</p>
          {activePerson.birthTime && (
            <label style={{ display: 'block', fontSize: 11.5, color: 'var(--astro-muted)', marginTop: 6 }}>
              Birth time zone:{' '}
              <select value={activePerson.birthTimezone ?? 'America/New_York'}
                onChange={e => {
                  const tz = e.target.value
                  updateSavedPerson(activePerson.id, { birthTimezone: tz })
                  const next = { ...activePerson, birthTimezone: tz }
                  setActivePerson(next)
                  setPeople(getSavedPeople())
                  openPerson(next)
                }}>
                {BIRTH_ZONES.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
              </select>
            </label>
          )}
        </div>

        {outlook && (
          <div className={styles.dayCard}>
            <p className={styles.dayTitle}>The next 30 days with {activePerson.name}</p>
            <p className={styles.dayHead} style={{ marginTop: 0 }}>Days the sky favors closeness and easy talk</p>
            {outlook.closer.length === 0 && <p className={styles.dayBody}>No standout days in the next 30. That is honest information too: steady, ordinary days are the base.</p>}
            {outlook.closer.map(d => (
              <button key={d.iso} type="button" className={styles.outlookRow} onClick={() => loadDay(activePerson, d.iso)}>
                <strong>{d.label}</strong>
                <span>{d.verdict}</span>
                {d.reasons[0] && <span className={styles.outlookWhy}>{d.reasons[0]}</span>}
              </button>
            ))}

            <p className={styles.dayHead}>Days to go gently</p>
            {outlook.careful.length === 0 && <p className={styles.dayBody}>Nothing especially tense is showing in the next 30 days.</p>}
            {outlook.careful.map(d => (
              <button key={d.iso} type="button" className={styles.outlookRow} onClick={() => loadDay(activePerson, d.iso)}>
                <strong>{d.label}</strong>
                <span>{d.verdict}{d.mercuryRetrograde ? ' · Mercury moving backward' : ''}</span>
                {(d.cautions[0] || d.topSky[0]) && <span className={styles.outlookWhy}>{d.cautions[0] ?? d.topSky[0]}</span>}
              </button>
            ))}

            <p className={styles.dayHead}>What to look out for on the good days</p>
            {outlook.lookFor.closer.map((x, i) => <p key={i} className={styles.dayBody}>• {x}</p>)}
            <p className={styles.dayHead}>What to look out for on the careful days</p>
            {outlook.lookFor.careful.map((x, i) => <p key={i} className={styles.dayBody}>• {x}</p>)}
            <p className={styles.dayHead}>Always worth watching</p>
            {outlook.lookFor.always.map((x, i) => <p key={i} className={styles.dayBody}>• {x}</p>)}
            <p className={styles.dayNote}>{outlook.note}{outlook.moonUncertain ? ` ${activePerson.name}’s Moon may be off without a confirmed birth time, so closeness days may shift slightly.` : ''}</p>
          </div>
        )}

        <div className={styles.dayCard}>
          <p className={styles.dayTitle}>How to navigate {activePerson.name} on…</p>
          <div className={styles.dayChips}>
            {dayChips().map(c => (
              <button key={c.iso} type="button" className={`${styles.dayChip} ${dayIso === c.iso ? styles.dayChipOn : ''}`}
                onClick={() => loadDay(activePerson, c.iso)}>{c.label}</button>
            ))}
          </div>

          {dayState === 'loading' && <p className={styles.dayNote}>Reading the sky for {activePerson.name} on that day…</p>}
          {dayState === 'error' && (
            <p className={styles.dayNote}>Couldn’t load this day. <button type="button" className={styles.dayRetry} onClick={() => loadDay(activePerson, dayIso, true)}>Try again</button></p>
          )}

          {dayReading && (
            <>
              <p className={styles.dayVerdict}>{dayReading.verdict.label}</p>
              {dayReading.reading.best_move && (
                <div className={styles.bestMove}>
                  <p className={styles.dayHead} style={{ marginTop: 0 }}>Best move today</p>
                  <p className={styles.dayBody}><strong>{dayReading.reading.best_move.headline}</strong></p>
                  <p className={styles.dayBody}><strong>When:</strong> {dayReading.reading.best_move.when}</p>
                  <p className={styles.dayBody}><strong>How:</strong> {dayReading.reading.best_move.how}</p>
                </div>
              )}
              <div className={styles.dayRatings}>
                <div><span>Communicate</span><strong>{LEVEL_LABEL[dayReading.ratings.communication.level]}</strong></div>
                <div><span>Be close</span><strong>{LEVEL_LABEL[dayReading.ratings.closeness.level]}</strong></div>
                <div><span>Space</span><strong>{dayReading.ratings.space.needsSpace ? 'Give some' : 'Not needed'}</strong></div>
              </div>

              {dayReading.reading.summary && <p className={styles.dayBody}><strong>{dayReading.reading.summary}</strong></p>}

              {dayReading.reading.feeling_today && (
                <>
                  <p className={styles.dayHead}>What {activePerson.name} is most likely feeling</p>
                  <p className={styles.dayBody}>{dayReading.reading.feeling_today}</p>
                  {dayReading.reading.feeling_clues && dayReading.reading.feeling_clues.length > 0 && (
                    <>
                      <p className={styles.dayHead}>What you might notice</p>
                      {dayReading.reading.feeling_clues.map((x, i) => <p key={i} className={styles.dayBody}>• {x}</p>)}
                    </>
                  )}
                </>
              )}

              {dayReading.reading.exact_words && dayReading.reading.exact_words.length > 0 && (
                <>
                  <p className={styles.dayHead}>Exactly what to say</p>
                  {dayReading.reading.exact_words.map((w, i) => (
                    <div key={i} className={styles.sayCard}>
                      <p className={styles.daySituation}>{w.situation}</p>
                      <p className={styles.dayBody}>“{w.say}”</p>
                    </div>
                  ))}
                </>
              )}

              {dayReading.reading.deeper_talk && (<><p className={styles.dayHead}>Is today the day for the deeper conversation?</p><p className={styles.dayBody}>{dayReading.reading.deeper_talk}</p></>)}
              {dayReading.reading.healthy_outcome && (<><p className={styles.dayHead}>What a healthy outcome looks like</p><p className={styles.dayBody}>{dayReading.reading.healthy_outcome}</p></>)}

              {dayReading.reading.communication && (<><p className={styles.dayHead}>Reaching out</p><p className={styles.dayBody}>{dayReading.reading.communication}</p></>)}
              {dayReading.reading.closeness && (<><p className={styles.dayHead}>Being close</p><p className={styles.dayBody}>{dayReading.reading.closeness}</p></>)}
              {dayReading.reading.space && (<><p className={styles.dayHead}>Space</p><p className={styles.dayBody}>{dayReading.reading.space}</p></>)}
              {dayReading.reading.how_they_may_feel && (<><p className={styles.dayHead}>How {activePerson.name} may feel</p><p className={styles.dayBody}>{dayReading.reading.how_they_may_feel}</p></>)}
              {dayReading.reading.how_to_approach && dayReading.reading.how_to_approach.length > 0 && (
                <><p className={styles.dayHead}>How to approach them</p>
                  {dayReading.reading.how_to_approach.map((x, i) => <p key={i} className={styles.dayBody}>• {x}</p>)}</>
              )}
              {dayReading.reading.what_to_say && dayReading.reading.what_to_say.length > 0 && (
                <><p className={styles.dayHead}>What you could say</p>
                  {dayReading.reading.what_to_say.map((x, i) => <p key={i} className={styles.dayBody}>{x}</p>)}</>
              )}
              {dayReading.reading.avoid && dayReading.reading.avoid.length > 0 && (
                <><p className={styles.dayHead}>Avoid</p>
                  {dayReading.reading.avoid.map((x, i) => <p key={i} className={styles.dayBody}>• {x}</p>)}</>
              )}
              {dayReading.reading.if_it_goes_sideways && (<><p className={styles.dayHead}>If it gets tense</p><p className={styles.dayBody}>{dayReading.reading.if_it_goes_sideways}</p></>)}

              {dayReading.connections.length > 0 && (
                <>
                  <p className={styles.dayHead}>The sky details behind this</p>
                  {dayReading.connections.map((c, i) => <p key={i} className={styles.dayBody}>• {c.text} ({c.strength})</p>)}
                </>
              )}
              <p className={styles.dayNote}>
                The ratings come from real planet positions that day. The explanation is an interpretation, a tendency and not a guarantee.
                {dayReading.moonUncertain ? ` ${activePerson.name}’s Moon sign may be off without a confirmed birth time.` : ''}
              </p>
            </>
          )}
        </div>
        {!synastry && <p style={{ fontSize: 12, color: 'var(--astro-muted)', textAlign: 'center', padding: 16 }}>Calculating real chart comparison…</p>}
        {synastry && (
          <>
            {Object.entries(synastry.categories).map(([key, value]) => (
              <div key={key} className={styles.categoryRow}>
                <span>{CATEGORY_LABELS[key as keyof SynastryResult['categories']]}</span>
                <div className={styles.categoryTrack}><div className={styles.categoryFill} style={{ width: `${value}%` }} /></div>
                <span className={styles.categoryValue}>{value}%</span>
              </div>
            ))}

            {synastry.aspects.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--astro-muted)', marginBottom: 8 }}>
                  What&apos;s Actually Going On Between You
                </p>
                {synastry.aspects.slice(0, 6).map(a => (
                  <div key={`${a.a}-${a.b}-${a.type}`} className={styles.aspectDetailRow}>
                    <div className={styles.aspectDetailHeader}>
                      <span>{a.a === 'NNode' ? 'North Node' : a.a} {plainAspectPhrase(a.type)} {a.b === 'NNode' ? 'North Node' : a.b}</span>
                      <span className={styles.aspectDetailStrength}>{a.orb < 2 ? 'Very Strong' : a.orb < 5 ? 'Strong' : 'Present'}</span>
                    </div>
                    <p className={styles.aspectDetailBody}>{a.interpretation}</p>
                  </div>
                ))}
              </div>
            )}

            <p className={styles.disclaimer}>{synastry.note} These reflect real chart-to-chart aspects, not a guaranteed outcome — astrology describes patterns, not destiny.</p>
          </>
        )}
      </>
    )
  }

  return (
    <>
      <AstrologyHero image="/images/astrology/connections.jpg" label="Connections" title="Compatibility & Synastry" subtitle="See how your chart moves with the people in your life." />

      {people.length === 0 ? (
        <div className={styles.emptyState}>
          <p>The people you explore will appear here.</p>
          <button type="button" onClick={() => setMode('add')} className={styles.addButton}><Plus size={16} /> Add a Person</button>
        </div>
      ) : (
        <>
          {people.map(p => (
            <button key={p.id} type="button" onClick={() => openPerson(p)} className={styles.personRow} style={{ width: '100%', textAlign: 'left', border: 'none' }}>
              <div className={styles.avatar}>{p.name[0]}</div>
              <div className={styles.personInfo}><strong>{p.name}</strong><span>{p.relationship}</span></div>
            </button>
          ))}
          <button type="button" onClick={() => setMode('add')} className={styles.addButton}><Plus size={16} /> Add a Person</button>
        </>
      )}
    </>
  )
}
