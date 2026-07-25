'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Briefcase,
  Coffee,
  Dumbbell,
  Heart,
  MoonStar,
  ShirtIcon,
  Sunrise,
  Utensils,
} from 'lucide-react'

import { GreetingHeader, dayIndex, useTodayContext } from '@/components/home/GreetingHeader'
import { TodayContextualDock } from '@/components/home/TodayContextualDock'
import { ZOE_EXERCISES_BY_DAY, ZOE_GYM_BY_DAY, ZOE_HERO_FOCUS_BY_DAY } from '@/lib/luna/zoeLifestyleProfile'
import { AppLayout } from '@/components/layout/AppLayout'
import { TODAY_MEALS } from '@/lib/luna/todayMeals'
import { TODAY_DOCK_CATEGORIES } from '@/lib/luna/todayDock'
import styles from './LunaTodayPage.module.css'

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
  const scrollerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/atelier/daily-outfit', { cache: 'no-store' })
      .then(res => res.json())
      .then(setOutfit)
      .catch(() => setOutfit(null))
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

  const idx = dayIndex()
  const focus = (now && ZOE_HERO_FOCUS_BY_DAY[now.weekday]) ?? ZOE_HERO_FOCUS_BY_DAY.Monday
  const gymFocusName = (now && ZOE_GYM_BY_DAY[now.weekday]) ?? ZOE_GYM_BY_DAY.Monday
  const exercises = (now && ZOE_EXERCISES_BY_DAY[now.weekday]) ?? ZOE_EXERCISES_BY_DAY.Monday
  const forYou = FOR_YOU_TODAY[idx % FOR_YOU_TODAY.length]
  const activeCategory = TODAY_DOCK_CATEGORIES[slideIndex] ?? TODAY_DOCK_CATEGORIES[0]

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
                  {TODAY_MEALS.map(meal => (
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
                <p className={styles.workTime}>10:30 AM – 5:30 PM</p>
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

        <TodayContextualDock category={activeCategory} />
      </div>
    </AppLayout>
  )
}
