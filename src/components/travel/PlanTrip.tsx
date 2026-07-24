'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { TravelSubHeader } from './TravelSubHeader'
import pageStyles from '../../app/travel/travel.module.css'
import styles from './PlanTrip.module.css'
import { DESTINATIONS } from '@/lib/travel/destinations'

const STEPS = ['destination', 'purpose', 'dates', 'travelers', 'budget', 'pace', 'interests', 'capture'] as const

interface TripForm {
  destinationMode: string; destinationName: string; purpose: string; dateMode: string
  travelers: string; budgetMode: string; budgetAmount: string; pace: string
  interests: string[]; captureMode: string
}

const EMPTY: TripForm = { destinationMode: '', destinationName: '', purpose: '', dateMode: '', travelers: '', budgetMode: '', budgetAmount: '', pace: '', interests: [], captureMode: '' }

export function PlanTrip() {
  const router = useRouter()
  const params = useSearchParams()
  const presetDestId = params.get('destination')
  const [stepIdx, setStepIdx] = useState(0)
  const [form, setForm] = useState<TripForm>(() => {
    if (presetDestId) {
      const dest = DESTINATIONS.find(d => d.id === presetDestId)
      return { ...EMPTY, destinationMode: 'know', destinationName: dest?.name ?? '' }
    }
    return EMPTY
  })
  const [saving, setSaving] = useState(false)
  const step = STEPS[stepIdx]

  function next() { setStepIdx(i => Math.min(i + 1, STEPS.length - 1)) }
  function back() { if (stepIdx === 0) router.push('/travel'); else setStepIdx(i => i - 1) }

  async function createTrip() {
    setSaving(true)
    let destinationName = form.destinationName
    let destinationId: string | null = presetDestId
    if (form.destinationMode === 'surprise' || form.destinationMode === 'choose') {
      const pick = DESTINATIONS[Math.floor(Math.random() * DESTINATIONS.length)]
      destinationName = pick.name
      destinationId = pick.id
    }
    try {
      const res = await fetch('/api/travel/trips', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${destinationName} Trip`,
          destination_name: destinationName || 'Somewhere new',
          destination_id: destinationId,
          status: 'draft',
          date_flexibility: form.dateMode === 'exact' ? 'exact' : form.dateMode === 'flexible' ? 'flexible' : 'not_sure',
          trip_type: form.purpose,
          travelers: form.travelers || 'solo',
          budget_amount: form.budgetAmount ? Number(form.budgetAmount) : null,
          capture_mode: form.captureMode === 'yes' ? 'help_capture' : form.captureMode === 'maybe' ? 'maybe' : 'just_enjoy',
          notes: form.pace ? `Preferred pace: ${form.pace}. Interests: ${form.interests.join(', ')}` : null,
        }),
      })
      const data = await res.json()
      if (data.trip) router.push(`/travel/trip/${data.trip.id}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={pageStyles.page}>
      <TravelSubHeader title="Plan a Trip" backHref="/travel" />
      <div className={styles.stepLabel}>Step {stepIdx + 1} of {STEPS.length}</div>

      {step === 'destination' && (
        <>
          <p className={styles.stepQuestion}>Where are you headed?</p>
          <div className={styles.optionGrid}>
            {['I know where', 'Help me choose', 'Surprise me', 'Somewhere saved', 'Near me', 'Road trip'].map(opt => {
              const key = opt.toLowerCase().includes('know') ? 'know' : opt.toLowerCase().includes('choose') ? 'choose' : opt.toLowerCase().includes('surprise') ? 'surprise' : opt.toLowerCase().includes('saved') ? 'saved' : opt.toLowerCase().includes('near') ? 'near' : 'road_trip'
              return <button key={opt} type="button" onClick={() => setForm(f => ({ ...f, destinationMode: key }))} className={`${styles.optionButton} ${form.destinationMode === key ? styles.optionButtonActive : ''}`}>{opt}</button>
            })}
          </div>
          {form.destinationMode === 'know' && (
            <input className={styles.input} style={{ marginTop: 10 }} placeholder="Where to?" value={form.destinationName} onChange={e => setForm(f => ({ ...f, destinationName: e.target.value }))} />
          )}
          <button type="button" onClick={next} disabled={!form.destinationMode || (form.destinationMode === 'know' && !form.destinationName.trim())} className={styles.nextButton}>Continue</button>
        </>
      )}

      {step === 'purpose' && (
        <>
          <p className={styles.stepQuestion}>What&apos;s this trip for?</p>
          <div className={styles.optionChipGrid}>
            {['Relax', 'Celebrate', 'Explore', 'Create', 'Work', 'Visit someone', 'Wellness', 'Romance', 'Solo reset', 'Food', 'Fashion', 'Photography', 'Nature', 'Adventure', 'Other'].map(opt => (
              <button key={opt} type="button" onClick={() => setForm(f => ({ ...f, purpose: opt }))} className={`${styles.optionChip} ${form.purpose === opt ? styles.optionChipActive : ''}`}>{opt}</button>
            ))}
          </div>
          <button type="button" onClick={next} disabled={!form.purpose} className={styles.nextButton}>Continue</button>
        </>
      )}

      {step === 'dates' && (
        <>
          <p className={styles.stepQuestion}>When are you thinking?</p>
          <div className={styles.optionGrid}>
            {['Exact dates', 'Flexible dates', 'Number of days', 'Weekend', 'One week', 'Longer', 'Not sure yet'].map(opt => {
              const key = opt.toLowerCase().includes('exact') ? 'exact' : opt.toLowerCase().includes('flexible') ? 'flexible' : 'not_sure'
              return <button key={opt} type="button" onClick={() => setForm(f => ({ ...f, dateMode: key }))} className={`${styles.optionButton} ${form.dateMode === key ? styles.optionButtonActive : ''}`}>{opt}</button>
            })}
          </div>
          <button type="button" onClick={next} disabled={!form.dateMode} className={styles.nextButton}>Continue</button>
        </>
      )}

      {step === 'travelers' && (
        <>
          <p className={styles.stepQuestion}>Who&apos;s coming?</p>
          <div className={styles.optionGrid}>
            {['Solo', 'Partner', 'Friends', 'Family', 'Work', 'Custom group'].map(opt => (
              <button key={opt} type="button" onClick={() => setForm(f => ({ ...f, travelers: opt }))} className={`${styles.optionButton} ${form.travelers === opt ? styles.optionButtonActive : ''}`}>{opt}</button>
            ))}
          </div>
          <button type="button" onClick={next} disabled={!form.travelers} className={styles.nextButton}>Continue</button>
        </>
      )}

      {step === 'budget' && (
        <>
          <p className={styles.stepQuestion}>What&apos;s the budget?</p>
          <div className={styles.optionGrid}>
            {['Total budget', 'Budget range', 'Not sure', 'Connect Money estimate'].map(opt => {
              const key = opt.toLowerCase().includes('total') ? 'total' : opt.toLowerCase().includes('range') ? 'range' : opt.toLowerCase().includes('connect') ? 'connect_money' : 'not_sure'
              return <button key={opt} type="button" onClick={() => setForm(f => ({ ...f, budgetMode: key }))} className={`${styles.optionButton} ${form.budgetMode === key ? styles.optionButtonActive : ''}`}>{opt}</button>
            })}
          </div>
          {form.budgetMode === 'total' && <input className={styles.input} style={{ marginTop: 10 }} type="number" placeholder="Total budget ($)" value={form.budgetAmount} onChange={e => setForm(f => ({ ...f, budgetAmount: e.target.value }))} />}
          <button type="button" onClick={next} disabled={!form.budgetMode} className={styles.nextButton}>Continue</button>
        </>
      )}

      {step === 'pace' && (
        <>
          <p className={styles.stepQuestion}>What pace feels right?</p>
          <div className={styles.optionGrid}>
            {['Slow', 'Balanced', 'Full itinerary', 'Spontaneous'].map(opt => (
              <button key={opt} type="button" onClick={() => setForm(f => ({ ...f, pace: opt }))} className={`${styles.optionButton} ${form.pace === opt ? styles.optionButtonActive : ''}`}>{opt}</button>
            ))}
          </div>
          <button type="button" onClick={next} disabled={!form.pace} className={styles.nextButton}>Continue</button>
        </>
      )}

      {step === 'interests' && (
        <>
          <p className={styles.stepQuestion}>What sounds good?</p>
          <div className={styles.optionChipGrid}>
            {['Beaches', 'Food', 'Museums', 'Shopping', 'Art', 'Nature', 'Wellness', 'Nightlife', 'History', 'Photography', 'Fashion', 'Local culture', 'Music', 'Spirituality', 'Fitness', 'Adventure'].map(opt => (
              <button key={opt} type="button" onClick={() => setForm(f => ({ ...f, interests: f.interests.includes(opt) ? f.interests.filter(i => i !== opt) : [...f.interests, opt] }))} className={`${styles.optionChip} ${form.interests.includes(opt) ? styles.optionChipActive : ''}`}>{opt}</button>
            ))}
          </div>
          <button type="button" onClick={next} className={styles.nextButton}>Continue</button>
        </>
      )}

      {step === 'capture' && (
        <>
          <p className={styles.stepQuestion}>Do you want to simply enjoy this trip, or capture it too?</p>
          <div className={styles.optionGrid}>
            {['Just enjoy', 'Maybe', 'Yes, help me capture it'].map(opt => {
              const key = opt.toLowerCase().includes('just') ? 'just_enjoy' : opt.toLowerCase().includes('maybe') ? 'maybe' : 'yes'
              return <button key={opt} type="button" onClick={() => setForm(f => ({ ...f, captureMode: key }))} className={`${styles.optionButton} ${form.captureMode === key ? styles.optionButtonActive : ''}`}>{opt}</button>
            })}
          </div>
          <button type="button" onClick={createTrip} disabled={!form.captureMode || saving} className={styles.nextButton}>{saving ? 'Creating your trip…' : 'Create Trip Draft'}</button>
        </>
      )}

      <button type="button" onClick={back} className={styles.backLink}>← Back</button>
    </div>
  )
}
