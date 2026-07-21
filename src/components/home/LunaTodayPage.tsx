'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Bell,
  Briefcase,
  Cloud,
  CloudRain,
  Coffee,
  Dumbbell,
  Heart,
  MoonStar,
  ShirtIcon,
  Sparkles,
  Sun,
  Sunrise,
  Utensils,
  Wind,
} from 'lucide-react'

import { AppLayout } from '@/components/layout/AppLayout'
import { useLocation } from '@/hooks/useLocation'
import { ZOE_EXERCISES_BY_DAY, ZOE_GYM_BY_DAY } from '@/lib/luna/zoeLifestyleProfile'
import { TODAY_MEALS } from '@/lib/luna/todayMeals'
import styles from './LunaTodayPage.module.css'

const QUOTES = [
  'Discipline creates freedom.',
  'What you do today can improve all your tomorrows.',
  'Small steps, taken daily, become a life you’re proud of.',
  'You do not have to see the whole staircase, just take the first step.',
  'Slow is smooth, and smooth is fast.',
  'Clarity comes from action, not thought.',
  'The way you do anything is the way you do everything.',
]

const HERO_FOCUS: Record<string, { emoji: string; title: string; subtitle: string }> = {
  Monday: { emoji: '🍑', title: 'Glute Growth Monday', subtitle: 'Move with purpose. The results follow.' },
  Tuesday: { emoji: '💪', title: 'Sexy Back Tuesday', subtitle: 'Pull, row, and build the back you love.' },
  Wednesday: { emoji: '🔥', title: 'Glute Pump Wednesday', subtitle: 'Light weight, high pump. Feel it work.' },
  Thursday: { emoji: '✨', title: 'Shoulder Sculpt Thursday', subtitle: 'Definition day. Small moves, big difference.' },
  Friday: { emoji: '🍑', title: 'Glute Growth Friday', subtitle: 'Heavy day. Finish the week strong.' },
  Saturday: { emoji: '⚡', title: 'Full Body Saturday', subtitle: 'One workout, everything included.' },
  Sunday: { emoji: '🌊', title: 'Recovery Sunday', subtitle: 'Walk, stretch, and let your body reset.' },
}

const FOR_YOU_TODAY = [
  { title: 'Sunset Walk', tags: ['Movement', 'Fresh air', 'Reset your mind'], cta: 'Protect your peace', image: '/images/rooms/travel.png' },
  { title: 'Ten Minutes of Quiet', tags: ['Stillness', 'Breath work', 'No screens'], cta: 'Protect your peace', image: '/images/rooms/wellness.png' },
  { title: 'Call Someone You Love', tags: ['Connection', 'Presence', 'Warmth'], cta: 'Protect your peace', image: '/images/rooms/travel.png' },
]

const SWATCH_COLORS = ['#4a3d33', '#7a746c', '#c9b393']

function dayIndex(): number {
  const start = new Date(new Date().getFullYear(), 0, 0).getTime()
  return Math.floor((Date.now() - start) / 86_400_000)
}

function getGreeting(hour: number): string {
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  if (hour < 21) return 'Good Evening'
  return 'Good Night'
}

function weatherIconFor(forecast: string) {
  const f = forecast.toLowerCase()
  if (f.includes('rain') || f.includes('shower')) return CloudRain
  if (f.includes('cloud')) return Cloud
  if (f.includes('wind')) return Wind
  return Sun
}

interface DailyOutfit { occasion?: string; outfit_caption?: string; image_url?: string | null }
interface AstrologyGuidance { horoscope?: string; energy?: string }

export function LunaTodayPage() {
  const location = useLocation()
  const [now, setNow] = useState<{ hour: number; weekday: string; dateLabel: string } | null>(null)
  const [weather, setWeather] = useState<{ tempF: number; forecast: string } | null>(null)
  const [weatherError, setWeatherError] = useState(false)
  const [outfit, setOutfit] = useState<DailyOutfit | null>(null)
  const [openTaskCount, setOpenTaskCount] = useState<number | null>(null)
  const [guidance, setGuidance] = useState<AstrologyGuidance | null>(null)

  useEffect(() => {
    const d = new Date()
    setNow({
      hour: d.getHours(),
      weekday: new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(d),
      dateLabel: new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(d),
    })
  }, [])

  useEffect(() => {
    if (location.lat == null || location.lon == null) return
    fetch(`/api/weather?lat=${location.lat}&lon=${location.lon}`, { cache: 'no-store' })
      .then(res => { if (!res.ok) throw new Error('unavailable'); return res.json() })
      .then(setWeather)
      .catch(() => setWeatherError(true))
  }, [location.lat, location.lon])

  useEffect(() => {
    if (location.permitted === null) return
    const params = new URLSearchParams({ tz: Intl.DateTimeFormat().resolvedOptions().timeZone })
    if (location.lat != null && location.lon != null) {
      params.set('lat', String(location.lat))
      params.set('lon', String(location.lon))
    }
    fetch(`/api/atelier/daily-outfit?${params.toString()}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(setOutfit)
      .catch(() => setOutfit(null))
  }, [location.permitted, location.lat, location.lon])

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

  const idx = dayIndex()
  const quote = QUOTES[idx % QUOTES.length]
  const greeting = now ? getGreeting(now.hour) : 'Hello'
  const focus = (now && HERO_FOCUS[now.weekday]) ?? HERO_FOCUS.Monday
  const gymFocusName = (now && ZOE_GYM_BY_DAY[now.weekday]) ?? ZOE_GYM_BY_DAY.Monday
  const exercises = (now && ZOE_EXERCISES_BY_DAY[now.weekday]) ?? ZOE_EXERCISES_BY_DAY.Monday
  const forYou = FOR_YOU_TODAY[idx % FOR_YOU_TODAY.length]
  const WeatherIcon = weather ? weatherIconFor(weather.forecast) : Sun

  return (
    <AppLayout noPad>
      <div className={styles.page}>
        <div className={styles.headerTop}>
          <div className={styles.greetingText}>
            <h1>{greeting}, Zoe <Heart size={18} strokeWidth={1.6} /></h1>
            {now && <p className={styles.dateLine}>{now.dateLabel}</p>}
          </div>
          <div className={styles.headerRight}>
            <span className={styles.bellButton}><Bell size={19} strokeWidth={1.6} /><i /></span>
            <div className={styles.weatherCard}>
              <WeatherIcon size={17} strokeWidth={1.5} className={styles.weatherIcon} />
              <strong>{weather ? `${weather.tempF}°` : weatherError ? '—' : '…'}</strong>
              <p>{weather ? weather.forecast : weatherError ? 'Unavailable' : 'Loading…'}</p>
            </div>
          </div>
        </div>

        <p className={styles.quoteLine}><Sparkles size={14} /> &ldquo;{quote}&rdquo;</p>

        <Link href="/plan-my-day" className={styles.hero}>
          <Image src="/images/rooms/hero-gym-focus.png" alt={gymFocusName} fill sizes="(max-width: 640px) 100vw, 640px" priority />
          <div className={styles.heroOverlay} />
          <div className={styles.heroContent}>
            <div className={styles.heroLabel}>Today&apos;s Focus</div>
            <h2>{focus.title} {focus.emoji}</h2>
            <p>{focus.subtitle}</p>
          </div>
        </Link>

        <div className={styles.cardGrid}>
          <Link href="/plan-my-day" className={styles.card}>
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
          </Link>

          <Link href="/fitness" className={styles.card}>
            <div className={styles.cardHeader}><Dumbbell size={15} /><span>Gym</span></div>
            <div className={styles.gymRow}>
              <div>
                <p className={styles.gymFocusName}>{gymFocusName}</p>
                <ul className={styles.gymList}>
                  {exercises.slice(0, 5).map(ex => <li key={ex}>&middot; {ex}</li>)}
                </ul>
              </div>
              <span className={styles.gymAvatar}>{focus.emoji}</span>
            </div>
            <span className={styles.cardLink}>View full workout</span>
          </Link>

          <Link href="/food" className={styles.card}>
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
          </Link>

          <Link href="/style" className={styles.card}>
            <div className={styles.cardHeader}><ShirtIcon size={15} /><span>Today&apos;s Outfit</span></div>
            <div className={styles.outfitRow}>
              <div className={styles.outfitPhoto}>
                <Image src={outfit?.image_url || '/images/rooms/outfit-sporty.png'} alt={outfit?.outfit_caption ?? 'Today\'s outfit'} fill sizes="72px" />
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
          </Link>

          <Link href="/work" className={styles.card}>
            <div className={styles.cardHeader}><Briefcase size={15} /><span>Work</span></div>
            <p className={styles.workTime}>10:30 AM – 5:30 PM</p>
            <p className={styles.workNote}>Focus block. Let&apos;s get it done.</p>
            <div className={styles.progressTrack}><div className={styles.progressFill} style={{ width: '8%' }} /></div>
            <p className={styles.workCount}>{openTaskCount != null ? `${openTaskCount} open tasks` : 'Loading tasks…'}</p>
            <span className={styles.cardLink}>Open work dashboard</span>
          </Link>

          <Link href="/wellness" className={styles.card}>
            <div className={styles.cardHeader}><Heart size={15} /><span>For You Today</span></div>
            <div className={styles.forYouRow}>
              <div className={styles.forYouPhoto}><Image src={forYou.image} alt={forYou.title} fill sizes="72px" /></div>
              <div className={styles.forYouTags}>
                <strong>{forYou.title}</strong>
                {forYou.tags.map(t => <span key={t}>{t}</span>)}
              </div>
            </div>
            <span className={styles.cardLink}>{forYou.cta}</span>
          </Link>
        </div>

        <Link href="/astrology" className={styles.astrologyCard}>
          <div className={styles.astrologyText}>
            <div className={styles.cardHeader}><MoonStar size={15} /><span>Daily Astrology</span></div>
            <p>{guidance?.horoscope ?? guidance?.energy ?? 'Your daily reading is syncing…'}</p>
          </div>
          <Sparkles size={38} strokeWidth={1} className={styles.astrologyGlyph} />
        </Link>
      </div>
    </AppLayout>
  )
}
