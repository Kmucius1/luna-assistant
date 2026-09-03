'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  Briefcase,
  Brain,
  DollarSign,
  Dumbbell,
  Flower2,
  MoonStar,
  PenLine,
  Plane,
  ShirtIcon,
  Sparkles,
  Sun,
  UtensilsCrossed,
  Waves,
} from 'lucide-react'

import { GreetingHeader, useTodayContext } from '@/components/home/GreetingHeader'
import { DailyCreativeSpark } from '@/components/home/DailyCreativeSpark'
import { ZOE_HERO_FOCUS_BY_DAY } from '@/lib/luna/zoeLifestyleProfile'
import { AppLayout } from '@/components/layout/AppLayout'
import styles from './LunaHomeGridPage.module.css'

interface Room {
  slug: string
  label: string
  tagline: [string, string]
  image: string
  href: string
  icon: typeof Sun
  accent: string
  comingSoon?: boolean
}

const ROOMS: Room[] = [
  { slug: 'today', label: 'Today', tagline: ['Plan your day.', 'Live on purpose.'], image: '/images/rooms/today.jpg', href: '/today', icon: Sun, accent: 'rgba(230,210,170,0.45)' },
  { slug: 'food', label: 'Food', tagline: ['Fuel your body.', 'Eat beautifully.'], image: '/images/rooms/food.jpg', href: '/food', icon: UtensilsCrossed, accent: 'rgba(160,190,150,0.35)' },
  { slug: 'style', label: 'Style', tagline: ['Dress the life', "you're building."], image: '/images/rooms/style.jpg', href: '/style', icon: ShirtIcon, accent: 'rgba(201,169,110,0.3)' },
  { slug: 'fitness', label: 'Fitness', tagline: ['Train your body.', 'Build strength.'], image: '/images/rooms/fitness.jpg', href: '/fitness', icon: Dumbbell, accent: 'rgba(210,150,150,0.32)' },
  { slug: 'work', label: 'Work', tagline: ['Build your brand.', 'Create impact.'], image: '/images/rooms/work.jpg', href: '/work', icon: Briefcase, accent: 'rgba(180,165,140,0.35)' },
  { slug: 'create', label: 'Create', tagline: ['Bring your ideas', 'to life.'], image: '/images/rooms/atelier.jpg', href: '/create', icon: PenLine, accent: 'rgba(201,169,110,0.32)' },
  { slug: 'wellness', label: 'Wellness', tagline: ['Protect your peace.', 'Nourish your soul.'], image: '/images/rooms/wellness.jpg', href: '/wellness', icon: Flower2, accent: 'rgba(150,175,160,0.32)' },
  { slug: 'astrology', label: 'Astrology', tagline: ['Align with', 'the universe.'], image: '/images/rooms/astrology.jpg', href: '/astrology', icon: MoonStar, accent: 'rgba(150,160,200,0.32)' },
  { slug: 'money', label: 'Money', tagline: ['Manage money.', 'Build wealth.'], image: '/images/rooms/money.jpg', href: '/money', icon: DollarSign, accent: 'rgba(190,175,140,0.35)' },
  { slug: 'brain', label: 'Brain Dump', tagline: ['Capture thoughts.', 'Clear your mind.'], image: '/images/rooms/brain.jpg', href: '/brain-dump', icon: Brain, accent: 'rgba(180,170,190,0.32)' },
  { slug: 'travel', label: 'Travel', tagline: ['Explore more.', 'Live fully.'], image: '/images/rooms/travel.jpg', href: '/travel', icon: Plane, accent: 'rgba(150,185,195,0.32)' },
  { slug: 'spiritual', label: 'Spiritual', tagline: ['Tarot, crystals,', 'rituals & more.'], image: '/images/rooms/spiritual.jpg', href: '/spirit', icon: Sparkles, accent: 'rgba(200,180,220,0.32)' },
]

// Mobile: 2 rooms per page (bigger cards, easier to read on a small screen).
// Desktop: 4 per page — matches the same 1024px cutover used by DesktopHeader/DesktopTabBar.
const MOBILE_PAGE_SIZE = 2
const DESKTOP_PAGE_SIZE = 4
const DESKTOP_BREAKPOINT = '(min-width: 1024px)'

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_BREAKPOINT)
    setIsDesktop(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isDesktop
}

const HERO_FOCUS_FALLBACK = ZOE_HERO_FOCUS_BY_DAY.Monday

export function LunaHomeGridPage() {
  const { now, weather, weatherError } = useTodayContext()
  const focus = (now && ZOE_HERO_FOCUS_BY_DAY[now.weekday]) ?? HERO_FOCUS_FALLBACK
  const isDesktop = useIsDesktop()
  const pageSize = isDesktop ? DESKTOP_PAGE_SIZE : MOBILE_PAGE_SIZE

  const pages = useMemo(() => {
    const chunks: Room[][] = []
    for (let i = 0; i < ROOMS.length; i += pageSize) chunks.push(ROOMS.slice(i, i + pageSize))
    return chunks
  }, [pageSize])

  const scrollerRef = useRef<HTMLDivElement>(null)
  const [pageIndex, setPageIndex] = useState(0)

  // Re-chunking on breakpoint change invalidates scroll position/pageIndex —
  // snap back to the first page rather than leaving a stale, out-of-bounds state.
  useEffect(() => {
    setPageIndex(0)
    scrollerRef.current?.scrollTo({ left: 0 })
  }, [pageSize])

  function handleScroll() {
    const el = scrollerRef.current
    if (!el || el.clientWidth === 0) return
    setPageIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  function goToPage(i: number) {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <AppLayout noPad noScroll>
      <div className={styles.page}>
        <GreetingHeader now={now} weather={weather} weatherError={weatherError} />

        <Link href="/plan-my-day" className={styles.hero}>
          <Image
            src={focus.image}
            alt={focus.title}
            fill
            sizes="(max-width: 640px) 100vw, 640px"
            style={focus.imagePosition ? { objectPosition: focus.imagePosition } : undefined}
            priority
          />
          <div className={styles.heroOverlay} />
          <div className={styles.heroContent}>
            <div className={styles.heroLabel}>Today&apos;s Focus</div>
            <h2>{focus.title} {focus.title === 'Recovery Sunday' ? <Waves size={13} strokeWidth={2} style={{ display: 'inline', verticalAlign: -2, color: '#5C4530' }} /> : focus.emoji}</h2>
            <p>{focus.subtitle}</p>
            <span className={styles.heroButton}>View Plan <ArrowRight size={11} /></span>
          </div>
        </Link>

        <div className={styles.roomsSection}>
          <div className={styles.roomPager} ref={scrollerRef} onScroll={handleScroll}>
            {pages.map((page, i) => (
              <div key={i} className={styles.roomPage}>
                {page.map(room => {
                  const Icon = room.icon
                  return (
                    <Link key={room.slug} href={room.href} className={styles.roomCard}>
                      <span className={styles.roomIconBadge} style={{ background: room.accent }}>
                        <Icon size={16} strokeWidth={1.7} className={styles.roomIcon} />
                      </span>
                      <span className={styles.roomLabel}>{room.label}</span>
                      <p className={styles.roomTagline}>{room.tagline[0]}<br />{room.tagline[1]}</p>
                      <div className={styles.roomPhoto}>
                        <Image src={room.image} alt={room.label} fill sizes="(max-width: 640px) 45vw, 220px" />
                        <span className={styles.roomGoButton}><ArrowUpRight size={13} /></span>
                      </div>
                      {room.comingSoon && <span className={styles.comingSoonBadge}>Soon</span>}
                    </Link>
                  )
                })}
              </div>
            ))}
          </div>

          <div className={styles.dots}>
            {pages.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`${styles.dot} ${i === pageIndex ? styles.dotActive : ''}`}
                onClick={() => goToPage(i)}
                aria-label={`Page ${i + 1} of ${pages.length}`}
              />
            ))}
          </div>
        </div>

        <div className={styles.sparkSection}><DailyCreativeSpark compact /></div>
      </div>
    </AppLayout>
  )
}
