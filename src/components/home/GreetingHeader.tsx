'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, ChevronLeft, Cloud, CloudRain, Heart, Sparkles, Sun, Wind } from 'lucide-react'

import { useLocation } from '@/hooks/useLocation'
import styles from './GreetingHeader.module.css'

const QUOTES = [
  'Discipline creates freedom.',
  'What you do today can improve all your tomorrows.',
  'Small steps, taken daily, become a life you’re proud of.',
  'You do not have to see the whole staircase, just take the first step.',
  'Slow is smooth, and smooth is fast.',
  'Clarity comes from action, not thought.',
  'The way you do anything is the way you do everything.',
]

export function dayIndex(): number {
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

export function useTodayContext() {
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
      .then(res => { if (!res.ok) throw new Error('unavailable'); return res.json() })
      .then(setWeather)
      .catch(() => setWeatherError(true))
  }, [location.lat, location.lon])

  return { now, weather, weatherError }
}

export function GreetingHeader({ now, weather, weatherError, backHref }: {
  now: { hour: number; weekday: string; dateLabel: string } | null
  weather: { tempF: number; forecast: string } | null
  weatherError: boolean
  /** Only /today needs this — it's not in the bottom nav, so without this
      there's no way back to /home besides the browser's own back button.
      /home itself never passes this (no "back to home" from home). */
  backHref?: string
}) {
  const greeting = now ? getGreeting(now.hour) : 'Hello'
  const quote = QUOTES[dayIndex() % QUOTES.length]
  const WeatherIcon = weather ? weatherIconFor(weather.forecast) : Sun

  return (
    <>
      <div className={styles.headerTop}>
        <div className={styles.headerLeft}>
          {backHref && (
            <Link href={backHref} className={styles.backButton} aria-label="Back to Home">
              <ChevronLeft size={18} strokeWidth={2} />
            </Link>
          )}
          <div className={styles.greetingText}>
            <h1>{greeting}, Zoe <Heart size={16} strokeWidth={1.6} /></h1>
            {now && <p className={styles.dateLine}>{now.dateLabel}</p>}
          </div>
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
    </>
  )
}
