'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  ArrowRight, ChevronLeft, Home, Sparkles, CalendarClock, Briefcase,
  ShoppingBasket, Dumbbell, HeartPulse, CheckCircle2, AlertCircle,
} from 'lucide-react'
import { SmartInput } from '@/components/ui/SmartInput'
import { YesNoChoice, ChoiceGrid } from '@/components/ui/ChoiceButton'
import { STAPLE_GROUP_LABEL, STAPLE_GROUPS_ORDER, type StapleGroup, type StapleStatus } from '@/lib/luna/pantryStaples'
import type { FreeSlot } from '@/lib/luna/calendarGaps'

const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.6)',
  border: '1px solid rgba(180,150,100,0.18)',
  borderRadius: 20,
  boxShadow: '0 6px 24px rgba(60,46,24,0.08)',
}

const PALETTE = {
  '--violet': '#5C4530',
  '--violet-deep': '#B08D52',
  '--violet-pale': '#F5EBD3',
  '--depth': '#100C1E',
  '--mid': '#32284A',
  '--mist': '#5E5474',
  '--text-1': '#100C1E',
  '--text-2': '#32284A',
  '--text-3': '#5E5474',
} as React.CSSProperties

type Step =
  | 'intro' | 'gathering' | 'review_week'
  | 'q_location' | 'q_groceries' | 'q_pantry_confirm' | 'q_grocery_time' | 'q_prep_time'
  | 'q_personal' | 'q_energy' | 'q_rhythm' | 'q_laundry' | 'q_cleaning'
  | 'finalizing' | 'result' | 'closing'

interface StapleWithStatus { name: string; group: string; category: string; status: StapleStatus | null }

const STATUS_OPTIONS = [
  { value: 'in_stock', label: 'In stock' },
  { value: 'low', label: 'Low' },
  { value: 'empty', label: 'Empty' },
]

const LAUNDRY_OPTIONS = [
  { value: 'full', label: 'Full laundry' },
  { value: 'one_load', label: 'One load only' },
  { value: 'move_monday', label: 'Move to Monday' },
  { value: 'move_thursday', label: 'Move to Thursday' },
]
const LAUNDRY_LABEL: Record<string, string> = {
  full: 'Full laundry', one_load: 'One load only', move_monday: 'Moved to Monday', move_thursday: 'Moved to Thursday',
}

const CLEANING_OPTIONS = [
  { value: 'full', label: 'Full reset' },
  { value: 'reset_30', label: '30-minute reset' },
  { value: 'tidy_15', label: '15-minute tidy' },
  { value: 'move_friday', label: 'Move to Friday' },
  { value: 'move_saturday', label: 'Move to Saturday' },
]
const CLEANING_LABEL: Record<string, string> = {
  full: 'Full reset', reset_30: '30-minute reset', tidy_15: '15-minute tidy', move_friday: 'Moved to Friday', move_saturday: 'Moved to Saturday',
}
const CLEANING_CATEGORIES = ['Bedroom', 'Bathroom', 'Kitchen', 'Floors', 'Clutter', 'Trash', 'Fridge', 'Bedding', 'Towels', 'Purse/bag cleanup']

interface ClassifiedEvent { title: string; day: string; time: string; locationType: string; rawLocation: string }
interface DrypTaskFlagged { id: string; title: string; account_name?: string; due_date?: string; isOverdue: boolean; isDueSoon: boolean; isStuck: boolean }
interface GatherPayload {
  week_summary?: string
  flagged_deadlines?: string[]
  meeting_notes?: string[]
  dryp_load_summary?: string
  pipeline_note?: string
  events?: ClassifiedEvent[]
  dryp_tasks?: DrypTaskFlagged[]
}
interface DayPlan {
  work_location: 'home' | 'office' | 'off'
  meetings: { time: string; title: string; locationType: string; detail: string }[]
  work_blocks: { time: string; label: string; detail: string }[]
  gym_focus: string
  meals: { breakfast: string; lunch: string; dinner: string }
  errands: string[]
  self_care: string[]
  outfit_type: string
  personal_plans: string[]
}
interface FinalPayload {
  days: Record<string, DayPlan>
  laundry_cleaning_day: string
  grocery_day: string | null
  top_3_business: { title: string; reason: string; source: string }[]
  top_3_personal: { title: string; reason: string }[]
  ai_message: string
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const LOCATION_LABEL: Record<string, string> = {
  virtual: 'Virtual',
  in_person_office: 'DRYP office',
  in_person_client: 'In person',
  unclear: 'Unclear',
}

const WORK_LOCATION_OPTIONS = [
  { value: 'mostly_home', label: 'Mostly home', icon: Home },
  { value: 'mostly_office', label: 'Mostly office', icon: Briefcase },
  { value: 'mixed', label: 'Mixed / usual pattern', icon: CalendarClock },
]

export default function WeeklyResetPage() {
  const [step, setStep] = useState<Step>('intro')
  const [gather, setGather] = useState<GatherPayload | null>(null)
  const [gatherError, setGatherError] = useState(false)
  const [finalResult, setFinalResult] = useState<FinalPayload | null>(null)
  const [finalizeError, setFinalizeError] = useState(false)
  const [confirmedUnclear, setConfirmedUnclear] = useState<Record<number, string>>({})

  const [workLocationPattern, setWorkLocationPattern] = useState<string | null>(null)
  const [groceriesNeeded, setGroceriesNeeded] = useState<boolean | null>(null)
  const [majorThisWeek, setMajorThisWeek] = useState('')
  const [energyLevel, setEnergyLevel] = useState(7)
  const [wantRhythmBlock, setWantRhythmBlock] = useState<boolean | null>(null)

  const [pantryStaples, setPantryStaples] = useState<StapleWithStatus[] | null>(null)
  const [pantryStatuses, setPantryStatuses] = useState<Record<string, StapleStatus>>({})
  const [pantryLoading, setPantryLoading] = useState(false)
  const [pantrySaving, setPantrySaving] = useState(false)
  const [stapleNeedsGrocery, setStapleNeedsGrocery] = useState(false)
  const [groceryTimeSlots, setGroceryTimeSlots] = useState<FreeSlot[]>([])
  const [prepTimeSlots, setPrepTimeSlots] = useState<FreeSlot[]>([])
  const [groceryTimeSlot, setGroceryTimeSlot] = useState<string | null>(null)
  const [prepTimeSlot, setPrepTimeSlot] = useState<string | null>(null)

  const [laundryChoice, setLaundryChoice] = useState<string | null>(null)
  const [cleaningChoice, setCleaningChoice] = useState<string | null>(null)
  const [cleaningCategories, setCleaningCategories] = useState<string[]>([])
  const [laundryDone, setLaundryDone] = useState(false)
  const [cleaningDone, setCleaningDone] = useState(false)
  const [homeTasksSaving, setHomeTasksSaving] = useState(false)

  function toggleCleaningCategory(cat: string) {
    setCleaningCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])
  }

  async function saveHomeTasksAndContinue() {
    setHomeTasksSaving(true)
    try {
      await Promise.all([
        laundryChoice ? fetch('/api/home/tasks', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'laundry', choice: laundryChoice }),
        }) : Promise.resolve(),
        cleaningChoice ? fetch('/api/home/tasks', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'cleaning', choice: cleaningChoice, categories: cleaningCategories }),
        }) : Promise.resolve(),
      ])
    } catch { /* soft-fail — she can still finish the week */ } finally {
      setHomeTasksSaving(false)
    }
    finalize()
  }

  async function markHomeTaskDone(type: 'laundry' | 'cleaning') {
    if (type === 'laundry') setLaundryDone(true); else setCleaningDone(true)
    await fetch('/api/home/tasks', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, completed: true }),
    }).catch(() => {})
  }

  async function loadPantryAndSlots() {
    setPantryLoading(true)
    try {
      const [staplesData, slotsData] = await Promise.all([
        fetch('/api/food/pantry/staples').then(r => r.json()),
        fetch('/api/food/pantry/free-slots').then(r => r.json()),
      ])
      const staples: StapleWithStatus[] = staplesData.staples ?? []
      setPantryStaples(staples)
      setPantryStatuses(Object.fromEntries(staples.map((s: StapleWithStatus) => [s.name, s.status ?? 'in_stock'])))
      setGroceryTimeSlots(slotsData.groceryTimeSlots ?? [])
      setPrepTimeSlots(slotsData.prepTimeSlots ?? [])
    } catch {
      setPantryStaples([])
    } finally {
      setPantryLoading(false)
    }
  }

  useEffect(() => {
    if (step === 'q_pantry_confirm' && !pantryStaples) loadPantryAndSlots()

  }, [step, pantryStaples])

  async function confirmPantryStaples() {
    setPantrySaving(true)
    try {
      await fetch('/api/food/pantry/staples', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ statuses: pantryStatuses }),
      })
    } catch { /* soft-fail — meal plan just won't know about this week's changes */ } finally {
      setPantrySaving(false)
    }
    const needsGrocery = Object.values(pantryStatuses).some(v => v === 'low' || v === 'empty')
    setStapleNeedsGrocery(needsGrocery)
    setStep(needsGrocery ? 'q_grocery_time' : 'q_prep_time')
  }

  const [reflections, setReflections] = useState<Record<string, string>>({})
  const [closingResult, setClosingResult] = useState<{ affirmation?: string; closing?: string; intention_for_week?: string } | null>(null)
  const [closingLoading, setClosingLoading] = useState(false)

  async function startGather() {
    setStep('gathering')
    setGatherError(false)
    try {
      const res = await fetch('/api/luna/weekly-reset', { method: 'POST' })
      if (!res.ok) throw new Error('gather failed')
      const data = await res.json()
      setGather(data)
      setStep('review_week')
    } catch {
      setGatherError(true)
    }
  }

  async function finalize() {
    setStep('finalizing')
    setFinalizeError(false)
    try {
      const res = await fetch('/api/luna/weekly-reset/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: {
            work_location_pattern: workLocationPattern,
            groceries_needed: groceriesNeeded,
            major_this_week: majorThisWeek,
            energy_level: energyLevel,
            want_rhythm_block: wantRhythmBlock,
            unclear_confirmations: confirmedUnclear,
            grocery_time_slot: groceryTimeSlot,
            prep_time_slot: prepTimeSlot,
            laundry_choice: laundryChoice,
            cleaning_choice: cleaningChoice,
            cleaning_categories: cleaningCategories,
          },
        }),
      })
      if (!res.ok) throw new Error('finalize failed')
      const data = await res.json()
      setFinalResult(data)
      setStep('result')
      if (groceriesNeeded) {
        fetch('/api/ai/weekly-meal-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }).catch(() => {})
      }
    } catch {
      setFinalizeError(true)
    }
  }

  async function getClosingReflection() {
    setClosingLoading(true)
    try {
      const res = await fetch('/api/ai/weekly-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reflections }),
      })
      setClosingResult(await res.json())
    } catch {
      setClosingResult({ affirmation: 'I trust my own rhythm.', closing: 'Rest tonight. A new week is waiting to receive you.' })
    } finally {
      setClosingLoading(false)
    }
  }

  const unclearEvents = (gather?.events ?? []).map((e, i) => ({ ...e, idx: i })).filter(e => e.locationType === 'unclear')

  return (
    <div style={PALETTE}>
      <AppLayout noPad className="pt-16">
        <div className="px-6 pb-nav">

          {step !== 'result' && (
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(244,235,212,0.9)' }}>
                <Sparkles className="h-5 w-5" style={{ color: 'var(--violet)' }} strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--violet)' }}>Sunday Weekly Reset</p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>Build the life you designed.</p>
              </div>
            </div>
          )}

          {step === 'intro' && (
            <div className="animate-fade-up">
              <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
                Let&apos;s build your week.
              </h2>
              <p className="text-base mb-8" style={{ color: 'var(--text-2)' }}>
                I&apos;ll review your calendar, email, and DRYP CRM first — then I&apos;ll only ask you what I can&apos;t already know.
              </p>
              <button onClick={startGather}
                className="w-full py-4 rounded-2xl font-semibold text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                Review my week <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {step === 'gathering' && (
            <div className="text-center py-20 animate-fade-up">
              <div className="w-16 h-16 rounded-full mx-auto mb-6 animate-breathe"
                style={{ background: 'radial-gradient(circle, rgba(201,169,110,0.4), rgba(201,169,110,0.1))' }} />
              <p className="font-display text-lg" style={{ color: 'var(--violet)' }}>Reviewing your week…</p>
              <p className="text-sm mt-2" style={{ color: 'var(--mist)' }}>Calendar, email, and DRYP CRM</p>
              {gatherError && (
                <div className="mt-8">
                  <p className="text-sm mb-4" style={{ color: '#C96B5A' }}>Couldn&apos;t gather your week — check your connection.</p>
                  <button onClick={startGather} className="px-6 py-3 rounded-2xl font-semibold" style={{ background: 'rgba(244,235,212,0.9)', color: 'var(--violet)' }}>
                    Try again
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 'review_week' && gather && (
            <div className="animate-fade-up space-y-4">
              <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--text-1)' }}>Here&apos;s what I found.</h2>

              <div className="p-5" style={CARD}>
                <p className="text-sm" style={{ color: 'var(--text-2)' }}>{gather.week_summary}</p>
              </div>

              {!!(gather.flagged_deadlines?.length) && (
                <div className="p-5" style={CARD}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>Flagged deadlines</p>
                  {gather.flagged_deadlines.map((d, i) => (
                    <p key={i} className="text-sm mb-1" style={{ color: 'var(--text-2)' }}>• {d}</p>
                  ))}
                </div>
              )}

              <div className="p-5" style={CARD}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>DRYP load</p>
                <p className="text-sm" style={{ color: 'var(--text-2)' }}>{gather.dryp_load_summary}</p>
              </div>

              {unclearEvents.length > 0 && (
                <div className="p-5" style={CARD}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: '#B08D52' }}>
                    <AlertCircle className="h-3.5 w-3.5" /> Confirm these
                  </p>
                  {unclearEvents.map(e => (
                    <div key={e.idx} className="mb-3 last:mb-0">
                      <p className="text-sm font-semibold mb-2" style={{ color: 'var(--depth)' }}>{e.day} {e.time} — {e.title}</p>
                      <ChoiceGrid
                        options={[
                          { value: 'virtual', label: 'Virtual' },
                          { value: 'in_person_office', label: 'Office' },
                          { value: 'in_person_client', label: 'In person' },
                        ]}
                        value={confirmedUnclear[e.idx] ?? null}
                        onChange={v => setConfirmedUnclear(prev => ({ ...prev, [e.idx]: v }))}
                      />
                    </div>
                  ))}
                </div>
              )}

              <button onClick={() => setStep('q_location')}
                className="w-full py-4 rounded-2xl font-semibold text-white transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                Continue <ArrowRight className="inline h-4 w-4 ml-1" />
              </button>
            </div>
          )}

          {step === 'q_location' && (
            <div className="animate-fade-up">
              <h2 className="font-display text-2xl font-semibold mb-6" style={{ color: 'var(--depth)' }}>How does this week look?</h2>
              <div className="mb-6"><ChoiceGrid options={WORK_LOCATION_OPTIONS} value={workLocationPattern} onChange={setWorkLocationPattern} /></div>
              <div className="flex gap-3">
                <button onClick={() => setStep('review_week')} className="flex-none px-5 py-4 rounded-2xl font-semibold" style={{ background: 'rgba(244,235,212,0.9)', color: 'var(--violet)' }}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setStep('q_groceries')} className="flex-1 py-4 rounded-2xl font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                  Continue <ArrowRight className="inline h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}

          {step === 'q_groceries' && (
            <div className="animate-fade-up">
              <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--depth)' }}>Groceries this week?</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--mid)' }}>I&apos;ll build the meal plan and grocery list if so.</p>
              <div className="mb-6"><YesNoChoice value={groceriesNeeded} onChange={setGroceriesNeeded} /></div>
              <div className="flex gap-3">
                <button onClick={() => setStep('q_location')} className="flex-none px-5 py-4 rounded-2xl font-semibold" style={{ background: 'rgba(244,235,212,0.9)', color: 'var(--violet)' }}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setStep(groceriesNeeded ? 'q_pantry_confirm' : 'q_personal')} className="flex-1 py-4 rounded-2xl font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                  Continue <ArrowRight className="inline h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}

          {step === 'q_pantry_confirm' && (
            <div className="animate-fade-up">
              <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--depth)' }}>What&apos;s stocked at home?</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--mid)' }}>Pre-filled from last time — just adjust whatever&apos;s changed.</p>
              {pantryLoading ? (
                <div className="text-center py-16">
                  <div className="w-12 h-12 rounded-full mx-auto mb-4 animate-breathe" style={{ background: 'radial-gradient(circle, rgba(201,169,110,0.4), rgba(201,169,110,0.1))' }} />
                  <p className="text-sm" style={{ color: 'var(--mist)' }}>Checking your pantry…</p>
                </div>
              ) : (
                STAPLE_GROUPS_ORDER.map(group => {
                  const items = (pantryStaples ?? []).filter(s => s.group === group)
                  if (items.length === 0) return null
                  return (
                    <div key={group} className="mb-5">
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>{STAPLE_GROUP_LABEL[group as StapleGroup]}</p>
                      <div className="space-y-3">
                        {items.map(s => (
                          <div key={s.name} className="p-3" style={CARD}>
                            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--depth)' }}>{s.name}</p>
                            <ChoiceGrid
                              columns={3}
                              options={STATUS_OPTIONS}
                              value={pantryStatuses[s.name] ?? 'in_stock'}
                              onChange={v => setPantryStatuses(p => ({ ...p, [s.name]: v as StapleStatus }))}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })
              )}
              <div className="flex gap-3 mt-2">
                <button onClick={() => setStep('q_groceries')} className="flex-none px-5 py-4 rounded-2xl font-semibold" style={{ background: 'rgba(244,235,212,0.9)', color: 'var(--violet)' }}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={confirmPantryStaples} disabled={pantryLoading || pantrySaving}
                  className="flex-1 py-4 rounded-2xl font-semibold text-white disabled:opacity-40" style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                  {pantrySaving ? 'Saving…' : 'Looks right — Continue'} <ArrowRight className="inline h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}

          {step === 'q_grocery_time' && (
            <div className="animate-fade-up">
              <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--depth)' }}>When can you grab groceries?</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--mid)' }}>Pulled from real gaps in your calendar this week.</p>
              {groceryTimeSlots.length > 0 ? (
                <div className="mb-6"><ChoiceGrid columns={1} options={groceryTimeSlots.map(s => ({ value: s.label, label: s.label, desc: `${s.durationMinutes} min free` }))} value={groceryTimeSlot} onChange={setGroceryTimeSlot} /></div>
              ) : (
                <p className="text-sm mb-6" style={{ color: 'var(--mist)' }}>No open slots found this week — I&apos;ll keep it flexible.</p>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep('q_pantry_confirm')} className="flex-none px-5 py-4 rounded-2xl font-semibold" style={{ background: 'rgba(244,235,212,0.9)', color: 'var(--violet)' }}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setStep('q_prep_time')} className="flex-1 py-4 rounded-2xl font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                  Continue <ArrowRight className="inline h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}

          {step === 'q_prep_time' && (
            <div className="animate-fade-up">
              <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--depth)' }}>When&apos;s a good time to meal prep?</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--mid)' }}>Biased toward evenings and weekends.</p>
              {prepTimeSlots.length > 0 ? (
                <div className="mb-6"><ChoiceGrid columns={1} options={prepTimeSlots.map(s => ({ value: s.label, label: s.label, desc: `${s.durationMinutes} min free` }))} value={prepTimeSlot} onChange={setPrepTimeSlot} /></div>
              ) : (
                <p className="text-sm mb-6" style={{ color: 'var(--mist)' }}>No open slots found this week — I&apos;ll keep it flexible.</p>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep(stapleNeedsGrocery ? 'q_grocery_time' : 'q_pantry_confirm')} className="flex-none px-5 py-4 rounded-2xl font-semibold" style={{ background: 'rgba(244,235,212,0.9)', color: 'var(--violet)' }}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setStep('q_personal')} className="flex-1 py-4 rounded-2xl font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                  Continue <ArrowRight className="inline h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}

          {step === 'q_personal' && (
            <div className="animate-fade-up">
              <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--depth)' }}>Anything major this week?</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--mid)' }}>A birthday, a trip, an event not yet on your calendar. Optional.</p>
              <div className="p-5 mb-6" style={CARD}>
                <SmartInput context="anything major this week — birthday, trip, event" placeholder="Nothing, or tell me what's coming up..." value={majorThisWeek} onChange={setMajorThisWeek} patternType="weekly" rows={3} autoSuggest={false} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(groceriesNeeded ? 'q_prep_time' : 'q_groceries')} className="flex-none px-5 py-4 rounded-2xl font-semibold" style={{ background: 'rgba(244,235,212,0.9)', color: 'var(--violet)' }}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setStep('q_energy')} className="flex-1 py-4 rounded-2xl font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                  Continue <ArrowRight className="inline h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}

          {step === 'q_energy' && (
            <div className="animate-fade-up">
              <h2 className="font-display text-2xl font-semibold mb-6" style={{ color: 'var(--depth)' }}>How&apos;s your capacity right now?</h2>
              <div className="p-5 mb-6" style={CARD}>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: 'var(--depth)' }}>Energy / capacity</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--violet)' }}>{energyLevel}/10</span>
                </div>
                <input type="range" min={1} max={10} value={energyLevel} onChange={e => setEnergyLevel(Number(e.target.value))} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('q_personal')} className="flex-none px-5 py-4 rounded-2xl font-semibold" style={{ background: 'rgba(244,235,212,0.9)', color: 'var(--violet)' }}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setStep('q_rhythm')} className="flex-1 py-4 rounded-2xl font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                  Continue <ArrowRight className="inline h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}

          {step === 'q_rhythm' && (
            <div className="animate-fade-up">
              <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--depth)' }}>Self-tan, beach, or sewing block?</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--mid)' }}>Still want your usual weekly rhythm block this week?</p>
              <div className="mb-6"><YesNoChoice value={wantRhythmBlock} onChange={setWantRhythmBlock} /></div>
              <div className="flex gap-3">
                <button onClick={() => setStep('q_energy')} className="flex-none px-5 py-4 rounded-2xl font-semibold" style={{ background: 'rgba(244,235,212,0.9)', color: 'var(--violet)' }}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setStep('q_laundry')} className="flex-1 py-4 rounded-2xl font-semibold text-white transition-all active:scale-95 flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {step === 'q_laundry' && (
            <div className="animate-fade-up">
              <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--depth)' }}>Laundry this week?</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--mid)' }}>Pick what makes sense, or move it to a lighter day.</p>
              <div className="mb-6"><ChoiceGrid options={LAUNDRY_OPTIONS} value={laundryChoice} onChange={setLaundryChoice} /></div>
              <div className="flex gap-3">
                <button onClick={() => setStep('q_rhythm')} className="flex-none px-5 py-4 rounded-2xl font-semibold" style={{ background: 'rgba(244,235,212,0.9)', color: 'var(--violet)' }}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setStep('q_cleaning')} disabled={!laundryChoice} className="flex-1 py-4 rounded-2xl font-semibold text-white disabled:opacity-40" style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                  Continue <ArrowRight className="inline h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}

          {step === 'q_cleaning' && (
            <div className="animate-fade-up">
              <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--depth)' }}>Home reset?</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--mid)' }}>How much cleaning does this week actually need?</p>
              <div className="mb-6"><ChoiceGrid options={CLEANING_OPTIONS} value={cleaningChoice} onChange={setCleaningChoice} /></div>
              {(cleaningChoice === 'full' || cleaningChoice === 'reset_30') && (
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>What needs it most? (optional)</p>
                  <div className="flex flex-wrap gap-2">
                    {CLEANING_CATEGORIES.map(cat => {
                      const active = cleaningCategories.includes(cat)
                      return (
                        <button key={cat} type="button" onClick={() => toggleCleaningCategory(cat)}
                          className="px-3 py-2 rounded-full text-xs font-semibold transition-all"
                          style={{ background: active ? 'var(--violet-pale)' : 'rgba(244,235,212,0.6)', border: `1px solid ${active ? 'var(--violet)' : 'rgba(180,150,100,0.2)'}`, color: active ? 'var(--violet)' : 'var(--mid)' }}>
                          {cat}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep('q_laundry')} className="flex-none px-5 py-4 rounded-2xl font-semibold" style={{ background: 'rgba(244,235,212,0.9)', color: 'var(--violet)' }}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={saveHomeTasksAndContinue} disabled={!cleaningChoice || homeTasksSaving} className="flex-1 py-4 rounded-2xl font-semibold text-white transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40" style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                  <Sparkles className="h-4 w-4" /> {homeTasksSaving ? 'Saving…' : 'Build my week'}
                </button>
              </div>
            </div>
          )}

          {step === 'finalizing' && (
            <div className="text-center py-20 animate-fade-up">
              <div className="w-16 h-16 rounded-full mx-auto mb-6 animate-breathe" style={{ background: 'radial-gradient(circle, rgba(201,169,110,0.4), rgba(201,169,110,0.1))' }} />
              <p className="font-display text-lg" style={{ color: 'var(--violet)' }}>Building your week…</p>
              {finalizeError && (
                <div className="mt-8">
                  <p className="text-sm mb-4" style={{ color: '#C96B5A' }}>Couldn&apos;t build your week — check your connection.</p>
                  <button onClick={finalize} className="px-6 py-3 rounded-2xl font-semibold" style={{ background: 'rgba(244,235,212,0.9)', color: 'var(--violet)' }}>
                    Try again
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 'result' && finalResult && (
            <div className="animate-fade-up space-y-4">
              <h2 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-1)' }}>Your week.</h2>

              <div className="p-5" style={CARD}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>Top 3 business</p>
                {finalResult.top_3_business.map((t, i) => (
                  <div key={i} className="flex items-start gap-2 py-1.5">
                    <span className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'var(--violet-pale)', color: 'var(--violet)' }}>{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--depth)' }}>{t.title}</p>
                      <p className="text-xs" style={{ color: 'var(--mist)' }}>{t.reason}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-5" style={CARD}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--herb, #6B8E5A)' }}>
                  <HeartPulse className="h-3.5 w-3.5" /> Top 3 personal
                </p>
                {finalResult.top_3_personal.map((t, i) => (
                  <div key={i} className="py-1.5">
                    <p className="text-sm font-medium" style={{ color: 'var(--depth)' }}>{t.title}</p>
                    <p className="text-xs" style={{ color: 'var(--mist)' }}>{t.reason}</p>
                  </div>
                ))}
              </div>

              {WEEKDAYS.map(day => {
                const d = finalResult.days[day]
                if (!d) return null
                return (
                  <div key={day} className="p-5" style={CARD}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-display text-base font-semibold" style={{ color: 'var(--depth)' }}>{day}</p>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--violet-pale)', color: 'var(--violet)' }}>
                        {d.work_location === 'home' ? 'Home' : d.work_location === 'office' ? 'Office' : 'Off'}
                      </span>
                    </div>
                    {d.meetings?.map((m, i) => (
                      <p key={i} className="text-xs mb-1" style={{ color: 'var(--text-2)' }}>
                        {m.time} — {m.title} <span style={{ color: 'var(--mist)' }}>({LOCATION_LABEL[m.locationType] ?? m.locationType})</span>
                      </p>
                    ))}
                    {d.work_blocks?.map((w, i) => (
                      <p key={i} className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>{w.time} · {w.label}</p>
                    ))}
                    <p className="text-xs mt-2 flex items-center gap-1" style={{ color: 'var(--mist)' }}>
                      <Dumbbell className="h-3 w-3" /> {d.gym_focus}
                    </p>
                    {d.meals && (
                      <p className="text-xs mt-1" style={{ color: 'var(--mist)' }}>
                        {d.meals.breakfast} · {d.meals.lunch} · {d.meals.dinner}
                      </p>
                    )}
                  </div>
                )
              })}

              <div className="p-5 flex flex-col gap-3" style={CARD}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" style={{ color: laundryDone ? '#4E8C6B' : 'var(--violet)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-2)' }}>
                      Laundry: {laundryChoice ? LAUNDRY_LABEL[laundryChoice] : finalResult.laundry_cleaning_day}
                    </span>
                  </div>
                  {laundryChoice && (laundryDone ? (
                    <span className="text-xs font-semibold" style={{ color: '#4E8C6B' }}>Done</span>
                  ) : (
                    <button onClick={() => markHomeTaskDone('laundry')} className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: 'var(--violet-pale)', color: 'var(--violet)' }}>Mark done</button>
                  ))}
                </div>
                {cleaningChoice && (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" style={{ color: cleaningDone ? '#4E8C6B' : 'var(--violet)' }} />
                      <span className="text-xs" style={{ color: 'var(--text-2)' }}>
                        Cleaning: {CLEANING_LABEL[cleaningChoice]}{cleaningCategories.length ? ` — ${cleaningCategories.join(', ')}` : ''}
                      </span>
                    </div>
                    {cleaningDone ? (
                      <span className="text-xs font-semibold" style={{ color: '#4E8C6B' }}>Done</span>
                    ) : (
                      <button onClick={() => markHomeTaskDone('cleaning')} className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: 'var(--violet-pale)', color: 'var(--violet)' }}>Mark done</button>
                    )}
                  </div>
                )}
                {(groceryTimeSlot || finalResult.grocery_day) && (
                  <div className="flex items-center gap-2">
                    <ShoppingBasket className="h-4 w-4" style={{ color: 'var(--violet)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-2)' }}>Groceries: {groceryTimeSlot ?? finalResult.grocery_day}</span>
                  </div>
                )}
              </div>

              <p className="text-sm text-center py-2 italic" style={{ color: 'var(--mist)' }}>{finalResult.ai_message}</p>

              <button onClick={() => setStep('closing')}
                className="w-full py-4 rounded-2xl font-semibold text-white transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                Continue <ArrowRight className="inline h-4 w-4 ml-1" />
              </button>
            </div>
          )}

          {step === 'closing' && !closingResult && (
            <div className="animate-fade-up space-y-4">
              <h2 className="font-display text-2xl font-semibold mb-1" style={{ color: 'var(--text-1)' }}>Close the week.</h2>
              <p className="text-sm mb-4" style={{ color: 'var(--text-2)' }}>Two quick prompts, then you&apos;re done.</p>
              <div>
                <p className="text-xs font-semibold mb-2 px-1" style={{ color: 'var(--violet)' }}>What went well this week?</p>
                <SmartInput context="what went well this week" placeholder="Speak or tap..." value={reflections.wins ?? ''} onChange={v => setReflections(r => ({ ...r, wins: v }))} patternType="weekly" rows={3} autoSuggest={false} />
              </div>
              <div>
                <p className="text-xs font-semibold mb-2 px-1" style={{ color: 'var(--violet)' }}>What&apos;s your intention for the week ahead?</p>
                <SmartInput context="intention for the week ahead" placeholder="Speak or tap..." value={reflections.intention ?? ''} onChange={v => setReflections(r => ({ ...r, intention: v }))} patternType="weekly" rows={3} autoSuggest={false} />
              </div>
              <button onClick={getClosingReflection} disabled={closingLoading}
                className="w-full py-4 rounded-2xl font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                {closingLoading ? 'Closing the week…' : 'Close the week'}
              </button>
            </div>
          )}

          {step === 'closing' && closingResult && (
            <div className="animate-fade-up space-y-4">
              <div className="rounded-2xl p-5 text-center" style={{ background: 'rgba(244,235,212,0.9)', border: '1px solid rgba(201,169,110,0.3)' }}>
                <p className="font-display text-base italic" style={{ color: 'var(--text-1)' }}>&ldquo;{closingResult.affirmation}&rdquo;</p>
              </div>
              {closingResult.intention_for_week && (
                <div className="p-5" style={CARD}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>Intention for next week</p>
                  <p className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>{closingResult.intention_for_week}</p>
                </div>
              )}
              {closingResult.closing && <p className="text-center text-sm" style={{ color: 'var(--text-3)' }}>{closingResult.closing}</p>}
              <Link href="/home" className="block">
                <button className="w-full py-4 rounded-2xl font-semibold text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                  <Home className="h-4 w-4" /> Return to Home
                </button>
              </Link>
            </div>
          )}

        </div>
      </AppLayout>
    </div>
  )
}
