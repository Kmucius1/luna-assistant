'use client'

import { useEffect, useState } from 'react'
import { Plus, ChevronLeft } from 'lucide-react'

import { getSavedPeople, addSavedPerson, type SavedPerson } from '@/lib/luna/savedPeople'
import styles from './AstrologyConnections.module.css'

const RELATIONSHIPS: SavedPerson['relationship'][] = ['Romantic', 'Friendship', 'Family', 'Business partner', 'Creative collaborator', 'Parent and child']

interface SynastryResult {
  categories: { emotionalConnection: number; communication: number; attraction: number; trustAndSupport: number }
  aspects: Array<{ a: string; b: string; type: string; orb: number }>
  note: string
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
  const [form, setForm] = useState({ name: '', relationship: 'Romantic' as SavedPerson['relationship'], birthDate: '', birthTime: '', birthLocation: '', unknownTime: false })

  useEffect(() => { setPeople(getSavedPeople()) }, [])

  function save() {
    if (!form.name.trim() || !form.birthDate) return
    addSavedPerson({
      name: form.name.trim(),
      relationship: form.relationship,
      birthDate: form.birthDate,
      birthTime: form.unknownTime ? undefined : form.birthTime,
      birthLocation: form.birthLocation.trim() || undefined,
      timeAccuracy: form.unknownTime ? 'unknown' : form.birthTime ? 'exact' : 'unknown',
    })
    setPeople(getSavedPeople())
    setForm({ name: '', relationship: 'Romantic', birthDate: '', birthTime: '', birthLocation: '', unknownTime: false })
    setMode('list')
  }

  async function openPerson(person: SavedPerson) {
    setActivePerson(person)
    setMode('view')
    setSynastry(null)
    try {
      const res = await fetch('/api/astrology/synastry', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ birthDate: person.birthDate, birthTime: person.birthTime }),
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
          <p style={{ fontSize: 11.5, color: 'var(--astro-muted)', margin: '2px 0 0' }}>{activePerson.relationship} · Born {activePerson.birthDate}</p>
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
            <p className={styles.disclaimer}>{synastry.note} These reflect real chart-to-chart aspects, not a guaranteed outcome — astrology describes patterns, not destiny.</p>
          </>
        )}
      </>
    )
  }

  return (
    <>
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
