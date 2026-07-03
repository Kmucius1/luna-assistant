'use client'
import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Save, Check, Plus, X, ChevronDown, ChevronUp } from 'lucide-react'

const PROFILE_KEY = 'luna_zoe_profile_v2'

export interface ZoeProfile {
  // Communication
  communication_style: string
  triggers: string[]
  dysregulators: string[]
  grounding_tools: string[]
  rules: string[]

  // Values & Identity
  values: string[]
  boundaries: string[]
  relationship_patterns: string[]

  // Relationships
  relationships: Array<{ name: string; context: string }>

  // Goals
  goals: Array<{ title: string; timeframe: string; why: string }>

  // Routines
  morning_routine: string[]
  night_routine: string[]

  // Notes
  astrology_notes: string
  human_design_notes: string
  custom_context: string
}

const DEFAULT_PROFILE: ZoeProfile = {
  communication_style: 'I communicate best when I am calm, clear, and grounded. I can over-explain when hurt. I need space before responding to emotionally loaded messages. I prefer directness that is still warm.',
  triggers: [
    'Being dismissed or not acknowledged',
    'Last-minute changes without warning',
    'Someone pushing past a boundary I set',
    'Feeling like I have to over-explain myself',
    'Being compared to others',
    'Feeling unseen in my work or effort',
    'Over-commitment when I am already depleted',
  ],
  dysregulators: [
    'Loud chaotic environments when I am already overwhelmed',
    'Checking my phone first thing in the morning',
    'Skipping food or water for too long',
    'Multitasking when I am emotionally activated',
    'Having unfinished conversations sitting in my head',
    'Working without a clear stopping point',
  ],
  grounding_tools: [
    'Step outside or open a window',
    'Drink cold water slowly',
    'Put on music that matches or shifts my mood',
    'Dictate what I am feeling in LUNA before responding',
    'Wash my hands or face',
    'Say the feeling out loud: "I am feeling ___."',
    'Text or call someone safe',
  ],
  rules: [
    'Do not send messages while emotional.',
    'Wait 20 minutes before responding to anything that hurt me.',
    'Avoid over-explaining.',
    'Ask clarifying questions before assuming.',
    'Do not respond from fear.',
    'Respond with intention, not urgency.',
    'I do not owe anyone an instant reply.',
    'Protect my peace before I protect the relationship.',
  ],
  values: [
    'Authenticity — I will not pretend to be okay when I am not',
    'Creative freedom — my work must have space for my full expression',
    'Emotional safety — in relationships, in spaces, in my own body',
    'Excellence — I hold a high standard for my work and my word',
    'Financial sovereignty — no one owns my peace or my decisions',
    'Spiritual alignment — I live and work in connection with my deeper knowing',
  ],
  boundaries: [
    'I do not accept disrespect in any relationship — professional or personal',
    'I will not overextend for clients who do not respect my time',
    'I do not explain or justify my boundaries to people who will not honor them',
    'I will not respond to work messages after 9 PM',
    'I say no to things that drain me without meaningful return',
    'I protect my creative time — it is not negotiable',
  ],
  relationship_patterns: [
    'I tend to over-give before setting limits, then feel resentment',
    'I can go silent when hurt instead of speaking directly',
    'I sometimes assume people know what I need without telling them',
    'I give people more chances than they have earned',
    'I can shrink myself to keep the peace — Libra Mars seeking balance',
    'When I feel secure, I am one of the most generous people in a relationship',
  ],
  relationships: [],
  goals: [
    { title: 'Reach 144 clients across my business portfolio', timeframe: 'Long-term', why: 'Financial sovereignty and proof of concept' },
    { title: 'Build a consistent $10K/month revenue base', timeframe: '12 months', why: 'Peace of mind and freedom to choose projects I love' },
    { title: 'Launch Nurturly', timeframe: '6 months', why: 'My most personal and impactful brand' },
    { title: 'Complete my USF degree', timeframe: 'Ongoing', why: 'For me — not for anyone else' },
  ],
  morning_routine: [
    'Do not check phone for first 20 minutes',
    'Drink a full glass of water',
    'Gratitude — 3 things before getting up',
    'Open LUNA — check morning brief',
    'Affirmation out loud',
    'Wash face / skincare',
    'Eat something before work',
    'Set my one priority for the day',
  ],
  night_routine: [
    'Stop working by 9:30 PM — or earlier',
    'Skin care routine',
    'No new input (news, social, messages) after 10 PM',
    'Journal or dictate in LUNA',
    'Check tomorrow\'s calendar',
    'Lay out clothes if going out',
    'Gratitude — end on something good',
    'Breathe before sleep — in for 4, hold for 4, out for 6',
  ],
  astrology_notes: 'Scorpio Sun & Mercury (deep, strategic, investigative). Cancer Moon & North Node (emotional foundation is everything). Gemini Rising (quick, verbal, idea-forward). Virgo Midheaven (career through systems and service). Venus Sag (freedom, beauty, meaning). Mars Libra (act from balance, not reaction). Saturn Taurus (slow money, self-worth work).',
  human_design_notes: 'Self-Projected Projector, 4/6. Authority is in my voice — I hear my truth when I speak it out loud. Wait for recognition before giving big energy. Bitterness = I am forcing. Success = being seen and invited. Role model through lived experience.',
  custom_context: '',
}

export function loadProfile(): ZoeProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : DEFAULT_PROFILE
  } catch { return DEFAULT_PROFILE }
}

function saveProfile(profile: ZoeProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

// ─── Reusable components ──────────────────────────────────────
function SectionHeader({ title, icon, color = 'var(--violet)' }: { title: string; icon: string; color?: string }) {
  return (
    <div className="flex items-center gap-2 mt-6 mb-3">
      <span className="text-base">{icon}</span>
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>{title}</p>
    </div>
  )
}

function TagEditor({ items, onChange, placeholder, color = 'var(--violet)', bg = 'rgba(155,92,255,0.08)' }:
  { items: string[]; onChange: (items: string[]) => void; placeholder: string; color?: string; bg?: string }) {
  const [input, setInput] = useState('')
  function add() {
    if (!input.trim()) return
    onChange([...items, input.trim()])
    setInput('')
  }
  return (
    <div className="glass-card p-4">
      <div className="flex flex-wrap gap-2 mb-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: bg, color: 'var(--depth)' }}>
            <span>{item}</span>
            <button onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="ml-1" style={{ color: 'var(--mist)' }}>
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add() }}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
          style={{ background: 'rgba(155,92,255,0.05)', color: 'var(--depth)', border: '1px solid rgba(155,92,255,0.1)' }} />
        <button onClick={add}
          className="px-3 py-2 rounded-xl" style={{ background: bg, color }}>
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function Collapsible({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-1 mb-1">
        <span className="text-sm font-semibold" style={{ color: 'var(--depth)' }}>{title}</span>
        {open ? <ChevronUp className="h-4 w-4" style={{ color: 'var(--mist)' }} /> : <ChevronDown className="h-4 w-4" style={{ color: 'var(--mist)' }} />}
      </button>
      {open && <div className="pb-2">{children}</div>}
    </div>
  )
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ZoeProfile>(DEFAULT_PROFILE)
  const [saved, setSaved]     = useState(false)
  const [newGoalTitle, setNewGoalTitle]   = useState('')
  const [newGoalWhen, setNewGoalWhen]     = useState('')
  const [newGoalWhy, setNewGoalWhy]       = useState('')
  const [newRelName, setNewRelName]       = useState('')
  const [newRelCtx, setNewRelCtx]         = useState('')

  useEffect(() => { setProfile(loadProfile()) }, [])

  function save() {
    saveProfile(profile)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function set<K extends keyof ZoeProfile>(key: K, val: ZoeProfile[K]) {
    setProfile(p => ({ ...p, [key]: val }))
  }

  function addGoal() {
    if (!newGoalTitle.trim()) return
    set('goals', [...profile.goals, { title: newGoalTitle.trim(), timeframe: newGoalWhen.trim() || 'Ongoing', why: newGoalWhy.trim() }])
    setNewGoalTitle(''); setNewGoalWhen(''); setNewGoalWhy('')
  }

  function addRelationship() {
    if (!newRelName.trim()) return
    set('relationships', [...profile.relationships, { name: newRelName.trim(), context: newRelCtx.trim() }])
    setNewRelName(''); setNewRelCtx('')
  }

  return (
    <div className="bg-sanctuary min-h-screen">
      <AppLayout noPad className="pt-16">
        <div className="px-6 pb-nav">

          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-medium uppercase tracking-wider" style={{ color: 'var(--violet)' }}>Living Profile</p>
              <h1 className="font-display text-2xl font-semibold mt-0.5" style={{ color: 'var(--depth)' }}>Who I Am</h1>
            </div>
            <button onClick={save}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: saved ? 'rgba(90,138,90,0.1)' : 'var(--violet)', color: saved ? '#5A8A5A' : 'white' }}>
              {saved ? <><Check className="h-4 w-4" /> Saved</> : <><Save className="h-4 w-4" /> Save</>}
            </button>
          </div>

          <p className="text-sm mb-6" style={{ color: 'var(--mid)' }}>
            LUNA reads this before every response. The more you add, the more she knows you.
          </p>

          {/* Fixed design block */}
          <div className="soul-card p-4 mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>My Design (fixed)</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--depth)' }}>Self-Projected Projector · 4/6 Profile</p>
            <p className="text-xs mt-1" style={{ color: 'var(--mid)' }}>Scorpio Sun · Cancer Moon · Gemini Rising · Virgo Midheaven</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--mid)' }}>Venus Sagittarius · Mars Libra · Saturn Taurus · North Node Cancer</p>
          </div>

          {/* ── COMMUNICATION ── */}
          <SectionHeader title="How I Communicate" icon="💬" />
          <Collapsible title="Communication style" defaultOpen>
            <div className="glass-card p-4">
              <textarea value={profile.communication_style}
                onChange={e => set('communication_style', e.target.value)}
                rows={3} placeholder="How do you communicate when calm? When hurt?"
                className="w-full bg-transparent outline-none text-sm resize-none" style={{ color: 'var(--depth)' }} />
            </div>
          </Collapsible>

          <SectionHeader title="My Rules" icon="📋" color="var(--golden)" />
          <TagEditor items={profile.rules} onChange={v => set('rules', v)}
            placeholder="Add a communication rule..." color="var(--golden)" bg="rgba(201,169,110,0.1)" />

          {/* ── EMOTIONAL ── */}
          <SectionHeader title="My Triggers" icon="⚡" color="#C87B7B" />
          <p className="text-xs mb-2" style={{ color: 'var(--mist)' }}>Things that hurt, activate, or wound you. LUNA watches for these in messages.</p>
          <TagEditor items={profile.triggers} onChange={v => set('triggers', v)}
            placeholder="Add a trigger..." color="#C87B7B" bg="rgba(200,123,123,0.1)" />

          <SectionHeader title="What Dysregulates Me" icon="🌀" color="#9E95AC" />
          <p className="text-xs mb-2" style={{ color: 'var(--mist)' }}>Distinct from triggers — these are environmental or behavioral states that pull you offline.</p>
          <TagEditor items={profile.dysregulators} onChange={v => set('dysregulators', v)}
            placeholder="Add a dysregulator..." color="#9E95AC" bg="rgba(158,149,172,0.1)" />

          <SectionHeader title="What Grounds Me" icon="🌿" color="#5A8A5A" />
          <TagEditor items={profile.grounding_tools} onChange={v => set('grounding_tools', v)}
            placeholder="Add a grounding tool..." color="#5A8A5A" bg="rgba(90,138,90,0.1)" />

          {/* ── VALUES & IDENTITY ── */}
          <SectionHeader title="My Values" icon="💜" />
          <p className="text-xs mb-2" style={{ color: 'var(--mist)' }}>What you stand for and will not compromise. LUNA uses this to detect misalignment.</p>
          <TagEditor items={profile.values} onChange={v => set('values', v)}
            placeholder="Add a value..." />

          <SectionHeader title="My Boundaries" icon="🛡" color="#4A7FB8" />
          <p className="text-xs mb-2" style={{ color: 'var(--mist)' }}>Things you will no longer accept or tolerate.</p>
          <TagEditor items={profile.boundaries} onChange={v => set('boundaries', v)}
            placeholder="Add a boundary..." color="#4A7FB8" bg="rgba(74,127,184,0.1)" />

          <SectionHeader title="Relationship Patterns" icon="🔄" color="#C9A96E" />
          <p className="text-xs mb-2" style={{ color: 'var(--mist)' }}>Patterns you repeat. LUNA will gently flag them when she sees them.</p>
          <TagEditor items={profile.relationship_patterns} onChange={v => set('relationship_patterns', v)}
            placeholder="Add a pattern..." color="var(--golden)" bg="rgba(201,169,110,0.1)" />

          {/* ── KEY RELATIONSHIPS ── */}
          <SectionHeader title="Key Relationships" icon="👥" />
          <div className="glass-card p-4 space-y-3">
            {profile.relationships.map((r, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="flex-1">
                  <p className="text-xs font-semibold" style={{ color: 'var(--depth)' }}>{r.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--mist)' }}>{r.context}</p>
                </div>
                <button onClick={() => set('relationships', profile.relationships.filter((_, idx) => idx !== i))}
                  style={{ color: 'var(--faint)' }}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <div className="pt-2 border-t" style={{ borderColor: 'rgba(155,92,255,0.08)' }}>
              <input value={newRelName} onChange={e => setNewRelName(e.target.value)}
                placeholder="Name (e.g. Kaleb, Mom, Client A)"
                className="w-full bg-transparent outline-none text-xs mb-2 pb-1.5"
                style={{ color: 'var(--depth)', borderBottom: '1px solid rgba(155,92,255,0.1)' }} />
              <input value={newRelCtx} onChange={e => setNewRelCtx(e.target.value)}
                placeholder="Context (relationship type, dynamics, anything LUNA should know)"
                className="w-full bg-transparent outline-none text-xs mb-3"
                style={{ color: 'var(--depth)' }} />
              <button onClick={addRelationship}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl"
                style={{ background: 'rgba(155,92,255,0.1)', color: 'var(--violet)' }}>
                <Plus className="inline h-3 w-3 mr-1" />Add person
              </button>
            </div>
          </div>

          {/* ── GOALS ── */}
          <SectionHeader title="My Goals" icon="🎯" color="#5A8A5A" />
          <div className="space-y-2 mb-3">
            {profile.goals.map((g, i) => (
              <div key={i} className="glass-card p-4 flex gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--depth)' }}>{g.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgba(90,138,90,0.1)', color: '#5A8A5A' }}>{g.timeframe}</span>
                    {g.why && <p className="text-xs italic" style={{ color: 'var(--mist)' }}>{g.why}</p>}
                  </div>
                </div>
                <button onClick={() => set('goals', profile.goals.filter((_, idx) => idx !== i))}
                  style={{ color: 'var(--faint)' }}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="glass-card p-4">
            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--mist)' }}>Add a goal</p>
            <input value={newGoalTitle} onChange={e => setNewGoalTitle(e.target.value)}
              placeholder="Goal title"
              className="w-full bg-transparent outline-none text-xs mb-2 pb-1.5"
              style={{ color: 'var(--depth)', borderBottom: '1px solid rgba(155,92,255,0.08)' }} />
            <input value={newGoalWhen} onChange={e => setNewGoalWhen(e.target.value)}
              placeholder="Timeframe (e.g. 6 months, Long-term)"
              className="w-full bg-transparent outline-none text-xs mb-2 pb-1.5"
              style={{ color: 'var(--depth)', borderBottom: '1px solid rgba(155,92,255,0.08)' }} />
            <input value={newGoalWhy} onChange={e => setNewGoalWhy(e.target.value)}
              placeholder="Why this matters to me..."
              className="w-full bg-transparent outline-none text-xs mb-3"
              style={{ color: 'var(--depth)' }} />
            <button onClick={addGoal}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl"
              style={{ background: 'rgba(90,138,90,0.1)', color: '#5A8A5A' }}>
              <Plus className="inline h-3 w-3 mr-1" />Add goal
            </button>
          </div>

          {/* ── ROUTINES ── */}
          <SectionHeader title="My Morning Routine" icon="☀️" color="var(--golden)" />
          <TagEditor items={profile.morning_routine} onChange={v => set('morning_routine', v)}
            placeholder="Add a morning step..." color="var(--golden)" bg="rgba(201,169,110,0.1)" />

          <SectionHeader title="My Night Routine" icon="🌙" color="#6B5DB8" />
          <TagEditor items={profile.night_routine} onChange={v => set('night_routine', v)}
            placeholder="Add a night step..." color="#6B5DB8" bg="rgba(107,93,184,0.1)" />

          {/* ── SPIRITUAL ── */}
          <SectionHeader title="My Astrology" icon="⭐" />
          <div className="glass-card p-4 mb-3">
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--mist)' }}>
              Notes on your chart — what feels most alive or relevant
            </p>
            <textarea value={profile.astrology_notes}
              onChange={e => set('astrology_notes', e.target.value)}
              rows={3} className="w-full bg-transparent outline-none text-sm resize-none"
              style={{ color: 'var(--depth)' }} />
          </div>

          <SectionHeader title="My Human Design" icon="💜" />
          <div className="glass-card p-4 mb-3">
            <textarea value={profile.human_design_notes}
              onChange={e => set('human_design_notes', e.target.value)}
              rows={3} className="w-full bg-transparent outline-none text-sm resize-none"
              style={{ color: 'var(--depth)' }} />
          </div>

          {/* ── EXTRA ── */}
          <SectionHeader title="Anything Else" icon="✏️" color="var(--mist)" />
          <div className="glass-card p-4 mb-6">
            <textarea value={profile.custom_context}
              onChange={e => set('custom_context', e.target.value)}
              rows={3} placeholder="Anything LUNA should know that does not fit above..."
              className="w-full bg-transparent outline-none text-sm resize-none"
              style={{ color: 'var(--depth)' }} />
          </div>

          <button onClick={save}
            className="w-full py-4 rounded-2xl font-semibold text-white transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
            {saved ? '✓ Profile Saved' : 'Save my profile'}
          </button>

          <p className="text-center text-xs mt-6 pb-4 font-display italic" style={{ color: 'var(--faint)' }}>
            &ldquo;The more LUNA knows you, the more clearly she can protect and guide you.&rdquo;
          </p>

        </div>
      </AppLayout>
    </div>
  )
}
