'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  Briefcase,
  Check,
  Coffee,
  Dumbbell,
  Heart,
  MoonStar,
  Moon,
  ShirtIcon,
  Sunrise,
  Utensils,
} from 'lucide-react'

import { GreetingHeader, dayIndex, useTodayContext } from '@/components/home/GreetingHeader'
import { TodayContextualDock } from '@/components/home/TodayContextualDock'
import { SmartInput } from '@/components/ui/SmartInput'
import { ZOE_EXERCISES_BY_DAY, ZOE_GYM_BY_DAY, ZOE_HERO_FOCUS_BY_DAY } from '@/lib/luna/zoeLifestyleProfile'
import { AppLayout } from '@/components/layout/AppLayout'
import { TODAY_MEALS } from '@/lib/luna/todayMeals'
import { imageForMeal } from '@/lib/luna/mealImages'
import { TODAY_DOCK_CATEGORIES } from '@/lib/luna/todayDock'
import styles from './LunaTodayPage.module.css'

const MORNING_MESSAGES = [
  "One good morning becomes one good day. You've got this.",
  'Slow down for five minutes — the day still has your back.',
  "You showed up before the sun did. That's already a win.",
  "Today doesn't need to be perfect, just yours.",
  'Small steps this morning, big momentum by tonight.',
  "You're allowed to feel proud of the routine you're building.",
  'Breathe. Drink your tea. The rest will follow.',
]

interface WeeklyMealEntry { day: string; meal: string }
interface WeeklyPlanJson { breakfasts?: WeeklyMealEntry[]; dinners?: WeeklyMealEntry[] }
interface WeeklyPlanRow { plan_json: WeeklyPlanJson }

type DayBlock = 'morning' | 'gym' | 'work' | 'evening' | 'night'

function blockForHour(hour: number): DayBlock {
  if (hour < 6) return 'morning'
  if (hour < 10) return 'gym'
  if (hour < 18) return 'work'
  if (hour < 21) return 'evening'
  return 'night'
}

function todayKey(): string {
  return new Date().toDateString()
}

const FOR_YOU_TODAY = [
  { title: 'Sunset Walk', tags: ['Movement', 'Fresh air', 'Reset your mind'], cta: 'Protect your peace', image: '/images/rooms/travel.jpg' },
  { title: 'Ten Minutes of Quiet', tags: ['Stillness', 'Breath work', 'No screens'], cta: 'Protect your peace', image: '/images/rooms/wellness.jpg' },
  { title: 'Call Someone You Love', tags: ['Connection', 'Presence', 'Warmth'], cta: 'Protect your peace', image: '/images/rooms/travel.jpg' },
]

const SWATCH_COLORS = ['#4a3d33', '#7a746c', '#c9b393']

interface DailyOutfit { occasion?: string; outfit_caption?: string; image_url?: string | null }
interface AstrologyGuidance { horoscope?: string; energy?: string }

export function LunaTodayPage() {
  const { now, weather, weatherError } = useTodayContext()
  const [outfit, setOutfit] = useState<DailyOutfit | null>(null)
  const [openTaskCount, setOpenTaskCount] = useState<number | null>(null)
  const [guidance, setGuidance] = useState<AstrologyGuidance | null>(null)
  const [slideIndex, setSlideIndex] = useState(0)
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanRow | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [reflectChecked, setReflectChecked] = useState<Set<string>>(new Set())
  const [reflectSummary, setReflectSummary] = useState('')
  const [reflectSaved, setReflectSaved] = useState(false)
  const [reflectSaveError, setReflectSaveError] = useState(false)
  const scrollerRef = useRef<HTMLDivElement>(null)

  // Reflection state is per-day and local — loaded from localStorage only
  // after mount (server always prerenders with no localStorage; reading it
  // during render causes a hydration mismatch, same issue documented on
  // the Wellness page).
  useEffect(() => {
    try {
      const key = todayKey()
      const savedChecked = localStorage.getItem(`luna_reflect_checked_${key}`)
      if (savedChecked) setReflectChecked(new Set(JSON.parse(savedChecked)))
      const savedSubmitted = localStorage.getItem(`luna_reflect_saved_${key}`)
      if (savedSubmitted === '1') setReflectSaved(true)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetch('/api/atelier/daily-outfit', { cache: 'no-store' })
      .then(res => res.json())
      .then(setOutfit)
      .catch(() => setOutfit(null))

    fetch('/api/food/weekly-plan', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setWeeklyPlan(data?.plan ?? null))
      .catch(() => setWeeklyPlan(null))
  }, [])

  useEffect(() => {
    fetch('/api/home/summary', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setOpenTaskCount(data?.tasks?.totalOpen ?? 0))
      .catch(() => setOpenTaskCount(null))

    fetch('/api/astrology/daily-guidance', { cache: 'no-store' })
      .then(res => res.json())
      .then(setGuidance)
      .catch(() => setGuidance(null))
  }, [])

  function handleScroll() {
    const el = scrollerRef.current
    if (!el || el.clientWidth === 0) return
    setSlideIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  function goToSlide(i: number) {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  function toggleReflectItem(id: string) {
    setReflectChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      try { localStorage.setItem(`luna_reflect_checked_${todayKey()}`, JSON.stringify([...next])) } catch { /* ignore */ }
      return next
    })
  }

  async function saveReflection(items: { id: string; label: string }[]) {
    if (!reflectSummary.trim()) return
    const done = items.filter(i => reflectChecked.has(i.id)).map(i => i.label)
    const skipped = items.filter(i => !reflectChecked.has(i.id)).map(i => i.label)
    setReflectSaveError(false)
    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_type: 'daily_reflection',
          content: reflectSummary.trim(),
          tags: done,
        }),
      })
      if (!res.ok) { setReflectSaveError(true); return }
    } catch { setReflectSaveError(true); return }
    setReflectSaved(true)
    try {
      localStorage.setItem(`luna_reflect_saved_${todayKey()}`, '1')
      localStorage.setItem(`luna_reflect_skipped_${todayKey()}`, JSON.stringify(skipped))
    } catch { /* ignore */ }
  }

  // dayIndex() reads the local calendar day, which can disagree between
  // Vercel's UTC server clock and Zoe's Eastern-time browser clock —
  // calling it unconditionally during render caused a text-mismatch
  // hydration error (React #418) that broke click handlers app-wide. Only
  // use the real value once `now` exists (client-only, post-mount), same
  // guard already used for the weekday-based values below.
  const idx = now ? dayIndex() : 0
  const focus = (now && ZOE_HERO_FOCUS_BY_DAY[now.weekday]) ?? ZOE_HERO_FOCUS_BY_DAY.Monday
  const gymFocusName = (now && ZOE_GYM_BY_DAY[now.weekday]) ?? ZOE_GYM_BY_DAY.Monday
  const exercises = (now && ZOE_EXERCISES_BY_DAY[now.weekday]) ?? ZOE_EXERCISES_BY_DAY.Monday
  const forYou = FOR_YOU_TODAY[idx % FOR_YOU_TODAY.length]
  const activeCategory = TODAY_DOCK_CATEGORIES[slideIndex] ?? TODAY_DOCK_CATEGORIES[0]
  const morningMessage = MORNING_MESSAGES[idx % MORNING_MESSAGES.length]

  const plannedBreakfast = now
    ? weeklyPlan?.plan_json.breakfasts?.find(m => m.day === now.weekday)?.meal
    : undefined
  const breakfastTitle = plannedBreakfast ?? TODAY_MEALS.find(m => m.mealType === 'breakfast')?.title ?? 'Breakfast'
  const breakfastImage = plannedBreakfast ? imageForMeal(plannedBreakfast) : (TODAY_MEALS.find(m => m.mealType === 'breakfast')?.image ?? '/images/rooms/food.jpg')

  const plannedDinner = now
    ? weeklyPlan?.plan_json.dinners?.find(m => m.day === now.weekday)?.meal
    : undefined
  const dinnerTitle = plannedDinner ?? TODAY_MEALS.find(m => m.mealType === 'dinner')?.title ?? 'Dinner'
  const dinnerImage = plannedDinner ? imageForMeal(plannedDinner) : (TODAY_MEALS.find(m => m.mealType === 'dinner')?.image ?? '/images/rooms/food.jpg')

  const todaySlideMeals = TODAY_MEALS.map(meal => {
    if (meal.mealType === 'breakfast' && plannedBreakfast) return { ...meal, title: breakfastTitle, image: breakfastImage }
    if (meal.mealType === 'dinner' && plannedDinner) return { ...meal, title: dinnerTitle, image: dinnerImage }
    return meal
  })

  const block = blockForHour(now?.hour ?? 7)

  const reflectItems = [
    { id: 'morning', label: 'Morning Routine', sub: 'Wake up, shower, get ready' },
    { id: 'breakfast', label: 'Breakfast', sub: breakfastTitle },
    { id: 'gym', label: 'Gym', sub: gymFocusName },
    { id: 'outfit', label: 'Outfit', sub: outfit?.occasion ?? "Today's outfit" },
    { id: 'work', label: 'Work Focus Block', sub: openTaskCount != null ? `${openTaskCount} tasks were still open` : 'Focus block' },
    { id: 'dinner', label: 'Dinner', sub: dinnerTitle },
    { id: 'reset', label: forYou.title, sub: 'Evening reset' },
  ]

  return (
    <AppLayout noPad noScroll hideBottomNav>
      <div className={styles.page}>
        <GreetingHeader now={now} weather={weather} weatherError={weatherError} backHref="/home" />

        <Link href="/plan-my-day" className={styles.hero}>
          <Image src="/images/today/hero.jpg" alt={gymFocusName} fill sizes="(max-width: 640px) 100vw, 640px" priority />
          <div className={styles.heroOverlay} />
          <div className={styles.heroContent}>
            <div className={styles.heroLabel}>Today&apos;s Focus</div>
            <h2>{focus.title} {focus.emoji}</h2>
            <p>{focus.subtitle}</p>
          </div>
        </Link>

        {!expanded ? (
          <div className={styles.blockCard}>
            {block === 'morning' && (
              <>
                <button type="button" className={styles.blockRow} onClick={() => setExpanded(true)}>
                  <div className={styles.blockRowPhoto}><Image src="/images/today/morning.jpg" alt="" fill sizes="90px" /></div>
                  <div className={styles.blockRowText}>
                    <span className={styles.blockRowLabel}><Sunrise size={12} /> Morning Plan</span>
                    <p className={styles.blockRowTitle}>Wake up, shower, get ready</p>
                    <p className={styles.blockRowSub}>Then oatmeal + hot tea <Coffee size={11} style={{ display: 'inline', verticalAlign: '-1px' }} /></p>
                  </div>
                </button>
                <Link href="/style" className={`${styles.blockRow} ${styles.blockRowReverse}`}>
                  <div className={styles.blockRowText}>
                    <span className={styles.blockRowLabel}><ShirtIcon size={12} /> Outfit</span>
                    <p className={styles.blockRowTitle}>{outfit?.occasion ?? 'Loading…'}</p>
                    <p className={styles.blockRowSub}>{outfit?.outfit_caption ?? ''}</p>
                  </div>
                  <div className={styles.blockRowPhoto}><Image src={outfit?.image_url || '/images/outfits/streetwear-01.jpg'} alt="" fill sizes="90px" /></div>
                </Link>
                <Link href="/food" className={styles.blockRow}>
                  <div className={styles.blockRowPhoto}><Image src={breakfastImage} alt="" fill sizes="90px" /></div>
                  <div className={styles.blockRowText}>
                    <span className={styles.blockRowLabel}><Utensils size={12} /> Breakfast</span>
                    <p className={styles.blockRowTitle}>{breakfastTitle}</p>
                  </div>
                </Link>
              </>
            )}

            {block === 'gym' && (
              <>
                <button type="button" className={styles.blockRow} onClick={() => setExpanded(true)}>
                  <div className={styles.blockRowPhoto}><Image src="/images/today/gym.jpg" alt="" fill sizes="90px" /></div>
                  <div className={styles.blockRowText}>
                    <span className={styles.blockRowLabel}><Dumbbell size={12} /> Gym Time</span>
                    <p className={styles.blockRowTitle}>{gymFocusName}</p>
                  </div>
                </button>
                <div className={`${styles.blockRow} ${styles.blockRowReverse}`}>
                  <div className={styles.blockRowText}>
                    <span className={styles.blockRowLabel}>Today&apos;s Exercises</span>
                    {exercises.slice(0, 4).map(ex => <p key={ex} className={styles.blockRowSub}>&middot; {ex}</p>)}
                  </div>
                </div>
              </>
            )}

            {block === 'work' && (
              <>
                <button type="button" className={styles.blockRow} onClick={() => setExpanded(true)}>
                  <div className={styles.blockRowPhoto}><Image src="/images/today/work.jpg" alt="" fill sizes="90px" /></div>
                  <div className={styles.blockRowText}>
                    <span className={styles.blockRowLabel}><Briefcase size={12} /> Work Focus</span>
                    <p className={styles.blockRowTitle}>10:00 AM – 6:00 PM</p>
                    <p className={styles.blockRowSub}>{openTaskCount != null ? `${openTaskCount} open tasks` : 'Loading…'}</p>
                  </div>
                </button>
                <Link href="/work" className={`${styles.blockRow} ${styles.blockRowReverse}`}>
                  <div className={styles.blockRowText}>
                    <span className={styles.blockRowLabel}>Right Now</span>
                    <p className={styles.blockRowTitle}>Focus block. Let&apos;s get it done.</p>
                  </div>
                </Link>
              </>
            )}

            {block === 'evening' && (
              <>
                <Link href="/food" className={styles.blockRow}>
                  <div className={styles.blockRowPhoto}><Image src={dinnerImage} alt="" fill sizes="90px" /></div>
                  <div className={styles.blockRowText}>
                    <span className={styles.blockRowLabel}><Utensils size={12} /> Dinner</span>
                    <p className={styles.blockRowTitle}>{dinnerTitle}</p>
                  </div>
                </Link>
                <button type="button" className={`${styles.blockRow} ${styles.blockRowReverse}`} onClick={() => setExpanded(true)}>
                  <div className={styles.blockRowText}>
                    <span className={styles.blockRowLabel}><Moon size={12} /> Reset</span>
                    <p className={styles.blockRowTitle}>{forYou.title}</p>
                  </div>
                  <div className={styles.blockRowPhoto}><Image src={forYou.image} alt="" fill sizes="90px" /></div>
                </button>
              </>
            )}

            {block === 'night' && (
              <div className={styles.reflectWrap}>
                <div className={styles.reflectHeader}><MoonStar size={13} /> Reflect on the Day</div>
                <p className={styles.reflectHint}>Check off what actually happened today, then sum it up — Luna uses this to help plan tomorrow.</p>
                <div className={styles.reflectChecklist}>
                  {reflectItems.map(item => {
                    const done = reflectChecked.has(item.id)
                    return (
                      <button key={item.id} type="button" className={styles.reflectItem} onClick={() => toggleReflectItem(item.id)}>
                        <span className={done ? styles.reflectCheckDone : styles.reflectCheck}>{done && <Check size={11} />}</span>
                        <span className={styles.reflectItemText}>
                          <strong>{item.label}</strong>
                          <span>{item.sub}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>

                {reflectSaved ? (
                  <p className={styles.reflectSavedMsg}><Check size={13} /> Saved — this is in your journal for tomorrow.</p>
                ) : (
                  <>
                    <SmartInput
                      context="daily reflection — how did today actually go, and what happened during each part of your day"
                      placeholder="A few sentences on how today really went…"
                      value={reflectSummary}
                      onChange={setReflectSummary}
                      patternType="night"
                      rows={3}
                      autosaveKey="today_reflection"
                    />
                    <button type="button" className={styles.reflectSaveButton} onClick={() => saveReflection(reflectItems)} disabled={!reflectSummary.trim()}>
                      Save Reflection
                    </button>
                    {reflectSaveError && <p className={styles.reflectErrorMsg}>Couldn&apos;t save that — check your connection and try again.</p>}
                  </>
                )}
                <button type="button" className={styles.rightNowSummaryLink} onClick={() => setExpanded(true)} style={{ background: 'none', border: 'none' }}>
                  Review Today&apos;s Blocks <ArrowRight size={12} />
                </button>
              </div>
            )}

            {block !== 'night' && (
              <>
                <p className={styles.rightNowMessage}><Heart size={11} /> {morningMessage}</p>
                <Link href="/plan-my-day" className={styles.rightNowSummaryLink}>View Full Day Summary <ArrowRight size={12} /></Link>
              </>
            )}
          </div>
        ) : (
        <>
        <button type="button" className={styles.collapseBar} onClick={() => setExpanded(false)}>&larr; Back to Right Now</button>
        <div className={styles.todayPager} ref={scrollerRef} onScroll={handleScroll}>
          <div className={styles.todaySlide}>
            <Link href="/plan-my-day" className={styles.slideCard}>
              <div className={styles.slidePhoto}><Image src="/images/today/morning.jpg" alt="" fill sizes="(max-width: 640px) 100vw, 640px" /></div>
              <div className={styles.slideBody}>
                <div className={styles.cardHeader}><Sunrise size={15} /><span>Morning Plan</span></div>
                <div className={styles.timeline}>
                  <div className={styles.timelineRow}>
                    <span className={styles.timelineTime}>5:00 AM</span>
                    <span className={styles.timelineDot} />
                    <span className={styles.timelineLabel}>Wake up, shower, get ready</span>
                  </div>
                  <div className={styles.timelineRow}>
                    <span className={styles.timelineTime}>5:20 AM</span>
                    <span className={styles.timelineDot} />
                    <span className={styles.timelineLabel}>Oatmeal + blueberries, hot tea <Coffee size={11} style={{ display: 'inline', verticalAlign: '-1px' }} /></span>
                  </div>
                  <div className={styles.timelineRow}>
                    <span className={styles.timelineTime}>5:45 AM</span>
                    <span className={styles.timelineDot} />
                    <span className={styles.timelineLabel}>Gym time <Dumbbell size={11} style={{ display: 'inline', verticalAlign: '-1px' }} /></span>
                  </div>
                </div>
                <span className={styles.cardLink}>View full morning</span>
              </div>
            </Link>
          </div>

          <div className={styles.todaySlide}>
            <Link href="/fitness" className={styles.slideCard}>
              <div className={styles.slidePhoto}><Image src="/images/today/gym.jpg" alt="" fill sizes="(max-width: 640px) 100vw, 640px" /></div>
              <div className={styles.slideBody}>
                <div className={styles.cardHeader}><Dumbbell size={15} /><span>Gym</span></div>
                <p className={styles.gymFocusName}>{gymFocusName}</p>
                <ul className={styles.gymList}>
                  {exercises.slice(0, 5).map(ex => <li key={ex}>&middot; {ex}</li>)}
                </ul>
                <span className={styles.cardLink}>View full workout</span>
              </div>
            </Link>
          </div>

          <div className={styles.todaySlide}>
            <Link href="/food" className={styles.slideCard}>
              <div className={styles.slidePhoto}><Image src="/images/today/meals.jpg" alt="" fill sizes="(max-width: 640px) 100vw, 640px" /></div>
              <div className={styles.slideBody}>
                <div className={styles.cardHeader}><Utensils size={15} /><span>Meals</span></div>
                <div className={styles.mealsList}>
                  {todaySlideMeals.map(meal => (
                    <div key={meal.id} className={styles.mealsRow}>
                      <div className={styles.mealThumb}><Image src={meal.image} alt={meal.title} fill sizes="34px" /></div>
                      <div>
                        <p>{meal.label}</p>
                        <p>{meal.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <span className={styles.cardLink}>View all meals</span>
              </div>
            </Link>
          </div>

          <div className={styles.todaySlide}>
            <Link href="/style" className={styles.slideCard}>
              <div className={styles.slidePhoto}><Image src="/images/today/outfit.jpg" alt="" fill sizes="(max-width: 640px) 100vw, 640px" /></div>
              <div className={styles.slideBody}>
                <div className={styles.cardHeader}><ShirtIcon size={15} /><span>Today&apos;s Outfit</span></div>
                <div className={styles.outfitRow}>
                  <div className={styles.outfitPhoto}>
                    <Image src={outfit?.image_url || '/images/rooms/outfit-sporty.jpg'} alt={outfit?.outfit_caption ?? 'Today\'s outfit'} fill sizes="72px" />
                  </div>
                  <div className={styles.outfitTags}>
                    <span>{outfit?.occasion ?? 'Sporty'}</span>
                    <span>Clean</span>
                    <span>Confident</span>
                    <div className={styles.swatches}>
                      {SWATCH_COLORS.map(c => <span key={c} className={styles.swatch} style={{ background: c }} />)}
                    </div>
                  </div>
                </div>
                <span className={styles.cardLink}>See all outfits</span>
              </div>
            </Link>
          </div>

          <div className={styles.todaySlide}>
            <Link href="/work" className={styles.slideCard}>
              <div className={styles.slidePhoto}><Image src="/images/today/work.jpg" alt="" fill sizes="(max-width: 640px) 100vw, 640px" /></div>
              <div className={styles.slideBody}>
                <div className={styles.cardHeader}><Briefcase size={15} /><span>Work</span></div>
                <p className={styles.workTime}>10:00 AM – 6:00 PM</p>
                <p className={styles.workNote}>Focus block. Let&apos;s get it done.</p>
                <div className={styles.progressTrack}><div className={styles.progressFill} style={{ width: '8%' }} /></div>
                <p className={styles.workCount}>{openTaskCount != null ? `${openTaskCount} open tasks` : 'Loading tasks…'}</p>
                <span className={styles.cardLink}>Open work dashboard</span>
              </div>
            </Link>
          </div>

          <div className={styles.todaySlide}>
            <Link href="/wellness" className={styles.slideCard}>
              <div className={styles.slidePhoto}><Image src="/images/today/wellness.jpg" alt="" fill sizes="(max-width: 640px) 100vw, 640px" /></div>
              <div className={styles.slideBody}>
                <div className={styles.cardHeader}><Heart size={15} /><span>For You Today</span></div>
                <div className={styles.forYouRow}>
                  <div className={styles.forYouPhoto}><Image src={forYou.image} alt={forYou.title} fill sizes="72px" /></div>
                  <div className={styles.forYouTags}>
                    <strong>{forYou.title}</strong>
                    {forYou.tags.map(t => <span key={t}>{t}</span>)}
                  </div>
                </div>
                <span className={styles.cardLink}>{forYou.cta}</span>
              </div>
            </Link>
          </div>

          <div className={styles.todaySlide}>
            <Link href="/astrology" className={styles.slideCard}>
              <div className={styles.slidePhoto}><Image src="/images/today/astrology.jpg" alt="" fill sizes="(max-width: 640px) 100vw, 640px" /></div>
              <div className={styles.slideBody}>
                <div className={styles.cardHeader}><MoonStar size={15} /><span>Daily Astrology</span></div>
                <p className={styles.astrologyText}>{guidance?.horoscope ?? guidance?.energy ?? 'Your daily reading is syncing…'}</p>
                <span className={styles.cardLink}>Open astrology</span>
              </div>
            </Link>
          </div>
        </div>

        <div className={styles.dots}>
          {TODAY_DOCK_CATEGORIES.map((cat, i) => (
            <button
              key={cat.id}
              type="button"
              className={`${styles.dot} ${i === slideIndex ? styles.dotActive : ''}`}
              onClick={() => goToSlide(i)}
              aria-label={cat.label}
            />
          ))}
        </div>
        </>
        )}

        {expanded ? <TodayContextualDock category={activeCategory} /> : <TodayContextualDock onExpand={() => setExpanded(true)} />}
      </div>
    </AppLayout>
  )
}
