'use client'
import { useState, useEffect, useRef } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { GlassCard } from '@/components/ui/GlassCard'
import { Sparkles, Moon, Star, RefreshCw, ChevronLeft } from 'lucide-react'
import { format } from 'date-fns'
import { drawCards, DrawnCard } from '@/lib/tarot-deck'
import { saveTarotReading, getTarotHistory, getTarotStats, TarotHistoryEntry } from '@/lib/tarot-history'

// ─── Moon phases ────────────────────────────────────────────────
const MOON_PHASES = [
  { name: 'New Moon',        emoji: '🌑', desc: 'Plant seeds. Set intentions. Go inward.' },
  { name: 'Waxing Crescent', emoji: '🌒', desc: 'Take small steps. Build momentum slowly.' },
  { name: 'First Quarter',   emoji: '🌓', desc: 'Act. Decide. Overcome resistance.' },
  { name: 'Waxing Gibbous',  emoji: '🌔', desc: 'Refine. Trust the growth. Be patient.' },
  { name: 'Full Moon',       emoji: '🌕', desc: 'Illuminate. Release. Celebrate what is.' },
  { name: 'Waning Gibbous',  emoji: '🌖', desc: 'Share. Integrate. Practice gratitude.' },
  { name: 'Last Quarter',    emoji: '🌗', desc: 'Release. Edit. Let what\'s done be done.' },
  { name: 'Waning Crescent', emoji: '🌘', desc: 'Rest. Restore. Surrender and receive.' },
]

// ─── Crystals ───────────────────────────────────────────────────
const CRYSTALS = [
  { name: 'Black Tourmaline', color: '#2A2A2A', desc: 'Grounds and protects your energy field',     use: 'Hold while setting boundaries or doing difficult work' },
  { name: 'Labradorite',      color: '#4A6FA5', desc: 'Strengthens intuition and psychic awareness', use: 'Place on your desk when you need clear decision-making' },
  { name: 'Rose Quartz',      color: '#D4A0A0', desc: 'Heals the heart and invites self-compassion', use: 'Keep near when processing emotional weight or softening' },
  { name: 'Citrine',          color: '#C9A84C', desc: 'Activates abundance and creative confidence',  use: 'Carry when pitching, pricing, or building new income' },
  { name: 'Amethyst',         color: '#9b5cff', desc: 'Deepens intuition and spiritual connection',  use: 'Sleep with it nearby to enhance dream clarity' },
  { name: 'Selenite',         color: '#E8E4F0', desc: 'Clears and recharges your aura',              use: 'Wave over your body at end of day to clear absorbed energy' },
  { name: 'Obsidian',         color: '#1A1A1A', desc: 'Reveals shadow and transforms what is hidden', use: 'Meditate with when ready to face what needs to be seen' },
  { name: 'Moonstone',        color: '#C0C8D8', desc: 'Connects to Cancer Moon intuition and cycles', use: 'Wear or carry during moon phases and emotional transitions' },
]

// ─── Human Design reminders ─────────────────────────────────────
const HD_REMINDERS = [
  { title: 'Projector Strategy: Wait for Invitation',   body: 'You are not meant to initiate. Big moves — new clients, pitches, relationships — work best when you are invited. The right doors open when you are recognized, not when you force your way in.' },
  { title: 'Self-Projected Authority: Use Your Voice',  body: 'Your clarity comes through speaking, not thinking. When facing a decision, say it out loud — to yourself, a mirror, or someone you trust. Your truth reveals itself in the speaking.' },
  { title: '4/6 Profile: Your Network Is Your Path',    body: 'Your 4th line builds through close, trusted relationships — not cold outreach. Your 6th line is becoming a living role model through experience. Every mistake is curriculum, not failure.' },
  { title: 'Projector Warning: Check for Bitterness',   body: 'Bitterness is your signal, not your punishment. If you feel resentful, overlooked, or exhausted — you are likely giving energy without invitation. Pause. Recalibrate. Wait to be seen.' },
  { title: 'Scorpio Sun: You Already Know',              body: 'Your Scorpio Sun reads beneath every surface. Trust what you sense about a person, a situation, or an opportunity — even before you can articulate it. You already know more than you let on.' },
  { title: 'Cancer Moon: Emotional Safety Is the Work', body: 'Your Cancer Moon means emotional safety is your foundation — not a luxury. Rest, home, soft spaces, and genuine care are not distractions from success. They ARE the path to it.' },
  { title: 'Virgo Midheaven: Build It Clean',           body: 'Your career grows through service, systems, and precision. When you turn chaos into order — for your clients, yourself, your brand — that IS your highest work. Clean systems are your legacy.' },
  { title: 'North Node in Cancer: Come Home',           body: 'Your destiny path is emotional wisdom, building safety for others, and creating home — literal and metaphorical. You are growing INTO depth, softness, and nurturing — not away from it.' },
]

// ─── Major Arcana ────────────────────────────────────────────────
const TAROT = [
  { name: 'The Fool',         emoji: '🌿', theme: 'New beginnings',    message: 'Something wants to begin. Trust the leap, even without the full map.' },
  { name: 'The Magician',     emoji: '✨', theme: 'Your power',         message: 'You have everything you need. Use it.' },
  { name: 'High Priestess',   emoji: '🌙', theme: 'Inner knowing',      message: 'Be still. The answer is already inside you.' },
  { name: 'The Empress',      emoji: '🌸', theme: 'Abundance',          message: 'Create, nurture, receive. Your power is generative.' },
  { name: 'The Emperor',      emoji: '🏛️', theme: 'Structure',          message: 'Build the system. Lead from discipline.' },
  { name: 'The Hierophant',   emoji: '📿', theme: 'Tradition',          message: 'What wisdom from the past applies right now?' },
  { name: 'The Lovers',       emoji: '💞', theme: 'Alignment',          message: 'Choose what is truly aligned, not just convenient.' },
  { name: 'The Chariot',      emoji: '⚡', theme: 'Willpower',          message: 'You can move through this. Focus and drive.' },
  { name: 'Strength',         emoji: '🦁', theme: 'Inner courage',      message: 'Gentle power. Calm in chaos.' },
  { name: 'The Hermit',       emoji: '🕯️', theme: 'Reflection',         message: 'Go within. The guide is you.' },
  { name: 'Wheel of Fortune', emoji: '🎡', theme: 'Cycles',             message: 'The wheel is turning. Trust the shift.' },
  { name: 'Justice',          emoji: '⚖️', theme: 'Truth',              message: 'Act from your truth. Balance will follow.' },
  { name: 'Hanged One',       emoji: '🌀', theme: 'Surrender',          message: 'Let go. A new perspective is coming.' },
  { name: 'Death',            emoji: '🦋', theme: 'Transformation',     message: 'Something is ending. This is the doorway, not the wall.' },
  { name: 'Temperance',       emoji: '🌊', theme: 'Balance',            message: 'Blend with patience. Nothing needs to be rushed.' },
  { name: 'The Devil',        emoji: '🔗', theme: 'Attachment',         message: 'What pattern has you bound? You can choose again.' },
  { name: 'The Tower',        emoji: '⚡', theme: 'Sudden change',      message: 'What is falling was never meant to stand. Let it go.' },
  { name: 'The Star',         emoji: '⭐', theme: 'Hope',               message: 'You are held. Pour out and trust you will be refilled.' },
  { name: 'The Moon',         emoji: '🌕', theme: 'The unconscious',    message: 'Not everything is as it appears. Trust what you feel.' },
  { name: 'The Sun',          emoji: '☀️', theme: 'Joy',                message: 'Allow yourself to shine. You don\'t need permission.' },
  { name: 'Judgement',        emoji: '🎺', theme: 'Awakening',          message: 'Answer the call. The invitation is here.' },
  { name: 'The World',        emoji: '🌍', theme: 'Completion',         message: 'A cycle is complete. Honor the journey before beginning again.' },
]

// ─── Runes ──────────────────────────────────────────────────────
const RUNES = [
  { name: 'Fehu',    symbol: 'ᚠ', meaning: 'Abundance, new beginnings',   message: 'Wealth is flowing. Tend to what you are building.' },
  { name: 'Uruz',    symbol: 'ᚢ', meaning: 'Strength, vitality',          message: 'You have more strength than you are using.' },
  { name: 'Thurisaz',symbol: 'ᚦ', meaning: 'Protection, threshold',       message: 'Stand at the gate. Not everything enters.' },
  { name: 'Ansuz',   symbol: 'ᚨ', meaning: 'Messages, communication',     message: 'Speak clearly. Something wants to be said.' },
  { name: 'Raido',   symbol: 'ᚱ', meaning: 'Journey, movement',           message: 'You are moving in the right direction. Keep going.' },
  { name: 'Kenaz',   symbol: 'ᚲ', meaning: 'Clarity, creative fire',      message: 'Light the torch. This is your moment of vision.' },
  { name: 'Gebo',    symbol: 'ᚷ', meaning: 'Gift, partnership',           message: 'Give and receive in equal measure today.' },
  { name: 'Wunjo',   symbol: 'ᚹ', meaning: 'Joy, fulfillment',            message: 'Happiness is available right now. Let it land.' },
  { name: 'Hagalaz', symbol: 'ᚺ', meaning: 'Disruption, transformation',  message: 'What is being shaken loose is meant to go.' },
  { name: 'Nauthiz', symbol: 'ᚾ', meaning: 'Need, constraint',            message: 'The limitation is the teacher. Work within it.' },
  { name: 'Isa',     symbol: 'ᛁ', meaning: 'Stillness, pause',            message: 'Stop. Be still. The answer comes in the quiet.' },
  { name: 'Jera',    symbol: 'ᛃ', meaning: 'Harvest, cycles',             message: 'What you planted is growing. Trust the timing.' },
  { name: 'Eihwaz',  symbol: 'ᛇ', meaning: 'Endurance, the long view',    message: 'This is worth the sustained effort. Keep going.' },
  { name: 'Perthro', symbol: 'ᛈ', meaning: 'Mystery, potential',          message: 'Something is unfolding beneath the surface. Trust it.' },
  { name: 'Algiz',   symbol: 'ᛉ', meaning: 'Protection, intuition',       message: 'Your instincts are armor. Follow what they say.' },
  { name: 'Sowilo',  symbol: 'ᛊ', meaning: 'Success, vitality, the Sun',  message: 'You are on the right path. Trust the light.' },
  { name: 'Tiwaz',   symbol: 'ᛏ', meaning: 'Justice, integrity',          message: 'Act from your deepest values. The right thing is clear.' },
  { name: 'Berkano', symbol: 'ᛒ', meaning: 'New life, nurturing',         message: 'Something tender is growing. Protect and nourish it.' },
  { name: 'Ehwaz',   symbol: 'ᛖ', meaning: 'Partnership, movement',       message: 'You move best alongside someone aligned with you.' },
  { name: 'Mannaz',  symbol: 'ᛗ', meaning: 'The self, humanity',          message: 'Know thyself. Everything else follows from that.' },
  { name: 'Laguz',   symbol: 'ᛚ', meaning: 'Water, flow, emotion',        message: 'Flow, don\'t force. Emotions are information.' },
  { name: 'Ingwaz',  symbol: 'ᛜ', meaning: 'Completion, potential energy',message: 'Rest and gather. The release will come at the right time.' },
  { name: 'Dagaz',   symbol: 'ᛞ', meaning: 'Breakthrough, new day',       message: 'The light is arriving. This is the moment before.' },
  { name: 'Othala',  symbol: 'ᛟ', meaning: 'Inheritance, home, legacy',   message: 'You are building something that will outlast this moment.' },
]

// ─── Moon Phase Rituals ─────────────────────────────────────────
const MOON_RITUALS: Record<string, { title: string; desc: string; steps: string[] }> = {
  'New Moon':        { title: 'Seed Planting Ceremony',   desc: 'The slate is clean. As a Scorpio, this is your power moment — what you plant in darkness becomes unstoppable in light.', steps: ['Light a candle. Dim the lights. Sit somewhere quiet.', 'Write what you are releasing — handwritten, not typed.', 'Write what you are calling in this lunar cycle. Be specific.', 'Speak your intentions out loud. Your Projector authority lives in your voice — hear yourself say it.', 'Draw one oracle or tarot card as a message from this new moon.', 'Burn or tear the release list. Keep your intentions somewhere sacred.'] },
  'Waxing Crescent': { title: 'Momentum Building',        desc: 'The seed has been planted. Now it needs one action — not ten.', steps: ['Review what you set at the New Moon.', 'Choose ONE thing to move on this week. Not five. One.', 'Identify the smallest possible first step — do it now.', 'Write: "I trust what is growing even when I cannot see it yet."', 'As a Projector: act in a burst, then rest. Do not sustain.'] },
  'First Quarter':   { title: 'Course Correction',        desc: 'This phase asks: what is still aligned? What has already shifted?', steps: ['Review where you are vs. where you expected to be.', 'Name ONE thing that is working. Honor it out loud.', 'Name ONE thing that is not working. No shame — just data.', 'Ask out loud: "Am I forcing, or am I being guided?"', 'Adjust the plan. Projectors recalibrate — they don\'t white-knuckle.'] },
  'Waxing Gibbous':  { title: 'Refinement and Patience',  desc: 'You can feel the fullness coming. This is where Projectors get tempted to push.', steps: ['Look at the thing that is almost ready. What does it still need?', 'Is there something you are forcing to happen faster? Name it.', 'Practice out loud: "The timing is right. I do not need to rush this."', 'Rest more than usual today. The full moon needs you at full energy.', 'Do not announce or launch anything yet — wait for the full moon.'] },
  'Full Moon':       { title: 'Full Moon Release Ritual', desc: 'What has grown to its fullness must be acknowledged — and what has outgrown its purpose must go.', steps: ['Write what you are releasing. Be specific and honest.', 'Take a shower or bath — imagine the water clearing everything not yours.', 'Light a candle. Speak what you are releasing out loud.', 'Write what you are celebrating this cycle. You built something.', 'Draw a tarot card — what does the full moon want you to know?', 'Sleep with your windows open if possible. Let the moonlight in.'] },
  'Waning Gibbous':  { title: 'Gratitude Harvest',        desc: 'The full moon energy is fading. This is the time for receiving what has been given.', steps: ['List five things this cycle brought — expected or not.', 'Write a thank-you to yourself for something you did well.', 'Share something you have learned with someone you trust (4th line: your network carries your light).', 'Ask: "What felt hard this cycle that was actually growth?"', 'Rest. The Projector harvest requires integration time.'] },
  'Last Quarter':    { title: 'Conscious Letting Go',     desc: 'The Scorpio in you knows: what dies here makes room for the next beginning.', steps: ['What is no longer serving you? Name it without drama.', 'Make one decision you have been postponing.', 'Clear something physical — a drawer, your inbox, a cluttered space.', 'Write: "I release _______ with gratitude for what it taught me."', 'Rest more. Integration is active work.'] },
  'Waning Crescent': { title: 'Deep Rest and Restore',    desc: 'This is the rarest, most sacred phase — and the one Projectors most need to honor.', steps: ['Do less than you think you should.', 'No new decisions or initiatives if possible.', 'Ask out loud: "What does my body need?" Then do that thing.', 'Sleep before midnight.', 'Sit quietly for 5 minutes without your phone. Just be.', 'Know: rest is not laziness. It is how you fill up for the next cycle.'] },
}

// ─── HD Profile detail ──────────────────────────────────────────
const HD_CHART = {
  type: 'Self-Projected Projector',
  profile: '4/6 — Opportunist / Role Model',
  authority: 'Self-Projected',
  strategy: 'Wait For Invitation',
  signature: 'Success',
  not_self: 'Bitterness',
  placements: [
    { label: 'Sun',        value: 'Scorpio',   note: 'Transformation, depth, investigation — you already sense the truth before it surfaces' },
    { label: 'Moon',       value: 'Cancer',    note: 'Emotional safety is your foundation — home, rest, and softness are the work, not distractions from it' },
    { label: 'Rising',     value: 'Cancer',    note: 'Warm, protective energy — you draw people in who need nurturing; you absorb the room' },
    { label: 'North Node', value: 'Cancer',    note: 'Destiny: emotional wisdom, creating safety for others, building home (literal and metaphorical)' },
    { label: 'Midheaven',  value: 'Virgo',     note: 'Career through service, precision, systems — your legacy grows when chaos becomes clean structure' },
    { label: 'Venus',      value: 'Capricorn', note: 'Love through loyalty, slow trust, long-term building — you invest deeply and need a partner doing the same' },
    { label: 'Mercury',    value: 'Scorpio',   note: 'Strategic, investigative communication — you speak to excavate truth, not fill silence' },
    { label: 'Mars',       value: 'Libra',     note: 'Acts best through balance and relational clarity — tone and communication matter before you move' },
    { label: 'Saturn',     value: 'Taurus',    note: 'Life lesson: self-worth before production, slow wealth, embodiment — you are valuable before you earn' },
  ],
  centers_defined: ['Throat', 'Self (G-Center)', 'Ajna', 'Head'],
  centers_undefined: ['Heart/Will', 'Sacral', 'Solar Plexus', 'Root', 'Spleen'],
}

// ─── Tarot Spreads ──────────────────────────────────────────────
interface Spread {
  key: string; emoji: string; name: string; description: string; positions: string[]; count: number
}
const SPREADS: Spread[] = [
  { key: 'daily',  emoji: '🌅', name: 'Daily Clarity',              description: 'One message for right now',                       positions: ['Message for today'],                                                       count: 1 },
  { key: 'love',   emoji: '💜', name: 'Love & Connection',          description: 'Current energy / Open to / Release',              positions: ['Current energy', 'Open to receive', 'What to release'],                   count: 3 },
  { key: 'work',   emoji: '💼', name: 'Career & Purpose',           description: 'Where you are / Best action / Outcome',           positions: ['Where you are', 'Best action', 'Outcome'],                                count: 3 },
  { key: 'money',  emoji: '💰', name: 'Money & Abundance',          description: 'Current flow / Blocks / Invitation',              positions: ['Current flow', 'The block', 'The invitation'],                            count: 3 },
  { key: 'shadow', emoji: '🌑', name: 'Shadow Work',                description: 'Hidden / Surfacing / Integrate',                  positions: ["What's hidden", "What's surfacing", 'What to integrate'],                 count: 3 },
  { key: 'now',    emoji: '✨', name: 'What do I need right now?',  description: 'One truth for this exact moment',                 positions: ['Truth for now'],                                                           count: 1 },
  { key: 'next',   emoji: '🌙', name: 'Next Chapter',               description: 'Leaving / Arriving / The gift between',           positions: ["What's leaving", "What's arriving", 'The gift between'],                  count: 3 },
  { key: 'full',   emoji: '🔮', name: 'Full Reading',               description: 'Complete picture of where you are',               positions: ['Foundation', 'Present energy', 'Challenge', 'What to call in', 'Outcome'], count: 5 },
]

interface CardReading { card: string; position: string; reversed: boolean; personal_reading: string; chart_connection: string; key_message: string }
interface TarotReading { overall_theme: string; tagline: string; card_readings: CardReading[]; overall_message: string; action: string; affirmation: string; time_note: string }
type TarotView = 'select' | 'drawing' | 'reading'
interface HdGuidance { daily_focus: string; invitation_watch: string; not_self_check: string; strategy_note: string; voice_prompt: string; affirmation: string }

const JOURNAL_PROMPTS = [
  'What is something you are carrying that is not yours to carry?',
  'What does your body know that your mind has not accepted yet?',
  'If your current challenge is a teacher, what is it trying to show you?',
  'What version of yourself showed up this week?',
  'What are you protecting yourself from that might actually be safe now?',
  'What would you do this week if you trusted yourself completely?',
  'What do you need to stop saying yes to?',
  'Who are you becoming, and do you like her?',
  'What fear is disguising itself as logic right now?',
  'What would feel like relief if you let it go today?',
  'What are you waiting for permission to begin?',
  'Where are you shrinking when you could be expanding?',
]

function getMoonPhase() {
  const knownNew  = new Date('2024-01-11')
  const daysSince = (Date.now() - knownNew.getTime()) / (1000 * 60 * 60 * 24)
  const cycleDay  = ((daysSince % 29.53) + 29.53) % 29.53
  return MOON_PHASES[Math.min(Math.floor(cycleDay / (29.53 / 8)), 7)]
}

function getDailyIndex(arr: unknown[]) {
  return new Date().getDate() % arr.length
}

type SpiritTab = 'today' | 'oracle' | 'hd' | 'crystals' | 'ritual'

interface RealMoonData {
  phase: { name: string; emoji: string; illumination: number; angle: number; description: string; next_exact: { name: string; time: string } | null }
  sign: { name: string; emoji: string; degree: number; minutes: number; formatted: string; keywords: string }
  next_ingress: string | null
  timezone: string
  calculated_at: string
}

export default function SpiritScreen() {
  const [guidance, setGuidance] = useState<{
    energy_today?: string; quote?: string; highlights?: string[];
    crystal?: string; crystal_why?: string; moon_note?: string;
    affirmation?: string; intention?: string; shadow_question?: string;
    gratitude_prompt?: string; meditation_prompt?: string;
    human_design_reminder?: string; chart_theme?: string;
  } | null>(null)
  const [loadingGuidance, setLoadingGuidance] = useState(false)
  const [activeTab, setActiveTab]             = useState<SpiritTab>('today')
  const [realMoon, setRealMoon]               = useState<RealMoonData | null>(null)

  // Tarot state
  const [tarotView, setTarotView]           = useState<TarotView>('select')
  const [selectedSpread, setSelectedSpread] = useState<Spread | null>(null)
  const [drawnCards, setDrawnCards]         = useState<DrawnCard[]>([])
  const [flipped, setFlipped]               = useState<boolean[]>([])
  const [tarotReading, setTarotReading]     = useState<TarotReading | null>(null)
  const [tarotLoading, setTarotLoading]     = useState(false)
  const [tarotError, setTarotError]         = useState(false)
  const [tarotContext, setTarotContext]      = useState('')
  const [resonance, setResonance]           = useState<1|2|3|null>(null)
  const [tarotSaved, setTarotSaved]         = useState(false)
  const [tarotHistory, setTarotHistory]     = useState<TarotHistoryEntry[]>([])
  const [tarotStats, setTarotStats]         = useState({ total: 0, resonance_avg: 0, accuracy_pct: 0, by_spread: {} as Record<string, number> })
  const [readingId]                         = useState(() => `tarot_${Date.now()}`)

  // HD guidance state
  const [hdGuidance, setHdGuidance] = useState<HdGuidance | null>(null)
  const [hdLoading, setHdLoading]   = useState(false)
  const hdFetched                   = useRef(false)

  const moon       = getMoonPhase()
  const crystal    = CRYSTALS[getDailyIndex(CRYSTALS)]
  const todayCard  = TAROT[getDailyIndex(TAROT)]
  const todayRune  = RUNES[getDailyIndex(RUNES)]
  const journalPmt = JOURNAL_PROMPTS[getDailyIndex(JOURNAL_PROMPTS)]
  const today      = format(new Date(), 'EEEE, MMMM d')
  const moonRitual = MOON_RITUALS[realMoon?.phase.name ?? moon.name] ?? MOON_RITUALS['Full Moon']

  // ─── Guidance with localStorage cache ───────────────────────
  async function loadGuidance(force = false) {
    const todayKey = new Date().toISOString().slice(0, 10)
    const cacheKey = 'luna_spirit_guidance_' + todayKey

    if (!force) {
      try {
        const cached = localStorage.getItem(cacheKey)
        if (cached) { setGuidance(JSON.parse(cached)); return }
      } catch {}
    }

    setLoadingGuidance(true)
    try {
      const tz  = Intl.DateTimeFormat().resolvedOptions().timeZone
      const url = `/api/ai/spiritual-guidance?tz=${encodeURIComponent(tz)}${force ? '&refresh=1' : ''}`
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const data = await res.json()
      setGuidance(data)
      try { localStorage.setItem(cacheKey, JSON.stringify(data)) } catch {}
    } catch {
      setGuidance({
        energy_today: 'Today asks you to move slowly before you move fast. Your mind may want to jump ahead, but your power is in choosing one clear step.',
        crystal: crystal.name, crystal_why: crystal.desc,
        moon_note: `${moon.emoji} ${moon.name} — ${moon.desc}`,
        affirmation: 'I move with grace. I do not chase the day. I guide it.',
        intention: 'I choose depth over speed. I am selective. I trust what is opening naturally.',
        shadow_question: 'Where am I confusing urgency with importance?',
        gratitude_prompt: 'What does my body need from me today that I have been too busy to give?',
        meditation_prompt: 'Breathe in: I receive. Breathe out: I release.',
        human_design_reminder: 'As a Self-Projected Projector, speak your decision out loud before you make it. Your truth is in your voice.',
      })
    } finally {
      setLoadingGuidance(false)
    }
  }

  // ─── HD guidance — lazy, cached ─────────────────────────────
  async function loadHdGuidance() {
    if (hdFetched.current) return
    hdFetched.current = true
    const todayKey = new Date().toISOString().slice(0, 10)
    const cacheKey = 'luna_hd_guidance_' + todayKey
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) { setHdGuidance(JSON.parse(cached)); return }
    } catch {}
    setHdLoading(true)
    try {
      const res  = await fetch('/api/ai/hd-daily', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const data = await res.json()
      if (!data.error) {
        setHdGuidance(data)
        try { localStorage.setItem(cacheKey, JSON.stringify(data)) } catch {}
      }
    } catch {} finally { setHdLoading(false) }
  }

  // ─── Tarot ──────────────────────────────────────────────────
  function chooseSpread(spread: Spread) {
    setSelectedSpread(spread)
    const cards = drawCards(spread.count).map((c, i) => ({ ...c, position: spread.positions[i] }))
    setDrawnCards(cards)
    setFlipped(new Array(spread.count).fill(false))
    setTarotReading(null); setResonance(null); setTarotSaved(false); setTarotError(false); setTarotContext('')
    setTarotView('drawing')
  }

  function flipCard(i: number) {
    setFlipped(prev => { const n = [...prev]; n[i] = true; return n })
  }

  async function getReading() {
    if (!selectedSpread) return
    setTarotLoading(true); setTarotError(false); setTarotView('reading')
    try {
      const h   = new Date().getHours()
      const tod = `${h % 12 || 12}:${new Date().getMinutes().toString().padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`
      const res = await fetch('/api/ai/tarot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spread_key:  selectedSpread.key,
          spread_name: selectedSpread.name,
          positions:   selectedSpread.positions,
          cards: drawnCards.map(c => ({ name: c.name, reversed: c.reversed, position: c.position ?? '', keywords: c.keywords })),
          time_of_day: tod,
          context: tarotContext.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error()
      setTarotReading(await res.json())
    } catch { setTarotError(true) }
    finally { setTarotLoading(false) }
  }

  function rateResonance(r: 1|2|3) {
    if (!selectedSpread || !tarotReading) return
    setResonance(r)
    if (!tarotSaved) {
      saveTarotReading({
        id: readingId,
        date: new Date().toISOString().slice(0, 10),
        spread_key:      selectedSpread.key,
        spread_name:     selectedSpread.name,
        cards:           drawnCards,
        reading_summary: tarotReading.overall_message,
        resonance: r,
      })
      setTarotSaved(true)
      setTarotHistory(getTarotHistory())
      setTarotStats(getTarotStats())
    }
  }

  function resetTarot() {
    setTarotView('select'); setSelectedSpread(null); setDrawnCards([])
    setFlipped([]); setTarotReading(null); setResonance(null); setTarotSaved(false); setTarotError(false); setTarotContext('')
  }

  // ─── Effects ─────────────────────────────────────────────────
  useEffect(() => {
    loadGuidance()
    setTarotHistory(getTarotHistory())
    setTarotStats(getTarotStats())

    function fetchMoon(tz: string) {
      fetch(`/api/astrology/moon?tz=${encodeURIComponent(tz)}`)
        .then(r => r.json()).then(setRealMoon).catch(() => {})
    }
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => fetchMoon(Intl.DateTimeFormat().resolvedOptions().timeZone),
        () => fetchMoon(Intl.DateTimeFormat().resolvedOptions().timeZone),
      )
    } else {
      fetchMoon(Intl.DateTimeFormat().resolvedOptions().timeZone)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'hd' && !hdFetched.current) loadHdGuidance()
  }, [activeTab])

  const TABS: { value: SpiritTab; label: string }[] = [
    { value: 'today',    label: '✨ Today'    },
    { value: 'oracle',   label: '🔮 Oracle'   },
    { value: 'hd',       label: '💜 Design'   },
    { value: 'crystals', label: '💎 Crystals' },
    { value: 'ritual',   label: '🕯 Ritual'   },
  ]

  return (
    <div className="bg-spirit min-h-screen">
      <AppLayout noPad className="pt-16">
        <div className="px-6 pb-nav">

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(155,92,255,0.12)' }}>
              <Sparkles className="h-5 w-5" style={{ color: 'var(--violet)' }} />
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-wider" style={{ color: 'var(--violet)' }}>Spirit</p>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>{today}</p>
            </div>
          </div>

          <h1 className="font-display text-2xl font-semibold mb-6" style={{ color: 'var(--text-1)' }}>
            Your sacred space.
          </h1>

          {/* Tabs */}
          <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {TABS.map(t => (
              <button key={t.value} onClick={() => setActiveTab(t.value)}
                className="flex-none px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all"
                style={{
                  background: activeTab === t.value ? 'var(--violet)' : 'rgba(155,92,255,0.08)',
                  color:      activeTab === t.value ? 'white' : 'var(--mid)',
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ═══ TODAY ════════════════════════════════════════════ */}
          {activeTab === 'today' && (
            <div className="space-y-4 animate-fade-up">

              {/* Moon card */}
              <GlassCard>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--violet)' }}>Moon</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Phase</p>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl animate-float">{realMoon ? realMoon.phase.emoji : moon.emoji}</span>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{realMoon ? realMoon.phase.name : moon.name}</p>
                        {realMoon && <p className="text-xs" style={{ color: 'var(--text-3)' }}>{realMoon.phase.illumination}% illuminated</p>}
                      </div>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-2)' }}>{realMoon ? realMoon.phase.description : moon.desc}</p>
                    {realMoon?.phase.next_exact && (
                      <p className="text-xs mt-1 px-2 py-1 rounded-lg" style={{ background: 'rgba(155,92,255,0.06)', color: 'var(--violet)' }}>
                        {realMoon.phase.next_exact.name}: {realMoon.phase.next_exact.time}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Sign</p>
                    {realMoon ? (
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xl">{realMoon.sign.emoji}</span>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{realMoon.sign.name}</p>
                        </div>
                        <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--violet)' }}>{realMoon.sign.formatted}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>{realMoon.sign.keywords}</p>
                        {realMoon.next_ingress && (
                          <p className="text-xs mt-1 px-2 py-1 rounded-lg italic" style={{ background: 'rgba(155,92,255,0.06)', color: 'var(--violet)' }}>→ {realMoon.next_ingress}</p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs italic" style={{ color: 'var(--text-3)' }}>Loading exact sign...</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>Verify in TimePassages</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t flex items-center justify-between" style={{ borderColor: 'rgba(155,92,255,0.08)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-4)' }}>
                    Live · astronomy-engine
                    {realMoon?.calculated_at && ` · ${new Date(realMoon.calculated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}`}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-4)' }}>Cross-ref TimePassages</p>
                </div>
              </GlassCard>

              {/* Daily card + rune */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-4)' }}>Card today</p>
                  <div className="text-2xl mb-1 animate-float">{todayCard.emoji}</div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>{todayCard.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--violet)' }}>{todayCard.theme}</p>
                  <p className="text-xs mt-1 italic" style={{ color: 'var(--text-3)' }}>{todayCard.message}</p>
                </div>
                <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-4)' }}>Rune today</p>
                  <div className="text-2xl mb-1 font-bold" style={{ color: 'var(--violet)', fontFamily: 'serif' }}>{todayRune.symbol}</div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>{todayRune.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{todayRune.meaning}</p>
                  <p className="text-xs mt-1 italic" style={{ color: 'var(--text-3)' }}>{todayRune.message}</p>
                </div>
              </div>

              {loadingGuidance ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-full mx-auto mb-4 animate-breathe"
                    style={{ background: 'radial-gradient(circle, rgba(155,92,255,0.3), transparent)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>Receiving spiritual guidance...</p>
                </div>
              ) : guidance && (
                <>
                  <GlassCard soul>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>Energy today</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>{guidance.energy_today}</p>
                    {guidance.chart_theme && (
                      <p className="text-xs mt-3 px-3 py-2 rounded-xl italic" style={{ background: 'rgba(155,92,255,0.06)', color: 'var(--violet)' }}>{guidance.chart_theme}</p>
                    )}
                  </GlassCard>

                  {guidance.quote && (
                    <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(201,169,110,0.08), rgba(155,92,255,0.06))', border: '1px solid rgba(201,169,110,0.15)' }}>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--golden)' }}>Quote</p>
                      <p className="font-display text-base italic leading-relaxed" style={{ color: 'var(--text-1)' }}>&ldquo;{guidance.quote}&rdquo;</p>
                    </div>
                  )}

                  {guidance.highlights && guidance.highlights.length > 0 && (
                    <GlassCard>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--violet)' }}>Today&apos;s highlights</p>
                      <div className="space-y-2.5">
                        {guidance.highlights.map((h, i) => (
                          <div key={i} className="flex gap-3 items-start">
                            <span className="text-sm flex-shrink-0 mt-0.5" style={{ color: 'var(--violet)' }}>✦</span>
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>{h}</p>
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  )}

                  <div className="rounded-2xl p-5 text-center" style={{ background: 'rgba(155,92,255,0.06)', border: '1px solid rgba(155,92,255,0.1)' }}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--violet)' }}>Affirmation</p>
                    <p className="font-display text-lg italic leading-relaxed" style={{ color: 'var(--text-1)' }}>&ldquo;{guidance.affirmation}&rdquo;</p>
                  </div>

                  <GlassCard>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>Intention</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>{guidance.intention}</p>
                  </GlassCard>

                  <GlassCard>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#A87B7B' }}>Shadow question</p>
                    <p className="font-display text-base italic leading-relaxed" style={{ color: 'var(--text-1)' }}>{guidance.shadow_question}</p>
                  </GlassCard>

                  <GlassCard>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--herb)' }}>Gratitude</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{guidance.gratitude_prompt}</p>
                  </GlassCard>

                  <GlassCard>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--lunar)' }}>Breath reminder</p>
                    <p className="text-sm italic leading-relaxed" style={{ color: 'var(--text-2)' }}>{guidance.meditation_prompt}</p>
                  </GlassCard>

                  <GlassCard>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl animate-float flex-shrink-0"
                        style={{ background: `${crystal.color}22`, border: `1.5px solid ${crystal.color}44` }}>💎</div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-3)' }}>Crystal today</p>
                        <p className="font-semibold" style={{ color: 'var(--text-1)' }}>{guidance.crystal || crystal.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-2)' }}>{guidance.crystal_why || crystal.desc}</p>
                      </div>
                    </div>
                    <p className="text-xs px-3 py-2 rounded-xl" style={{ background: 'rgba(155,92,255,0.06)', color: 'var(--text-2)' }}>{crystal.use}</p>
                  </GlassCard>

                  {guidance.human_design_reminder && (
                    <GlassCard>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>Human Design</p>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{guidance.human_design_reminder}</p>
                    </GlassCard>
                  )}

                  <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-4)' }}>Journal prompt</p>
                    <p className="font-display text-sm italic leading-relaxed" style={{ color: 'var(--text-2)' }}>&ldquo;{journalPmt}&rdquo;</p>
                  </div>

                  <button onClick={() => loadGuidance(true)}
                    className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
                    style={{ background: 'rgba(155,92,255,0.08)', color: 'var(--violet)' }}>
                    <RefreshCw className="h-4 w-4" /> Refresh guidance
                  </button>
                </>
              )}
            </div>
          )}

          {/* ═══ ORACLE ═══════════════════════════════════════════ */}
          {activeTab === 'oracle' && (
            <div className="animate-fade-up">

              {/* SPREAD SELECT */}
              {tarotView === 'select' && (
                <div className="space-y-4">
                  {tarotStats.total > 0 && (
                    <div className="flex gap-2 text-center">
                      {[
                        { v: tarotStats.total,        l: 'Readings' },
                        { v: `${tarotStats.accuracy_pct}%`, l: 'Resonant' },
                        { v: tarotStats.resonance_avg > 0 ? tarotStats.resonance_avg.toFixed(1) : '—', l: 'Avg score' },
                      ].map(s => (
                        <div key={s.l} className="flex-1 rounded-2xl py-3" style={{ background: 'rgba(155,92,255,0.07)', border: '1px solid rgba(155,92,255,0.14)' }}>
                          <p className="text-lg font-bold" style={{ color: 'var(--violet)' }}>{s.v}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{s.l}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-4)' }}>Choose your spread</p>
                  <div className="grid grid-cols-2 gap-3">
                    {SPREADS.map(s => {
                      const cnt = tarotStats.by_spread[s.key] ?? 0
                      return (
                        <button key={s.key} onClick={() => chooseSpread(s)} style={{
                          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
                          borderRadius: 18, padding: '14px 14px 12px', textAlign: 'left', cursor: 'pointer',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <span style={{ fontSize: 22 }}>{s.emoji}</span>
                            {cnt > 0 && <span style={{ fontSize: 11, color: 'rgba(155,92,255,0.55)', fontWeight: 600 }}>{cnt}×</span>}
                          </div>
                          <p style={{ fontSize: 12, fontWeight: 700, color: 'white', marginBottom: 3 }}>{s.name}</p>
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>{s.description}</p>
                          <p style={{ fontSize: 11, color: 'rgba(155,92,255,0.6)', marginTop: 6, fontWeight: 600 }}>{s.count === 1 ? '1 card' : `${s.count} cards`}</p>
                        </button>
                      )
                    })}
                  </div>

                  {/* Daily rune */}
                  <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-4)' }}>Daily rune</p>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(155,92,255,0.08)', border: '1.5px solid rgba(155,92,255,0.15)' }}>
                        <span className="text-xl font-bold" style={{ color: 'var(--violet)', fontFamily: 'serif' }}>{todayRune.symbol}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{todayRune.name} — <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>{todayRune.meaning}</span></p>
                        <p className="text-sm italic mt-1" style={{ color: 'var(--text-2)' }}>&ldquo;{todayRune.message}&rdquo;</p>
                      </div>
                    </div>
                  </div>

                  {/* History */}
                  {tarotHistory.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-4)' }}>Recent readings</p>
                      <div className="space-y-2">
                        {tarotHistory.slice(0, 3).map((h, i) => (
                          <div key={i} className="rounded-2xl px-4 py-3 flex items-center justify-between"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <div>
                              <p className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>{h.spread_name}</p>
                              <p className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>{h.cards.slice(0, 3).map(c => c.emoji).join(' ')}</p>
                            </div>
                            {h.resonance && (
                              <span style={{ fontSize: 16 }}>{h.resonance === 3 ? '🎯' : h.resonance === 2 ? '✓' : '○'}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* DRAWING */}
              {tarotView === 'drawing' && selectedSpread && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <button onClick={resetTarot} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                      <ChevronLeft className="h-3.5 w-3.5" /> Spreads
                    </button>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>·</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>{selectedSpread.emoji} {selectedSpread.name}</span>
                  </div>

                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                    Tap each card to reveal it. When all are flipped, get your reading.
                  </p>

                  <div style={{ display: 'grid', gap: 12, gridTemplateColumns: drawnCards.length === 1 ? '1fr' : drawnCards.length === 2 ? '1fr 1fr' : 'repeat(3, 1fr)' }}>
                    {drawnCards.slice(0, Math.min(drawnCards.length, 3)).map((card, i) => (
                      <button key={i} onClick={() => flipCard(i)} style={{
                        borderRadius: 16, cursor: flipped[i] ? 'default' : 'pointer',
                        background: flipped[i] ? 'rgba(155,92,255,0.08)' : 'rgba(155,92,255,0.15)',
                        padding: '16px 12px', textAlign: 'center',
                        border: flipped[i] ? '1px solid rgba(155,92,255,0.2)' : '1px solid rgba(155,92,255,0.35)',
                        transition: 'all 0.3s',
                      } as React.CSSProperties}>
                        {flipped[i] ? (
                          <>
                            <div style={{ fontSize: drawnCards.length <= 2 ? 32 : 22, marginBottom: 6 }}>{card.emoji}</div>
                            <p style={{ fontSize: drawnCards.length <= 2 ? 12 : 10, fontWeight: 700, color: 'white', marginBottom: 2, lineHeight: 1.3 }}>{card.name}</p>
                            {card.reversed && <p style={{ fontSize: 10, color: '#E05E5E', fontWeight: 600 }}>Reversed</p>}
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>{card.position}</p>
                          </>
                        ) : (
                          <>
                            <div style={{ fontSize: 22, marginBottom: 6, opacity: 0.4 }}>✦</div>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{card.position}</p>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>tap to reveal</p>
                          </>
                        )}
                      </button>
                    ))}
                  </div>

                  {drawnCards.length > 3 && (
                    <div className="grid grid-cols-2 gap-3">
                      {drawnCards.slice(3).map((card, i) => (
                        <button key={i+3} onClick={() => flipCard(i+3)} style={{
                          borderRadius: 16, cursor: flipped[i+3] ? 'default' : 'pointer',
                          background: flipped[i+3] ? 'rgba(155,92,255,0.08)' : 'rgba(155,92,255,0.15)',
                          padding: '16px 12px', textAlign: 'center',
                          border: flipped[i+3] ? '1px solid rgba(155,92,255,0.2)' : '1px solid rgba(155,92,255,0.35)',
                        } as React.CSSProperties}>
                          {flipped[i+3] ? (
                            <>
                              <div style={{ fontSize: 24, marginBottom: 6 }}>{card.emoji}</div>
                              <p style={{ fontSize: 11, fontWeight: 700, color: 'white', marginBottom: 2 }}>{card.name}</p>
                              {card.reversed && <p style={{ fontSize: 10, color: '#E05E5E', fontWeight: 600 }}>Reversed</p>}
                              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>{card.position}</p>
                            </>
                          ) : (
                            <>
                              <div style={{ fontSize: 24, marginBottom: 6, opacity: 0.4 }}>✦</div>
                              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{card.position}</p>
                            </>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {flipped.length > 0 && flipped.every(Boolean) && (
                    <div className="space-y-3">
                      <textarea
                        value={tarotContext}
                        onChange={e => setTarotContext(e.target.value)}
                        placeholder="What are you asking about? (optional — adds depth to your reading)"
                        rows={2}
                        style={{
                          width: '100%', background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14,
                          padding: '12px 14px', color: 'white', fontSize: 13,
                          resize: 'none', outline: 'none', fontFamily: 'inherit',
                        }}
                      />
                      <button onClick={getReading} style={{
                        width: '100%', padding: '14px', borderRadius: 18, border: 'none', cursor: 'pointer',
                        background: 'linear-gradient(135deg, #9b5cff, #5A3F88)', color: 'white', fontSize: 14, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      }}>
                        <Sparkles className="h-4 w-4" /> Get my reading
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* READING */}
              {tarotView === 'reading' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <button onClick={resetTarot} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                      <ChevronLeft className="h-3.5 w-3.5" /> New spread
                    </button>
                    {selectedSpread && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>{selectedSpread.emoji} {selectedSpread.name}</span>}
                  </div>

                  {tarotLoading && (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 rounded-full mx-auto mb-4" style={{ background: 'radial-gradient(circle, rgba(155,92,255,0.3), transparent)', animation: 'breathe 3s ease infinite' }} />
                      <p className="text-sm" style={{ color: 'var(--text-3)' }}>Reading your cards…</p>
                      <p className="text-xs mt-2" style={{ color: 'var(--text-4)' }}>Channeling your reading — this takes a moment</p>
                    </div>
                  )}

                  {!tarotLoading && tarotError && (
                    <div className="text-center py-8">
                      <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>Couldn&apos;t get a reading. Try again.</p>
                      <button onClick={getReading} style={{ padding: '10px 20px', borderRadius: 14, background: 'rgba(155,92,255,0.12)', border: '1px solid rgba(155,92,255,0.25)', color: 'var(--violet)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Retry</button>
                    </div>
                  )}

                  {!tarotLoading && tarotReading && (
                    <>
                      <div className="rounded-2xl p-5 text-center" style={{ background: 'linear-gradient(135deg, rgba(155,92,255,0.12), rgba(90,63,136,0.1))', border: '1px solid rgba(155,92,255,0.25)' }}>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(185,139,255,0.7)' }}>{tarotReading.overall_theme}</p>
                        <p className="font-display text-lg italic" style={{ color: 'white' }}>&ldquo;{tarotReading.tagline}&rdquo;</p>
                        {tarotReading.time_note && (
                          <p className="text-xs mt-3 italic" style={{ color: 'rgba(255,255,255,0.35)' }}>{tarotReading.time_note}</p>
                        )}
                      </div>

                      {tarotReading.card_readings.map((cr, i) => {
                        const drawn = drawnCards[i]
                        return (
                          <div key={i} className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <div className="p-4 pb-4">
                              <div className="flex items-center gap-3 mb-3">
                                <span style={{ fontSize: 22 }}>{drawn?.emoji ?? '🔮'}</span>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-bold" style={{ color: 'white' }}>{cr.card}</p>
                                    {cr.reversed && <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: 'rgba(224,94,94,0.15)', color: '#E05E5E' }}>Reversed</span>}
                                  </div>
                                  <p className="text-xs mt-0.5" style={{ color: 'var(--violet)' }}>{cr.position}</p>
                                </div>
                              </div>
                              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>{cr.personal_reading}</p>
                              {cr.chart_connection && (
                                <div className="mt-3 px-3 py-2 rounded-xl" style={{ background: 'rgba(155,92,255,0.08)', border: '1px solid rgba(155,92,255,0.15)' }}>
                                  <p className="text-xs leading-relaxed" style={{ color: 'var(--violet)' }}>✦ {cr.chart_connection}</p>
                                </div>
                              )}
                              {cr.key_message && (
                                <p className="text-sm font-semibold mt-3 italic" style={{ color: 'var(--violet)' }}>&ldquo;{cr.key_message}&rdquo;</p>
                              )}
                            </div>
                          </div>
                        )
                      })}

                      <GlassCard>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--golden)' }}>Overall message</p>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>{tarotReading.overall_message}</p>
                      </GlassCard>

                      {tarotReading.action && (
                        <GlassCard>
                          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#5A8A5A' }}>Call to action</p>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{tarotReading.action}</p>
                        </GlassCard>
                      )}

                      <div className="rounded-2xl p-5 text-center" style={{ background: 'rgba(155,92,255,0.06)', border: '1px solid rgba(155,92,255,0.1)' }}>
                        <p className="font-display text-base italic" style={{ color: 'var(--text-1)' }}>&ldquo;{tarotReading.affirmation}&rdquo;</p>
                      </div>

                      {/* Resonance rating */}
                      <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-4)' }}>Did this resonate?</p>
                        <div className="flex gap-3 justify-center">
                          {([
                            { v: 3 as const, label: 'Deeply', emoji: '🎯' },
                            { v: 2 as const, label: 'Partially', emoji: '✓' },
                            { v: 1 as const, label: 'Not really', emoji: '○' },
                          ] as { v: 1|2|3; label: string; emoji: string }[]).map(opt => (
                            <button key={opt.v} onClick={() => rateResonance(opt.v)} style={{
                              flex: 1, padding: '10px 4px', borderRadius: 14,
                              border: resonance === opt.v ? '1.5px solid rgba(155,92,255,0.5)' : '1px solid rgba(255,255,255,0.08)',
                              background: resonance === opt.v ? 'rgba(155,92,255,0.15)' : 'transparent',
                              cursor: 'pointer', fontSize: 11,
                              fontWeight: resonance === opt.v ? 700 : 400,
                              color: resonance === opt.v ? 'var(--violet)' : 'rgba(255,255,255,0.4)',
                            }}>
                              <div style={{ fontSize: 18, marginBottom: 4 }}>{opt.emoji}</div>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        {tarotSaved && <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Saved to your history ✓</p>}
                      </div>

                      <button onClick={resetTarot} style={{ width: '100%', padding: '12px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        New reading
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══ DESIGN ═══════════════════════════════════════════ */}
          {activeTab === 'hd' && (
            <div className="space-y-4 animate-fade-up">

              {/* HD header */}
              <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(155,92,255,0.15), rgba(90,63,136,0.1))', border: '1px solid rgba(155,92,255,0.25)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--violet)' }}>Your Design</p>
                <p className="font-display text-xl font-semibold" style={{ color: 'var(--text-1)' }}>{HD_CHART.type}</p>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>{HD_CHART.profile}</p>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {[
                    { label: 'Strategy',  value: HD_CHART.strategy  },
                    { label: 'Authority', value: HD_CHART.authority  },
                    { label: 'Signature', value: HD_CHART.signature  },
                    { label: 'Not-Self',  value: HD_CHART.not_self   },
                  ].map(item => (
                    <div key={item.label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <p className="text-xs" style={{ color: 'var(--text-4)' }}>{item.label}</p>
                      <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-1)' }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI daily HD guidance */}
              {hdLoading ? (
                <div className="text-center py-8">
                  <div className="w-10 h-10 rounded-full mx-auto mb-3 animate-breathe"
                    style={{ background: 'radial-gradient(circle, rgba(155,92,255,0.3), transparent)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>Channeling your HD focus...</p>
                </div>
              ) : hdGuidance ? (
                <div className="space-y-3">
                  <GlassCard soul>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>Today&apos;s HD focus</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>{hdGuidance.daily_focus}</p>
                  </GlassCard>
                  <GlassCard>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#5A8A5A' }}>Invitation to watch for</p>
                    <p className="text-sm" style={{ color: 'var(--text-1)' }}>{hdGuidance.invitation_watch}</p>
                  </GlassCard>
                  <GlassCard>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#A87B7B' }}>Not-self check</p>
                    <p className="text-sm" style={{ color: 'var(--text-1)' }}>{hdGuidance.not_self_check}</p>
                  </GlassCard>
                  <GlassCard>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--violet)' }}>Strategy for today</p>
                    <p className="text-sm" style={{ color: 'var(--text-1)' }}>{hdGuidance.strategy_note}</p>
                  </GlassCard>
                  <GlassCard>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--golden)' }}>Speak this out loud</p>
                    <p className="text-sm italic" style={{ color: 'var(--text-1)' }}>{hdGuidance.voice_prompt}</p>
                  </GlassCard>
                  <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(155,92,255,0.06)', border: '1px solid rgba(155,92,255,0.1)' }}>
                    <p className="font-display text-sm italic" style={{ color: 'var(--text-1)' }}>&ldquo;{hdGuidance.affirmation}&rdquo;</p>
                  </div>
                </div>
              ) : (
                <button onClick={loadHdGuidance}
                  className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ background: 'rgba(155,92,255,0.08)', color: 'var(--violet)' }}>
                  <Sparkles className="h-4 w-4" /> Load today&apos;s HD guidance
                </button>
              )}

              {/* Chart placements */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-4)' }}>Birth chart</p>
                <div className="space-y-2">
                  {HD_CHART.placements.map(p => (
                    <div key={p.label} className="flex items-start gap-3 rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex-shrink-0" style={{ width: 76 }}>
                        <p className="text-xs" style={{ color: 'var(--text-4)' }}>{p.label}</p>
                        <p className="text-sm font-bold" style={{ color: 'var(--violet)' }}>{p.value}</p>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>{p.note}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Centers */}
              <GlassCard>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-4)' }}>Energy centers</p>
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: '#5A8A5A' }}>Defined (consistent energy)</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {HD_CHART.centers_defined.map(c => (
                      <span key={c} className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: 'rgba(90,138,90,0.12)', color: '#5A8A5A', border: '1px solid rgba(90,138,90,0.2)' }}>{c}</span>
                    ))}
                  </div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-4)' }}>Undefined (open, amplifying)</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {HD_CHART.centers_undefined.map(c => (
                      <span key={c} className="px-2.5 py-1 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-3)', border: '1px solid rgba(255,255,255,0.08)' }}>{c}</span>
                    ))}
                  </div>
                  <p className="text-xs italic" style={{ color: 'var(--text-4)' }}>Open Heart: your worth is not in your output. You absorb and amplify — protect your energy by waiting for genuine recognition before giving it.</p>
                </div>
              </GlassCard>

              {/* HD reminders */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-4)' }}>Design reminders</p>
                <div className="space-y-3">
                  {HD_REMINDERS.map((note, i) => (
                    <GlassCard key={i}>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(155,92,255,0.1)' }}>
                          <Star className="h-4 w-4" style={{ color: 'var(--violet)' }} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-1)' }}>{note.title}</p>
                          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{note.body}</p>
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ CRYSTALS ═════════════════════════════════════════ */}
          {activeTab === 'crystals' && (
            <div className="space-y-4 animate-fade-up">
              {/* Today's crystal — featured */}
              <div className="rounded-2xl p-5" style={{ background: `linear-gradient(135deg, ${crystal.color}18, ${crystal.color}06)`, border: `1.5px solid ${crystal.color}30` }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-4)' }}>Your crystal today</p>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl animate-float flex-shrink-0"
                    style={{ background: `${crystal.color}22`, border: `2px solid ${crystal.color}44` }}>💎</div>
                  <div>
                    <p className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>{crystal.name}</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>{crystal.desc}</p>
                    <p className="text-xs mt-2 italic" style={{ color: 'var(--text-3)' }}>{crystal.use}</p>
                  </div>
                </div>
              </div>

              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-4)' }}>Crystal library</p>
              <div className="space-y-3">
                {CRYSTALS.map((c, i) => (
                  <div key={i} className="rounded-2xl p-4 flex items-start gap-4"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: `${c.color}22`, border: `1.5px solid ${c.color}55` }}>💎</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold" style={{ color: 'var(--text-1)' }}>{c.name}</p>
                        {c.name === crystal.name && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(155,92,255,0.15)', color: 'var(--violet)' }}>Today</span>
                        )}
                      </div>
                      <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>{c.desc}</p>
                      <p className="text-xs mt-1 italic" style={{ color: 'var(--text-3)' }}>{c.use}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ RITUAL ═══════════════════════════════════════════ */}
          {activeTab === 'ritual' && (
            <div className="space-y-4 animate-fade-up">

              {/* Moon phase ritual */}
              <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(155,92,255,0.1), rgba(90,63,136,0.06))', border: '1px solid rgba(155,92,255,0.2)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Moon className="h-4 w-4" style={{ color: 'var(--violet)' }} />
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--violet)' }}>
                    {realMoon?.phase.name ?? moon.name} Ritual
                  </p>
                </div>
                <p className="font-display text-lg font-semibold mb-2" style={{ color: 'var(--text-1)' }}>{moonRitual.title}</p>
                <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-2)' }}>{moonRitual.desc}</p>
                <div className="space-y-3">
                  {moonRitual.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                        style={{ background: 'rgba(155,92,255,0.2)', color: 'var(--violet)' }}>{i + 1}</div>
                      <p className="text-sm leading-relaxed pt-0.5" style={{ color: 'var(--text-1)' }}>{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Morning ritual */}
              <GlassCard>
                <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--golden)' }}>☀️ Morning ritual</p>
                <div className="space-y-4">
                  {[
                    { step: 1, title: 'Ground your body',      desc: 'Feet flat on the floor. Three slow breaths. Feel the earth holding you before you check your phone.' },
                    { step: 2, title: 'Hydrate first',         desc: 'One full glass of water before anything else. Your Cancer Moon processes emotion through the body — this matters.' },
                    { step: 3, title: 'Cancer Moon check-in',  desc: 'Ask: "What does my heart need today?" Sit with whatever comes. Write it if it\'s loud.' },
                    { step: 4, title: 'Speak your intention',  desc: 'One word or one sentence for the day — spoken out loud. Your Self-Projected authority lives in your voice.' },
                    { step: 5, title: 'Choose one first move', desc: 'Only one. The most important thing. Not five. One. Then begin.' },
                  ].map(item => (
                    <div key={item.step} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                        style={{ background: 'rgba(201,169,110,0.15)', color: 'var(--golden)' }}>{item.step}</div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{item.title}</p>
                        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-3)' }}>{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* Evening ritual */}
              <GlassCard>
                <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--violet)' }}>🌙 Evening ritual</p>
                <div className="space-y-4">
                  {[
                    { step: 1, title: 'Energy clearing',       desc: 'Hands on your chest. Ask: "What is mine and what did I absorb today?" As Cancer Rising, you absorb rooms — release what isn\'t yours.' },
                    { step: 2, title: 'HD review',             desc: 'Did you wait for invitation today or push? Notice without judgment. Bitterness is information, not failure.' },
                    { step: 3, title: 'Three gratitudes',      desc: 'What did you do? What happened for you? What are you grateful for? These are three different things.' },
                    { step: 4, title: 'Body release',          desc: 'Shake your hands. Roll your shoulders. Your body carried your work today — acknowledge it and let it go.' },
                    { step: 5, title: 'Tomorrow\'s one word',  desc: 'Speak one word for how you want to feel tomorrow. Not what you need to do — how you want to feel.' },
                  ].map(item => (
                    <div key={item.step} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                        style={{ background: 'rgba(155,92,255,0.15)', color: 'var(--violet)' }}>{item.step}</div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{item.title}</p>
                        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-3)' }}>{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* Scorpio shadow release */}
              <div className="rounded-2xl p-5" style={{ background: 'rgba(168,123,123,0.06)', border: '1px solid rgba(168,123,123,0.15)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#A87B7B' }}>🌑 Scorpio shadow release</p>
                <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-2)' }}>
                  Every day ends with something to transmute. As a Scorpio, you don&apos;t just release — you alchemize.
                </p>
                <p className="text-sm italic mb-2" style={{ color: 'var(--text-2)' }}>
                  &ldquo;What did I feel today that I have not named yet?&rdquo;
                </p>
                <p className="text-sm italic" style={{ color: 'var(--text-2)' }}>
                  &ldquo;What would I do differently if I trusted myself completely?&rdquo;
                </p>
                <p className="text-xs mt-4 italic" style={{ color: '#A87B7B' }}>
                  Write it, say it out loud, or sit with it. The Scorpio process requires witness, not solution.
                </p>
              </div>

              {/* Dream log */}
              <button onClick={() => { window.location.href = '/dictation' }}
                className="w-full rounded-2xl p-4 flex items-center justify-between"
                style={{ background: 'rgba(155,92,255,0.06)', border: '1px solid rgba(155,92,255,0.1)' }}>
                <div className="flex items-center gap-3">
                  <Moon className="h-5 w-5" style={{ color: 'var(--violet)' }} />
                  <div className="text-left">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Dream log</p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>Record last night&apos;s dreams</p>
                  </div>
                </div>
                <span className="text-xs font-medium" style={{ color: 'var(--violet)' }}>Dictate →</span>
              </button>

            </div>
          )}

        </div>
      </AppLayout>
    </div>
  )
}
