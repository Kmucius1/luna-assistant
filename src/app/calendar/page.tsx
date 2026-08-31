'use client'
import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Calendar, Clock, MapPin, RefreshCw, ExternalLink, ArrowLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { CalendarEvent } from '@/lib/calendar'
import { PEOPLE, personFor } from '@/lib/calendarPeople'

const G: React.CSSProperties = {
  background: 'rgba(255,255,255,0.62)',
  border: '1px solid rgba(180,150,100,0.18)',
  borderRadius: 20,
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  boxShadow: '0 6px 24px rgba(60,46,24,0.08)',
}

function eventDay(ev: CalendarEvent): Date {
  if (ev.allDay) return new Date(ev.start.slice(0, 10) + 'T12:00:00')
  return new Date(ev.start)
}

function formatDateLabel(ev: CalendarEvent): string {
  const d = eventDay(ev)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return 'Today'
  if (d.toDateString() === new Date(now.getTime() + 86400000).toDateString()) return 'Tomorrow'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

// Persists which people's calendars are hidden, so the toggle survives
// reloads instead of resetting every visit. Defaults to Mick hidden on
// the very first visit (no stored preference yet).
const HIDDEN_PEOPLE_KEY = 'luna_calendar_hidden_people_v1'

function loadHiddenPeople(): Set<string> {
  if (typeof window === 'undefined') return new Set(['Mick'])
  try {
    const raw = localStorage.getItem(HIDDEN_PEOPLE_KEY)
    if (raw === null) return new Set(['Mick'])
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set(['Mick'])
  }
}

function saveHiddenPeople(people: Set<string>) {
  try { localStorage.setItem(HIDDEN_PEOPLE_KEY, JSON.stringify([...people])) } catch {}
}

function groupByDate(events: CalendarEvent[]): { label: string; key: string; events: CalendarEvent[] }[] {
  const map = new Map<string, CalendarEvent[]>()
  for (const ev of events) {
    const key = eventDay(ev).toDateString()
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(ev)
  }
  return Array.from(map.entries())
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([key, evs]) => ({
      label: formatDateLabel(evs[0]),
      key,
      events: evs.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
    }))
}

function EventCard({ ev }: { ev: CalendarEvent }) {
  const past   = new Date(ev.end) < new Date()
  const person = personFor(ev)
  const accent = person ? person.color : ev.isToday ? '#5C4530' : ev.isTomorrow ? '#5C4530' : 'rgba(94,84,116,0.2)'

  return (
    <div style={{ ...G, padding: '14px 16px', opacity: past ? 0.5 : 1, borderLeft: `3px solid ${accent}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#100C1E', lineHeight: 1.35, margin: 0 }}>{ev.title}</p>
            {person && (
              <span style={{
                fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
                color: person.color, background: `${person.color}22`, border: `1px solid ${person.color}44`,
                borderRadius: 8, padding: '2px 7px', flexShrink: 0,
              }}>
                {person.label}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#5E5474' }}>
              <Clock className="h-3 w-3" />
              {ev.allDay ? 'All day' : `${ev.startTime} – ${ev.endTime}`}
            </span>
            {ev.location && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#5E5474' }}>
                <MapPin className="h-3 w-3" />{ev.location}
              </span>
            )}
          </div>
          {ev.description && (
            <p style={{ fontSize: 11, color: '#8A8098', marginTop: 6, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {ev.description.replace(/https?:\/\/\S+/g, '').trim()}
            </p>
          )}
        </div>
        {ev.htmlLink && (
          <a href={ev.htmlLink} target="_blank" rel="noreferrer" style={{ color: '#8A8098', flexShrink: 0, marginTop: 2 }}>
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  )
}

export default function CalendarPage() {
  const [events,    setEvents]    = useState<CalendarEvent[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [filter,    setFilter]    = useState<'all' | 'today' | 'week'>('all')
  const [fetchedAt, setFetchedAt] = useState('')
  const [hiddenPeople, setHiddenPeople] = useState<Set<string>>(loadHiddenPeople)

  function togglePerson(label: string) {
    setHiddenPeople(prev => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      saveHiddenPeople(next)
      return next
    })
  }

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/calendar/upcoming?days=14')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load calendar')
      // Keep events from yesterday onward (so events earlier today still show)
      const cutoff = new Date(Date.now() - 86400000)
      const upcoming = (data.events ?? []).filter((e: CalendarEvent) => new Date(e.end) > cutoff)
      setEvents(upcoming)
      setFetchedAt(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load events')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const now     = new Date()
  const weekOut = new Date(now.getTime() + 7 * 86400000)

  const visibleEvents = events.filter(e => {
    const person = personFor(e)
    return !person || !hiddenPeople.has(person.label)
  })

  const filtered = filter === 'today'
    ? visibleEvents.filter(e => e.isToday)
    : filter === 'week'
    ? visibleEvents.filter(e => eventDay(e) <= weekOut)
    : visibleEvents

  const grouped    = groupByDate(filtered)
  const todayCount = visibleEvents.filter(e => e.isToday).length
  const weekCount  = visibleEvents.filter(e => eventDay(e) <= weekOut).length
  const peopleInView = PEOPLE.filter(p => events.some(e => personFor(e)?.label === p.label))

  return (
    <div
      className="bg-app min-h-screen"
      style={{
        '--app-bg-from': '#FBF8F2',
        '--app-bg-mid': '#F6F1E7',
        '--app-bg-to': '#F0E9DA',
      } as React.CSSProperties}
    >
      <AppLayout noPad className="pt-16">
        <div style={{ padding: '0 0 180px' }}>

          <div style={{ padding: '20px 20px 0' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#5E5474', fontSize: 12, textDecoration: 'none', marginBottom: 14 }}>
              <ArrowLeft className="h-3.5 w-3.5" /> Home
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: '#F5EFE3' }}>Calendar</h1>
                {!loading && !error && (
                  <p style={{ fontSize: 12, color: 'rgba(245,239,227,0.72)', marginTop: 2 }}>
                    {todayCount} today · {weekCount} this week{fetchedAt ? ` · synced ${fetchedAt}` : ''}
                  </p>
                )}
              </div>
              <button onClick={load} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 12, border: '1px solid rgba(180,150,100,0.18)', background: 'rgba(255,255,255,0.5)', color: '#5E5474', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {peopleInView.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                {peopleInView.map(p => {
                  const shown = !hiddenPeople.has(p.label)
                  return (
                    <button
                      key={p.email}
                      onClick={() => togglePerson(p.label)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600,
                        color: shown ? '#32284A' : '#8A8098',
                        background: shown ? `${p.color}1A` : 'rgba(255,255,255,0.45)',
                        border: `1px solid ${shown ? `${p.color}44` : 'rgba(180,150,100,0.16)'}`,
                        borderRadius: 20, padding: '5px 11px', cursor: 'pointer',
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: shown ? p.color : 'rgba(94,84,116,0.3)', flexShrink: 0 }} />
                      Show {p.label}'s schedule
                    </button>
                  )
                })}
              </div>
            )}

            {events.length > 0 && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                {(['all', 'today', 'week'] as const).map(v => (
                  <button key={v} onClick={() => setFilter(v)} style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: filter === v ? '#5C4530' : 'rgba(255,255,255,0.5)', color: filter === v ? 'white' : '#5E5474' }}>
                    {v === 'all' ? 'All' : v === 'today' ? 'Today' : 'This week'}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ padding: '0 16px' }}>

            {error && (
              <div style={{ ...G, padding: 16, background: 'rgba(250,225,222,0.92)', border: '1px solid rgba(224,94,94,0.4)', marginBottom: 12 }}>
                <p style={{ fontSize: 13, color: '#B23B3B' }}>{error}</p>
              </div>
            )}

            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ ...G, padding: 18, height: 80 }}>
                    <div style={{ width: '60%', height: 14, borderRadius: 7, background: 'rgba(180,150,100,0.14)', marginBottom: 10 }} />
                    <div style={{ width: '40%', height: 10, borderRadius: 5, background: 'rgba(180,150,100,0.1)' }} />
                  </div>
                ))}
              </div>
            )}

            {!loading && grouped.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {grouped.map(group => (
                  <div key={group.key}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: group.label === 'Today' ? '#5C4530' : group.label === 'Tomorrow' ? '#5C4530' : '#5E5474', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        {group.label}
                      </p>
                      <div style={{ flex: 1, height: 1, background: 'rgba(180,150,100,0.16)' }} />
                      <span style={{ fontSize: 11, color: '#8A8098' }}>{group.events.length}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {group.events.map(ev => <EventCard key={ev.id} ev={ev} />)}
                    </div>
                  </div>
                ))}
                <button onClick={load} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '13px 0', borderRadius: 16, border: '1px solid rgba(180,150,100,0.18)', background: 'rgba(255,255,255,0.45)', color: '#5E5474', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Refresh <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {!loading && !error && grouped.length === 0 && (
              <div style={{ ...G, padding: 32, textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: 18, background: 'rgba(201,169,110,0.15)', border: '1px solid rgba(201,169,110,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Calendar className="h-6 w-6" style={{ color: '#5C4530' }} />
                </div>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#100C1E', marginBottom: 8 }}>No upcoming events</p>
                <p style={{ fontSize: 13, color: '#5E5474', lineHeight: 1.6 }}>
                  {filter !== 'all' ? 'Try switching to All to see more.' : 'Connect Google Calendar in Settings to see your schedule here.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    </div>
  )
}
