'use client'
import { AppLayout } from '@/components/layout/AppLayout'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'

type Tab = 'planets' | 'houses' | 'aspects'

const PLANETS_DATA = [
  {
    name: 'Sun', emoji: '☀️', rules: 'Leo · 5th House', keyword: 'Identity · vitality · purpose · ego',
    body: 'The Sun is your core self — who you fundamentally are beneath all roles, wounds, and conditioning. It shows how your life force wants to express itself. Your Sun sign is your creative engine, your purpose zone, your area of natural radiance. It answers: what makes me feel most alive? What am I here to embody? The house it falls in shows WHERE that energy wants to express. The sign shows HOW. Aspects to the Sun show what either supports or challenges that core expression.',
    inYourChart: 'Your Sun in Scorpio 22° means your life force is fundamentally alchemical. You transform, you dive deep, you refuse surface-level existence. Your power comes from radical emotional honesty, willingness to face shadow, and capacity for complete regeneration.',
  },
  {
    name: 'Moon', emoji: '🌙', rules: 'Cancer · 4th House', keyword: 'Emotions · instincts · needs · inner child',
    body: 'The Moon governs your emotional body — how you feel, how you process feelings, what you need to feel safe, and how your inner child moves through the world. It is the most intimate, unconscious layer of your chart. Your Moon sign shows the emotional weather you carry internally. The house shows what environment or life area your feelings are most focused on. Moon transits (every 2.5 days) affect your mood rhythm more visibly than most planetary movements.',
    inYourChart: 'Your Moon in Cancer 4° makes your emotional intelligence your greatest asset and your primary compass. You need safety, home, water, and quiet to function. Your feelings are data. When you feel safe, you are capable of deep creative and intuitive work. Without safety, nothing else works.',
  },
  {
    name: 'Mercury', emoji: '☿', rules: 'Gemini & Virgo · 3rd & 6th Houses', keyword: 'Mind · communication · thought · perception',
    body: 'Mercury rules how you think, process information, communicate, and learn. It governs language, data, local travel, siblings, and the daily operations of your mind. Mercury retrograde (3x per year) reverses communication and review cycles. The sign Mercury falls in shows the style of your thinking — how your mind naturally moves. The house shows the topic or environment where your thinking is most active.',
    inYourChart: 'Mercury in Scorpio 3° makes your mind a research instrument. You think in depth, not breadth. You investigate, probe, and seek what is hidden. You are a pattern-recognizer. You can tell when someone is not telling the truth. Your communication style is precise, intentional, and impactful.',
  },
  {
    name: 'Venus', emoji: '♀', rules: 'Taurus & Libra · 2nd & 7th Houses', keyword: 'Love · beauty · values · pleasure · attraction',
    body: 'Venus governs what you love, what you find beautiful, what you value, and how you relate in close partnerships. It rules your aesthetic sense, your relationship to money and pleasure, and the way you attract and are attracted to others. Venus sign shows your love language, style preferences, and values in relationship. Venus house shows the life area where you seek beauty and connection most naturally.',
    inYourChart: 'Your Venus in Sagittarius 29° (cusp Capricorn) makes you a freedom-loving, adventure-attracted, philosophically romantic soul. You are drawn to people who expand your mind. You love beauty as an experience — travel, ideas, creativity, bold aesthetics. The Capricorn cusp adds capacity for building serious, lasting love over time.',
  },
  {
    name: 'Mars', emoji: '♂', rules: 'Aries · 1st House', keyword: 'Drive · action · desire · anger · passion',
    body: 'Mars is your engine — how you take action, what you desire, where your drive lives, and how you handle conflict and anger. It governs ambition, sex drive, physical energy, and competitive instincts. Mars sign shows your action style. Mars house shows the area where your drive is most focused. Mars retrograde (every ~26 months) calls for internal review of what you actually want to build and how.',
    inYourChart: 'Mars in Libra 6° means your drive is activated by beauty, fairness, and relational harmony. You are motivated through aesthetics and values. You avoid conflict until your values are directly crossed, then you become precise and decisive. You need your environment to be beautiful in order to feel energized to work in it.',
  },
  {
    name: 'Jupiter', emoji: '♃', rules: 'Sagittarius · 9th House', keyword: 'Expansion · abundance · wisdom · opportunity',
    body: 'Jupiter shows where you naturally experience abundance, growth, wisdom, and luck. It is the planet of expansion and higher meaning. Jupiter transits tend to bring opportunities, visibility, and growth in the house it occupies. Jupiter takes ~12 years to orbit the Sun — a Jupiter return (every ~12 years) marks a major life expansion cycle. The sign shows your style of growth. The house shows where your life wants to expand.',
    inYourChart: 'Jupiter in Gemini 7° means your abundance and expansion come through communication, ideas, learning, and connection. Writing, speaking, networking, multiple interests — these are your abundance portals. The risk is scattering. When you stay curious and communicative, luck finds you.',
  },
  {
    name: 'Saturn', emoji: '♄', rules: 'Capricorn · 10th House', keyword: 'Discipline · structure · karma · mastery · time',
    body: 'Saturn is the great teacher — it shows where you must earn through effort, discipline, and facing reality clearly. Saturn themes take time and cannot be rushed. The Saturn Return (ages 28-30 and 58-60) marks a major life reckoning and restructuring. Saturn in your chart shows where you are building mastery over a lifetime. The sign shows the lesson. The house shows the arena of the lesson.',
    inYourChart: 'Saturn in Taurus 27° places your life lesson in the domain of money, body, and slow wealth. You are learning that stability comes from patience, not speed. The gift of this placement — when honored — is lasting material security, a deeply grounded relationship with your physical body, and the capacity to build something of real lasting value.',
  },
  {
    name: 'Uranus', emoji: '⛢', rules: 'Aquarius · 11th House', keyword: 'Awakening · disruption · liberation · innovation',
    body: 'Uranus moves through each sign for ~7 years and governs collective awakening, sudden change, liberation from the past, and innovation. Uranus transits often bring unexpected disruption or breakthrough — sometimes both at once. The house Uranus occupies in your chart shows where you are most likely to experience sudden change or live unconventionally.',
    inYourChart: 'Uranus in Aquarius 17° (generational) makes you part of a generation that fundamentally rewires community, collective consciousness, and technology. Personally, you disrupt systems simply by existing authentically. You think ahead of your time and belong to a collective that sees possibility where others see impossibility.',
  },
  {
    name: 'Neptune', emoji: '♆', rules: 'Pisces · 12th House', keyword: 'Dreams · illusion · spirituality · compassion · dissolution',
    body: 'Neptune is the planet of dissolution, fantasy, spiritual longing, and collective imagination. It blurs boundaries — sometimes in beautiful, transcendent ways; sometimes through confusion and illusion. Neptune transits can bring deep spiritual openings or confusion about what is real. Neptune square Neptune (late 30s-40s) is a major transit for spiritual reckoning.',
    inYourChart: 'Neptune in Aquarius 4° (generational) makes you part of a generation that dissolves old social structures through visionary idealism and humanitarian consciousness. Personally, your dreams often center around collective possibility, community healing, and a future that does not yet exist.',
  },
  {
    name: 'Pluto', emoji: '♇', rules: 'Scorpio · 8th House', keyword: 'Transformation · power · death/rebirth · shadow · evolution',
    body: 'Pluto governs the deepest transformation available to humans — the death of the old self and birth of the new. Pluto transits are long (years) and non-negotiable. Whatever Pluto touches, it forces to transform. The house and sign show where evolution is demanded. Pluto is also collective — it shapes entire eras and generations.',
    inYourChart: 'Pluto in Sagittarius 11° (generational) places your generation\'s power in belief systems, philosophy, religion, and the expansion of consciousness. Old belief structures are dying. New philosophies are being born. Personally: you have an unusual power to completely change your own worldview when you encounter a deeper truth.',
  },
]

const HOUSES_DATA = [
  { number: 1, name: 'House of Self',          rules: 'Aries · Mars', body: 'The Ascendant. Your physical appearance, first impression, how you naturally begin things, your approach to life. The mask and the door into the chart.', zoe: 'Your 1st house is Gemini 12°. You come across as expressive, curious, communicative, and adaptable. People meet your Gemini exterior before they know your Scorpio depth.' },
  { number: 2, name: 'House of Resources',      rules: 'Taurus · Venus', body: 'Money, possessions, self-worth, income, values. How you earn and what you value. Also your relationship to your own body.', zoe: 'Saturn in Taurus sits here — your relationship with money is a lifelong lesson in patience and quality over speed.' },
  { number: 3, name: 'House of Mind',           rules: 'Gemini · Mercury', body: 'Communication, local travel, siblings, learning, short journeys, writing, speaking. How your everyday mind moves.', zoe: 'This is a naturally activated zone — Gemini Rising amplifies your 3rd house themes. Your voice is your tool.' },
  { number: 4, name: 'House of Home',           rules: 'Cancer · Moon', body: 'Home, family, roots, mother, emotional foundation, private life, ancestry. Where you come from and what grounds you.', zoe: 'Your Moon is in Cancer in the 1st house (relative to your rising) but Cancer rules your 4th house. Home and emotional safety are the bedrock of your entire life architecture.' },
  { number: 5, name: 'House of Creativity',     rules: 'Leo · Sun', body: 'Creativity, pleasure, romance, children, play, self-expression, speculation. Where your heart leads.', zoe: 'Your Virgo Midheaven energy eventually flows here — the heart of your creative expression.' },
  { number: 6, name: 'House of Service',        rules: 'Virgo · Mercury', body: 'Health, work, daily routines, service, habits, pets. How you show up every day. Your relationship with your physical body and its maintenance.', zoe: 'Virgo Midheaven rules your public service — this is where your daily work ethic and precision live.' },
  { number: 7, name: 'House of Partnership',    rules: 'Libra · Venus', body: 'One-on-one relationships, marriage, business partnerships, known enemies. What you attract and what you need in relationship.', zoe: 'Your Mars in Libra activates 7th house energy — your drive is relational. You act through partnership.' },
  { number: 8, name: 'House of Transformation', rules: 'Scorpio · Pluto', body: 'Death, rebirth, shared resources, sex, inheritance, occult, deep psychology, other people\'s money. Where you face depth.', zoe: 'Your Scorpio Sun and Mercury both resonate with 8th house themes. You are built for deep transformation.' },
  { number: 9, name: 'House of Expansion',      rules: 'Sagittarius · Jupiter', body: 'Philosophy, higher learning, travel, religion, publishing, foreign cultures, ethics. What expands your world.', zoe: 'Jupiter in Gemini is your ruler here — expansion through ideas and communication is your natural territory.' },
  { number: 10, name: 'House of Career',        rules: 'Capricorn · Saturn', body: 'Career, public image, legacy, authority, worldly success, reputation. How you are known in the world.', zoe: 'Virgo Midheaven here: your career legacy is built through precision, service, systems, and genuine usefulness to others.' },
  { number: 11, name: 'House of Community',     rules: 'Aquarius · Uranus', body: 'Friends, groups, collective vision, hopes, wishes, networks, community. Your place in the collective.', zoe: 'Aquarian energy here — your network and community are unconventional, future-facing, and ideally aligned with a bigger vision.' },
  { number: 12, name: 'House of the Unseen',    rules: 'Pisces · Neptune', body: 'Hidden matters, solitude, dreams, karma, spirituality, undoing, self-transcendence. What lies beneath the conscious.', zoe: 'The 12th house holds your Pisces themes — your spiritual depth, dream life, and the places you retreat to restore.' },
]

const ASPECTS_DATA = [
  { symbol: '☌', name: 'Conjunction (0°)', orb: '8°', energy: 'Fusion', color: '#DC82AA', body: 'Two energies completely merge. Planets in conjunction intensify and blend their themes. This can feel like one energy amplifying the other — the two planets cannot be separated. Conjunctions in your natal chart show where your energies are unified and powerful. Transiting conjunctions mark activation moments.', example: 'Sun conjunct Mars: your identity and drive are fused. You are naturally bold and self-directed.' },
  { symbol: '⚹', name: 'Sextile (60°)', orb: '4°', energy: 'Opportunity', color: '#5A7A9A', body: 'Planets in sextile work together easily but require a small effort to activate. They offer gifts, skills, and opportunities that are available when you reach for them. Less automatic than a trine — more conscious cooperation needed.', example: 'Moon sextile Mercury: your emotions and mind work well together when you choose to express your feelings clearly.' },
  { symbol: '□', name: 'Square (90°)', orb: '8°', energy: 'Friction', color: '#C96B5A', body: 'Planets in square are in dynamic tension. They push against each other, creating friction, urgency, and the drive to grow. Squares in your natal chart show recurring areas of challenge that ultimately build strength and character. They are not bad — they are growth engines.', example: 'Moon square Saturn: your emotional needs and need for structure are in ongoing tension — the work is learning to honor both.' },
  { symbol: '△', name: 'Trine (120°)', orb: '8°', energy: 'Flow', color: '#5A8A7A', body: 'The easiest, most harmonious aspect. Planets in trine flow naturally and support each other. Natal trines are gifts and talents that come easily — sometimes so easily they are taken for granted. Transiting trines offer flowing support and opportunities that feel effortless.', example: 'Venus trine Jupiter: beauty, abundance, and love flow naturally. These energies amplify each other with ease.' },
  { symbol: '☍', name: 'Opposition (180°)', orb: '8°', energy: 'Polarity', color: '#C9A96E', body: 'Two planets directly across from each other create awareness through contrast. Oppositions invite integration of two opposite energies rather than choosing one over the other. Full Moons create Sun-Moon oppositions. Natal oppositions often show up as relationship tensions or life polarities that ask for balance.', example: 'Sun opposite Moon: identity and emotion pull in different directions — the work is integration, not choosing a side.' },
]

function ExpandCard({ children }: { children: React.ReactNode }) { return <>{children}</> }

export default function DeepDivesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('planets')
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="min-h-screen">
      <AppLayout>
        <div className="flex items-center gap-3 mb-5 pt-2">
          <Link href="/astrology">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
              <ArrowLeft className="h-4 w-4" style={{ color: 'var(--text-3)' }} />
            </div>
          </Link>
          <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-1)' }}>Deep Dives</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {(['planets','houses','aspects'] as Tab[]).map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); setExpanded(null) }}
              className="px-4 py-2 rounded-full text-xs font-semibold capitalize transition-all"
              style={{
                background: activeTab === tab ? 'var(--violet)' : 'var(--surface)',
                color: activeTab === tab ? '#100C1E' : 'var(--text-3)',
                border: `1px solid ${activeTab === tab ? 'var(--violet)' : 'var(--surface-border)'}`,
              }}>
              {tab}
            </button>
          ))}
        </div>

        {/* Planets */}
        {activeTab === 'planets' && (
          <div className="space-y-2">
            {PLANETS_DATA.map(p => (
              <button key={p.name} onClick={() => setExpanded(expanded === p.name ? null : p.name)}
                className="w-full rounded-[20px] p-4 text-left"
                style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{p.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>{p.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-4)' }}>{p.keyword}</p>
                  </div>
                  {expanded === p.name ? <ChevronDown className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-4)' }} />
                                        : <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-4)' }} />}
                </div>
                {expanded === p.name && (
                  <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--surface-border)' }}>
                    <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-4)' }}>What It Rules</p>
                    <p className="text-xs mb-3" style={{ color: 'var(--violet)' }}>{p.rules}</p>
                    <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-2)' }}>{p.body}</p>
                    <div className="rounded-[14px] p-3" style={{ background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.2)' }}>
                      <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--violet)' }}>In Your Chart</p>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>{p.inYourChart}</p>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Houses */}
        {activeTab === 'houses' && (
          <div className="space-y-2">
            {HOUSES_DATA.map(h => (
              <button key={h.number} onClick={() => setExpanded(expanded === String(h.number) ? null : String(h.number))}
                className="w-full rounded-[20px] p-4 text-left"
                style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(201,169,110,0.15)', border: '1px solid rgba(201,169,110,0.25)' }}>
                    <span className="text-xs font-bold" style={{ color: 'var(--violet)' }}>{h.number}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>{h.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-4)' }}>{h.rules}</p>
                  </div>
                  {expanded === String(h.number)
                    ? <ChevronDown className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-4)' }} />
                    : <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-4)' }} />}
                </div>
                {expanded === String(h.number) && (
                  <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--surface-border)' }}>
                    <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-2)' }}>{h.body}</p>
                    <div className="rounded-[14px] p-3" style={{ background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.2)' }}>
                      <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--violet)' }}>For You</p>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>{h.zoe}</p>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Aspects */}
        {activeTab === 'aspects' && (
          <div className="space-y-2">
            {ASPECTS_DATA.map(a => (
              <button key={a.name} onClick={() => setExpanded(expanded === a.name ? null : a.name)}
                className="w-full rounded-[20px] p-4 text-left"
                style={{ background: 'var(--surface)', border: `1px solid ${expanded === a.name ? a.color + '44' : 'var(--surface-border)'}` }}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold" style={{ color: a.color }}>{a.symbol}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>{a.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ background: a.color + '20', color: a.color }}>{a.energy}</span>
                      <span className="text-xs" style={{ color: 'var(--text-4)' }}>Orb: {a.orb}</span>
                    </div>
                  </div>
                  {expanded === a.name
                    ? <ChevronDown className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-4)' }} />
                    : <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-4)' }} />}
                </div>
                {expanded === a.name && (
                  <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--surface-border)' }}>
                    <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-2)' }}>{a.body}</p>
                    <div className="rounded-[14px] p-3" style={{ background: a.color + '12', border: `1px solid ${a.color}22` }}>
                      <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: a.color }}>Example</p>
                      <p className="text-sm italic" style={{ color: 'var(--text-2)' }}>{a.example}</p>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </AppLayout>
    </div>
  )
}
