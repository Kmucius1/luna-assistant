'use client'

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ElementType,
  type ReactNode,
} from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  BookOpen,
  Brain,
  Calendar,
  ChevronRight,
  Cloud,
  Droplets,
  Heart,
  Mic,
  Moon,
  PenLine,
  Plus,
  Scissors,
  ShowerHead,
  Sparkles,
  Star,
  Sun,
  Sunrise,
  Target,
  Utensils,
  Waves,
  Zap,
} from 'lucide-react'

import { LunaShell } from '@/components/luna/LunaShell'
import { LunaSwipePager } from '@/components/luna/LunaSwipePager'
import { useLocation } from '@/hooks/useLocation'
import VAULT_CATEGORIES from '@/data/vault/categories.json'
import styles from './LunaHomeExperience.module.css'

interface GuidanceData {
  horoscope?: string
  energy?: string
  affirmation?: string
  shadow_question?: string
  moon_note?: string
}

interface HomeTask {
  id: string
  title: string
  urgency_level?: string
}

interface DayPlanBlock {
  time: string
  label: string
  detail?: string
  type: string
  anchor?: boolean
  emoji?: string
}

interface DayPlan {
  schedule?: DayPlanBlock[]
}

interface MoonPreviewData {
  phase?: { name: string; emoji?: string; illumination?: number }
  sign?: { name: string; emoji?: string }
}

interface TodayCheckIn {
  sleep_rating?: number | null
  energy_rating?: number | null
  mood_rating?: number | null
  type?: string
  date?: string
  created_at?: string
}

interface DailyOutfit {
  occasion: string
  why: string
  outfit_caption: string
  image_url: string | null
}

interface MoneyPreviewData {
  bills_due_soon?: unknown[]
  has_transactions?: boolean
  spending_this_week?: number
}

type HeroTimeBucket = 'morning' | 'afternoon' | 'evening' | 'night'

type IconType = ElementType<{ className?: string; size?: number; strokeWidth?: number }>

const HERO_GREETINGS: Record<HeroTimeBucket, string> = {
  morning: 'Good morning',
  afternoon: 'Good afternoon',
  evening: 'Good evening',
  night: 'Good night',
}

const HERO_TAGLINES: Record<HeroTimeBucket, string[]> = {
  morning: [
    'You are not behind.\nYou are becoming.',
    'Start soft.\nThe day will meet you there.',
    'One clear breath\nbefore the noise begins.',
  ],
  afternoon: [
    'Keep going.\nYou are closer than it feels.',
    'This is the middle,\nnot the mistake.',
    'Steady pace.\nYou do not have to rush this.',
  ],
  evening: [
    'The day is closing.\nLet it.',
    'You did enough.\nReally.',
    'Soften now.\nTomorrow can wait its turn.',
  ],
  night: [
    'Rest is not\nfalling behind.',
    'The quiet is yours.\nStay a while.',
    'You are not behind.\nYou are becoming.',
  ],
}

const PARKED = VAULT_CATEGORIES.flatMap(category => category.items)
  .filter(item => item.status === 'parked')
  .slice(0, 3)
  .map(item => item.name)

const FALLBACK_PARKED = ["LINK'D UP", 'Nurturly', 'TikTok Shop']

function getBucket(hour: number): HeroTimeBucket {
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  if (hour < 21) return 'evening'
  return 'night'
}

function getTagline(hour: number): string {
  const bucket = getBucket(hour)
  const pool = HERO_TAGLINES[bucket]
  const start = new Date(new Date().getFullYear(), 0, 0).getTime()
  const day = Math.floor((Date.now() - start) / 86_400_000)
  return pool[day % pool.length]
}

function timeToMinutes(value?: string): number | null {
  if (!value) return null
  const match = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
  if (!match) return null
  let hours = Number.parseInt(match[1], 10)
  const minutes = Number.parseInt(match[2], 10)
  const suffix = match[3].toUpperCase()
  if (suffix === 'PM' && hours !== 12) hours += 12
  if (suffix === 'AM' && hours === 12) hours = 0
  return hours * 60 + minutes
}

function ratingStatus(value?: number | null): string {
  if (value == null) return 'Not synced'
  if (value >= 8) return 'Great'
  if (value >= 5) return 'Okay'
  return 'Low'
}

function SectionLabel({ icon: Icon, children }: { icon?: IconType; children: ReactNode }) {
  return (
    <div className={styles.sectionLabel}>
      {Icon ? <Icon size={16} strokeWidth={1.7} /> : <span className={styles.spark}>✦</span>}
      <span>{children}</span>
    </div>
  )
}

function GlassCard({ className = '', children }: { className?: string; children: ReactNode }) {
  return <section className={`${styles.glassCard} ${className}`}>{children}</section>
}

function IconOrb({ icon: Icon, tone = 'purple' }: { icon: IconType; tone?: 'purple' | 'pink' | 'gold' }) {
  return (
    <span className={`${styles.iconOrb} ${styles[`tone_${tone}`]}`}>
      <Icon size={25} strokeWidth={1.65} />
    </span>
  )
}

function EnergyRing({ value, size = 'large' }: { value: number; size?: 'small' | 'large' }) {
  const safeValue = Math.min(100, Math.max(0, value))
  const radius = 47
  const circumference = 2 * Math.PI * radius
  const dash = circumference * (1 - safeValue / 100)
  return (
    <div className={`${styles.energyRing} ${size === 'small' ? styles.energyRingSmall : ''}`}>
      <svg viewBox="0 0 110 110" aria-hidden="true">
        <circle cx="55" cy="55" r={radius} className={styles.energyTrack} />
        <circle
          cx="55"
          cy="55"
          r={radius}
          className={styles.energyProgress}
          strokeDasharray={circumference}
          strokeDashoffset={dash}
        />
      </svg>
      <div className={styles.energyCenter}>
        <strong>{safeValue || '—'}</strong>
        <span>{safeValue ? 'Good Energy' : 'Not logged'}</span>
        <b>✦</b>
      </div>
    </div>
  )
}

function QuickAction({ icon: Icon, label, href }: { icon: IconType; label: string; href: string }) {
  return (
    <Link href={href} className={styles.quickAction}>
      <IconOrb icon={Icon} />
      <span>{label}</span>
    </Link>
  )
}

function HomeSlideOne({
  greeting,
  tagline,
  moon,
  checkIn,
  topTasks,
  dayPlan,
  bucket,
}: {
  greeting: string
  tagline: string
  moon: MoonPreviewData | null
  checkIn: TodayCheckIn | null
  topTasks: HomeTask[]
  dayPlan: DayPlan | null
  bucket: HeroTimeBucket
}) {
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const nextItems = (dayPlan?.schedule ?? [])
    .map(item => ({ ...item, minutes: timeToMinutes(item.time) }))
    .filter((item): item is DayPlanBlock & { minutes: number } => item.minutes != null && item.minutes >= nowMinutes)
    .sort((a, b) => a.minutes - b.minutes)
    .slice(0, 3)
  const priorities = nextItems.length > 0
    ? nextItems.map((item, index) => ({ id: `${item.time}-${index}`, title: `${item.time} · ${item.label}` }))
    : topTasks.slice(0, 3)
  const energy = checkIn
    ? Math.round((((checkIn.sleep_rating ?? 0) + (checkIn.energy_rating ?? 0) + (checkIn.mood_rating ?? 0)) / 3) * 10)
    : 0

  return (
    <div className={styles.slideOne}>
      <GlassCard className={`${styles.heroCard} hero-${bucket}`}>
        <div className={styles.heroCopy}>
          <h1>{greeting}, Zoe <span>✦</span></h1>
          <p>{tagline}</p>
          <div className={styles.moonLine}>
            <span>{moon?.phase?.emoji ?? '🌙'}</span>
            <span>
              {moon?.phase?.name && moon.phase.illumination != null
                ? `${moon.phase.name} · ${moon.phase.illumination}% illuminated`
                : 'Moon phase syncing'}
            </span>
          </div>
        </div>
      </GlassCard>

      <GlassCard className={styles.glanceCard}>
        <SectionLabel>Today at a Glance</SectionLabel>
        <div className={styles.glanceBody}>
          <EnergyRing value={energy} size="small" />
          <div className={styles.metricGrid}>
            <div className={styles.metricCard}>
              <IconOrb icon={Heart} />
              <span>Mood</span>
              <strong>{ratingStatus(checkIn?.mood_rating)}</strong>
            </div>
            <div className={styles.metricCard}>
              <IconOrb icon={Moon} />
              <span>Sleep</span>
              <strong>{checkIn?.sleep_rating != null ? `${checkIn.sleep_rating}/10` : 'Not synced'}</strong>
            </div>
            <div className={styles.metricCard}>
              <IconOrb icon={Sunrise} />
              <span>Peak</span>
              <strong>Not synced</strong>
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard className={styles.priorityCard}>
        <div className={styles.priorityHeader}>
          <SectionLabel icon={Target}>Today&apos;s Top 3</SectionLabel>
        </div>
        <div className={styles.priorityList}>
          {priorities.length > 0 ? priorities.map((task, index) => (
            <div key={task.id} className={styles.priorityRow}>
              <span className={styles.priorityNumber}>{index + 1}</span>
              <span>{task.title}</span>
              <Star size={17} strokeWidth={1.35} />
            </div>
          )) : (
            <div className={styles.emptyLine}>No priorities yet. Ask LUNA to plan your day.</div>
          )}
        </div>
        <Link href={nextItems.length > 0 ? '/plan-my-day' : '/tasks'} className={styles.inlineLink}>
          {nextItems.length > 0 ? 'View full plan' : 'View all tasks'} <ChevronRight size={15} />
        </Link>
      </GlassCard>
    </div>
  )
}

function HomeSlideTwo({ guidance, lunaMessage }: {
  guidance: GuidanceData | null
  lunaMessage: { message: string; affirmation: string } | null
}) {
  const [expanded, setExpanded] = useState(false)
  const message = lunaMessage?.message ?? guidance?.energy ?? 'Today needs prioritizing self-care and intuition over external validation. Focus on one task at a time.'

  return (
    <div className={styles.twoColumnSlide}>
      <GlassCard className={styles.quickActionsCard}>
        <SectionLabel icon={Zap}>Quick Actions</SectionLabel>
        <div className={styles.quickActionsGrid}>
          <QuickAction icon={Mic} label="Dictate" href="/luna?tab=dictate" />
          <QuickAction icon={Brain} label="Brain Dump" href="/brain-dump" />
          <QuickAction icon={Calendar} label="Plan My Day" href="/plan-my-day" />
          <QuickAction icon={Plus} label="New Task" href="/tasks?new=1" />
        </div>
      </GlassCard>

      <GlassCard className={styles.lunaMessageCard}>
        <SectionLabel>LUNA&apos;S MESSAGE</SectionLabel>
        <p className={`${styles.lunaMessageText} ${expanded ? styles.expandedText : ''}`}>{message}</p>
        <div className={styles.lunaMessageArt} aria-hidden="true" />
        <button type="button" className={styles.pillButton} onClick={() => setExpanded(value => !value)}>
          {expanded ? 'Show less' : 'Tell me more'} <ChevronRight size={16} />
        </button>
      </GlassCard>
    </div>
  )
}

function HomeSlideThree({ outfit, moon, money, guidance }: {
  outfit: DailyOutfit | null
  moon: MoonPreviewData | null
  money: MoneyPreviewData | null
  guidance: GuidanceData | null
}) {
  const outfitParts = (outfit?.outfit_caption ?? 'Cropped graphic tee, oversized wide-leg denim, chunky sandals')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .slice(0, 3)

  return (
    <div className={styles.previewSlide}>
      <GlassCard className={styles.outfitCard}>
        <div className={styles.outfitImageWrap}>
          {outfit?.image_url ? <img src={outfit.image_url} alt={outfit.outfit_caption} /> : <Scissors size={44} strokeWidth={1.25} />}
        </div>
        <div className={styles.outfitCopy}>
          <SectionLabel icon={Scissors}>What to Wear Today</SectionLabel>
          <h2>{outfit?.occasion ?? 'Summer Saturday vibes'}</h2>
          <p>{outfit?.outfit_caption ?? 'Cropped graphic tee, oversized wide-leg denim, chunky sandals'}</p>
          <div className={styles.outfitTags}>
            {outfitParts.map((part, index) => <span key={`${part}-${index}`}>{part}</span>)}
          </div>
          <Link href="/outfit-today" className={styles.largeInlineLink}>Open <ChevronRight size={18} /></Link>
        </div>
        <div className={styles.outfitMoon} aria-hidden="true">☾</div>
      </GlassCard>

      <GlassCard className={styles.dailyGlanceCard}>
        <div className={styles.dailyGlanceArt} aria-hidden="true" />
        <div className={styles.dailyGlanceCopy}>
          <SectionLabel icon={Moon}>Today&apos;s Glance</SectionLabel>
          <div className={styles.glanceRows}>
            <div><IconOrb icon={Sparkles} /><span>Astrology</span><strong>{moon?.sign?.name ? `${moon.sign.name} Moon` : moon?.phase?.name ?? 'Astrology'}</strong></div>
            <div><IconOrb icon={Target} /><span>Spent this week</span><strong>{money?.has_transactions ? `$${(money.spending_this_week ?? 0).toFixed(2)}` : '—'}</strong></div>
            <div><IconOrb icon={Moon} /><span>Tonight</span><strong>Wind down</strong></div>
          </div>
          <p className={styles.glanceNote}>✦ {guidance?.moon_note ?? 'Emotional clarity · intuition · home'}</p>
          <Link href="/daily-glance" className={styles.largeInlineLink}>Open <ChevronRight size={18} /></Link>
        </div>
      </GlassCard>
    </div>
  )
}

function HomeSlideFour({ checkIn }: { checkIn: TodayCheckIn | null }) {
  const energy = checkIn
    ? Math.round((((checkIn.sleep_rating ?? 0) + (checkIn.energy_rating ?? 0) + (checkIn.mood_rating ?? 0)) / 3) * 10)
    : 0
  const rows = [
    { icon: Moon, label: 'Sleep', value: checkIn?.sleep_rating != null ? `${checkIn.sleep_rating}/10` : '—', status: ratingStatus(checkIn?.sleep_rating) },
    { icon: Zap, label: 'Energy', value: checkIn?.energy_rating != null ? `${checkIn.energy_rating}/10` : '—', status: ratingStatus(checkIn?.energy_rating) },
    { icon: Heart, label: 'Mood', value: checkIn?.mood_rating != null ? `${checkIn.mood_rating}/10` : '—', status: ratingStatus(checkIn?.mood_rating) },
  ]

  return (
    <GlassCard className={styles.wellnessCard}>
      <SectionLabel icon={Heart}>Wellness &amp; Energy <span className={styles.spark}>✦</span></SectionLabel>
      <p className={styles.cardSubtitle}>Your mind, body &amp; spirit today</p>
      <div className={styles.wellnessBody}>
        <EnergyRing value={energy} />
        <div className={styles.wellnessDivider} />
        <div className={styles.wellnessRows}>
          {rows.map(({ icon, label, value, status }) => (
            <div key={label} className={styles.wellnessRow}>
              <IconOrb icon={icon} />
              <div><strong>{label}</strong><span>{value}</span></div>
              <b className={status === 'Low' ? styles.statusLow : ''}>● {status}</b>
              <ChevronRight size={19} />
            </div>
          ))}
          {!checkIn && <Link href="/morning" className={styles.checkInLink}>Log today&apos;s check-in →</Link>}
        </div>
      </div>
    </GlassCard>
  )
}

function FlowChart() {
  return (
    <div className={styles.flowChart}>
      <div className={styles.peakLabel}>Peak 4–6 PM</div>
      <svg viewBox="0 0 1000 170" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="flowFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9b5cff" stopOpacity="0.38" />
            <stop offset="1" stopColor="#9b5cff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0 145 C190 145 265 132 390 95 C500 62 560 28 650 45 C770 66 835 119 1000 142 L1000 170 L0 170 Z" fill="url(#flowFill)" />
        <path d="M0 145 C190 145 265 132 390 95 C500 62 560 28 650 45 C770 66 835 119 1000 142" fill="none" stroke="#9854ff" strokeWidth="5" strokeLinecap="round" />
        <circle cx="610" cy="38" r="10" fill="#b98bff" />
        <circle cx="610" cy="38" r="19" fill="none" stroke="#b98bff" strokeOpacity="0.36" strokeWidth="4" />
      </svg>
      <div className={styles.flowTimes}>{['12 AM', '4 AM', '8 AM', '12 PM', '4 PM', '8 PM', '12 AM'].map(time => <span key={time}>{time}</span>)}</div>
      <div className={styles.flowLabels}><span><Moon size={14} /> Rest</span><span><Sun size={14} /> Focus</span><span><Moon size={14} /> Wind Down</span></div>
    </div>
  )
}

function HomeSlideFive() {
  return (
    <div className={styles.flowSlide}>
      <GlassCard className={styles.flowCard}>
        <div className={styles.flowHeader}>
          <div><SectionLabel icon={Waves}>Today&apos;s Flow</SectionLabel><p>Energy throughout your day</p></div>
          <Link href="/health">See full day <ChevronRight size={15} /></Link>
        </div>
        <FlowChart />
      </GlassCard>

      <GlassCard className={styles.journalCard}>
        <div className={styles.journalCopy}>
          <SectionLabel icon={PenLine}>Daily Journal Prompt</SectionLabel>
          <span>For your reflection</span>
          <blockquote>“What is one area of my life that is asking for more patience?”</blockquote>
          <Link href="/journal" className={styles.primaryButton}>Start Journaling <ChevronRight size={18} /></Link>
        </div>
        <div className={styles.journalArt} aria-hidden="true" />
      </GlassCard>
    </div>
  )
}

function HomeSlideSix({ checkIn, topTasks }: { checkIn: TodayCheckIn | null; topTasks: HomeTask[] }) {
  const [bodyDone, setBodyDone] = useState<Set<string>>(new Set())
  const [focusDone, setFocusDone] = useState(false)
  const basics = [
    { id: 'water', icon: Droplets, label: 'Water' },
    { id: 'food', icon: Utensils, label: 'Food' },
    { id: 'shower', icon: ShowerHead, label: 'Shower' },
    { id: 'sunlight', icon: Sun, label: 'Sunlight' },
  ]
  const energyStatus = checkIn?.energy_rating != null && checkIn.energy_rating >= 8 ? 'strong' : checkIn?.energy_rating != null && checkIn.energy_rating < 5 ? 'low' : 'medium'

  return (
    <div className={styles.energySlide}>
      <GlassCard className={styles.energyReadCard}>
        <div className={styles.energyReadOverlay}>
          <SectionLabel icon={Zap}>Energy Read</SectionLabel>
          <h2>{checkIn?.mood_rating != null && checkIn.mood_rating < 5 ? 'Tender but capable' : 'Scattered but capable'}</h2>
          <p>Your mind is moving faster than your body. Start with grounding, then choose one clean action.</p>
          <div className={styles.energyPills}>
            <span><Cloud size={17} /> Mood: {ratingStatus(checkIn?.mood_rating).toLowerCase()}</span>
            <span><Zap size={17} /> Energy: {energyStatus}</span>
            <span><Moon size={17} /> Sleep: {checkIn?.sleep_rating != null ? `${checkIn.sleep_rating}/10` : 'not synced'}</span>
            <span><Sparkles size={17} /> Support: grounding</span>
          </div>
        </div>
      </GlassCard>

      <div className={styles.energyBottomGrid}>
        <GlassCard className={styles.bodyBasicsCard}>
          <SectionLabel icon={Heart}>Body Basics</SectionLabel>
          <p>You need water + food before decisions.</p>
          <div className={styles.basicButtons}>
            {basics.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                type="button"
                className={bodyDone.has(id) ? styles.basicDone : ''}
                onClick={() => setBodyDone(current => {
                  const next = new Set(current)
                  next.has(id) ? next.delete(id) : next.add(id)
                  return next
                })}
              >
                <Icon size={22} strokeWidth={1.65} /> {label}
              </button>
            ))}
          </div>
        </GlassCard>

        <GlassCard className={styles.focusResetCard}>
          <SectionLabel icon={Target}>Focus Reset</SectionLabel>
          <p>One 25-min block. No multitasking.</p>
          <strong>{topTasks[0]?.title ?? 'Choose one clear priority'}</strong>
          <button type="button" className={styles.focusButton} onClick={() => setFocusDone(value => !value)}>
            {focusDone ? '✓ Focus block complete' : 'Start focus block'} <ChevronRight size={17} />
          </button>
        </GlassCard>
      </div>
    </div>
  )
}

const RESET_MODES = [
  { id: 'late', icon: Sunrise, label: 'I woke up late', response: 'Recovery mode: choose one required task and release the rest.' },
  { id: 'rush', icon: Zap, label: "I’m rushing", response: 'Rush mode: stop switching. Finish the next physical action only.' },
  { id: 'overwhelmed', icon: Cloud, label: 'I feel overwhelmed', response: 'Grounding mode: breathe, drink water, and name the one thing that matters.' },
  { id: 'softness', icon: Heart, label: 'I need softness', response: 'Soft mode: lower the pressure without abandoning yourself.' },
]

function HomeSlideSeven() {
  const [activeMode, setActiveMode] = useState<string | null>(null)
  const [homeDone, setHomeDone] = useState(false)
  const active = RESET_MODES.find(mode => mode.id === activeMode)

  return (
    <div className={styles.resetSlide}>
      <GlassCard className={styles.resetModeCard}>
        <SectionLabel>Choose Reset Mode</SectionLabel>
        <div className={styles.resetModeGrid}>
          {RESET_MODES.map(({ id, icon, label }) => (
            <button key={id} type="button" className={activeMode === id ? styles.resetActive : ''} onClick={() => setActiveMode(activeMode === id ? null : id)}>
              <IconOrb icon={icon} tone={id === 'late' ? 'gold' : id === 'softness' ? 'pink' : 'purple'} />
              <span>{label}</span>
              <ChevronRight size={22} />
            </button>
          ))}
        </div>
        {active && <p className={styles.resetResponse}>{active.response}</p>}
      </GlassCard>

      <GlassCard className={styles.homeEnergyCard}>
        <div className={styles.homeEnergyCopy}>
          <SectionLabel>Home Energy</SectionLabel>
          <h2>Small reset. Big energy.</h2>
          <p>Start one load of laundry</p>
          <button type="button" className={styles.primaryButton} onClick={() => setHomeDone(value => !value)}>
            {homeDone ? '✓ Task complete' : 'Start task'} <ChevronRight size={18} />
          </button>
        </div>
        <div className={styles.homeEnergyArt} aria-hidden="true" />
      </GlassCard>
    </div>
  )
}

function StarSigil() {
  return (
    <div className={styles.starSigil} aria-hidden="true">
      <span />
      <i />
    </div>
  )
}

function HomeSlideEight({ guidance }: { guidance: GuidanceData | null }) {
  const week = Math.ceil((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 604_800_000)
  const dayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

  return (
    <GlassCard className={styles.weeklyFocusCard}>
      <div className={styles.weeklyTopRow}><SectionLabel>Weekly Focus</SectionLabel><span>WK {week}</span></div>
      <StarSigil />
      <h2>One lane gets your<br />energy this week.</h2>
      <blockquote>{guidance?.affirmation ?? 'I trust my voice and my wisdom, and I confidently share my truth with others, knowing that it will guide me toward my highest purpose and potential.'}</blockquote>
      <div className={styles.weekDays}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => <span key={`${day}-${index}`} className={index === dayIndex ? styles.currentDay : index < dayIndex ? styles.pastDay : ''}><i />{day}</span>)}
      </div>
      <div className={styles.weekThemes}><span>✦ Refinement</span><span>◉ Visibility</span><span>ϟ Momentum</span></div>
    </GlassCard>
  )
}

function HomeSlideNine({ guidance }: { guidance: GuidanceData | null }) {
  const parked = PARKED.length > 0 ? PARKED : FALLBACK_PARKED
  return (
    <div className={styles.weekPlanSlide}>
      <div className={styles.lessonGrid}>
        <GlassCard className={`${styles.lessonCard} ${styles.lessonBackground}`}>
          <IconOrb icon={BookOpen} />
          <div><SectionLabel>Lesson</SectionLabel><p>{guidance?.shadow_question ?? 'Recognition over chasing. Speak clearly, then let the right doors open.'}</p></div>
        </GlassCard>
        <GlassCard className={`${styles.lessonCard} ${styles.upcomingBackground}`}>
          <IconOrb icon={Zap} />
          <div><SectionLabel>Upcoming Energy</SectionLabel><p>This week favors refinement, planning, and one brave visible step.</p></div>
        </GlassCard>
      </div>

      <GlassCard className={styles.parkedCard}>
        <div className={styles.parkedHeader}>
          <div><SectionLabel icon={BookOpen}>Parked Priorities</SectionLabel><p>Your ideas are safe here.</p></div>
          <Moon size={44} strokeWidth={1.25} />
        </div>
        <div className={styles.parkedRows}>
          {parked.slice(0, 3).map(item => <div key={item}><span>●</span><strong>{item}</strong><b>⠿</b></div>)}
        </div>
      </GlassCard>

      <Link href="/luna" className={styles.planWeekButton}><span className={styles.planWeekOrb}>✦</span><strong>Plan my week <ChevronRight size={25} /></strong><Star size={30} strokeWidth={1.5} /></Link>
    </div>
  )
}

const TAB_TO_SLIDE: Record<string, number> = {
  today: 0,
  focus: 1,
  previews: 2,
  wellness: 3,
  flow: 4,
  energy: 5,
  reset: 6,
  weekly: 7,
  parked: 8,
}

function LunaHomeInner() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') ?? ''
  const [activeSlide, setActiveSlide] = useState(TAB_TO_SLIDE[initialTab] ?? 0)
  const [hour, setHour] = useState(12)
  const [tagline, setTagline] = useState(() => HERO_TAGLINES[getBucket(12)][0])
  const [guidance, setGuidance] = useState<GuidanceData | null>(null)
  const [lunaMessage, setLunaMessage] = useState<{ message: string; affirmation: string } | null>(null)
  const [topTasks, setTopTasks] = useState<HomeTask[]>([])
  const [dayPlan, setDayPlan] = useState<DayPlan | null>(null)
  const [moonData, setMoonData] = useState<MoonPreviewData | null>(null)
  const [moneyData, setMoneyData] = useState<MoneyPreviewData | null>(null)
  const [checkIn, setCheckIn] = useState<TodayCheckIn | null>(null)
  const [dailyOutfit, setDailyOutfit] = useState<DailyOutfit | null>(null)
  const location = useLocation()

  useEffect(() => {
    const update = () => {
      const nextHour = new Date().getHours()
      setHour(nextHour)
      setTagline(getTagline(nextHour))
    }
    update()
    const timer = window.setInterval(update, 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (location.permitted === null) return
    const params = new URLSearchParams({ tz: Intl.DateTimeFormat().resolvedOptions().timeZone })
    if (location.lat != null && location.lon != null) {
      params.set('lat', String(location.lat))
      params.set('lon', String(location.lon))
    }
    fetch(`/api/atelier/daily-outfit?${params.toString()}`, { cache: 'no-store' })
      .then(response => response.json())
      .then(data => setDailyOutfit(data))
      .catch(() => setDailyOutfit(null))
  }, [location.permitted, location.lat, location.lon])

  const loadData = useCallback(() => {
    const timezone = encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)

    fetch('/api/astrology/daily-guidance', { cache: 'no-store' })
      .then(response => response.json())
      .then(data => setGuidance(data))
      .catch(() => {
        fetch('/api/ai/spiritual-guidance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }).then(response => response.json()).then(data => setGuidance(data)).catch(() => {})
      })

    fetch(`/api/luna/daily-message?tz=${timezone}`, { cache: 'no-store' })
      .then(response => response.json())
      .then(data => setLunaMessage(data))
      .catch(() => setLunaMessage(null))

    fetch('/api/home/summary', { cache: 'no-store' })
      .then(response => response.json())
      .then(data => setTopTasks(data.tasks?.top ?? []))
      .catch(() => setTopTasks([]))

    fetch(`/api/home/day-plan?tz=${timezone}`, { cache: 'no-store' })
      .then(response => response.json())
      .then(data => setDayPlan(data.plan ?? null))
      .catch(() => setDayPlan(null))

    fetch(`/api/astrology/moon?tz=${timezone}`, { cache: 'no-store' })
      .then(response => response.json())
      .then(data => setMoonData(data))
      .catch(() => setMoonData(null))

    fetch('/api/money/summary', { cache: 'no-store' })
      .then(response => response.json())
      .then(data => setMoneyData(data))
      .catch(() => setMoneyData(null))

    fetch('/api/check-ins?limit=5', { cache: 'no-store' })
      .then(response => response.json())
      .then((data: { checkIns?: TodayCheckIn[] }) => {
        const today = new Date().toDateString()
        const match = (data.checkIns ?? []).find(item => item.created_at && new Date(item.created_at).toDateString() === today)
        setCheckIn(match ?? null)
      })
      .catch(() => setCheckIn(null))
  }, [])

  useEffect(() => {
    loadData()
    const interval = window.setInterval(loadData, 60_000)
    const onFocus = () => loadData()
    const onVisibility = () => { if (document.visibilityState === 'visible') loadData() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [loadData])

  const bucket = getBucket(hour)
  const pages = useMemo(() => [
    { id: 'today', label: 'Today', noScroll: true, content: <HomeSlideOne greeting={HERO_GREETINGS[bucket]} tagline={tagline} moon={moonData} checkIn={checkIn} topTasks={topTasks} dayPlan={dayPlan} bucket={bucket} /> },
    { id: 'focus', label: 'Focus', noScroll: true, content: <HomeSlideTwo guidance={guidance} lunaMessage={lunaMessage} /> },
    { id: 'previews', label: 'Previews', noScroll: true, content: <HomeSlideThree outfit={dailyOutfit} moon={moonData} money={moneyData} guidance={guidance} /> },
    { id: 'wellness', label: 'Wellness', noScroll: true, content: <HomeSlideFour checkIn={checkIn} /> },
    { id: 'flow', label: 'Flow', noScroll: true, content: <HomeSlideFive /> },
    { id: 'energy', label: 'Energy', noScroll: true, content: <HomeSlideSix checkIn={checkIn} topTasks={topTasks} /> },
    { id: 'reset', label: 'Reset', noScroll: true, content: <HomeSlideSeven /> },
    { id: 'weekly', label: 'Weekly', noScroll: true, content: <HomeSlideEight guidance={guidance} /> },
    { id: 'parked', label: 'Parked', noScroll: true, content: <HomeSlideNine guidance={guidance} /> },
  ], [bucket, hour, tagline, moonData, checkIn, topTasks, dayPlan, guidance, lunaMessage, dailyOutfit, moneyData])

  return (
    <LunaShell noScroll wide>
      <div className={styles.homeExperience}>
        <LunaSwipePager
          pages={pages}
          hidePills
          accentColor="#9b5cff"
          activeIndex={activeSlide}
          onChangeIndex={setActiveSlide}
          pageNoScroll
        />
      </div>
    </LunaShell>
  )
}

export function LunaHomeExperience() {
  return (
    <Suspense fallback={null}>
      <LunaHomeInner />
    </Suspense>
  )
}
