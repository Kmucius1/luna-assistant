'use client'
/**
 * Global location hook — requests geolocation permission once, stores coordinates
 * in localStorage, and exposes timezone + coordinates to the whole app.
 * Timezone is always available (from browser); coordinates require permission.
 */
import { useState, useEffect } from 'react'

export interface LocationState {
  tz:        string
  lat:       number | null
  lon:       number | null
  permitted: boolean | null   // null = not asked yet, true = granted, false = denied
  localHour: number           // current local hour (0-23) from browser
  localTime: string           // formatted local time string e.g. "7:42 PM"
  localDate: string           // formatted local date e.g. "Sunday, June 22, 2025"
}

const STORAGE_KEY = 'luna_location_v1'

function getTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

function getLocalHour(): number {
  return new Date().getHours()
}

function getLocalTime(): string {
  return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function getLocalDate(tz: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  }).format(new Date())
}

function loadStored(): { lat: number; lon: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const { lat, lon, ts } = JSON.parse(raw)
    // Expire after 6 hours — location can change
    if (Date.now() - ts > 6 * 3600_000) { localStorage.removeItem(STORAGE_KEY); return null }
    return { lat, lon }
  } catch { return null }
}

function storeCoords(lat: number, lon: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ lat, lon, ts: Date.now() }))
  } catch {}
}

export function useLocation(): LocationState {
  const tz = typeof window !== 'undefined' ? getTimezone() : 'America/New_York'

  const [state, setState] = useState<LocationState>({
    tz,
    lat:       null,
    lon:       null,
    permitted: null,
    localHour: getLocalHour(),
    localTime: getLocalTime(),
    localDate: getLocalDate(tz),
  })

  useEffect(() => {
    // Always refresh the time every minute
    const interval = setInterval(() => {
      setState(prev => ({
        ...prev,
        localHour: getLocalHour(),
        localTime: getLocalTime(),
      }))
    }, 60_000)

    // Check for stored coordinates first
    const stored = loadStored()
    if (stored) {
      setState(prev => ({ ...prev, lat: stored.lat, lon: stored.lon, permitted: true }))
    }

    // Request geolocation
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lon } = pos.coords
          storeCoords(lat, lon)
          setState(prev => ({ ...prev, lat, lon, permitted: true }))
        },
        () => {
          setState(prev => ({ ...prev, permitted: false }))
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 3600_000 }
      )
    }

    return () => clearInterval(interval)
  }, [])

  return state
}
