'use client'
import { AppLayout } from '@/components/layout/AppLayout'
import Link from 'next/link'

const CATEGORIES = [
  {
    name: 'Daily Flow',
    items: [
      { href: '/morning',      emoji: '🌅', label: 'Check In',      desc: 'Morning · Midday · Night' },
      { href: '/today',        emoji: '📋', label: 'Today',         desc: 'Daily priorities' },
      { href: '/plan-my-day',  emoji: '🗓', label: 'Plan My Day',   desc: 'Schedule + tasks' },
      { href: '/brain-dump',   emoji: '🧠', label: 'Brain Dump',    desc: 'Clear your mind' },
      { href: '/dictation',    emoji: '🎙', label: 'Dictate',       desc: 'Voice to anything' },
      { href: '/memory',       emoji: '📖', label: 'Memory',        desc: 'Past reflections' },
    ],
  },
  {
    name: 'Work & Business',
    items: [
      { href: '/work',         emoji: '💼', label: 'Work Brief',    desc: 'Tasks + clients' },
      { href: '/tasks',        emoji: '✅', label: 'Tasks',         desc: 'All your tasks' },
      { href: '/calendar',     emoji: '📅', label: 'Calendar',      desc: 'Schedule' },
      { href: '/email',        emoji: '📧', label: 'Email',         desc: 'Inbox analysis' },
      { href: '/messages',     emoji: '💬', label: 'Messages',      desc: 'Communication coach' },
      { href: '/career',       emoji: '🧭', label: 'Career',        desc: 'Path compass' },
    ],
  },
  {
    name: 'Soul & Spirit',
    items: [
      { href: '/spirit',       emoji: '🔮', label: 'Spirit',        desc: 'Moon · Crystals · Chart' },
      { href: '/journal',      emoji: '📓', label: 'Journal',       desc: 'Write freely' },
      { href: '/highest-self', emoji: '✨', label: 'Highest Self',  desc: 'Mirror + patterns' },
      { href: '/lessons',      emoji: '🌱', label: 'Lessons',       desc: 'Weekly tracker' },
      { href: '/relationships',emoji: '💜', label: 'Relationships', desc: 'People + energy' },
    ],
  },
  {
    name: 'Atelier & Style',
    items: [
      { href: '/atelier',      emoji: '🪡', label: 'Atelier',       desc: 'Style oracle + closet' },
    ],
  },
  {
    name: 'Money & Projects',
    items: [
      { href: '/money',        emoji: '💰', label: 'Money',         desc: 'Track + grow' },
      { href: '/vault',        emoji: '🗄', label: 'Vault',         desc: 'Project ideas' },
      { href: '/weekly',       emoji: '🏠', label: 'Weekly Reset',  desc: 'Home + routines' },
    ],
  },
  {
    name: 'Night & Rest',
    items: [
      { href: '/night',        emoji: '🌙', label: 'Night Mode',    desc: 'Protect tomorrow' },
      { href: '/late-mode',    emoji: '😮‍💨', label: 'Recovery',      desc: 'Running late reset' },
      { href: '/rush-mode',    emoji: '⚡', label: 'Rush Mode',     desc: 'Quick morning' },
    ],
  },
  {
    name: 'Settings',
    items: [
      { href: '/settings',     emoji: '⚙️', label: 'Settings',      desc: 'Profile + AI' },
      { href: '/profile',      emoji: '👤', label: 'Profile',       desc: 'Your account' },
      { href: '/dictation',    emoji: '🎤', label: 'Dictation',     desc: 'Voice capture' },
    ],
  },
]

function AppIcon({ href, emoji, label, desc, delay }: { href: string; emoji: string; label: string; desc: string; delay: number }) {
  return (
    <Link href={href}>
      <div
        className="flex flex-col items-center gap-2 p-3 rounded-3xl tap-scale hover-lift"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--surface-border)',
          animation: `cardEntrance 0.35s cubic-bezier(0.4,0,0.2,1) ${delay}s both`,
          cursor: 'pointer',
        }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
          style={{ background: 'var(--surface-strong)' }}>
          {emoji}
        </div>
        <div className="text-center">
          <p className="text-xs font-bold leading-tight" style={{ color: 'var(--text-1)' }}>{label}</p>
          <p className="text-xs mt-0.5 leading-tight" style={{ color: 'var(--text-3)', fontSize: 10 }}>{desc}</p>
        </div>
      </div>
    </Link>
  )
}

export default function MorePage() {
  return (
    <div
      style={{
        '--text-1': '#100C1E',
        '--text-2': '#32284A',
        '--text-3': '#5E5474',
        '--text-4': '#8A8098',
        '--surface': 'rgba(255,255,255,0.6)',
        '--surface-border': 'rgba(180,150,100,0.18)',
        '--surface-strong': 'rgba(255,255,255,0.7)',
        '--app-bg-from': '#FBF8F2',
        '--app-bg-mid': '#F6F1E7',
        '--app-bg-to': '#F0E9DA',
      } as React.CSSProperties}
    >
      <AppLayout>
        <div className="pt-5 pb-4">
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-1)' }}>All Features</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>Everything LUNA can do for you.</p>

          <div className="space-y-8">
            {CATEGORIES.map((cat) => (
              <div key={cat.name}>
                <p className="text-xs font-bold uppercase tracking-widest mb-3"
                  style={{ color: 'var(--text-4)' }}>{cat.name}</p>
                <div className="grid grid-cols-3 gap-3">
                  {cat.items.map((item, i) => (
                    <AppIcon key={item.href} {...item} delay={i * 0.04} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    </div>
  )
}
