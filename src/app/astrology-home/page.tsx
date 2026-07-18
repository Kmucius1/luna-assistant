'use client'

import { BookOpen, Calendar, Heart, Moon, RefreshCw, Sparkles, Star, Sun, Target } from 'lucide-react'
import { WorkspaceLauncher, type WorkspaceApp } from '@/components/workspaces/WorkspaceLauncher'

const apps: WorkspaceApp[] = [
  { title: 'Daily Reading', description: 'Today’s energy, focus, warnings, and personal guidance.', href: '/astrology/daily', icon: Sun, art: 'daily' },
  { title: 'Birth Chart', description: 'Explore your placements, houses, strengths, and purpose.', href: '/astrology/chart', icon: Target, art: 'chart' },
  { title: 'Current Transits', description: 'See what is moving now and how it affects your timing.', href: '/astrology/transits', icon: RefreshCw, art: 'transits' },
  { title: 'Moon', description: 'Moon phase, moon sign, lunar energy, and rituals.', href: '/astrology/moon', icon: Moon, art: 'moon' },
  { title: 'Relationships', description: 'Compatibility, synastry, love timing, and connection patterns.', href: '/astrology/love', icon: Heart, art: 'love' },
  { title: 'Tarot & Oracle', description: 'Pull cards, ask a question, and save your readings.', href: '/astrology?tab=spirit', icon: Sparkles, art: 'tarot' },
  { title: 'Rituals', description: 'Morning, evening, grounding, and moon-centered practices.', href: '/astrology?tab=spirit', icon: Star, art: 'rituals' },
  { title: 'Journal', description: 'Daily reflection, dreams, gratitude, and shadow prompts.', href: '/journal', icon: BookOpen, art: 'journal' },
  { title: 'Manifest', description: 'Intentions, affirmations, goals, and your vision work.', href: '/manifest', icon: Star, art: 'manifest' },
  { title: 'Cosmic Calendar', description: 'Track retrogrades, eclipses, moons, and major transits.', href: '/astrology/calendar', icon: Calendar, art: 'cosmic' },
]

export default function AstrologyHomePage() {
  return <WorkspaceLauncher eyebrow="Your Cosmic Guide" title="Astrology" description="Open one focused astrology app at a time, without carrying every reading and tool on the same screen." apps={apps} theme="astrology" />
}
