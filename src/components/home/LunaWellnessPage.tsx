'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ChevronLeft, MoreHorizontal, Sparkles, Sun, CloudRain, Moon, Smile, Waves,
  Check, Droplet, Plus, BookOpen, MoonStar,
} from 'lucide-react'

import { useTodayContext } from '@/components/home/GreetingHeader'
import { AppLayout } from '@/components/layout/AppLayout'
import { SmartInput } from '@/components/ui/SmartInput'
import { addPattern, getInsights } from '@/lib/patterns'
import { ZOE_GYM_BY_DAY } from '@/lib/luna/zoeLifestyleProfile'
import { SELF_CARE_ITEMS, RECOVERY_AFTER, getSelfCareStatus, markSelfCareDoneToday } from '@/lib/luna/wellness'
import styles from './LunaWellnessPage.module.css'

const HYDRATION_GOAL_OZ = 90
const GLASS_OZ = 8

const FEELINGS = [
  { label: 'Amazing', icon: Sun, score: 100 },
  { label: 'Good', icon: Smile, score: 80 },
  { label: 'Okay', icon: Waves, score: 60 },
  { label: 'Stressed', icon: CloudRain, score: 35 },
  { label: 'Exhausted', icon: Moon, score: 20 },
] as const

function todayKey(): string {
  return new Date().toDateString()
}

function yesterdayWeekday(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(d)
}

export function LunaWellnessPage() {
  const { now, weather, weatherError } = useTodayContext()
  const [feeling, setFeeling] = useState<string | null>(null)
  const [resetDone, setResetDone] = useState<Set<string>>(new Set())
  const [hydrationOz, setHydrationOz] = useState(0)
  const [sleepRating, setSleepRating] = useState<number | null | 'none'>(null)
  const [aiMessage, setAiMessage] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [journalText, setJournalText] = useState('')
  const [journalSaved, setJournalSaved] = useState(false)
  // localStorage-derived values must never be read during render (only
  // inside useEffect) — the server always prerenders with no localStorage,
  // so reading it at render time causes a client/server hydration mismatch.
  // This exact bug already hit this app once (see useLocation.ts's comment).
  const [energyAvg, setEnergyAvg] = useState<number | null>(null)
  const [selfCareStatuses, setSelfCareStatuses] = useState<Record<string, ReturnType<typeof getSelfCareStatus>>>({})
  // Also deferred to useEffect — new Date() during render can disagree
  // between server (UTC) and client (local) clocks right around midnight UTC.
  const [yesterday, setYesterday] = useState<string | null>(null)

  function refreshSelfCareStatuses() {
    const next: Record<string, ReturnType<typeof getSelfCareStatus>> = {}
    for (const item of SELF_CARE_ITEMS) next[item.id] = getSelfCareStatus(item)
    setSelfCareStatuses(next)
  }

  // Restore today's local state (hydration + reset checklist reset daily)
  useEffect(() => {
    try {
      const key = todayKey()
      const savedHydration = localStorage.getItem(`luna_hydration_${key}`)
      if (savedHydration) setHydrationOz(Number(savedHydration))
      const savedReset = localStorage.getItem(`luna_wellness_reset_${key}`)
      if (savedReset) setResetDone(new Set(JSON.parse(savedReset)))
      const savedFeeling = localStorage.getItem(`luna_wellness_feeling_${key}`)
      if (savedFeeling) setFeeling(savedFeeling)
    } catch {}
    setEnergyAvg(getInsights(14).energyAvg)
    refreshSelfCareStatuses()
    setYesterday(yesterdayWeekday())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Real sleep signal: today's morning check-in, if one was logged.
  useEffect(() => {
    fetch('/api/check-ins?limit=10')
      .then(res => res.json())
      .then((data: { checkIns?: Array<{ created_at: string; sleep_rating: number | null }> }) => {
        const todays = (data.checkIns ?? []).find(c => new Date(c.created_at).toDateString() === todayKey() && c.sleep_rating != null)
        setSleepRating(todays ? todays.sleep_rating : 'none')
      })
      .catch(() => setSleepRating('none'))
  }, [])

  function addGlass() {
    const next = hydrationOz + GLASS_OZ
    setHydrationOz(next)
    try { localStorage.setItem(`luna_hydration_${todayKey()}`, String(next)) } catch {}
  }

  function toggleReset(item: string) {
    setResetDone(prev => {
      const next = new Set(prev)
      next.has(item) ? next.delete(item) : next.add(item)
      try { localStorage.setItem(`luna_wellness_reset_${todayKey()}`, JSON.stringify([...next])) } catch {}
      return next
    })
  }

  function selectFeeling(label: string) {
    setFeeling(label)
    try { localStorage.setItem(`luna_wellness_feeling_${todayKey()}`, label) } catch {}
    addPattern({ type: 'wellness_mood', context: 'How are you feeling today (Wellness)', value: label, source: 'suggestion' })
  }

  function markSelfCare(id: string) {
    markSelfCareDoneToday(id)
    refreshSelfCareStatuses()
  }

  const gymFocusToday = now ? ZOE_GYM_BY_DAY[now.weekday] : null
  const recoveryItems = useMemo(() => (yesterday ? RECOVERY_AFTER[yesterday] : null) ?? RECOVERY_AFTER.Sunday, [yesterday])

  const resetItems = useMemo(() => {
    const items: string[] = []
    const selfTanStatus = selfCareStatuses.self_tan
    if (!selfTanStatus || selfTanStatus.dueLabel === 'Due now' || selfTanStatus.dueLabel === 'Not logged yet') items.push('Self tan tonight')
    items.push('20-minute walk')
    if (weather && (weather.uvIndex ?? 0) >= 3) items.push('SPF')
    items.push(`Drink ${HYDRATION_GOAL_OZ} oz water`)
    const niceOut = weather && weather.tempF >= 75 && !weather.forecast.toLowerCase().includes('rain')
    if (now?.weekday === 'Sunday' || niceOut) items.push('Beach after work')
    return items
  }, [weather, now?.weekday, selfCareStatuses])

  const sunshineSuggestion = useMemo(() => {
    if (!weather) return null
    if ((weather.uvIndex ?? 0) >= 6) return 'UV is high — wear SPF if you\'re outside for long.'
    if (weather.tempF >= 75 && !weather.forecast.toLowerCase().includes('rain')) return 'Today is perfect for the beach after work.'
    if (weather.forecast.toLowerCase().includes('rain')) return 'Rain today — a good day to stay in and reset instead.'
    return 'Mild day — a walk outside would still feel good.'
  }, [weather])

  // Composite score from whichever real signals exist today — honest empty
  // state (—) for anything not yet logged, not a fabricated number.
  const scoreRows = useMemo(() => {
    const moodScore = feeling ? FEELINGS.find(f => f.label === feeling)!.score : null
    const energyScore = energyAvg != null ? Math.round(energyAvg * 10) : null
    const hydrationScore = Math.min(100, Math.round((hydrationOz / HYDRATION_GOAL_OZ) * 100))
    const sleepScore = typeof sleepRating === 'number' ? Math.round((sleepRating / 5) * 100) : null
    const recoveryScore = yesterday == null ? null : (yesterday === 'Sunday' || yesterday === 'Saturday' ? 85 : 65)
    return [
      { label: 'Sleep', value: sleepScore },
      { label: 'Energy', value: energyScore },
      { label: 'Mood', value: moodScore },
      { label: 'Hydration', value: hydrationScore },
      { label: 'Recovery', value: recoveryScore },
    ]
  }, [feeling, hydrationOz, sleepRating, energyAvg, yesterday])

  const overallScore = useMemo(() => {
    const known = scoreRows.map(r => r.value).filter((v): v is number => v != null)
    if (!known.length) return null
    return Math.round(known.reduce((a, b) => a + b, 0) / known.length)
  }, [scoreRows])

  async function generateSummary() {
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/wellness-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood: feeling ?? undefined,
          weatherForecast: weather?.forecast,
          tempF: weather?.tempF,
          uvIndex: weather?.uvIndex,
          gymFocusToday,
          hydrationProgress: `${hydrationOz}/${HYDRATION_GOAL_OZ} oz`,
        }),
      })
      const data = await res.json()
      setAiMessage(data.message ?? null)
    } catch {
      setAiMessage(null)
    } finally {
      setAiLoading(false)
    }
  }

  useEffect(() => {
    if (feeling && !aiMessage && !aiLoading) generateSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feeling])

  async function saveJournal() {
    if (!journalText.trim()) return
    try {
      await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_type: 'wellness', content: journalText.trim(), mood: feeling ?? undefined }),
      })
      setJournalSaved(true)
      setJournalText('')
    } catch {}
  }

  return (
    <AppLayout noPad>
      <div className={styles.page}>
        <div className={styles.topBar}>
          <Link href="/home" className={styles.backButton} aria-label="Back to Home"><ChevronLeft size={18} /></Link>
          <h1><span>WELLNESS</span> <Sparkles size={14} /></h1>
          <button type="button" className={styles.moreButton} aria-label="More"><MoreHorizontal size={18} /></button>
        </div>

        <div className={styles.heroWrap}>
          <div className={styles.hero}>
            <Image src="/images/rooms/hero-wellness-focus.jpg" alt="" fill sizes="(max-width: 640px) 100vw, 640px" priority />
            <div className={styles.heroOverlay} />
            <div className={styles.heroContent}>
              <h2>{now ? (now.hour < 12 ? 'Good Morning' : now.hour < 17 ? 'Good Afternoon' : 'Good Evening') : 'Hello'}, Zoe</h2>
              <p>You deserve to feel your best today.</p>
            </div>
          </div>

          <div className={styles.scoreCard}>
            <div className={styles.scoreLabel}><Sun size={11} /> Wellness Score</div>
            <div className={styles.scoreNumber}>{overallScore != null ? `${overallScore}%` : '—'}</div>
            <div className={styles.scoreBarOuter}><div className={styles.scoreBarInner} style={{ width: `${overallScore ?? 0}%` }} /></div>
            <div className={styles.scoreRows}>
              {scoreRows.map(row => (
                <div key={row.label} className={styles.scoreRow}>
                  <span>{row.label}</span>
                  <div className={styles.scoreRowTrack}>
                    <div className={styles.scoreRowFill} style={{ width: `${row.value ?? 8}%`, opacity: row.value == null ? 0.25 : 1 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {(aiMessage || aiLoading) && (
          <div className={styles.lunaTake}>
            <Sparkles size={15} />
            <p>{aiLoading ? 'Luna is thinking about your day…' : aiMessage}</p>
          </div>
        )}

        <section>
          <div className={styles.sectionHeader}><Sun size={13} /> Today&apos;s Reset</div>
          <div className={styles.resetCard}>
            <div className={styles.resetPhoto}><Image src="/images/rooms/wellness-sunshine.jpg" alt="" fill sizes="140px" /></div>
            <div className={styles.resetBody}>
              <div className={styles.resetLabel}>Today&apos;s Focus</div>
              <ul>
                {resetItems.map(item => (
                  <li key={item} onClick={() => toggleReset(item)} className={resetDone.has(item) ? styles.resetItemDone : ''}>
                    <span className={styles.resetCheck}>{resetDone.has(item) && <Check size={11} />}</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section>
          <div className={styles.sectionHeader}>How Are You Feeling? <span className={styles.sectionHint}>Choose one</span></div>
          <div className={styles.feelingRow}>
            {FEELINGS.map(f => {
              const Icon = f.icon
              const active = feeling === f.label
              return (
                <button key={f.label} type="button" onClick={() => selectFeeling(f.label)} className={`${styles.feelingCard} ${active ? styles.feelingCardActive : ''}`}>
                  <Icon size={18} />
                  <span>{f.label}</span>
                </button>
              )
            })}
          </div>
        </section>

        <section>
          <div className={styles.sectionHeader}>Today&apos;s Recovery <span className={styles.sectionHint}>Based on yesterday</span></div>
          <div className={styles.recoveryCard}>
            <div className={styles.recoveryPhoto}><Image src="/images/rooms/wellness-recovery.jpg" alt="" fill sizes="120px" /></div>
            <div className={styles.recoveryBody}>
              <h3>Recovery Plan</h3>
              <ul>
                {recoveryItems.map(item => <li key={item}><Check size={11} /> {item}</li>)}
              </ul>
            </div>
          </div>
        </section>

        <section>
          <div className={styles.sectionHeader}>Self Care <span className={styles.sectionHint}>Tap to log today</span></div>
          <div className={styles.selfCareRow}>
            {SELF_CARE_ITEMS.map(item => {
              const status = selfCareStatuses[item.id]
              return (
                <button key={item.id} type="button" onClick={() => markSelfCare(item.id)} className={styles.selfCareCard}>
                  <div className={styles.selfCarePhoto}><Image src={item.image} alt="" fill sizes="90px" /></div>
                  <span className={styles.selfCareLabel}>{item.label}</span>
                  <span className={status?.overdue ? styles.selfCareDueOverdue : styles.selfCareDue}>{status?.dueLabel ?? 'Not logged yet'}</span>
                </button>
              )
            })}
          </div>
        </section>

        <section>
          <div className={styles.sectionHeader}><Sun size={13} /> Sunshine</div>
          <div className={styles.sunshineCard}>
            <Image src="/images/rooms/wellness-sunshine.jpg" alt="" fill sizes="(max-width: 640px) 100vw, 640px" />
            <div className={styles.sunshineOverlay} />
            <div className={styles.sunshineContent}>
              <div className={styles.sunshineStats}>
                <div><span>UV Index</span><strong>{weather?.uvIndex ?? '—'}</strong></div>
                <div><span>Weather</span><strong>{weather ? `${weather.tempF}°` : weatherError ? '—' : '…'}</strong></div>
              </div>
              <p>{sunshineSuggestion ?? 'Checking today\'s weather…'}</p>
            </div>
          </div>
        </section>

        <section>
          <div className={styles.sectionHeader}>Movement</div>
          <div className={styles.movementCard}>
            <p className={styles.movementToday}><strong>Today</strong> — {gymFocusToday ?? 'Loading…'}</p>
            <p className={styles.movementNote}>Movement isn&apos;t about workouts — walk, stretch, breathe, or move however feels good today.</p>
          </div>
        </section>

        <section>
          <div className={styles.sectionHeader}><Droplet size={13} /> Hydration</div>
          <div className={styles.hydrationCard}>
            <div className={styles.hydrationInfo}>
              <strong>{hydrationOz} oz</strong>
              <span>of {HYDRATION_GOAL_OZ} oz goal</span>
            </div>
            <div className={styles.hydrationBarOuter}><div className={styles.hydrationBarInner} style={{ width: `${Math.min(100, (hydrationOz / HYDRATION_GOAL_OZ) * 100)}%` }} /></div>
            <button type="button" onClick={addGlass} className={styles.hydrationButton}><Plus size={14} /> Add a glass</button>
          </div>
        </section>

        <section>
          <div className={styles.sectionHeader}><MoonStar size={13} /> Sleep <span className={styles.sectionHint}>Last Night</span></div>
          <div className={styles.sleepCard}>
            {typeof sleepRating === 'number' ? (
              <>
                <strong>{sleepRating}/5</strong>
                <span>Logged this morning</span>
              </>
            ) : sleepRating === 'none' ? (
              <p className={styles.sleepEmpty}>No check-in logged yet today. <Link href="/morning">Log this morning →</Link></p>
            ) : (
              <p className={styles.sleepEmpty}>Checking today&apos;s check-in…</p>
            )}
          </div>
        </section>

        <section>
          <div className={styles.sectionHeader}>More In Wellness</div>
          <div className={styles.soonRow}>
            {['Skin', 'Hair', 'Body', 'Cycle Tracking'].map(label => (
              <div key={label} className={styles.soonCard}>
                <span className={styles.soonBadge}>Soon</span>
                {label}
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className={styles.sectionHeader}><BookOpen size={13} /> Wellness Journal</div>
          <div className={styles.journalCard}>
            {journalSaved ? (
              <p className={styles.journalSaved}><Check size={14} /> Saved. <Link href="/journal">View journal →</Link></p>
            ) : (
              <>
                <SmartInput
                  context="wellness journal — a quick reflection on how today felt"
                  placeholder="Three sentences. Just for you."
                  value={journalText}
                  onChange={setJournalText}
                  patternType="wellness_journal"
                  rows={3}
                  autosaveKey="wellness_journal"
                />
                <button type="button" onClick={saveJournal} disabled={!journalText.trim()} className={styles.journalSave}>Save entry</button>
              </>
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  )
}
