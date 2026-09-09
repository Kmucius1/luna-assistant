'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  ArrowRight, ChevronLeft, Home, Sparkles,
  ShoppingBasket, Dumbbell, HeartPulse, CheckCircle2, AlertCircle,
} from 'lucide-react'
import { SmartInput } from '@/components/ui/SmartInput'
import { YesNoChoice, ChoiceGrid } from '@/components/ui/ChoiceButton'
import { STAPLE_GROUP_LABEL, STAPLE_GROUPS_ORDER, type StapleGroup, type StapleStatus } from '@/lib/luna/pantryStaples'
import type { FreeSlot } from '@/lib/luna/calendarGaps'
import { SELF_CARE_ITEMS, getSelfCareStatus } from '@/lib/luna/wellness'
import { MOVEMENT_ALTERNATIVES, REST_OPTION, type MovementChoice } from '@/lib/luna/movementAlternatives'
import styles from './weekly.module.css'

const FEELING_OPTIONS = [
  { value: 'calm', label: 'Calm' },
  { value: 'productive', label: 'Productive' },
  { value: 'social', label: 'Social' },
  { value: 'focused', label: 'Focused' },
  { value: 'restorative', label: 'Restorative' },
  { value: 'creative', label: 'Creative' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'high_energy', label: 'High-energy' },
  { value: 'light', label: 'Light' },
  { value: 'mix', label: 'Mix' },
]

const WEEKDAY_LOCATION_OPTIONS: Record<string, { value: string; label: string }[]> = {
  Monday: [{ value: 'home', label: 'Home' }, { value: 'office', label: 'Office' }, { value: 'split', label: 'Split' }, { value: 'luna_decide', label: 'Let Luna decide' }],
  Tuesday: [{ value: 'home', label: 'Home' }, { value: 'office', label: 'Office' }, { value: 'split', label: 'Split' }, { value: 'luna_decide', label: 'Let Luna decide' }],
  Wednesday: [{ value: 'home', label: 'Home' }, { value: 'office', label: 'Office' }, { value: 'split', label: 'Split' }],
  Thursday: [{ value: 'home', label: 'Home' }, { value: 'office', label: 'Office' }, { value: 'split', label: 'Split' }, { value: 'luna_decide', label: 'Let Luna decide' }],
  Friday: [{ value: 'home', label: 'Home' }, { value: 'office', label: 'Office' }, { value: 'split', label: 'Split' }, { value: 'light', label: 'Light workday' }, { value: 'luna_decide', label: 'Let Luna decide' }],
}
const LOCATION_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

const MORNING_REALISM_OPTIONS = [
  { value: 'slow', label: 'Full slow mornings' },
  { value: 'normal', label: 'Normal mornings' },
  { value: 'compressed', label: 'May need compressed mornings' },
  { value: 'essentials_only', label: 'Very busy — protect the essentials only' },
]

const SELF_CARE_WEEK_OPTIONS = [
  'Hair care', 'Nails', 'Brows', 'Long shower', 'Body care', 'Skincare',
  'Beauty restock', 'Outfit prep', 'Early night', 'Full self-care block', 'Light self-care only',
]

const DINNER_OPTIONS = [
  'Chicken + rice + veggies', 'Taco Tuesday', 'Buffalo chicken wraps', 'Crispy chicken tenders',
  'Chicken quesadilla', 'Salmon', 'Pasta', 'Eat out', 'Flexible / easy night',
]

const HOME_EXTRA_OPTIONS = ['Car', 'Gas', 'Car wash', 'Grocery run', 'Personal admin']

type Step =
  | 'intro' | 'gathering' | 'q_feeling' | 'review_week'
  | 'q_location' | 'q_meeting_prep' | 'q_movement' | 'q_morning'
  | 'q_personal' | 'q_rhythm'
  | 'q_groceries' | 'q_pantry_confirm' | 'q_grocery_time' | 'q_prep_time' | 'q_dinner_choice'
  | 'q_laundry' | 'q_cleaning' | 'q_selfcare' | 'q_money'
  | 'finalizing' | 'result' | 'closing'

interface StapleWithStatus { id?: string; name: string; group: string; category: string; status: StapleStatus | null; custom?: boolean }

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
  travel?: string[]
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

export default function WeeklyResetPage() {
  const [step, setStep] = useState<Step>('intro')
  const [gather, setGather] = useState<GatherPayload | null>(null)
  const [gatherError, setGatherError] = useState(false)
  const [finalResult, setFinalResult] = useState<FinalPayload | null>(null)
  const [finalizeError, setFinalizeError] = useState(false)
  const [confirmedUnclear, setConfirmedUnclear] = useState<Record<number, string>>({})

  const [weekFeeling, setWeekFeeling] = useState<string | null>(null)
  const [workLocationByDay, setWorkLocationByDay] = useState<Record<string, string>>({ Wednesday: 'home' })
  const [meetingPrepDays, setMeetingPrepDays] = useState<string[]>([])
  const [movementByDay, setMovementByDay] = useState<Record<string, MovementChoice>>({})
  const [morningRealism, setMorningRealism] = useState<string | null>(null)
  const [selfCarePriorities, setSelfCarePriorities] = useState<string[]>([])
  const [homeExtras, setHomeExtras] = useState<string[]>([])
  const [dinnerChoices, setDinnerChoices] = useState<string[]>([])

  interface MoneyVisibility {
    mrr: { current: number; expected_next_month: number }
    cashFlowIn: number
    incomeSources: { source_name: string; amount: number }[]
  }
  const [moneyVisibility, setMoneyVisibility] = useState<MoneyVisibility | null>(null)
  const [moneyVisibilityLoading, setMoneyVisibilityLoading] = useState(false)

  const [groceriesNeeded, setGroceriesNeeded] = useState<boolean | null>(null)
  const [majorThisWeek, setMajorThisWeek] = useState('')
  const [wantRhythmBlock, setWantRhythmBlock] = useState<boolean | null>(null)

  function toggleMulti(setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) {
    setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])
  }

  // Candidate meeting-prep days — derived from real classified calendar
  // events (in-person/office meetings), pre-checked rather than guessed
  // from nothing. She can still adjust before continuing.
  const candidateMeetingDays = Array.from(new Set(
    (gather?.events ?? [])
      .filter(e => e.locationType === 'in_person_office' || e.locationType === 'in_person_client')
      .map(e => e.day)
  ))

  async function loadMoneyVisibility() {
    setMoneyVisibilityLoading(true)
    try {
      const [dashRes, revRes] = await Promise.all([
        fetch('/api/money/dashboard').then(r => r.json()).catch(() => null),
        fetch('/api/dryp/revenue-summary').then(r => r.json()).catch(() => null),
      ])
      setMoneyVisibility({
        mrr: { current: revRes?.mrr?.current ?? 0, expected_next_month: revRes?.mrr?.expected_next_month ?? 0 },
        cashFlowIn: revRes?.cash_flow_this_month?.dryp_money_in ?? 0,
        incomeSources: dashRes?.income_sources ?? [],
      })
      if (!moneyReview && dashRes && !dashRes.error) {
        setMoneyReview({
          safeToSpend: dashRes.safe_to_spend?.safeToSpend ?? 0,
          billsDueThisWeek: (dashRes.bills_due_this_week ?? []).map((b: { name: string; due_date: string; expected_amount: number | null }) => ({ name: b.name, due_date: b.due_date, expected_amount: b.expected_amount })),
          subscriptionAlerts: dashRes.subscription_alerts_count ?? 0,
          duplicateAlerts: dashRes.duplicate_charges_count ?? 0,
        })
      }
    } catch { /* soft-fail — money step just shows what it has */ } finally {
      setMoneyVisibilityLoading(false)
    }
  }

  const [pantryStaples, setPantryStaples] = useState<StapleWithStatus[] | null>(null)
  const [pantryStatuses, setPantryStatuses] = useState<Record<string, StapleStatus>>({})
  const [pantryLoading, setPantryLoading] = useState(false)
  const [pantrySaving, setPantrySaving] = useState(false)
  const [stapleNeedsGrocery, setStapleNeedsGrocery] = useState(false)
  const [newStapleName, setNewStapleName] = useState('')
  const [newStapleGroup, setNewStapleGroup] = useState<StapleGroup>('easy_backup')
  const [addingStaple, setAddingStaple] = useState(false)

  interface MoneyReview {
    safeToSpend: number
    billsDueThisWeek: { name: string; due_date: string; expected_amount: number | null }[]
    subscriptionAlerts: number
    duplicateAlerts: number
  }
  const [moneyReview, setMoneyReview] = useState<MoneyReview | null>(null)
  const [selfCareOverdue, setSelfCareOverdue] = useState<{ label: string; dueLabel: string }[]>([])

  interface FoodPlanPreview { mealCount: number; groceryCount: number }
  const [foodPlanPreview, setFoodPlanPreview] = useState<FoodPlanPreview | null>(null)

  useEffect(() => {
    if (step !== 'result') return
    fetch('/api/food/weekly-plan').then(r => r.json()).then(d => {
      const plan = d.plan?.plan_json
      if (!plan) return
      const mealCount = (plan.breakfasts?.length ?? 0) + (plan.lunches?.length ?? 0) + (plan.dinners?.length ?? 0)
      const groceryCount = Object.values(plan.grocery_list ?? {}).reduce((sum: number, items) => sum + (Array.isArray(items) ? items.length : 0), 0) as number
      if (mealCount || groceryCount) setFoodPlanPreview({ mealCount, groceryCount })
    }).catch(() => {})
  }, [step])

useEffect(() => {
    if (step !== 'q_selfcare' || selfCareOverdue.length) return
    const overdue = SELF_CARE_ITEMS
      .map(item => ({ label: item.label, status: getSelfCareStatus(item) }))
      .filter(x => x.status.overdue)
      .map(x => ({ label: x.label, dueLabel: x.status.dueLabel }))
    setSelfCareOverdue(overdue)
  }, [step, selfCareOverdue.length])

  useEffect(() => {
    if (step === 'q_money' && !moneyVisibility && !moneyVisibilityLoading) loadMoneyVisibility()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  // Pre-check meeting-prep days from real classified calendar events —
  // only seeds once, so her own edits afterward aren't overwritten.
  const meetingPrepSeeded = useRef(false)
  useEffect(() => {
    if (step === 'q_meeting_prep' && !meetingPrepSeeded.current && candidateMeetingDays.length) {
      meetingPrepSeeded.current = true
      setMeetingPrepDays(candidateMeetingDays)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])
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
    setStep('q_selfcare')
  }

  const [editingField, setEditingField] = useState<string | null>(null)
  const [editFieldValue, setEditFieldValue] = useState('')

  // A real patch — updates exactly the one field on the one day in the
  // stored plan, no regeneration, so editing one thing can't destroy the
  // rest of the week.
  async function saveFieldEdit(day: string, field?: string, mealField?: string) {
    const value = editFieldValue
    setFinalResult(prev => {
      if (!prev) return prev
      const dayPlan = { ...prev.days[day] }
      if (mealField) dayPlan.meals = { ...dayPlan.meals, [mealField]: value } as DayPlan['meals']
      else if (field) (dayPlan as unknown as Record<string, unknown>)[field] = value
      return { ...prev, days: { ...prev.days, [day]: dayPlan } }
    })
    setEditingField(null)
    await fetch('/api/luna/weekly-reset/edit', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ day, field, mealField, value }),
    }).catch(() => {})
  }

  async function cycleWorkLocation(day: string, current: string) {
    const next = current === 'home' ? 'office' : current === 'office' ? 'off' : 'home'
    setFinalResult(prev => prev ? { ...prev, days: { ...prev.days, [day]: { ...prev.days[day], work_location: next as DayPlan['work_location'] } } } : prev)
    await fetch('/api/luna/weekly-reset/edit', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ day, field: 'work_location', value: next }),
    }).catch(() => {})
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
    // Always offer a grocery-shopping time slot here — she already said
    // groceries are needed to reach this step at all, and she may need to
    // shop for perishables/produce even when every tracked staple reads
    // in-stock. Staple status only decides what's ON the list, not whether
    // a shopping trip happens.
    setStapleNeedsGrocery(true)
    setStep('q_grocery_time')
  }

  async function addCustomStaple() {
    const name = newStapleName.trim()
    if (!name) return
    setAddingStaple(true)
    try {
      const res = await fetch('/api/food/pantry/staples', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, group: newStapleGroup }),
      })
      const data = await res.json()
      if (data.staple) {
        setPantryStaples(prev => [...(prev ?? []), data.staple])
        setPantryStatuses(prev => ({ ...prev, [data.staple.name]: 'in_stock' }))
        setNewStapleName('')
      }
    } finally {
      setAddingStaple(false)
    }
  }

  async function removeCustomStaple(staple: StapleWithStatus) {
    if (!staple.id) return
    setPantryStaples(prev => (prev ?? []).filter(s => s.name !== staple.name))
    setPantryStatuses(prev => {
      const next = { ...prev }
      delete next[staple.name]
      return next
    })
    await fetch(`/api/food/pantry/${staple.id}`, { method: 'DELETE' }).catch(() => {})
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
            week_feeling: weekFeeling,
            work_location_by_day: workLocationByDay,
            meeting_prep_days: meetingPrepDays,
            movement_by_day: movementByDay,
            morning_realism: morningRealism,
            groceries_needed: groceriesNeeded,
            major_this_week: majorThisWeek,
            want_rhythm_block: wantRhythmBlock,
            unclear_confirmations: confirmedUnclear,
            grocery_time_slot: groceryTimeSlot,
            prep_time_slot: prepTimeSlot,
            dinner_choices: dinnerChoices,
            laundry_choice: laundryChoice,
            cleaning_choice: cleaningChoice,
            cleaning_categories: cleaningCategories,
            home_extras: homeExtras,
            self_care_priorities: selfCarePriorities,
          },
        }),
      })
      if (!res.ok) throw new Error('finalize failed')
      const data = await res.json()
      setFinalResult(data)
      setStep('result')
      if (groceriesNeeded) {
        const dinnerNote = dinnerChoices.length ? `Preferred dinners this week: ${dinnerChoices.join(', ')}.` : ''
        fetch('/api/ai/weekly-meal-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: dinnerNote }) }).catch(() => {})
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
    <div className={styles.palette}>
      <AppLayout noPad className="pt-16">
        <div className="px-6 pb-nav">

          {step !== 'result' && (
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(244,235,212,0.9)' }}>
                <Sparkles className="h-5 w-5" style={{ color: '#5C4530' }} strokeWidth={1.8} />
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
              <button onClick={() => setStep('q_feeling')}
                className="w-full py-4 rounded-2xl font-semibold text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                Review my week <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {step === 'q_feeling' && (
            <div className="animate-fade-up">
              <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--depth)' }}>How do you want this week to feel?</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--mid)' }}>This shapes how much I actually pack into it.</p>
              <div className="mb-6"><ChoiceGrid columns={2} options={FEELING_OPTIONS} value={weekFeeling} onChange={setWeekFeeling} /></div>
              <div className="flex gap-3">
                <button onClick={() => setStep('intro')} className="flex-none px-5 py-4 rounded-2xl font-semibold" style={{ background: 'rgba(244,235,212,0.9)', color: '#5C4530' }}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={startGather} disabled={!weekFeeling} className="flex-1 py-4 rounded-2xl font-semibold text-white disabled:opacity-40" style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                  Continue <ArrowRight className="inline h-4 w-4 ml-1" />
                </button>
              </div>
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
                  <button onClick={startGather} className="px-6 py-3 rounded-2xl font-semibold" style={{ background: 'rgba(244,235,212,0.9)', color: '#5C4530' }}>
                    Try again
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 'review_week' && gather && (
            <div className="animate-fade-up space-y-4">
              <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--text-1)' }}>Here&apos;s what I found.</h2>

              <div className={`p-5 ${styles.card}`}>
                <p className="text-sm" style={{ color: 'var(--text-2)' }}>{gather.week_summary}</p>
              </div>

              {!!(gather.flagged_deadlines?.length) && (
                <div className={`p-5 ${styles.card}`}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>Flagged deadlines</p>
                  {gather.flagged_deadlines.map((d, i) => (
                    <p key={i} className="text-sm mb-1" style={{ color: 'var(--text-2)' }}>• {d}</p>
                  ))}
                </div>
              )}

              <div className={`p-5 ${styles.card}`}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>DRYP load</p>
                <p className="text-sm" style={{ color: 'var(--text-2)' }}>{gather.dryp_load_summary}</p>
              </div>

              {unclearEvents.length > 0 && (
                <div className={`p-5 ${styles.card}`}>
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
              <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--depth)' }}>Where do you actually want to work?</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--mid)' }}>Day by day — no assumptions.</p>
              <div className="space-y-5 mb-6">
                {LOCATION_DAYS.map(day => (
                  <div key={day}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>{day}</p>
                    <ChoiceGrid
                      columns={2}
                      options={WEEKDAY_LOCATION_OPTIONS[day]}
                      value={workLocationByDay[day] ?? (day === 'Wednesday' ? 'home' : null)}
                      onChange={v => setWorkLocationByDay(prev => ({ ...prev, [day]: v }))}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('review_week')} className="flex-none px-5 py-4 rounded-2xl font-semibold" style={{ background: 'rgba(244,235,212,0.9)', color: '#5C4530' }}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setStep('q_meeting_prep')} className="flex-1 py-4 rounded-2xl font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                  Continue <ArrowRight className="inline h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}

          {step === 'q_meeting_prep' && (
            <div className="animate-fade-up">
              <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--depth)' }}>Which days need full meeting-day prep?</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--mid)' }}>Pre-checked from your real calendar — adjust if I missed one.</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {WEEKDAYS.slice(0, 5).map(day => {
                  const isChecked = meetingPrepDays.includes(day)
                  return (
                    <button key={day} type="button" onClick={() => toggleMulti(setMeetingPrepDays, day)}
                      className="px-4 py-3 rounded-2xl text-sm font-semibold transition-all"
                      style={{ background: isChecked ? 'var(--violet-pale)' : 'rgba(244,235,212,0.6)', border: `1.5px solid ${isChecked ? 'var(--violet)' : 'rgba(180,150,100,0.2)'}`, color: isChecked ? '#5C4530' : '#5E5474' }}>
                      {day}
                    </button>
                  )
                })}
              </div>
              {candidateMeetingDays.length === 0 && (
                <p className="text-xs mb-6" style={{ color: 'var(--mist)' }}>No in-person or client meetings detected this week — check any day yourself if I missed one.</p>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep('q_location')} className="flex-none px-5 py-4 rounded-2xl font-semibold" style={{ background: 'rgba(244,235,212,0.9)', color: '#5C4530' }}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setStep('q_movement')} className="flex-1 py-4 rounded-2xl font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                  Continue <ArrowRight className="inline h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}

          {step === 'q_movement' && (
            <div className="animate-fade-up">
              <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--depth)' }}>Movement, day by day.</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--mid)' }}>No zero-movement days — gym or something real instead.</p>
              <div className="space-y-4 mb-6">
                {WEEKDAYS.map(day => {
                  const current = movementByDay[day] ?? 'gym'
                  const isGym = current === 'gym'
                  return (
                    <div key={day} className={`p-4 ${styles.card}`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold" style={{ color: 'var(--depth)' }}>{day}</p>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setMovementByDay(prev => ({ ...prev, [day]: 'gym' }))}
                            className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: isGym ? '#5C4530' : 'rgba(244,235,212,0.9)', color: isGym ? '#FFFFFF' : '#5C4530' }}>Gym</button>
                          <button type="button" onClick={() => setMovementByDay(prev => ({ ...prev, [day]: prev[day] && prev[day] !== 'gym' ? prev[day] : 'walk' }))}
                            className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: !isGym ? '#5C4530' : 'rgba(244,235,212,0.9)', color: !isGym ? '#FFFFFF' : '#5C4530' }}>Not gym</button>
                        </div>
                      </div>
                      {!isGym && (
                        <ChoiceGrid
                          columns={2}
                          options={[...MOVEMENT_ALTERNATIVES, REST_OPTION]}
                          value={current}
                          onChange={v => setMovementByDay(prev => ({ ...prev, [day]: v as MovementChoice }))}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('q_meeting_prep')} className="flex-none px-5 py-4 rounded-2xl font-semibold" style={{ background: 'rgba(244,235,212,0.9)', color: '#5C4530' }}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setStep('q_morning')} className="flex-1 py-4 rounded-2xl font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                  Continue <ArrowRight className="inline h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}

          {step === 'q_morning' && (
            <div className="animate-fade-up">
              <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--depth)' }}>How realistic are mornings this week?</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--mid)' }}>If it&apos;s busy, I&apos;ll compress your routine — never cut it.</p>
              <div className="mb-6"><ChoiceGrid columns={1} options={MORNING_REALISM_OPTIONS} value={morningRealism} onChange={setMorningRealism} /></div>
              <div className="flex gap-3">
                <button onClick={() => setStep('q_movement')} className="flex-none px-5 py-4 rounded-2xl font-semibold" style={{ background: 'rgba(244,235,212,0.9)', color: '#5C4530' }}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setStep('q_personal')} className="flex-1 py-4 rounded-2xl font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
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
                <button onClick={() => setStep('q_rhythm')} className="flex-none px-5 py-4 rounded-2xl font-semibold" style={{ background: 'rgba(244,235,212,0.9)', color: '#5C4530' }}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setStep(groceriesNeeded ? 'q_pantry_confirm' : 'q_laundry')} className="flex-1 py-4 rounded-2xl font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
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
                          <div key={s.name} className={`p-3 ${styles.card}`}>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-semibold" style={{ color: 'var(--depth)' }}>{s.name}</p>
                              {s.custom && (
                                <button type="button" onClick={() => removeCustomStaple(s)} aria-label={`Remove ${s.name}`}
                                  className="text-xs font-semibold" style={{ color: 'var(--mist)' }}>Remove</button>
                              )}
                            </div>
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
              {!pantryLoading && (
                <div className={`p-3 mb-2 ${styles.card}`}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>Add an item</p>
                  <div className="flex gap-2 mb-2">
                    <input
                      value={newStapleName}
                      onChange={e => setNewStapleName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addCustomStaple()}
                      placeholder="e.g. Frozen shrimp"
                      className="flex-1 px-3 py-2 rounded-xl text-sm"
                      style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(180,150,100,0.2)', color: '#100C1E' }}
                    />
                    <select
                      value={newStapleGroup}
                      onChange={e => setNewStapleGroup(e.target.value as StapleGroup)}
                      className="px-2 py-2 rounded-xl text-xs"
                      style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(180,150,100,0.2)', color: '#100C1E' }}
                    >
                      {STAPLE_GROUPS_ORDER.map(g => <option key={g} value={g}>{STAPLE_GROUP_LABEL[g]}</option>)}
                    </select>
                    <button type="button" onClick={addCustomStaple} disabled={addingStaple || !newStapleName.trim()}
                      className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                      style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                      {addingStaple ? '…' : 'Add'}
                    </button>
                  </div>
                </div>
              )}
              <div className="flex gap-3 mt-2">
                <button onClick={() => setStep('q_groceries')} className="flex-none px-5 py-4 rounded-2xl font-semibold" style={{ background: 'rgba(244,235,212,0.9)', color: '#5C4530' }}>
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
                <button onClick={() => setStep('q_pantry_confirm')} className="flex-none px-5 py-4 rounded-2xl font-semibold" style={{ background: 'rgba(244,235,212,0.9)', color: '#5C4530' }}>
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
                <button onClick={() => setStep(stapleNeedsGrocery ? 'q_grocery_time' : 'q_pantry_confirm')} className="flex-none px-5 py-4 rounded-2xl font-semibold" style={{ background: 'rgba(244,235,212,0.9)', color: '#5C4530' }}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setStep('q_dinner_choice')} className="flex-1 py-4 rounded-2xl font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                  Continue <ArrowRight className="inline h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}

          {step === 'q_dinner_choice' && (
            <div className="animate-fade-up">
              <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--depth)' }}>What dinners do you want this week?</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--mid)' }}>Pick as many as sound good — I&apos;ll place them across the week.</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {DINNER_OPTIONS.map(opt => {
                  const active = dinnerChoices.includes(opt)
                  return (
                    <button key={opt} type="button" onClick={() => toggleMulti(setDinnerChoices, opt)}
                      className="px-4 py-3 rounded-2xl text-sm font-semibold transition-all"
                      style={{ background: active ? 'var(--violet-pale)' : 'rgba(244,235,212,0.6)', border: `1.5px solid ${active ? 'var(--violet)' : 'rgba(180,150,100,0.2)'}`, color: active ? '#5C4530' : '#5E5474' }}>
                      {opt}
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('q_prep_time')} className="flex-none px-5 py-4 rounded-2xl font-semibold" style={{ background: 'rgba(244,235,212,0.9)', color: '#5C4530' }}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setStep('q_laundry')} className="flex-1 py-4 rounded-2xl font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                  Continue <ArrowRight className="inline h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}

          {step === 'q_personal' && (
            <div className="animate-fade-up">
              <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--depth)' }}>Anything major this week?</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--mid)' }}>A birthday, a trip, an event not yet on your calendar. Optional.</p>
              <div className={`p-5 mb-6 ${styles.card}`}>
                <SmartInput context="anything major this week — birthday, trip, event" placeholder="Nothing, or tell me what's coming up..." value={majorThisWeek} onChange={setMajorThisWeek} patternType="weekly" rows={3} autoSuggest={false} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('q_morning')} className="flex-none px-5 py-4 rounded-2xl font-semibold" style={{ background: 'rgba(244,235,212,0.9)', color: '#5C4530' }}>
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
                <button onClick={() => setStep('q_personal')} className="flex-none px-5 py-4 rounded-2xl font-semibold" style={{ background: 'rgba(244,235,212,0.9)', color: '#5C4530' }}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setStep('q_groceries')} className="flex-1 py-4 rounded-2xl font-semibold text-white transition-all active:scale-95 flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
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
                <button onClick={() => setStep(groceriesNeeded ? 'q_dinner_choice' : 'q_groceries')} className="flex-none px-5 py-4 rounded-2xl font-semibold" style={{ background: 'rgba(244,235,212,0.9)', color: '#5C4530' }}>
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
                          style={{ background: active ? 'var(--violet-pale)' : 'rgba(244,235,212,0.6)', border: `1px solid ${active ? 'var(--violet)' : 'rgba(180,150,100,0.2)'}`, color: active ? '#5C4530' : '#5E5474' }}>
                          {cat}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>Anything else this week? (optional)</p>
                <div className="flex flex-wrap gap-2">
                  {HOME_EXTRA_OPTIONS.map(opt => {
                    const active = homeExtras.includes(opt)
                    return (
                      <button key={opt} type="button" onClick={() => toggleMulti(setHomeExtras, opt)}
                        className="px-3 py-2 rounded-full text-xs font-semibold transition-all"
                        style={{ background: active ? 'var(--violet-pale)' : 'rgba(244,235,212,0.6)', border: `1px solid ${active ? 'var(--violet)' : 'rgba(180,150,100,0.2)'}`, color: active ? '#5C4530' : '#5E5474' }}>
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('q_laundry')} className="flex-none px-5 py-4 rounded-2xl font-semibold" style={{ background: 'rgba(244,235,212,0.9)', color: '#5C4530' }}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={saveHomeTasksAndContinue} disabled={!cleaningChoice || homeTasksSaving} className="flex-1 py-4 rounded-2xl font-semibold text-white transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40" style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                  {homeTasksSaving ? 'Saving…' : 'Continue'} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {step === 'q_selfcare' && (
            <div className="animate-fade-up">
              <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--depth)' }}>What self-care do you want protected this week?</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--mid)' }}>Weekends default to this first.</p>
              {selfCareOverdue.length > 0 && (
                <div className={`p-4 mb-6 ${styles.card}`}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>Actually due</p>
                  {selfCareOverdue.map((s, i) => (
                    <p key={i} className="text-sm mb-1" style={{ color: 'var(--text-2)' }}>• {s.label} — {s.dueLabel}</p>
                  ))}
                  <Link href="/wellness" style={{ fontSize: 12, color: 'var(--violet)', fontWeight: 600 }}>Open Wellness</Link>
                </div>
              )}
              <div className="flex flex-wrap gap-2 mb-6">
                {SELF_CARE_WEEK_OPTIONS.map(opt => {
                  const active = selfCarePriorities.includes(opt)
                  return (
                    <button key={opt} type="button" onClick={() => toggleMulti(setSelfCarePriorities, opt)}
                      className="px-4 py-3 rounded-2xl text-sm font-semibold transition-all"
                      style={{ background: active ? 'var(--violet-pale)' : 'rgba(244,235,212,0.6)', border: `1.5px solid ${active ? 'var(--violet)' : 'rgba(180,150,100,0.2)'}`, color: active ? '#5C4530' : '#5E5474' }}>
                      {opt}
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('q_cleaning')} className="flex-none px-5 py-4 rounded-2xl font-semibold" style={{ background: 'rgba(244,235,212,0.9)', color: '#5C4530' }}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setStep('q_money')} className="flex-1 py-4 rounded-2xl font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                  Continue <ArrowRight className="inline h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}

          {step === 'q_money' && (
            <div className="animate-fade-up">
              <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--depth)' }}>Your money, at a glance.</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--mid)' }}>Visibility only — nothing here becomes your task.</p>
              {moneyVisibilityLoading ? (
                <div className="text-center py-10">
                  <div className="w-12 h-12 rounded-full mx-auto mb-4 animate-breathe" style={{ background: 'radial-gradient(circle, rgba(201,169,110,0.4), rgba(201,169,110,0.1))' }} />
                  <p className="text-sm" style={{ color: 'var(--mist)' }}>Pulling this together…</p>
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  {moneyReview && (
                    <div className={`p-5 ${styles.card}`}>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--violet)' }}>Personal</p>
                      <p className="text-sm mb-2" style={{ color: 'var(--depth)' }}>Safe to spend: <span className="font-semibold">${moneyReview.safeToSpend.toFixed(0)}</span></p>
                      {moneyReview.billsDueThisWeek.length > 0 ? (
                        moneyReview.billsDueThisWeek.map((b, i) => (
                          <p key={i} className="text-xs mb-0.5" style={{ color: 'var(--mist)' }}>• {b.name}{b.expected_amount ? ` — $${b.expected_amount.toFixed(0)}` : ''} ({b.due_date})</p>
                        ))
                      ) : (
                        <p className="text-xs" style={{ color: 'var(--mist)' }}>No bills due this week.</p>
                      )}
                    </div>
                  )}
                  {moneyVisibility && moneyVisibility.incomeSources.length > 0 && (
                    <div className={`p-5 ${styles.card}`}>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--violet)' }}>Expected income</p>
                      {moneyVisibility.incomeSources.map((s, i) => (
                        <p key={i} className="text-xs mb-0.5" style={{ color: 'var(--mist)' }}>• {s.source_name} — ${s.amount.toFixed(0)}</p>
                      ))}
                    </div>
                  )}
                  {moneyVisibility && (
                    <div className={`p-5 ${styles.card}`}>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--violet)' }}>DRYP — awareness only</p>
                      <p className="text-xs mb-0.5" style={{ color: 'var(--mist)' }}>Current MRR: ${moneyVisibility.mrr.current.toFixed(0)} · expected next month: ${moneyVisibility.mrr.expected_next_month.toFixed(0)}</p>
                      <p className="text-xs" style={{ color: 'var(--mist)' }}>Money in this month: ${moneyVisibility.cashFlowIn.toFixed(0)}</p>
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep('q_selfcare')} className="flex-none px-5 py-4 rounded-2xl font-semibold" style={{ background: 'rgba(244,235,212,0.9)', color: '#5C4530' }}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={finalize} className="flex-1 py-4 rounded-2xl font-semibold text-white transition-all active:scale-95 flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                  <Sparkles className="h-4 w-4" /> Build my week
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
                  <button onClick={finalize} className="px-6 py-3 rounded-2xl font-semibold" style={{ background: 'rgba(244,235,212,0.9)', color: '#5C4530' }}>
                    Try again
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 'result' && finalResult && (
            <div className="animate-fade-up space-y-4">
              <h2 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-1)' }}>Your week.</h2>

              <div className={`p-5 ${styles.card}`}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>Top 3 business</p>
                {finalResult.top_3_business.map((t, i) => (
                  <div key={i} className="flex items-start gap-2 py-1.5">
                    <span className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#F4F0FA', color: '#5C4530' }}>{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--depth)' }}>{t.title}</p>
                      <p className="text-xs" style={{ color: 'var(--mist)' }}>{t.reason}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className={`p-5 ${styles.card}`}>
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

              {!!(gather?.pipeline_note) && (
                <div className={`p-5 ${styles.card}`}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>What you only need awareness of</p>
                  <p className="text-sm" style={{ color: 'var(--text-2)' }}>{gather.pipeline_note}</p>
                </div>
              )}

              <div className={`p-5 ${styles.card}`}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>What belongs to the team</p>
                <p className="text-sm" style={{ color: 'var(--text-2)' }}>Every DRYP task above is already confirmed yours — nothing assigned to the rest of the team gets placed on your week.</p>
              </div>

              {WEEKDAYS.map(day => {
                const d = finalResult.days[day]
                if (!d) return null
                return (
                  <div key={day} className={`p-5 ${styles.card}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-display text-base font-semibold" style={{ color: 'var(--depth)' }}>{day}</p>
                      <button type="button" onClick={() => cycleWorkLocation(day, d.work_location)}
                        className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: '#F4F0FA', color: '#5C4530', border: 'none', cursor: 'pointer' }}>
                        {d.work_location === 'home' ? 'Home' : d.work_location === 'office' ? 'Office' : 'Off'}
                      </button>
                    </div>
                    {d.meetings?.map((m, i) => (
                      <p key={i} className="text-xs mb-1" style={{ color: 'var(--text-2)' }}>
                        {m.time} — {m.title} <span style={{ color: 'var(--mist)' }}>({LOCATION_LABEL[m.locationType] ?? m.locationType})</span>
                      </p>
                    ))}
                    {d.work_blocks?.map((w, i) => (
                      <p key={i} className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>{w.time} · {w.label}</p>
                    ))}
                    <div className="text-xs mt-2 flex items-center gap-1" style={{ color: 'var(--mist)' }}>
                      <Dumbbell className="h-3 w-3" />
                      {editingField === `${day}:gym_focus` ? (
                        <input autoFocus value={editFieldValue} onChange={e => setEditFieldValue(e.target.value)}
                          onBlur={() => saveFieldEdit(day, 'gym_focus')} onKeyDown={e => e.key === 'Enter' && saveFieldEdit(day, 'gym_focus')}
                          className="flex-1 text-xs px-1 py-0.5 rounded" style={{ border: '1px solid rgba(180,150,100,0.3)', background: 'white', color: '#100C1E' }} />
                      ) : (
                        <span onClick={() => { setEditingField(`${day}:gym_focus`); setEditFieldValue(d.gym_focus ?? '') }} style={{ cursor: 'pointer' }}>{d.gym_focus}</span>
                      )}
                    </div>
                    {d.meals && (
                      <div className="text-xs mt-1 flex flex-wrap gap-1" style={{ color: 'var(--mist)' }}>
                        {(['breakfast', 'lunch', 'dinner'] as const).map((mf, i) => (
                          <span key={mf} style={{ display: 'flex', alignItems: 'center' }}>
                            {i > 0 && <span className="mx-1">·</span>}
                            {editingField === `${day}:meals:${mf}` ? (
                              <input autoFocus value={editFieldValue} onChange={e => setEditFieldValue(e.target.value)}
                                onBlur={() => saveFieldEdit(day, undefined, mf)} onKeyDown={e => e.key === 'Enter' && saveFieldEdit(day, undefined, mf)}
                                className="text-xs px-1 py-0.5 rounded" style={{ width: 110, border: '1px solid rgba(180,150,100,0.3)', background: 'white', color: '#100C1E' }} />
                            ) : (
                              <span onClick={() => { setEditingField(`${day}:meals:${mf}`); setEditFieldValue(d.meals[mf] ?? '') }} style={{ cursor: 'pointer' }}>{d.meals[mf]}</span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                    {!!d.travel?.length && (
                      <p className="text-xs mt-1 flex items-start gap-1" style={{ color: 'var(--mist)' }}>
                        🚗 {d.travel.join(' · ')}
                      </p>
                    )}
                  </div>
                )
              })}

              <div className={`p-5 flex flex-col gap-3 ${styles.card}`}>
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
                    <button onClick={() => markHomeTaskDone('laundry')} className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: '#F4F0FA', color: '#5C4530' }}>Mark done</button>
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
                      <button onClick={() => markHomeTaskDone('cleaning')} className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: '#F4F0FA', color: '#5C4530' }}>Mark done</button>
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

              {foodPlanPreview ? (
                <Link href="/food/groceries" className="block">
                  <div className={`p-5 flex items-center justify-between ${styles.card}`}>
                    <div className="flex items-center gap-2">
                      <ShoppingBasket className="h-4 w-4" style={{ color: 'var(--violet)' }} />
                      <span className="text-xs" style={{ color: 'var(--text-2)' }}>
                        {foodPlanPreview.mealCount} meals planned · {foodPlanPreview.groceryCount} grocery items
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4" style={{ color: 'var(--mist)' }} />
                  </div>
                </Link>
              ) : groceriesNeeded && (
                <Link href="/food" className="block">
                  <div className={`p-5 flex items-center justify-between ${styles.card}`}>
                    <span className="text-xs" style={{ color: 'var(--text-2)' }}>No meal plan built yet this week — generate one in Food</span>
                    <ArrowRight className="h-4 w-4" style={{ color: 'var(--mist)' }} />
                  </div>
                </Link>
              )}

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
                <p className="font-display text-base italic" style={{ color: '#100C1E' }}>&ldquo;{closingResult.affirmation}&rdquo;</p>
              </div>
              {closingResult.intention_for_week && (
                <div className={`p-5 ${styles.card}`}>
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
