'use client'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { AppLayout } from '@/components/layout/AppLayout'
import { GlassCard } from '@/components/ui/GlassCard'
import { Sparkles, Moon, Star, RefreshCw, Gem, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { getTarotHistory, getTarotStats, TarotHistoryEntry } from '@/lib/tarot-history'
import { getCrystalRecommendations, type ZodiacSign } from '@/lib/astrology'
import crystalsData from '@/data/crystals/crystals.json'
import styles from './spirit-page.module.css'

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

// ─── Live crystal library (moon-driven, src/data/crystals/crystals.json) ──
interface CrystalEntry {
  name: string; color: string; lightColor: string; emoji: string
  signs: string[]; phases: string[]; moods: string[]
  properties: string; howToUse: string; affirmation: string; chakra: string; lunaNote: string
}
const CRYSTAL_LIBRARY = crystalsData as CrystalEntry[]

// ─── Ritual elements per sign (scents/colors/crystals/elements) ──────────
const RITUAL_ELEMENTS_BY_SIGN: Record<string, { scents: string[]; colors: string[]; crystals: string[]; elements: string[] }> = {
  Aries:       { scents:['cinnamon','black pepper','ginger'], colors:['red','orange'], crystals:['carnelian','red jasper'], elements:['fire','candle'] },
  Taurus:      { scents:['rose','vanilla','sandalwood'], colors:['green','gold'], crystals:['rose quartz','malachite'], elements:['earth','flowers'] },
  Gemini:      { scents:['peppermint','lavender','eucalyptus'], colors:['yellow','silver'], crystals:['citrine','clear quartz'], elements:['air','journal'] },
  Cancer:      { scents:['jasmine','ylang ylang','coconut'], colors:['silver','white'], crystals:['moonstone','selenite'], elements:['water','bath','tea'] },
  Leo:         { scents:['frankincense','amber','bergamot'], colors:['gold','orange'], crystals:['sunstone','tiger eye'], elements:['fire','sun','mirror'] },
  Virgo:       { scents:['lavender','rosemary','neroli'], colors:['sage','navy'], crystals:['amazonite','amethyst'], elements:['earth','herbs','lists'] },
  Libra:       { scents:['rose','peony','lily'], colors:['pink','light blue'], crystals:['rose quartz','lapis lazuli'], elements:['air','flowers','beauty'] },
  Scorpio:     { scents:['patchouli','dark rose','oud'], colors:['deep red','black'], crystals:['obsidian','black tourmaline'], elements:['water','candle','shadow work'] },
  Sagittarius: { scents:['sage','cedar','citrus'], colors:['purple','gold'], crystals:['lapis lazuli','sodalite'], elements:['fire','travel object','journal'] },
  Capricorn:   { scents:['vetiver','cedar','frankincense'], colors:['charcoal','forest green'], crystals:['smoky quartz','garnet'], elements:['earth','structure','goals'] },
  Aquarius:    { scents:['eucalyptus','star anise','violet'], colors:['electric blue','silver'], crystals:['amethyst','labradorite'], elements:['air','community','innovation'] },
  Pisces:      { scents:['ocean','jasmine','vanilla'], colors:['sea blue','lavender'], crystals:['aquamarine','moonstone'], elements:['water','dreams','art'] },
}

interface RitualContext { intention: string; ritual: string[]; release: string[]; avoid: string }

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
    { label: 'Rising',     value: 'Gemini',    note: 'Quick, expressive, multi-faceted energy — you think and speak fast, and adapt to whoever is in the room' },
    { label: 'North Node', value: 'Cancer',    note: 'Destiny: emotional wisdom, creating safety for others, building home (literal and metaphorical)' },
    { label: 'Midheaven',  value: 'Virgo',     note: 'Career through service, precision, systems — your legacy grows when chaos becomes clean structure' },
    { label: 'Venus',      value: 'Sagittarius', note: 'Love through freedom, honesty, and shared adventure, right at the Capricorn cusp — you need a partner who can keep up and still build something real with you' },
    { label: 'Mercury',    value: 'Scorpio',   note: 'Strategic, investigative communication — you speak to excavate truth, not fill silence' },
    { label: 'Mars',       value: 'Libra',     note: 'Acts best through balance and relational clarity — tone and communication matter before you move' },
    { label: 'Saturn',     value: 'Taurus',    note: 'Life lesson: self-worth before production, slow wealth, embodiment — you are valuable before you earn' },
  ],
  centers_defined: ['Throat', 'Self (G-Center)', 'Ajna', 'Head'],
  centers_undefined: ['Heart/Will', 'Sacral', 'Solar Plexus', 'Root', 'Spleen'],
}

// Full tarot spread-drawing/AI-reading engine lives at /tarot — the Oracle
// tab here links out to it rather than duplicating SPREADS/drawCards/etc.
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

  // Tarot state — quick daily rune + read-only history/stats display; the
  // full spread-drawing/AI-reading engine lives at /tarot (linked from Oracle)
  const [tarotHistory, setTarotHistory]     = useState<TarotHistoryEntry[]>([])
  const [tarotStats, setTarotStats]         = useState({ total: 0, resonance_avg: 0, accuracy_pct: 0, by_spread: {} as Record<string, number> })

  // Crystals state
  const [crystalFilter, setCrystalFilter]     = useState<'today' | 'all'>('today')
  const [expandedCrystal, setExpandedCrystal] = useState<string | null>(null)

  // Ritual state
  const [ritualContext, setRitualContext]     = useState<RitualContext | null>(null)
  const [ritualCompleted, setRitualCompleted] = useState<Set<string>>(new Set())

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
  const todaysCrystals = realMoon
    ? (getCrystalRecommendations(realMoon.sign.name as ZodiacSign, realMoon.phase.name) as unknown as CrystalEntry[])
    : []
  const ritualElements = RITUAL_ELEMENTS_BY_SIGN[realMoon?.sign.name ?? 'Cancer'] ?? RITUAL_ELEMENTS_BY_SIGN.Cancer

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

  // ─── Ritual: toggle a checklist step ─────────────────────────
  function toggleRitualStep(step: string) {
    setRitualCompleted(prev => {
      const next = new Set(prev)
      if (next.has(step)) next.delete(step)
      else next.add(step)
      return next
    })
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

  // Live sign/phase-driven ritual context (astrology.ts getMoonRitualContext,
  // via /api/astrology/rituals) — fetched once real moon data is known
  useEffect(() => {
    if (!realMoon) return
    fetch(`/api/astrology/rituals?phase=${encodeURIComponent(realMoon.phase.name)}&sign=${encodeURIComponent(realMoon.sign.name)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && !data.error) setRitualContext(data) })
      .catch(() => {})
  }, [realMoon?.phase.name, realMoon?.sign.name])

  const TABS: { value: SpiritTab; label: string }[] = [
    { value: 'today',    label: '✨ Today'    },
    { value: 'oracle',   label: '🔮 Oracle'   },
    { value: 'hd',       label: '💜 Design'   },
    { value: 'crystals', label: '💎 Crystals' },
    { value: 'ritual',   label: '🕯 Ritual'   },
  ]

  return (
    <div className={`bg-spirit min-h-screen ${styles.page}`}>
      <AppLayout noPad className="pt-16">
        <div className="px-6 pb-nav">

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(201,169,110,0.12)' }}>
              <Sparkles className="h-5 w-5" style={{ color: 'var(--violet)' }} />
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-wider" style={{ color: 'var(--violet)' }}>Spirit</p>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>{today}</p>
            </div>
          </div>

          <h1 className="font-display text-2xl font-semibold mb-4" style={{ color: 'var(--text-1)' }}>
            Your sacred space.
          </h1>

          <div className="relative rounded-2xl overflow-hidden mb-6" style={{ height: 170 }}>
            <Image src="/images/astrology/spirit.jpg" alt="" fill sizes="(max-width: 640px) 100vw, 640px" priority style={{ objectFit: 'cover' }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(20,15,10,0.82) 20%, rgba(20,15,10,0.15) 70%)' }} />
            <div className="absolute inset-0 flex flex-col justify-end p-4">
              <p className="text-[8.5px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--violet)' }}>Ritual</p>
              <p className="font-display text-lg font-semibold text-white">Tarot, crystals & rituals</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {TABS.map(t => (
              <button key={t.value} onClick={() => setActiveTab(t.value)}
                className="flex-none px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all"
                style={{
                  background: activeTab === t.value ? 'var(--violet)' : 'rgba(201,169,110,0.08)',
                  color:      activeTab === t.value ? '#100C1E' : 'var(--mid)',
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
                      <p className="text-xs mt-1 px-2 py-1 rounded-lg" style={{ background: 'rgba(201,169,110,0.06)', color: 'var(--violet)' }}>
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
                          <p className="text-xs mt-1 px-2 py-1 rounded-lg italic" style={{ background: 'rgba(201,169,110,0.06)', color: 'var(--violet)' }}>→ {realMoon.next_ingress}</p>
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
                <div className="mt-3 pt-2 border-t flex items-center justify-between" style={{ borderColor: 'rgba(201,169,110,0.08)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-4)' }}>
                    Live · astronomy-engine
                    {realMoon?.calculated_at && ` · ${new Date(realMoon.calculated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}`}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-4)' }}>Cross-ref TimePassages</p>
                </div>
              </GlassCard>

              {/* Daily card + rune */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-4 text-center" style={{ background: 'var(--surface-inactive)', border: '1px solid rgba(180,150,100,0.18)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-4)' }}>Card today</p>
                  <div className="text-2xl mb-1 animate-float">{todayCard.emoji}</div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>{todayCard.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--violet)' }}>{todayCard.theme}</p>
                  <p className="text-xs mt-1 italic" style={{ color: 'var(--text-3)' }}>{todayCard.message}</p>
                </div>
                <div className="rounded-2xl p-4 text-center" style={{ background: 'var(--surface-inactive)', border: '1px solid rgba(180,150,100,0.18)' }}>
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
                    style={{ background: 'radial-gradient(circle, rgba(201,169,110,0.3), transparent)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>Receiving spiritual guidance...</p>
                </div>
              ) : guidance && (
                <>
                  <GlassCard soul>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>Energy today</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>{guidance.energy_today}</p>
                    {guidance.chart_theme && (
                      <p className="text-xs mt-3 px-3 py-2 rounded-xl italic" style={{ background: 'rgba(201,169,110,0.06)', color: 'var(--violet)' }}>{guidance.chart_theme}</p>
                    )}
                  </GlassCard>

                  {guidance.quote && (
                    <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(201,169,110,0.08), rgba(201,169,110,0.06))', border: '1px solid rgba(201,169,110,0.15)' }}>
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

                  <div className="rounded-2xl p-5 text-center" style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.1)' }}>
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
                    <p className="text-xs px-3 py-2 rounded-xl" style={{ background: 'rgba(201,169,110,0.06)', color: 'var(--text-2)' }}>{crystal.use}</p>
                  </GlassCard>

                  {guidance.human_design_reminder && (
                    <GlassCard>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>Human Design</p>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{guidance.human_design_reminder}</p>
                    </GlassCard>
                  )}

                  <div className="rounded-2xl p-5" style={{ background: 'var(--surface-inactive)', border: '1px solid rgba(180,150,100,0.18)' }}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-4)' }}>Journal prompt</p>
                    <p className="font-display text-sm italic leading-relaxed" style={{ color: 'var(--text-2)' }}>&ldquo;{journalPmt}&rdquo;</p>
                  </div>

                  <button onClick={() => loadGuidance(true)}
                    className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
                    style={{ background: 'rgba(201,169,110,0.08)', color: 'var(--violet)' }}>
                    <RefreshCw className="h-4 w-4" /> Refresh guidance
                  </button>
                </>
              )}
            </div>
          )}

          {/* ═══ ORACLE ═══════════════════════════════════════════ */}
          {activeTab === 'oracle' && (
            <div className="space-y-4 animate-fade-up">

              {tarotStats.total > 0 && (
                <div className="flex gap-2 text-center">
                  {[
                    { v: tarotStats.total,        l: 'Readings' },
                    { v: `${Math.round(tarotStats.accuracy_pct)}%`, l: 'Resonant' },
                    { v: tarotStats.resonance_avg > 0 ? tarotStats.resonance_avg.toFixed(1) : '—', l: 'Avg score' },
                  ].map(s => (
                    <div key={s.l} className="flex-1 rounded-2xl py-3" style={{ background: 'rgba(201,169,110,0.07)', border: '1px solid rgba(201,169,110,0.14)' }}>
                      <p className="text-lg font-bold" style={{ color: 'var(--violet)' }}>{s.v}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{s.l}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Draw Your Cards — full spread selection + AI reading lives
                  at /tarot; kept as one app-wide engine, linked from here */}
              <Link href="/tarot" className="block rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(201,169,110,0.16), rgba(184,151,79,0.1))', border: '1px solid rgba(201,169,110,0.28)', textDecoration: 'none' }}>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: 'rgba(201,169,110,0.18)', border: '1.5px solid rgba(201,169,110,0.3)' }}>🔮</div>
                  <div className="flex-1">
                    <p className="font-display text-lg font-semibold" style={{ color: 'var(--text-1)' }}>Draw Your Cards</p>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>Choose a spread, flip your cards, get a full AI-guided reading.</p>
                  </div>
                  <Sparkles className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--violet)' }} />
                </div>
              </Link>

              {/* Daily rune */}
              <div className="rounded-2xl p-4" style={{ background: 'var(--surface-inactive)', border: '1px solid rgba(180,150,100,0.18)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-4)' }}>Daily rune</p>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(201,169,110,0.08)', border: '1.5px solid rgba(201,169,110,0.15)' }}>
                    <span className="text-xl font-bold" style={{ color: 'var(--violet)', fontFamily: 'serif' }}>{todayRune.symbol}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{todayRune.name} — <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>{todayRune.meaning}</span></p>
                    <p className="text-sm italic mt-1" style={{ color: 'var(--text-2)' }}>&ldquo;{todayRune.message}&rdquo;</p>
                  </div>
                </div>
              </div>

              {/* Recent readings (read-only history from /tarot) */}
              {tarotHistory.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-4)' }}>Recent readings</p>
                    <Link href="/tarot" className="text-xs font-semibold" style={{ color: 'var(--violet)' }}>View all →</Link>
                  </div>
                  <div className="space-y-2">
                    {tarotHistory.slice(0, 3).map((h, i) => (
                      <div key={i} className="rounded-2xl px-4 py-3 flex items-center justify-between"
                        style={{ background: 'var(--surface-inactive)', border: '1px solid rgba(180,150,100,0.18)' }}>
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

          {/* ═══ DESIGN ═══════════════════════════════════════════ */}
          {activeTab === 'hd' && (
            <div className="space-y-4 animate-fade-up">

              {/* HD header */}
              <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(201,169,110,0.15), rgba(184,151,79,0.1))', border: '1px solid rgba(201,169,110,0.25)' }}>
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
                    <div key={item.label} className="rounded-xl p-3" style={{ background: 'var(--surface-inactive)' }}>
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
                    style={{ background: 'radial-gradient(circle, rgba(201,169,110,0.3), transparent)' }} />
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
                  <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.1)' }}>
                    <p className="font-display text-sm italic" style={{ color: 'var(--text-1)' }}>&ldquo;{hdGuidance.affirmation}&rdquo;</p>
                  </div>
                </div>
              ) : (
                <button onClick={loadHdGuidance}
                  className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ background: 'rgba(201,169,110,0.08)', color: 'var(--violet)' }}>
                  <Sparkles className="h-4 w-4" /> Load today&apos;s HD guidance
                </button>
              )}

              {/* Chart placements */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-4)' }}>Birth chart</p>
                <div className="space-y-2">
                  {HD_CHART.placements.map(p => (
                    <div key={p.label} className="flex items-start gap-3 rounded-xl px-4 py-3" style={{ background: 'var(--surface-inactive)', border: '1px solid rgba(180,150,100,0.18)' }}>
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
                      <span key={c} className="px-2.5 py-1 rounded-lg text-xs" style={{ background: 'var(--surface-inactive)', color: 'var(--text-3)', border: '1px solid rgba(180,150,100,0.18)' }}>{c}</span>
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
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(201,169,110,0.1)' }}>
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
              {/* Live moon-based recommendation */}
              <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(201,169,110,0.15), rgba(184,151,79,0.1))', border: '1px solid rgba(201,169,110,0.25)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Gem className="h-4 w-4" style={{ color: 'var(--violet)' }} />
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--violet)' }}>Crystal recommendation today</p>
                </div>
                {realMoon ? (
                  <p className="text-sm" style={{ color: 'var(--text-1)' }}>
                    Based on {realMoon.phase.emoji} {realMoon.phase.name} in {realMoon.sign.emoji} {realMoon.sign.name}
                  </p>
                ) : (
                  <p className="text-sm italic" style={{ color: 'var(--text-3)' }}>Loading live moon data…</p>
                )}
              </div>

              {/* Filter */}
              <div className="flex gap-2">
                {(['today', 'all'] as const).map(f => (
                  <button key={f} onClick={() => setCrystalFilter(f)}
                    className="px-4 py-2 rounded-full text-xs font-semibold transition-all"
                    style={{
                      background: crystalFilter === f ? 'var(--violet)' : 'rgba(201,169,110,0.08)',
                      color: crystalFilter === f ? '#100C1E' : 'var(--mid)',
                      border: '1px solid rgba(201,169,110,0.15)',
                    }}>
                    {f === 'today' ? `Today (${todaysCrystals.length})` : `Full Library (${CRYSTAL_LIBRARY.length})`}
                  </button>
                ))}
              </div>

              {/* Crystal cards */}
              <div className="space-y-3">
                {(crystalFilter === 'today' ? (todaysCrystals.length ? todaysCrystals : CRYSTAL_LIBRARY.slice(0, 4)) : CRYSTAL_LIBRARY).map(c => {
                  const isExpanded = expandedCrystal === c.name
                  return (
                    <button key={c.name} onClick={() => setExpandedCrystal(isExpanded ? null : c.name)}
                      className="w-full rounded-2xl p-4 text-left"
                      style={{ background: 'var(--surface-inactive)', border: `1px solid ${isExpanded ? c.color + '55' : 'rgba(180,150,100,0.18)'}` }}>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                          style={{ background: `${c.color}22`, border: `1.5px solid ${c.color}55` }}>{c.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold" style={{ color: 'var(--text-1)' }}>{c.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{c.properties}</p>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-4 space-y-3" style={{ borderTop: '1px solid rgba(180,150,100,0.18)' }}>
                          <div className="flex flex-wrap gap-1.5">
                            {[...c.signs, ...c.phases].slice(0, 4).map(tag => (
                              <span key={tag} className="text-xs px-2 py-0.5 rounded-full"
                                style={{ background: c.color + '18', color: c.lightColor, border: `1px solid ${c.color}25` }}>{tag}</span>
                            ))}
                            <span className="text-xs px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(201,169,110,0.15)', color: 'var(--violet)', border: '1px solid rgba(201,169,110,0.2)' }}>{c.chakra}</span>
                          </div>
                          <div className="rounded-xl p-3" style={{ background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.2)' }}>
                            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--violet)' }}>LUNA</p>
                            <p className="text-sm italic leading-relaxed" style={{ color: 'var(--text-1)' }}>{c.lunaNote}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-4)' }}>How to use</p>
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{c.howToUse}</p>
                          </div>
                          <div className="rounded-xl p-3" style={{ background: c.color + '10', border: `1px solid ${c.color}20` }}>
                            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: c.lightColor }}>Affirmation</p>
                            <p className="text-sm italic" style={{ color: 'var(--text-1)' }}>{c.affirmation}</p>
                          </div>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ═══ RITUAL ═══════════════════════════════════════════ */}
          {activeTab === 'ritual' && (
            <div className="space-y-4 animate-fade-up">

              {/* Moon phase ritual — live sign/phase-driven via astrology.ts getMoonRitualContext */}
              <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(201,169,110,0.1), rgba(184,151,79,0.06))', border: '1px solid rgba(201,169,110,0.2)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Moon className="h-4 w-4" style={{ color: 'var(--violet)' }} />
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--violet)' }}>
                    {realMoon?.phase.name ?? moon.name} Ritual — {realMoon?.sign.name ?? 'your'} energy
                  </p>
                </div>
                <p className="font-display text-lg font-semibold mb-1" style={{ color: 'var(--text-1)' }}>{moonRitual.title}</p>
                <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-2)' }}>{moonRitual.desc}</p>

                {ritualContext?.intention && (
                  <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--text-2)' }}>
                    <span className="font-semibold" style={{ color: 'var(--violet)' }}>Set your intention around:</span>{' '}{ritualContext.intention}
                  </p>
                )}
                {ritualContext?.avoid && (
                  <p className="text-sm mb-4" style={{ color: 'var(--text-3)' }}>
                    <span className="font-semibold">Avoid:</span> {ritualContext.avoid}
                  </p>
                )}

                <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-4)' }}>Your ritual steps</p>
                <div className="space-y-2">
                  {(ritualContext?.ritual?.length ? ritualContext.ritual : moonRitual.steps).map((step, i) => {
                    const done = ritualCompleted.has(step)
                    return (
                      <button key={i} onClick={() => toggleRitualStep(step)}
                        className="w-full rounded-xl p-3 flex items-center gap-3 text-left transition-all"
                        style={{
                          background: done ? 'rgba(90,140,120,0.1)' : 'var(--surface-inactive)',
                          border: `1px solid ${done ? 'rgba(90,140,120,0.3)' : 'rgba(180,150,100,0.18)'}`,
                        }}>
                        <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                          style={{ background: done ? '#5A8A7A' : 'transparent', border: done ? 'none' : '2px solid var(--text-4)' }}>
                          {done && <CheckCircle2 className="h-4 w-4 text-white" />}
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: done ? '#5A8A7A' : 'var(--text-1)', textDecoration: done ? 'line-through' : 'none' }}>{step}</p>
                      </button>
                    )
                  })}
                </div>

                {ritualContext?.release && ritualContext.release.length > 0 && (
                  <div className="mt-4 rounded-xl p-4" style={{ background: 'rgba(201,107,90,0.08)', border: '1px solid rgba(201,107,90,0.15)' }}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#C96B5A' }}>Full moon release</p>
                    <p className="text-xs mb-2" style={{ color: 'var(--text-3)' }}>Write these on paper. Burn or bury after your ritual.</p>
                    <ul className="space-y-1.5">
                      {ritualContext.release.map((r, i) => (
                        <li key={i} className="text-sm flex items-start gap-2" style={{ color: 'var(--text-1)' }}>
                          <span style={{ color: '#C96B5A', fontWeight: 'bold', marginTop: 2, flexShrink: 0 }}>✕</span>{r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-4)' }}>Ritual elements for {realMoon?.sign.name ?? 'Cancer'}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Scents', items: ritualElements.scents },
                      { label: 'Colors', items: ritualElements.colors },
                      { label: 'Crystals', items: ritualElements.crystals },
                      { label: 'Elements', items: ritualElements.elements },
                    ].map(cat => (
                      <div key={cat.label} className="rounded-xl p-3" style={{ background: 'var(--surface-inactive)', border: '1px solid rgba(180,150,100,0.18)' }}>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-4)' }}>{cat.label}</p>
                        <div className="flex flex-wrap gap-1">
                          {cat.items.map(item => (
                            <span key={item} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,169,110,0.15)', color: 'var(--violet)', border: '1px solid rgba(201,169,110,0.2)' }}>{item}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
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
                    { step: 1, title: 'Energy clearing',       desc: 'Hands on your chest. Ask: "What is mine and what did I absorb today?" With your Cancer Moon, you absorb rooms — release what isn\'t yours.' },
                    { step: 2, title: 'HD review',             desc: 'Did you wait for invitation today or push? Notice without judgment. Bitterness is information, not failure.' },
                    { step: 3, title: 'Three gratitudes',      desc: 'What did you do? What happened for you? What are you grateful for? These are three different things.' },
                    { step: 4, title: 'Body release',          desc: 'Shake your hands. Roll your shoulders. Your body carried your work today — acknowledge it and let it go.' },
                    { step: 5, title: 'Tomorrow\'s one word',  desc: 'Speak one word for how you want to feel tomorrow. Not what you need to do — how you want to feel.' },
                  ].map(item => (
                    <div key={item.step} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                        style={{ background: 'rgba(201,169,110,0.15)', color: 'var(--violet)' }}>{item.step}</div>
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
                style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.1)' }}>
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
