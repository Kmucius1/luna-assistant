import { NextRequest, NextResponse } from 'next/server'
import { todayKey } from '@/lib/luna/today'

export const dynamic = 'force-dynamic'

const PHASES = [
  { name: 'New Moon', glow: '#6f4aa8', moon: '#171226' },
  { name: 'Waxing Crescent', glow: '#8460bd', moon: '#b8a9d7' },
  { name: 'First Quarter', glow: '#9a68d8', moon: '#d2c6e8' },
  { name: 'Waxing Gibbous', glow: '#a779e0', moon: '#e2daf0' },
  { name: 'Full Moon', glow: '#c49af0', moon: '#f3edff' },
  { name: 'Waning Gibbous', glow: '#9f76d4', moon: '#ddd2ec' },
  { name: 'Last Quarter', glow: '#815eb8', moon: '#c7badc' },
  { name: 'Waning Crescent', glow: '#714da6', moon: '#aa9abd' },
]

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, character => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;',
  })[character] ?? character)
}

function seededNumber(seed: number, offset: number) {
  const x = Math.sin(seed * 9301 + offset * 49297) * 233280
  return x - Math.floor(x)
}

export async function GET(request: NextRequest) {
  const now = new Date()
  const dateKey = request.nextUrl.searchParams.get('date') || todayKey(now)
  const parsedDate = new Date(`${dateKey}T12:00:00Z`)
  const safeDate = Number.isNaN(parsedDate.getTime()) ? now : parsedDate
  const daySeed = Math.floor(safeDate.getTime() / 86_400_000)

  const knownNewMoon = new Date('2024-01-11T11:57:00Z').getTime()
  const lunarDays = (safeDate.getTime() - knownNewMoon) / 86_400_000
  const lunarAge = ((lunarDays % 29.530588) + 29.530588) % 29.530588
  const phaseIndex = Math.floor((lunarAge / 29.530588) * 8) % 8
  const phase = PHASES[phaseIndex]

  const hour = now.getHours()
  const timeTone = hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'day' : 'evening'
  const palettes = {
    morning: ['#17102f', '#4d367a', '#b782c8'],
    day: ['#100b29', '#35225e', '#7650a7'],
    evening: ['#0b0821', '#2e1b50', '#8a4f99'],
    night: ['#070516', '#21143f', '#4b2e73'],
  }
  const palette = palettes[timeTone]

  const stars = Array.from({ length: 34 }, (_, index) => {
    const x = 6 + seededNumber(daySeed, index * 3 + 1) * 88
    const y = 5 + seededNumber(daySeed, index * 3 + 2) * 78
    const radius = 0.25 + seededNumber(daySeed, index * 3 + 3) * 0.75
    const opacity = 0.25 + seededNumber(daySeed, index * 4 + 4) * 0.7
    return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${radius.toFixed(2)}" fill="#ffffff" opacity="${opacity.toFixed(2)}"/>`
  }).join('')

  const cloudShift = 4 + seededNumber(daySeed, 91) * 8
  const moonX = 49 + (seededNumber(daySeed, 101) - 0.5) * 8
  const moonY = 30 + (seededNumber(daySeed, 102) - 0.5) * 5
  const phaseLabel = escapeXml(phase.name)

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 90 160" role="img" aria-label="${phaseLabel} celestial artwork">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0.85" y2="1">
        <stop offset="0" stop-color="${palette[0]}"/>
        <stop offset="0.55" stop-color="${palette[1]}"/>
        <stop offset="1" stop-color="${palette[2]}"/>
      </linearGradient>
      <radialGradient id="halo">
        <stop offset="0" stop-color="${phase.glow}" stop-opacity="0.78"/>
        <stop offset="0.45" stop-color="${phase.glow}" stop-opacity="0.22"/>
        <stop offset="1" stop-color="${phase.glow}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="mist" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#d9c7ef" stop-opacity="0"/>
        <stop offset="0.5" stop-color="#d9c7ef" stop-opacity="0.24"/>
        <stop offset="1" stop-color="#d9c7ef" stop-opacity="0"/>
      </linearGradient>
      <filter id="blur"><feGaussianBlur stdDeviation="2.8"/></filter>
      <filter id="soft"><feGaussianBlur stdDeviation="0.8"/></filter>
    </defs>
    <rect width="90" height="160" fill="url(#sky)"/>
    <ellipse cx="${moonX.toFixed(2)}" cy="${moonY.toFixed(2)}" rx="31" ry="31" fill="url(#halo)"/>
    ${stars}
    <circle cx="${moonX.toFixed(2)}" cy="${moonY.toFixed(2)}" r="10.8" fill="${phase.moon}"/>
    <circle cx="${(moonX - 2.8).toFixed(2)}" cy="${(moonY - 2.3).toFixed(2)}" r="2.1" fill="#8f82a9" opacity="0.24"/>
    <circle cx="${(moonX + 3.2).toFixed(2)}" cy="${(moonY + 2.1).toFixed(2)}" r="1.5" fill="#8f82a9" opacity="0.2"/>
    <path d="M-12 ${82 + cloudShift} C10 ${68 + cloudShift}, 24 ${78 + cloudShift}, 43 ${70 + cloudShift} C61 ${63 + cloudShift}, 75 ${75 + cloudShift}, 104 ${64 + cloudShift}" fill="none" stroke="url(#mist)" stroke-width="9" filter="url(#blur)"/>
    <path d="M-14 ${108 + cloudShift} C8 ${94 + cloudShift}, 28 ${109 + cloudShift}, 46 ${98 + cloudShift} C63 ${88 + cloudShift}, 77 ${103 + cloudShift}, 104 ${91 + cloudShift}" fill="none" stroke="url(#mist)" stroke-width="13" filter="url(#blur)"/>
    <path d="M0 139 C15 124, 30 133, 43 122 C57 111, 72 120, 90 108 L90 160 L0 160 Z" fill="#080616" opacity="0.7"/>
    <path d="M0 146 C18 133, 34 143, 49 132 C66 120, 77 132, 90 123 L90 160 L0 160 Z" fill="#130d29" opacity="0.9"/>
    <ellipse cx="45" cy="146" rx="32" ry="4" fill="#9d73cf" opacity="0.13" filter="url(#soft)"/>
  </svg>`

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
