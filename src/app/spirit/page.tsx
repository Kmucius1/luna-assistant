'use client'
import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { GlassCard } from '@/components/ui/GlassCard'
import { Sparkles, Moon, Star, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'

// ─── Moon Phases ─────────────────────────────────────────────
const MOON_PHASES = [
  { name: 'New Moon',        emoji: '🌑', desc: 'New beginnings. Set intentions. Plant the seed.' },
  { name: 'Waxing Crescent', emoji: '🌒', desc: 'Take the first steps. Trust the spark.' },
  { name: 'First Quarter',   emoji: '🌓', desc: 'Push through resistance. Decide and act.' },
  { name: 'Waxing Gibbous',  emoji: '🌔', desc: 'Refine your work. Almost there. Trust the process.' },
  { name: 'Full Moon',       emoji: '🌕', desc: 'Release, celebrate, and see clearly. Emotions are louder.' },
  { name: 'Waning Gibbous',  emoji: '🌖', desc: 'Share your gifts. Gratitude season.' },
  { name: 'Last Quarter',    emoji: '🌗', desc: 'Let go of what is not working. Clear your space.' },
  { name: 'Waning Crescent', emoji: '🌘', desc: 'Rest, reflect, and restore. The cycle ends here.' },
]

// ─── Crystals ────────────────────────────────────────────────
const CRYSTALS = [
  { name: 'Amethyst',          color: '#8B6FB8', desc: 'Calm, protection, intuitive clarity',         use: 'Hold when anxious or making decisions' },
  { name: 'Labradorite',       color: '#4A7FB8', desc: 'Magic, intuition, seeing beyond the obvious',  use: 'Carry when you need to trust yourself' },
  { name: 'Rose Quartz',       color: '#E8B4B8', desc: 'Self-love, emotional healing, softness',       use: 'Place on your heart when you feel hard on yourself' },
  { name: 'Black Tourmaline',  color: '#3D3547', desc: 'Energetic protection, grounding',              use: 'Wear when dealing with draining people or spaces' },
  { name: 'Citrine',           color: '#E8C97A', desc: 'Abundance, joy, creative motivation',          use: 'Place at your desk when doing money or creative work' },
  { name: 'Selenite',          color: '#E8E4F4', desc: 'Clarity, higher guidance, peace',              use: 'Use before meditation or journaling' },
  { name: 'Moonstone',         color: '#C4D0E8', desc: 'Intuition, feminine cycles, new beginnings',   use: 'Carry during times of big change or transition' },
  { name: 'Clear Quartz',      color: '#F0EEFF', desc: 'Amplification, clarity, universal energy',    use: 'Pair with any other crystal to amplify its power' },
]

// ─── HD Reminders ────────────────────────────────────────────
const HD_REMINDERS = [
  { title: 'Projector Strategy',        body: 'Wait for recognition and invitation before initiating big moves. Your wisdom is most powerful when it is welcomed.' },
  { title: 'Self-Projected Authority',  body: 'Your truth lives in your voice. Speak your decision out loud — you will hear what is honest before you finish the sentence.' },
  { title: '4/6 Profile',               body: 'Your power is in relationships and lived experience. The right people are finding you. You are becoming the role model through everything you have lived.' },
  { title: 'Projector Warning',         body: 'If you are feeling bitter, you are likely overworking or trying to force recognition. Step back. Wait. Be seen, not chasing.' },
  { title: 'Scorpio Sun',               body: 'You are here to go deep, not wide. Strategic depth is your superpower. Do not let Gemini Rising scatter you. Choose what truly matters.' },
  { title: 'Cancer Moon',               body: 'Your emotional safety is your foundation of success. Tend to your home, your body, and your inner world with the same care you give your clients.' },
  { title: 'Virgo Midheaven',           body: 'Your career grows through clean systems, honest service, and turning chaos into useful structure. This is your legacy lane.' },
  { title: 'North Node in Cancer',      body: 'You are meant to embody nurturing, softness, and emotional leadership. Caring for yourself and others is not weakness — it is your path.' },
]

// ─── Tarot ───────────────────────────────────────────────────
const TAROT = [
  { name: 'The Fool',         emoji: '🌟', theme: 'New beginning, leap of faith',     message: 'Something new is beginning. Trust the jump even without seeing where you land.' },
  { name: 'The Magician',     emoji: '✨', theme: 'Power, manifestation, skill',       message: 'Everything you need is already in your hands. Stop waiting to begin.' },
  { name: 'The High Priestess',emoji: '🌙',theme: 'Intuition, sacred knowing',         message: 'The answer is already in you. Stop asking others what you already know.' },
  { name: 'The Empress',      emoji: '🌿', theme: 'Abundance, nurturing, creation',    message: 'Tend to yourself as beautifully as you tend to everything else.' },
  { name: 'The Emperor',      emoji: '🏛',  theme: 'Structure, authority, groundedness',message: 'Build the foundation now. What you create from order will outlast everything built from chaos.' },
  { name: 'The Hierophant',   emoji: '📿', theme: 'Tradition, learning, mentorship',   message: 'There is wisdom available to you right now — in a teacher, a system, or a practice. Receive it.' },
  { name: 'The Lovers',       emoji: '💕', theme: 'Choice, alignment, values',         message: 'This is a moment of alignment or misalignment. Choose what is true, not what is comfortable.' },
  { name: 'The Chariot',      emoji: '⚡', theme: 'Will, momentum, direction',         message: 'You have the power to move forward. Stop negotiating with yourself and drive.' },
  { name: 'Strength',         emoji: '🦁', theme: 'Inner strength, patience, courage', message: 'Your power today is in staying soft while staying firm. You do not need to roar.' },
  { name: 'The Hermit',       emoji: '🕯', theme: 'Solitude, inner guidance, wisdom',  message: 'You need less input from outside right now. The answer is in the quiet.' },
  { name: 'Wheel of Fortune', emoji: '🎡', theme: 'Change, cycles, turning point',     message: 'Something is shifting. Trust the cycle — it is moving in your favor even if you cannot see it yet.' },
  { name: 'Justice',          emoji: '⚖️', theme: 'Truth, fairness, cause and effect', message: 'What you put out is returning. Be honest with yourself about what you have been choosing.' },
  { name: 'The Hanged Man',   emoji: '🌀', theme: 'Pause, surrender, new perspective', message: 'Stop trying to force this. A pause is not failure — it is the only way to see clearly right now.' },
  { name: 'Death',            emoji: '🦋', theme: 'Transformation, endings, rebirth',  message: 'Something is ending so something better can begin. Do not hold onto what is already leaving.' },
  { name: 'Temperance',       emoji: '🌊', theme: 'Balance, patience, flow',           message: 'Find the middle ground. You are being asked to blend, not force.' },
  { name: 'The Star',         emoji: '⭐', theme: 'Hope, renewal, faith',              message: 'You are allowed to hope again. The darkness is passing. Let yourself receive.' },
  { name: 'The Moon',         emoji: '🌕', theme: 'Illusion, intuition, the unknown',  message: 'Not everything is what it appears. Trust your gut, not the narrative in your head.' },
  { name: 'The Sun',          emoji: '☀️', theme: 'Joy, success, vitality',            message: 'You are stepping into a brighter season. Let yourself be seen and celebrated.' },
  { name: 'Judgement',        emoji: '🎺', theme: 'Awakening, calling, reflection',    message: 'You are being called toward something higher. Answer it.' },
  { name: 'The World',        emoji: '🌍', theme: 'Completion, wholeness, integration',message: 'A cycle is complete. You have earned this. Let yourself feel it before you start the next thing.' },
  { name: 'The Tower',        emoji: '⚡', theme: 'Disruption, revelation, change',    message: 'Something is breaking down so something real can be built. What falls was not meant to stay.' },
  { name: 'The Devil',        emoji: '🔗', theme: 'Attachment, shadow, freedom',       message: 'What are you staying in because of fear? You have more freedom than you are allowing yourself.' },
]

// ─── Runes ──────────────────────────────────────────────────
const RUNES = [
  { name: 'Fehu',    symbol: 'ᚠ', meaning: 'Abundance, wealth, new beginnings',        message: 'Abundance is available. Tend to what you already have and watch it grow.' },
  { name: 'Uruz',    symbol: 'ᚢ', meaning: 'Primal strength, vitality, raw power',     message: 'Tap into your raw power today. You are stronger than the obstacle.' },
  { name: 'Thurisaz',symbol: 'ᚦ', meaning: 'Gateway, protection, willpower',           message: 'You are crossing a threshold. Prepare before you step through.' },
  { name: 'Ansuz',   symbol: 'ᚨ', meaning: 'Communication, divine message, clarity',   message: 'Pay attention to what you hear and say today. Words carry extra power.' },
  { name: 'Raidho',  symbol: 'ᚱ', meaning: 'Journey, rhythm, right timing',            message: 'You are on the right path. Trust the pace you are moving.' },
  { name: 'Kenaz',   symbol: 'ᚲ', meaning: 'Creativity, illumination, insight',        message: 'Something is becoming clear. Follow the creative spark you feel today.' },
  { name: 'Gebo',    symbol: 'ᚷ', meaning: 'Gift, generosity, exchange',               message: 'Give and receive with equal grace today.' },
  { name: 'Wunjo',   symbol: 'ᚹ', meaning: 'Joy, harmony, alignment',                  message: 'You are in a moment of alignment. Let yourself feel how good this actually is.' },
  { name: 'Hagalaz', symbol: 'ᚺ', meaning: 'Change, disruption, awakening',            message: 'Something disrupting you is also freeing you. Let it.' },
  { name: 'Nauthiz', symbol: 'ᚾ', meaning: 'Need, patience, inner fire',               message: 'The constraint you feel is building something in you. Stay the course.' },
  { name: 'Isa',     symbol: 'ᛁ', meaning: 'Stillness, pause, clarity',                message: 'Stop. Be still. The answer comes in the pause, not the push.' },
  { name: 'Jera',    symbol: 'ᛃ', meaning: 'Harvest, cycles, patience',                message: 'You are closer to the harvest than you think. Keep tending.' },
  { name: 'Eihwaz',  symbol: 'ᛇ', meaning: 'Endurance, deep roots, transformation',   message: 'You are more rooted than you feel. Let yourself endure.' },
  { name: 'Perthro', symbol: 'ᛈ', meaning: 'Mystery, fate, inner knowing',             message: 'Something is not yet revealed. Trust that you will know when you need to.' },
  { name: 'Algiz',   symbol: 'ᛉ', meaning: 'Protection, higher self, intuition',       message: 'You are protected. Stay connected to what is highest in you today.' },
  { name: 'Sowilo',  symbol: 'ᛊ', meaning: 'Success, vitality, wholeness',             message: 'You are aligned with your path. Move forward.' },
  { name: 'Tiwaz',   symbol: 'ᛏ', meaning: 'Justice, honor, direction',                message: 'Do what is right, even when it costs something.' },
  { name: 'Berkano', symbol: 'ᛒ', meaning: 'New beginnings, growth, nurturing',        message: 'Something is growing in you. Tend it gently.' },
  { name: 'Ehwaz',   symbol: 'ᛖ', meaning: 'Partnership, trust, movement',             message: 'Progress comes through collaboration right now. Who do you need to move with?' },
  { name: 'Mannaz',  symbol: 'ᛗ', meaning: 'Self, humanity, community',               message: 'Know yourself. Your clarity of identity is your greatest asset today.' },
  { name: 'Laguz',   symbol: 'ᛚ', meaning: 'Flow, intuition, emotional truth',         message: 'Stop thinking. Feel your way through this one.' },
  { name: 'Ingwaz',  symbol: 'ᛜ', meaning: 'Completion, rest, potential energy',       message: 'Rest before your next move. What is incubating in you needs time.' },
  { name: 'Dagaz',   symbol: 'ᛞ', meaning: 'Breakthrough, dawn, transformation',      message: 'A breakthrough is here or very close. The darkest part is behind you.' },
  { name: 'Othala',  symbol: 'ᛟ', meaning: 'Ancestral wisdom, home, belonging',        message: 'Return to what is essential. You belong here. Trust your roots.' },
]

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
  const knownNew = new Date('2024-01-11')
  const daysSince = (Date.now() - knownNew.getTime()) / (1000 * 60 * 60 * 24)
  const cycleDay = ((daysSince % 29.53) + 29.53) % 29.53
  return MOON_PHASES[Math.min(Math.floor(cycleDay / (29.53 / 8)), 7)]
}

function getDailyIndex(arr: unknown[]) {
  return new Date().getDate() % arr.length
}

type SpiritTab = 'today' | 'oracle' | 'hd' | 'crystals'

interface RealMoonData {
  phase: {
    name: string
    emoji: string
    illumination: number
    angle: number
    description: string
    next_exact: { name: string; time: string } | null
  }
  sign: { name: string; emoji: string; degree: number; minutes: number; formatted: string; keywords: string }
  next_ingress: string | null
  timezone: string
  calculated_at: string
}

export default function SpiritScreen() {
  const [guidance, setGuidance] = useState<{
    energy_today?: string; crystal?: string; crystal_why?: string;
    moon_note?: string; affirmation?: string; intention?: string;
    shadow_question?: string; gratitude_prompt?: string;
    meditation_prompt?: string; human_design_reminder?: string;
  } | null>(null)
  const [tarotResult, setTarotResult]   = useState<{ card_message?: string; life_area?: string; action?: string; chart_connection?: string; affirmation?: string } | null>(null)
  const [loadingGuidance, setLoadingGuidance] = useState(false)
  const [loadingTarot, setLoadingTarot]       = useState(false)
  const [activeTab, setActiveTab]             = useState<SpiritTab>('today')
  const [realMoon, setRealMoon]               = useState<RealMoonData | null>(null)

  const moon        = getMoonPhase()
  const crystal     = CRYSTALS[getDailyIndex(CRYSTALS)]
  const hdNote      = HD_REMINDERS[getDailyIndex(HD_REMINDERS)]
  const todayCard   = TAROT[getDailyIndex(TAROT)]
  const todayRune   = RUNES[getDailyIndex(RUNES)]
  const journalPmt  = JOURNAL_PROMPTS[getDailyIndex(JOURNAL_PROMPTS)]
  const today       = format(new Date(), 'EEEE, MMMM d')

  async function loadGuidance() {
    setLoadingGuidance(true)
    try {
      const res  = await fetch('/api/ai/spiritual-guidance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      setGuidance(await res.json())
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

  async function getTarotReading() {
    setLoadingTarot(true)
    try {
      const res = await fetch('/api/ai/tarot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card: todayCard.name, theme: todayCard.theme }),
      })
      setTarotResult(await res.json())
    } catch {
      setTarotResult({
        card_message: todayCard.message,
        life_area: 'Inner wisdom and current direction',
        action: 'Spend 10 minutes sitting with what this card means for you specifically.',
        chart_connection: 'Your Scorpio Sun is always reading beneath the surface. Trust that depth today.',
        affirmation: `I receive what ${todayCard.name} is asking me to see.`,
      })
    } finally {
      setLoadingTarot(false)
    }
  }

  useEffect(() => {
    loadGuidance()

    function fetchMoon(tz: string) {
      fetch(`/api/astrology/moon?tz=${encodeURIComponent(tz)}`)
        .then(r => r.json())
        .then(setRealMoon)
        .catch(() => {/* use approximation fallback */})
    }

    // Request location services for accurate timezone
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          // Location granted — browser timezone is now accurate
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
          fetchMoon(tz)
        },
        () => {
          // Location denied — fall back to browser timezone
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
          fetchMoon(tz)
        }
      )
    } else {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      fetchMoon(tz)
    }
  }, [])

  const TABS: { value: SpiritTab; label: string }[] = [
    { value: 'today',   label: '✨ Today'   },
    { value: 'oracle',  label: '🔮 Oracle'  },
    { value: 'hd',      label: '💜 Design'  },
    { value: 'crystals',label: '💎 Crystals'},
  ]

  return (
    <div className="bg-spirit min-h-screen">
      <AppLayout noPad>
        <div className="px-5 pt-14 pb-nav">

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(139,111,184,0.12)' }}>
              <Sparkles className="h-5 w-5" style={{ color: 'var(--violet)' }} />
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-wider" style={{ color: 'var(--violet)' }}>Spirit</p>
              <p className="text-xs" style={{ color: 'var(--mist)' }}>{today}</p>
            </div>
          </div>

          <h1 className="font-display text-2xl font-semibold mb-6" style={{ color: 'var(--depth)' }}>
            Your sacred space.
          </h1>

          {/* Tabs */}
          <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
            {TABS.map(t => (
              <button key={t.value} onClick={() => setActiveTab(t.value)}
                className="flex-none px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all"
                style={{
                  background: activeTab === t.value ? 'var(--violet)' : 'rgba(139,111,184,0.08)',
                  color: activeTab === t.value ? 'white' : 'var(--mid)',
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── TODAY tab ── */}
          {activeTab === 'today' && (
            <div className="space-y-4 animate-fade-up">
              {/* Moon card — Phase + Sign clearly separated */}
              <GlassCard>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--violet)' }}>
                  Moon
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {/* Moon Phase — emoji and data both from real API */}
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--mist)' }}>Phase</p>
                    <div className="flex items-center gap-2">
                      {/* Use API emoji — not the approximate function */}
                      <span className="text-2xl animate-float">
                        {realMoon ? realMoon.phase.emoji : moon.emoji}
                      </span>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--depth)' }}>
                          {realMoon ? realMoon.phase.name : moon.name}
                        </p>
                        {realMoon && (
                          <p className="text-[10px]" style={{ color: 'var(--mist)' }}>
                            {realMoon.phase.illumination}% illuminated
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--mid)' }}>
                      {realMoon ? realMoon.phase.description : moon.desc}
                    </p>
                    {/* Show exact phase moment if within ~48h */}
                    {realMoon?.phase.next_exact && (
                      <p className="text-[10px] mt-1 px-2 py-1 rounded-lg" style={{ background: 'rgba(139,111,184,0.06)', color: 'var(--violet)' }}>
                        {realMoon.phase.next_exact.name}: {realMoon.phase.next_exact.time}
                      </p>
                    )}
                  </div>

                  {/* Moon Sign — SEPARATE from phase, always from API */}
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--mist)' }}>Sign</p>
                    {realMoon ? (
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xl">{realMoon.sign.emoji}</span>
                          <p className="text-sm font-semibold" style={{ color: 'var(--depth)' }}>
                            {realMoon.sign.name}
                          </p>
                        </div>
                        <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--violet)' }}>
                          {realMoon.sign.formatted}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--mid)' }}>
                          {realMoon.sign.keywords}
                        </p>
                        {realMoon.next_ingress && (
                          <p className="text-[10px] mt-1 px-2 py-1 rounded-lg italic" style={{ background: 'rgba(139,111,184,0.06)', color: 'var(--violet)' }}>
                            → {realMoon.next_ingress}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs italic" style={{ color: 'var(--mist)' }}>
                          Loading exact sign...
                        </p>
                        <p className="text-[10px] mt-1" style={{ color: 'var(--faint)' }}>
                          Verify in TimePassages
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Calculated time + accuracy note */}
                <div className="mt-3 pt-2 border-t flex items-center justify-between" style={{ borderColor: 'rgba(139,111,184,0.08)' }}>
                  <p className="text-[9px]" style={{ color: 'var(--faint)' }}>
                    Live · astronomy-engine ephemeris
                    {realMoon?.calculated_at && ` · ${new Date(realMoon.calculated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}`}
                  </p>
                  <p className="text-[9px]" style={{ color: 'var(--faint)' }}>Cross-ref TimePassages</p>
                </div>
              </GlassCard>

              {loadingGuidance ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-full mx-auto mb-4 animate-breathe"
                    style={{ background: 'radial-gradient(circle, rgba(139,111,184,0.3), transparent)' }} />
                  <p className="text-sm" style={{ color: 'var(--mist)' }}>Receiving spiritual guidance...</p>
                </div>
              ) : guidance && (
                <>
                  <GlassCard soul>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>Energy today</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--depth)' }}>{guidance.energy_today}</p>
                  </GlassCard>

                  <GlassCard>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl animate-float flex-shrink-0"
                        style={{ background: `${crystal.color}22`, border: `1.5px solid ${crystal.color}44` }}>💎</div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--mist)' }}>Crystal today</p>
                        <p className="font-semibold" style={{ color: 'var(--depth)' }}>{guidance.crystal || crystal.name}</p>
                        <p className="text-xs" style={{ color: 'var(--mid)' }}>{guidance.crystal_why || crystal.desc}</p>
                      </div>
                    </div>
                    <p className="text-xs px-3 py-2 rounded-xl" style={{ background: 'rgba(139,111,184,0.06)', color: 'var(--mid)' }}>
                      {crystal.use}
                    </p>
                  </GlassCard>

                  <div className="rounded-2xl p-5 text-center" style={{ background: 'rgba(139,111,184,0.06)', border: '1px solid rgba(139,111,184,0.1)' }}>
                    <p className="font-display text-lg italic leading-relaxed" style={{ color: 'var(--depth)' }}>
                      &ldquo;{guidance.affirmation}&rdquo;
                    </p>
                  </div>

                  <GlassCard>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>Today&apos;s intention</p>
                    <p className="text-sm" style={{ color: 'var(--depth)' }}>{guidance.intention}</p>
                  </GlassCard>

                  <GlassCard>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#A87B7B' }}>Shadow question</p>
                    <p className="font-display text-base italic" style={{ color: 'var(--depth)' }}>{guidance.shadow_question}</p>
                  </GlassCard>

                  <div className="grid grid-cols-2 gap-3">
                    <GlassCard className="col-span-1 !p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--herb)' }}>Gratitude</p>
                      <p className="text-sm" style={{ color: 'var(--mid)' }}>{guidance.gratitude_prompt}</p>
                    </GlassCard>
                    <GlassCard className="col-span-1 !p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--lunar)' }}>Breathe</p>
                      <p className="text-sm italic" style={{ color: 'var(--mid)' }}>{guidance.meditation_prompt}</p>
                    </GlassCard>
                  </div>

                  {guidance.human_design_reminder && (
                    <GlassCard>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>Human Design</p>
                      <p className="text-sm" style={{ color: 'var(--mid)' }}>{guidance.human_design_reminder}</p>
                    </GlassCard>
                  )}

                  <button onClick={loadGuidance}
                    className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
                    style={{ background: 'rgba(139,111,184,0.08)', color: 'var(--violet)' }}>
                    <RefreshCw className="h-4 w-4" /> Refresh guidance
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── ORACLE tab ── */}
          {activeTab === 'oracle' && (
            <div className="space-y-4 animate-fade-up">
              <p className="text-sm" style={{ color: 'var(--mid)' }}>
                Today&apos;s oracle is drawn by the date — every day brings its own card and rune.
              </p>

              {/* Tarot card */}
              <div className="soul-card p-5">
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--violet)' }}>
                  Daily tarot
                </p>
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 animate-float"
                    style={{ background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.3)' }}>
                    {todayCard.emoji}
                  </div>
                  <div className="flex-1">
                    <p className="font-display text-lg font-semibold mb-1" style={{ color: 'var(--depth)' }}>
                      {todayCard.name}
                    </p>
                    <p className="text-xs mb-2" style={{ color: 'var(--mist)' }}>{todayCard.theme}</p>
                    <p className="text-sm leading-relaxed italic" style={{ color: 'var(--mid)' }}>
                      &ldquo;{todayCard.message}&rdquo;
                    </p>
                  </div>
                </div>
              </div>

              {/* Tarot AI reading */}
              {!tarotResult ? (
                <button onClick={getTarotReading} disabled={loadingTarot}
                  className="w-full py-3 rounded-2xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                  <Sparkles className="inline h-4 w-4 mr-2" />
                  {loadingTarot ? 'Reading your card...' : 'Get personal reading for this card'}
                </button>
              ) : (
                <div className="space-y-3">
                  <GlassCard>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>What this means for you</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--depth)' }}>{tarotResult.card_message}</p>
                  </GlassCard>
                  {tarotResult.life_area && (
                    <GlassCard>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--mist)' }}>Life area</p>
                      <p className="text-sm" style={{ color: 'var(--depth)' }}>{tarotResult.life_area}</p>
                    </GlassCard>
                  )}
                  {tarotResult.action && (
                    <GlassCard>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#5A8A5A' }}>Your action</p>
                      <p className="text-sm font-semibold" style={{ color: 'var(--depth)' }}>{tarotResult.action}</p>
                    </GlassCard>
                  )}
                  {tarotResult.affirmation && (
                    <div className="rounded-2xl p-4 text-center"
                      style={{ background: 'rgba(139,111,184,0.06)', border: '1px solid rgba(139,111,184,0.1)' }}>
                      <p className="font-display text-base italic" style={{ color: 'var(--depth)' }}>
                        &ldquo;{tarotResult.affirmation}&rdquo;
                      </p>
                    </div>
                  )}
                  <button onClick={() => setTarotResult(null)}
                    className="text-xs font-medium" style={{ color: 'var(--mist)' }}>
                    Clear reading
                  </button>
                </div>
              )}

              {/* Daily Rune */}
              <GlassCard>
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(139,111,184,0.08)', border: '1.5px solid rgba(139,111,184,0.15)' }}>
                    <span className="text-2xl font-bold" style={{ color: 'var(--violet)', fontFamily: 'serif' }}>
                      {todayRune.symbol}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--mist)' }}>Daily rune</p>
                    <p className="font-semibold mb-0.5" style={{ color: 'var(--depth)' }}>{todayRune.name}</p>
                    <p className="text-xs mb-2" style={{ color: 'var(--mist)' }}>{todayRune.meaning}</p>
                    <p className="text-sm italic" style={{ color: 'var(--mid)' }}>&ldquo;{todayRune.message}&rdquo;</p>
                  </div>
                </div>
              </GlassCard>

              {/* Journal prompt */}
              <div className="rounded-2xl p-5"
                style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.12)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--golden)' }}>
                  Journal prompt
                </p>
                <p className="font-display text-base italic leading-relaxed" style={{ color: 'var(--depth)' }}>
                  &ldquo;{journalPmt}&rdquo;
                </p>
                <button
                  onClick={() => { window.location.href = '/dictation' }}
                  className="mt-3 text-xs font-semibold"
                  style={{ color: 'var(--violet)' }}>
                  Dictate your response →
                </button>
              </div>
            </div>
          )}

          {/* ── HD tab ── */}
          {activeTab === 'hd' && (
            <div className="space-y-4 animate-fade-up">
              <div className="soul-card p-5 mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--violet)' }}>Your Design</p>
                <p className="font-display text-lg font-semibold" style={{ color: 'var(--depth)' }}>Self-Projected Projector · 4/6</p>
                <p className="text-sm mt-1" style={{ color: 'var(--mid)' }}>Scorpio Sun · Cancer Moon · Gemini Rising · Virgo Midheaven</p>
              </div>
              {HD_REMINDERS.map((note, i) => (
                <GlassCard key={i}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(139,111,184,0.1)' }}>
                      <Star className="h-4 w-4" style={{ color: 'var(--violet)' }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--depth)' }}>{note.title}</p>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--mid)' }}>{note.body}</p>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}

          {/* ── CRYSTALS tab ── */}
          {activeTab === 'crystals' && (
            <div className="space-y-3 animate-fade-up">
              {CRYSTALS.map((c, i) => (
                <GlassCard key={i}>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: `${c.color}22`, border: `1.5px solid ${c.color}55` }}>💎</div>
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--depth)' }}>{c.name}</p>
                      <p className="text-sm mt-0.5" style={{ color: 'var(--mid)' }}>{c.desc}</p>
                      <p className="text-xs mt-1 italic" style={{ color: 'var(--mist)' }}>{c.use}</p>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}

          {/* Dream log link */}
          <div className="mt-6">
            <button onClick={() => { window.location.href = '/dictation' }}
              className="w-full rounded-2xl p-4 flex items-center justify-between"
              style={{ background: 'rgba(139,111,184,0.06)', border: '1px solid rgba(139,111,184,0.1)' }}>
              <div className="flex items-center gap-3">
                <Moon className="h-5 w-5" style={{ color: 'var(--violet)' }} />
                <div className="text-left">
                  <p className="text-sm font-semibold" style={{ color: 'var(--depth)' }}>Dream log</p>
                  <p className="text-xs" style={{ color: 'var(--mist)' }}>Record last night&apos;s dreams</p>
                </div>
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--violet)' }}>Dictate →</span>
            </button>
          </div>

        </div>
      </AppLayout>
    </div>
  )
}
