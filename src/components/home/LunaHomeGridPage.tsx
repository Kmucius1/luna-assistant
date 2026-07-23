'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  Briefcase,
  Brain,
  DollarSign,
  Dumbbell,
  Flower2,
  MoonStar,
  PenLine,
  Plane,
  ShirtIcon,
  Sun,
  UtensilsCrossed,
} from 'lucide-react'

import { GreetingHeader, useTodayContext } from '@/components/home/GreetingHeader'
import { ZOE_GYM_BY_DAY } from '@/lib/luna/zoeLifestyleProfile'
import { AppLayout } from '@/components/layout/AppLayout'
import styles from './LunaHomeGridPage.module.css'

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
  { slug: 'today', label: 'Today', tagline: ['Plan your day.', 'Live on purpose.'], image: '/images/rooms/today.jpg', href: '/today', icon: Sun },
  { slug: 'food', label: 'Food', tagline: ['Fuel your body.', 'Eat beautifully.'], image: '/images/rooms/food.jpg', href: '/food', icon: UtensilsCrossed },
  { slug: 'style', label: 'Style', tagline: ['Dress the life', "you're building."], image: '/images/rooms/style.jpg', href: '/style', icon: ShirtIcon },
  { slug: 'fitness', label: 'Fitness', tagline: ['Train your body.', 'Build strength.'], image: '/images/rooms/fitness.jpg', href: '/fitness', icon: Dumbbell },
  { slug: 'work', label: 'Work', tagline: ['Build your brand.', 'Create impact.'], image: '/images/rooms/work.jpg', href: '/work', icon: Briefcase },
  { slug: 'create', label: 'Create', tagline: ['Bring your ideas', 'to life.'], image: '/images/rooms/atelier.jpg', href: '/creative', icon: PenLine },
  { slug: 'wellness', label: 'Wellness', tagline: ['Protect your peace.', 'Nourish your soul.'], image: '/images/rooms/wellness.jpg', href: '/wellness', icon: Flower2, comingSoon: true },
  { slug: 'astrology', label: 'Astrology', tagline: ['Align with', 'the universe.'], image: '/images/rooms/astrology.jpg', href: '/astrology', icon: MoonStar },
  { slug: 'money', label: 'Money', tagline: ['Manage money.', 'Build wealth.'], image: '/images/rooms/money.jpg', href: '/money', icon: DollarSign },
  { slug: 'brain', label: 'Brain Dump', tagline: ['Capture thoughts.', 'Clear your mind.'], image: '/images/rooms/brain.jpg', href: '/brain-dump', icon: Brain },
  { slug: 'travel', label: 'Travel', tagline: ['Explore more.', 'Live fully.'], image: '/images/rooms/travel.jpg', href: '/travel', icon: Plane, comingSoon: true },
  { slug: 'next', label: 'Next Move', tagline: ['Plan your next step.', 'Make it happen.'], image: '/images/rooms/next-move.jpg', href: '/next', icon: ArrowRight, comingSoon: true },
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

export function LunaHomeGridPage() {
  const { now, weather, weatherError } = useTodayContext()
  const focus = (now && HERO_FOCUS[now.weekday]) ?? HERO_FOCUS.Monday
  const gymFocusName = (now && ZOE_GYM_BY_DAY[now.weekday]) ?? ZOE_GYM_BY_DAY.Monday

  return (
    <AppLayout noPad noScroll>
      <div className={styles.page}>
        <GreetingHeader now={now} weather={weather} weatherError={weatherError} />

        <Link href="/plan-my-day" className={styles.hero}>
          <Image src="/images/rooms/hero-gym-focus.jpg" alt={gymFocusName} fill sizes="(max-width: 640px) 100vw, 640px" priority />
          <div className={styles.heroOverlay} />
          <div className={styles.heroContent}>
            <div className={styles.heroLabel}>Today&apos;s Focus</div>
            <h2>{focus.title} {focus.emoji}</h2>
            <p>{focus.subtitle}</p>
            <span className={styles.heroButton}>View Plan <ArrowRight size={11} /></span>
          </div>
        </Link>

        <div className={styles.roomGrid}>
          {ROOMS.map(room => {
            const Icon = room.icon
            return (
              <Link key={room.slug} href={room.href} className={styles.roomCard}>
                <Icon size={12} strokeWidth={1.6} className={styles.roomIcon} />
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
    </AppLayout>
  )
}
