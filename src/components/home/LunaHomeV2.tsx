'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  Bell,
  Brain,
  Briefcase,
  Cloud,
  CloudRain,
  DollarSign,
  Dumbbell,
  Flower2,
  Heart,
  MapPin,
  MoonStar,
  PenLine,
  Plane,
  ShirtIcon,
  Sparkles,
  Sun,
  UtensilsCrossed,
  Wind,
} from 'lucide-react'

import { useLocation } from '@/hooks/useLocation'
import { ZOE_GYM_BY_DAY } from '@/lib/luna/zoeLifestyleProfile'
import styles from './LunaHomeV2.module.css'

interface Room {
  slug: string
  label: string
  tagline: [string, string]
  image: string
  href: string
  icon: typeof Sun
  comingSoon?: boolean
}

const ROOMS: Room[] = [
  { slug: 'today', label: 'Today', tagline: ['Plan your day.', 'Live on purpose.'], image: '/images/rooms/today.png', href: '/today', icon: Sun },
  { slug: 'food', label: 'Food', tagline: ['Fuel your body.', 'Eat beautifully.'], image: '/images/rooms/food.png', href: '/food', icon: UtensilsCrossed, comingSoon: true },
  { slug: 'style', label: 'Style', tagline: ['Dress the life', "you're building."], image: '/images/rooms/style.png', href: '/creative', icon: ShirtIcon },
  { slug: 'fitness', label: 'Fitness', tagline: ['Train your body.', 'Build strength.'], image: '/images/rooms/fitness.png', href: '/fitness', icon: Dumbbell, comingSoon: true },
  { slug: 'work', label: 'Work', tagline: ['Build your brand.', 'Create impact.'], image: '/images/rooms/work.png', href: '/work', icon: Briefcase },
  { slug: 'create', label: 'Create', tagline: ['Bring your ideas', 'to life.'], image: '/images/rooms/atelier.png', href: '/creative', icon: PenLine },
  { slug: 'wellness', label: 'Wellness', tagline: ['Protect your peace.', 'Nourish your soul.'], image: '/images/rooms/wellness.png', href: '/wellness', icon: Flower2, comingSoon: true },
  { slug: 'astrology', label: 'Astrology', tagline: ['Align with', 'the universe.'], image: '/images/rooms/astrology.png', href: '/astrology', icon: MoonStar },
  { slug: 'money', label: 'Money', tagline: ['Manage money.', 'Build wealth.'], image: '/images/rooms/money.png', href: '/money', icon: DollarSign },
  { slug: 'brain', label: 'Brain Dump', tagline: ['Capture thoughts.', 'Clear your mind.'], image: '/images/rooms/brain.png', href: '/brain-dump', icon: Brain },
  { slug: 'travel', label: 'Travel', tagline: ['Explore more.', 'Live fully.'], image: '/images/rooms/travel.png', href: '/travel', icon: Plane, comingSoon: true },
  { slug: 'next', label: 'Next Move', tagline: ['Plan your next step.', 'Make it happen.'], image: '/images/rooms/next-move.png', href: '/next', icon: ArrowRight, comingSoon: true },
]

const QUOTES = [
  'Discipline creates freedom.',
  'What you do today can improve all your tomorrows.',
  'Small steps, taken daily, become a life you’re proud of.',
  'You do not have to see the whole staircase, just take the first step.',
  'Slow is smooth, and smooth is fast.',
  'Clarity comes from action, not thought.',
  'The way you do anything is the way you do everything.',
]

// Punchy display copy for the Hero card, grounded in the real weekly gym
// split from zoeLifestyleProfile.ts (ZOE_GYM_BY_DAY) — keep these in sync
// if that split ever changes.
const HERO_FOCUS: Record<string, { emoji: string; title: string; subtitle: string }> = {
  Monday: { emoji: '🍑', title: 'Glute Growth Monday', subtitle: 'Move with purpose. The results follow.' },
  Tuesday: { emoji: '💪', title: 'Sexy Back Tuesday', subtitle: 'Pull, row, and build the back you love.' },
  Wednesday: { emoji: '🔥', title: 'Glute Pump Wednesday', subtitle: 'Light weight, high pump. Feel it work.' },
  Thursday: { emoji: '✨', title: 'Shoulder Sculpt Thursday', subtitle: 'Definition day. Small moves, big difference.' },
  Friday: { emoji: '🍑', title: 'Glute Growth Friday', subtitle: 'Heavy day. Finish the week strong.' },
  Saturday: { emoji: '⚡', title: 'Full Body Saturday', subtitle: 'One workout, everything included.' },
  Sunday: { emoji: '🌊', title: 'Recovery Sunday', subtitle: 'Walk, stretch, and let your body reset.' },
}

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

function cityFromTimezone(tz: string): string {
  const parts = tz.split('/')
  const city = parts[parts.length - 1] ?? tz
  return city.replace(/_/g, ' ')
}

function weatherIconFor(forecast: string) {
  const f = forecast.toLowerCase()
  if (f.includes('rain') || f.includes('shower')) return CloudRain
  if (f.includes('cloud')) return Cloud
  if (f.includes('wind')) return Wind
  return Sun
}

export function LunaHomeV2() {
  const location = useLocation()
  const [now, setNow] = useState<{ hour: number; weekday: string; dateLabel: string } | null>(null)
  const [weather, setWeather] = useState<{ tempF: number; forecast: string } | null>(null)
  const [weatherError, setWeatherError] = useState(false)

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
      .then(res => {
        if (!res.ok) throw new Error('weather unavailable')
        return res.json()
      })
      .then(data => setWeather(data))
      .catch(() => setWeatherError(true))
  }, [location.lat, location.lon])

  const idx = dayIndex()
  const quote = QUOTES[idx % QUOTES.length]
  const greeting = now ? getGreeting(now.hour) : 'Hello'
  const focus = (now && HERO_FOCUS[now.weekday]) ?? HERO_FOCUS.Monday
  const gymDetail = (now && ZOE_GYM_BY_DAY[now.weekday]) ?? ''
  const WeatherIcon = weather ? weatherIconFor(weather.forecast) : Sun

  return (
    <div className={styles.page}>
      <div className={styles.headerTop}>
        <div className={styles.greetingText}>
          <h1>{greeting}, Zoe <Heart size={16} strokeWidth={1.6} /></h1>
          {now && <p className={styles.dateLine}>{now.dateLabel}</p>}
        </div>
        <div className={styles.headerRight}>
          <span className={styles.bellButton}><Bell size={18} strokeWidth={1.6} /><i /></span>
          <div className={styles.weatherCard}>
            <WeatherIcon size={16} strokeWidth={1.5} className={styles.weatherIcon} />
            <strong>{weather ? `${weather.tempF}°` : weatherError ? '—' : '…'}</strong>
            <p>{weather ? weather.forecast : weatherError ? 'Unavailable' : 'Loading…'}</p>
            {location.tz && <p className={styles.place}>{cityFromTimezone(location.tz)}</p>}
          </div>
        </div>
      </div>

      <p className={styles.quoteLine}><Sparkles size={13} /> &ldquo;{quote}&rdquo;</p>

      <Link href="/plan-my-day" className={styles.hero}>
        <div className={styles.heroText}>
          <div className={styles.heroLabel}>Today&apos;s Focus</div>
          <h2>{focus.title} <span>{focus.emoji}</span></h2>
          <p>{focus.subtitle}</p>
          <span className={styles.heroButton}>View Plan <ArrowRight size={13} /></span>
        </div>
        <div className={styles.heroPhoto}>
          <Image src="/images/rooms/hero-today-focus.png" alt={gymDetail || 'Today\'s workout focus'} fill sizes="(max-width: 640px) 45vw, 300px" priority />
        </div>
      </Link>

      <div className={styles.roomGrid}>
        {ROOMS.map(room => {
          const Icon = room.icon
          return (
            <Link key={room.slug} href={room.href} className={styles.roomCard}>
              <Icon size={16} strokeWidth={1.5} className={styles.roomIcon} />
              <span className={styles.roomLabel}>{room.label}</span>
              <p className={styles.roomTagline}>{room.tagline[0]}<br />{room.tagline[1]}</p>
              <div className={styles.roomPhoto}>
                <Image src={room.image} alt={room.label} fill sizes="(max-width: 640px) 25vw, 160px" />
              </div>
              {room.comingSoon && <span className={styles.comingSoonBadge}>Soon</span>}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
