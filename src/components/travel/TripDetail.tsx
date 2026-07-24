'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Plus, Trash2 } from 'lucide-react'
import { TravelSubHeader } from './TravelSubHeader'
import pageStyles from '../../app/travel/travel.module.css'
import styles from './TripDetail.module.css'

interface Trip { id: string; title: string; destination_name: string; status: string; start_date: string | null; end_date: string | null; travelers: string; budget_amount: number | null; capture_mode: string; notes: string | null }
interface Activity { id: string; title: string; status: string; time_of_day: string; cost: number | null }
interface Booking { id: string; booking_type: string; provider: string | null; amount: number | null; confirmation_number: string | null }
interface BudgetItem { id: string; category: string; planned_amount: number | null; actual_amount: number | null }
interface PackingItem { id: string; name: string; category: string; is_packed: boolean }
interface Memory { id: string; memory_type: string; content: string | null; created_at: string }

const TABS = ['Overview', 'Itinerary', 'Budget', 'Packing', 'Bookings', 'Notes', 'Memories'] as const

function daysUntil(date: string): number { return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000) }

export function TripDetail({ id }: { id: string }) {
  const router = useRouter()
  const [tab, setTab] = useState<typeof TABS[number]>('Overview')
  const [trip, setTrip] = useState<Trip | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([])
  const [packing, setPacking] = useState<PackingItem[]>([])
  const [memories, setMemories] = useState<Memory[]>([])
  const [newActivity, setNewActivity] = useState('')
  const [notes, setNotes] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  function load() {
    fetch(`/api/travel/trips/${id}`).then(r => r.json()).then(d => {
      setTrip(d.trip); setActivities(d.activities ?? []); setBookings(d.bookings ?? []); setBudgetItems(d.budgetItems ?? []); setPacking(d.packing ?? [])
      setNotes(d.trip?.notes ?? '')
    })
    fetch(`/api/travel/trips/${id}/memories`).then(r => r.json()).then(d => setMemories(d.memories ?? []))
  }
  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function addActivity() {
    if (!newActivity.trim()) return
    await fetch(`/api/travel/trips/${id}/activities`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newActivity.trim() }) })
    setNewActivity('')
    load()
  }
  async function toggleActivity(a: Activity) {
    await fetch(`/api/travel/trips/${id}/activities`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activityId: a.id, status: a.status === 'completed' ? 'would_love' : 'completed' }) })
    load()
  }
  async function removeActivity(activityId: string) {
    await fetch(`/api/travel/trips/${id}/activities`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activityId }) })
    load()
  }
  async function generatePacking() {
    await fetch(`/api/travel/trips/${id}/packing`, { method: 'POST' })
    load()
  }
  async function togglePacked(item: PackingItem) {
    await fetch(`/api/travel/trips/${id}/packing`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemId: item.id, is_packed: !item.is_packed }) })
    load()
  }
  async function saveNotes() {
    await fetch(`/api/travel/trips/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes }) })
  }
  async function deleteTrip() {
    await fetch(`/api/travel/trips/${id}`, { method: 'DELETE' })
    router.push('/travel')
  }

  if (!trip) return <div className={pageStyles.page}><TravelSubHeader title="Trip" /><p style={{ textAlign: 'center', fontSize: 12, color: 'var(--travel-muted)' }}>Loading…</p></div>

  const plannedTotal = budgetItems.reduce((s, b) => s + (b.planned_amount ?? 0), 0)
  const actualTotal = budgetItems.reduce((s, b) => s + (b.actual_amount ?? 0), 0)

  return (
    <div className={pageStyles.page}>
      <TravelSubHeader title={trip.destination_name} backHref="/travel" />
      <div className={styles.tabRow}>
        {TABS.map(t => <button key={t} type="button" onClick={() => setTab(t)} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}>{t}</button>)}
      </div>

      {tab === 'Overview' && (
        <div className={styles.card}>
          <div className={styles.statRow}><span>Destination</span><span>{trip.destination_name}</span></div>
          {trip.start_date && <div className={styles.statRow}><span>Dates</span><span>{new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{trip.end_date ? ` – ${new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}</span></div>}
          {trip.start_date && <div className={styles.statRow}><span>Countdown</span><span>{Math.max(0, daysUntil(trip.start_date))} days</span></div>}
          <div className={styles.statRow}><span>Travelers</span><span style={{ textTransform: 'capitalize' }}>{trip.travelers}</span></div>
          <div className={styles.statRow}><span>Status</span><span style={{ textTransform: 'capitalize' }}>{trip.status}</span></div>
          {trip.budget_amount != null && <div className={styles.statRow}><span>Budget</span><span>${trip.budget_amount.toLocaleString()}</span></div>}
          <div className={styles.statRow}><span>Capture Mode</span><span style={{ textTransform: 'capitalize' }}>{trip.capture_mode.replace('_', ' ')}</span></div>
        </div>
      )}

      {tab === 'Itinerary' && (
        <div className={styles.card}>
          <div className={styles.addRow}>
            <input className={styles.addInput} placeholder="Add an activity…" value={newActivity} onChange={e => setNewActivity(e.target.value)} onKeyDown={e => e.key === 'Enter' && addActivity()} />
            <button type="button" onClick={addActivity} className={styles.addButton}><Plus size={14} /></button>
          </div>
          {activities.length === 0 ? <p style={{ fontSize: 12, color: 'var(--travel-muted)', textAlign: 'center', padding: 12 }}>This day is still open. Add an activity or keep it flexible.</p> : activities.map(a => (
            <div key={a.id} className={styles.addRow}>
              <button type="button" onClick={() => toggleActivity(a)} className={`${styles.itemCheck} ${a.status === 'completed' ? styles.itemCheckDone : ''}`}>{a.status === 'completed' && <Check size={12} />}</button>
              <span className={`${styles.itemText} ${a.status === 'completed' ? styles.itemTextDone : ''}`}>{a.title}</span>
              <button type="button" onClick={() => removeActivity(a.id)} style={{ background: 'none', border: 'none', color: 'var(--travel-muted)' }}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {tab === 'Budget' && (
        <div className={styles.card}>
          <div className={styles.statRow}><span>Planned</span><span>${plannedTotal.toLocaleString()}</span></div>
          <div className={styles.statRow}><span>Actual</span><span>${actualTotal.toLocaleString()}</span></div>
          {budgetItems.map(b => (
            <div key={b.id} className={styles.statRow}><span style={{ textTransform: 'capitalize' }}>{b.category}</span><span>${(b.actual_amount ?? b.planned_amount ?? 0).toLocaleString()}</span></div>
          ))}
          {budgetItems.length === 0 && <p style={{ fontSize: 12, color: 'var(--travel-muted)', textAlign: 'center', padding: 12 }}>No budget items yet.</p>}
        </div>
      )}

      {tab === 'Packing' && (
        <div className={styles.card}>
          {packing.length === 0 ? (
            <>
              <p style={{ fontSize: 12, color: 'var(--travel-muted)', textAlign: 'center', marginBottom: 10 }}>No packing list yet.</p>
              <button type="button" onClick={generatePacking} className={styles.addButton} style={{ width: '100%', padding: '10px' }}>Generate Packing List</button>
            </>
          ) : packing.map(item => (
            <div key={item.id} className={styles.addRow}>
              <button type="button" onClick={() => togglePacked(item)} className={`${styles.itemCheck} ${item.is_packed ? styles.itemCheckDone : ''}`}>{item.is_packed && <Check size={12} />}</button>
              <span className={`${styles.itemText} ${item.is_packed ? styles.itemTextDone : ''}`}>{item.name}</span>
              <span style={{ fontSize: 10, color: 'var(--travel-muted)', textTransform: 'capitalize' }}>{item.category}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'Bookings' && (
        <div className={styles.card}>
          {bookings.length === 0 ? <p style={{ fontSize: 12, color: 'var(--travel-muted)', textAlign: 'center', padding: 12 }}>No bookings tracked yet.</p> : bookings.map(b => (
            <div key={b.id} className={styles.statRow}><span style={{ textTransform: 'capitalize' }}>{b.booking_type}{b.provider ? ` · ${b.provider}` : ''}</span><span>{b.amount != null ? `$${b.amount}` : b.confirmation_number ?? '—'}</span></div>
          ))}
        </div>
      )}

      {tab === 'Notes' && (
        <div className={styles.card}>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={saveNotes} placeholder="Research, links, restaurant lists, ideas…" rows={6} style={{ width: '100%', border: 'none', outline: 'none', fontSize: 13, color: 'var(--travel-text)', resize: 'none' }} />
        </div>
      )}

      {tab === 'Memories' && (
        <div className={styles.card}>
          {memories.length === 0 ? <p style={{ fontSize: 12, color: 'var(--travel-muted)', textAlign: 'center', padding: 12 }}>Memories from this trip will live here.</p> : memories.map(m => (
            <div key={m.id} className={styles.statRow}><span>{new Date(m.created_at).toLocaleDateString()}</span><span>{m.content ?? m.memory_type}</span></div>
          ))}
        </div>
      )}

      <button type="button" onClick={() => setConfirmDelete(true)} style={{ background: 'none', border: 'none', color: '#C96B5A', fontSize: 12, fontWeight: 600, marginTop: 8 }}>Delete Trip</button>

      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(16,12,30,0.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setConfirmDelete(false)}>
          <div style={{ background: '#fff', borderRadius: 18, padding: 18, maxWidth: 300, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 13, color: 'var(--travel-text)', margin: '0 0 14px' }}>Delete this trip? This can&apos;t be undone.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setConfirmDelete(false)} style={{ flex: 1, minHeight: 40, borderRadius: 12, border: 'none', background: '#F0EDE6', color: 'var(--travel-text)' }}>Cancel</button>
              <button type="button" onClick={deleteTrip} style={{ flex: 1, minHeight: 40, borderRadius: 12, border: 'none', background: '#C96B5A', color: '#fff' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
