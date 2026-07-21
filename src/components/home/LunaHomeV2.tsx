'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Briefcase,
  Cloud,
  CloudRain,
  Coins,
  Compass,
  DoorOpen,
  Dumbbell,
  MapPin,
  Moon,
  PenLine,
  Plane,
  Quote,
  Scissors,
  ShirtIcon,
  Sparkle,
  Sparkles,
  Sun,
  Sunrise,
  Utensils,
  Wind,
} from 'lucide-react'

import { useLocation } from '@/hooks/useLocation'
import styles from './LunaHomeV2.module.css'

interface Room {
  slug: string
  label: string
  image: string
  href: string
  icon: typeof Sun
  comingSoon?: boolean
}

const ROOMS: Room[] = [
  { slug: 'today', label: 'Today', image: '/images/rooms/today.png', href: '/today', icon: Sunrise },
  { slug: 'food', label: 'Food', image: '/images/rooms/food.png', href: '/food', icon: Utensils, comingSoon: true },
  { slug: 'style', label: 'Style', image: '/images/rooms/style.png', href: '/creative', icon: ShirtIcon },
  { slug: 'fitness', label: 'Fitness', image: '/images/rooms/fitness.png', href: '/fitness', icon: Dumbbell, comingSoon: true },
  { slug: 'work', label: 'Work', image: '/images/rooms/work.png', href: '/work', icon: Briefcase },
  { slug: 'atelier', label: 'Atelier', image: '/images/rooms/atelier.png', href: '/creative', icon: Scissors },
  { slug: 'wellness', label: 'Wellness', image: '/images/rooms/wellness.png', href: '/wellness', icon: Sparkle, comingSoon: true },
  { slug: 'astrology', label: 'Astrology', image: '/images/rooms/astrology.png', href: '/astrology', icon: Moon },
  { slug: 'money', label: 'Money', image: '/images/rooms/money.png', href: '/money', icon: Coins },
  { slug: 'brain', label: 'Brain Dump', image: '/images/rooms/brain.png', href: '/brain-dump', icon: PenLine },
  { slug: 'travel', label: 'Travel', image: '/images/rooms/travel.png', href: '/travel', icon: Plane, comingSoon: true },
  { slug: 'next', label: 'Next Move', image: '/images/rooms/next-move.png', href: '/next', icon: DoorOpen, comingSoon: true },
]

const QUOTES: { text: string; author: string }[] = [
  { text: 'Discipline is choosing between what you want now and what you want most.', author: 'Abraham Lincoln' },
  { text: 'What you do today can improve all your tomorrows.', author: 'Ralph Marston' },
  { text: 'Small steps, taken daily, become a life you’re proud of.', author: 'Luna' },
  { text: 'You do not have to see the whole staircase, just take the first step.', author: 'Martin Luther King Jr.' },
  { text: 'Slow is smooth, and smooth is fast.', author: 'Navy SEAL Proverb' },
  { text: 'Clarity comes from action, not thought.', author: 'Marie Forleo' },
  { text: 'The way you do anything is the way you do everything.', author: 'T. Harv Eker' },
]

const FOCUS_MESSAGES = [
  { title: 'Be Present', body: 'Focus on what truly matters and trust the process.' },
  { title: 'Move With Intention', body: 'One clear priority beats ten scattered ones.' },
  { title: 'Protect Your Energy', body: 'Say no to what drains you so you can say yes to what matters.' },
  { title: 'Steady Wins', body: 'Consistency compounds quietly. Keep going.' },
]

function dayIndex(): number {
  const start = new Date(new Date().getFullYear(), 0, 0).getTime()
  return Math.floor((Date.now() - start) / 86_400_000)
}

function getGreeting(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 21) return 'Good evening'
  return 'Good night'
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
  const [hour, setHour] = useState<number | null>(null)
  const [weather, setWeather] = useState<{ tempF: number; forecast: string } | null>(null)
  const [weatherError, setWeatherError] = useState(false)

  useEffect(() => {
    setHour(new Date().getHours())
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
  const focus = FOCUS_MESSAGES[idx % FOCUS_MESSAGES.length]
  const greeting = hour != null ? getGreeting(hour) : 'Hello'
  const WeatherIcon = weather ? weatherIconFor(weather.forecast) : Sun

  return (
    <div className={styles.page}>
      <div className={styles.greetingRow}>
        <div className={styles.greetingText}>
          <h1>{greeting}, Zoë <Sparkles size={20} strokeWidth={1.6} /></h1>
          <p>Let&apos;s make today exceptional.</p>
        </div>
        <div className={styles.avatar}>Z</div>
      </div>

      <div className={styles.topRow}>
        <div className={styles.tile}>
          <WeatherIcon size={26} strokeWidth={1.5} className={styles.weatherIcon} />
          <div className={styles.weatherTemp}>
            <strong>{weather ? `${weather.tempF}°` : weatherError ? '—' : '…'}</strong>
          </div>
          <p>{weather ? weather.forecast : weatherError ? 'Weather unavailable' : 'Loading forecast…'}</p>
          {location.tz && (
            <p className={styles.place}><MapPin size={12} /> {cityFromTimezone(location.tz)}</p>
          )}
        </div>

        <div className={styles.tile}>
          <Quote size={20} className={styles.quoteMark} />
          <p className={styles.quoteText}>{quote.text}</p>
          <p className={styles.quoteAuthor}>— {quote.author}</p>
        </div>
      </div>

      <Link href="/home-classic" className={styles.hero}>
        <Image src="/images/rooms/hero-today-focus.png" alt="Today's focus" fill sizes="(max-width: 640px) 100vw, 640px" priority />
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <div className={styles.heroLabel}>Today&apos;s Focus</div>
          <h2>{focus.title}</h2>
          <p>{focus.body}</p>
          <span className={styles.heroButton}>
            View Today <span><Compass size={14} /></span>
          </span>
        </div>
      </Link>

      <div className={styles.roomsHeader}>
        <h3>My Rooms</h3>
        <span>Edit</span>
      </div>

      <div className={styles.roomGrid}>
        {ROOMS.map(room => {
          const Icon = room.icon
          return (
            <Link key={room.slug} href={room.href} className={styles.roomCard}>
              <Image src={room.image} alt={room.label} fill sizes="(max-width: 640px) 25vw, 160px" />
              <div className={styles.roomOverlay} />
              <Icon size={16} strokeWidth={1.6} className={styles.roomIcon} />
              {room.comingSoon && <span className={styles.comingSoonBadge}>Soon</span>}
              <span className={styles.roomLabel}>{room.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
