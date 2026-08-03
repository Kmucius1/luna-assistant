'use client'

import { useEffect, useState } from 'react'
import { Briefcase, RefreshCw, Sparkles } from 'lucide-react'

import styles from './WorkViews.module.css'

interface DayPlanBlock { time: string; label: string; detail?: string; emoji?: string }
interface WorkDayPlan { day_focus?: string; ai_message?: string; schedule: DayPlanBlock[] }

export function AgendaView() {
  const [plan, setPlan] = useState<WorkDayPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(false)

  function loadPlan() {
    setLoading(true)
    fetch(`/api/work/day-plan?tz=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setPlan(data?.plan ?? null))
      .catch(() => setPlan(null))
      .finally(() => setLoading(false))
  }
  useEffect(loadPlan, [])

  async function generatePlan() {
    setGenerating(true)
    setError(false)
    try {
      const res = await fetch('/api/work/day-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tz: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      })
      if (!res.ok) { setError(true); setGenerating(false); return }
      const data = await res.json()
      setPlan(data.plan)
    } catch {
      setError(true)
    }
    setGenerating(false)
  }

  return (
    <>
      <div className={styles.agendaHeader}>
        <div className={styles.sectionHeader}><Briefcase size={12} /> Work Agenda</div>
        <span className={styles.agendaRange}>10:00 AM &ndash; 6:00 PM</span>
      </div>

      {loading ? (
        <div className={styles.card}><div className={styles.emptyNote}>Loading&hellip;</div></div>
      ) : !plan ? (
        <div className={styles.card}>
          <div className={styles.emptyNote}>
            Nothing planned yet today — just your work hours, built from your real open tasks.
          </div>
          <button type="button" className={styles.planButton} onClick={generatePlan} disabled={generating}>
            <Sparkles size={14} /> {generating ? 'Planning your workday…' : 'Plan My Work Day'}
          </button>
          {error && <p className={styles.trackErrorMsg}>Couldn&apos;t build that — check your connection and try again.</p>}
        </div>
      ) : (
        <>
          {plan.ai_message && (
            <div className={styles.agendaNote}><Sparkles size={12} /> {plan.ai_message}</div>
          )}
          <div className={styles.card}>
            {plan.schedule.map((block, i) => (
              <div key={`${block.time}-${i}`} className={styles.agendaRow}>
                <span className={styles.agendaTime}>{block.time}</span>
                <span className={styles.agendaBar} />
                <div className={styles.agendaBody}>
                  <strong>{block.emoji ? `${block.emoji} ` : ''}{block.label}</strong>
                  {block.detail && <span>{block.detail}</span>}
                </div>
              </div>
            ))}
          </div>
          <button type="button" className={styles.regenerateButton} onClick={generatePlan} disabled={generating}>
            <RefreshCw size={12} className={generating ? styles.spinning : undefined} /> {generating ? 'Replanning…' : 'Regenerate'}
          </button>
          {error && <p className={styles.trackErrorMsg}>Couldn&apos;t regenerate — check your connection and try again.</p>}
        </>
      )}
    </>
  )
}
