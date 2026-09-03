'use client'

import { useEffect, useState } from 'react'
import { CalendarDays, Mail, RefreshCw } from 'lucide-react'

import styles from './WorkViews.module.css'
import type { WorkEvent } from '@/app/api/work/events/route'

function formatDate(dateHeader: string): string {
  const d = new Date(dateHeader)
  if (isNaN(d.getTime())) return dateHeader
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function EventsView() {
  const [events, setEvents] = useState<WorkEvent[] | null>(null)
  const [connected, setConnected] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  function load() {
    setLoading(true)
    setError(false)
    fetch('/api/work/events', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        setConnected(data.connected)
        setEvents(data.events ?? [])
        if (data.error) setError(true)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  return (
    <>
      <div className={styles.agendaHeader}>
        <div className={styles.sectionHeader}><CalendarDays size={12} /> Modeling Events</div>
      </div>

      {loading ? (
        <div className={styles.card}><div className={styles.emptyNote}>Searching your email&hellip;</div></div>
      ) : !connected ? (
        <div className={styles.card}>
          <div className={styles.emptyNote}>
            Connect your email in <a href="/settings">Settings</a> to pull paid, on-premise modeling opportunities in here automatically.
          </div>
        </div>
      ) : !events || events.length === 0 ? (
        <div className={styles.card}>
          <div className={styles.emptyNote}>
            Nothing matching a paid, on-site modeling opportunity turned up in your inbox yet — this searches for terms like modeling, shoot, casting, or brand ambassador combined with pay/rate/fee. If you know the exact wording your bookings usually come in as, tell me and I&apos;ll tune the search.
          </div>
          <button type="button" className={styles.regenerateButton} onClick={load} disabled={loading}>
            <RefreshCw size={12} /> Search again
          </button>
        </div>
      ) : (
        <>
          <div className={styles.card}>
            {events.map(ev => (
              <div key={ev.id} className={styles.agendaRow}>
                <span className={styles.agendaTime}>{formatDate(ev.date)}</span>
                <span className={styles.agendaBar} />
                <div className={styles.agendaBody}>
                  <strong>{ev.subject}</strong>
                  <span>{ev.from}</span>
                  <span>{ev.snippet}</span>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className={styles.regenerateButton} onClick={load} disabled={loading}>
            <RefreshCw size={12} /> Refresh
          </button>
        </>
      )}
      {error && <p className={styles.trackErrorMsg}>Couldn&apos;t search email — check your connection and try again.</p>}
      <p className={styles.emptyNote} style={{ padding: '10px 4px 0' }}>
        <Mail size={11} style={{ verticalAlign: -1, marginRight: 4 }} />
        Pulled live from your connected inbox — nothing here is stored or invented.
      </p>
    </>
  )
}
