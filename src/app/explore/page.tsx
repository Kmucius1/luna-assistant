'use client'
import { useState } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { CategoryPager } from '@/components/ui/CategoryPager'
import { Search, Moon, Briefcase, DollarSign, Heart, Star, Sparkles, Calendar, MessageCircle, Scissors, Home, Zap, BookOpen, Clock, Target, Brain, Mic, Sun } from 'lucide-react'

const G: React.CSSProperties = {
  background: 'rgba(20,12,50,0.68)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 22,
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
}

interface AppDef { label: string; emoji: string; href: string; desc: string; color: string; external?: boolean }

const ALL_APPS: AppDef[] = [
  { label: 'LUNA Chat',       emoji: '💬', href: '/luna',                color: '#C4A9E8', desc: 'Talk to your AI guide'        },
  { label: 'Astrology',       emoji: '🌙', href: '/astrology',           color: '#A890D0', desc: 'Daily horoscope & transits'   },
  { label: 'Tasks',           emoji: '✅', href: '/tasks',               color: '#8AB88A', desc: 'Priorities & task tracking'   },
  { label: 'Calendar',        emoji: '📅', href: '/calendar',            color: '#A8C4DA', desc: 'Events & scheduling'          },
  { label: 'Money',           emoji: '💰', href: '/money/transactions',  color: '#8AB88A', desc: 'Transactions & bills'         },
  { label: 'Email',           emoji: '📬', href: '/email',               color: '#C4A9E8', desc: 'Gmail inbox'                  },
  { label: 'DRYP Hub',        emoji: '🏢', href: '/dryp-hub',            color: '#C9A96E', desc: 'CRM & client outreach'        },
  { label: 'Style Oracle',    emoji: '✂️', href: '/creative',            color: '#D4A8C4', desc: 'Style, mood & aesthetics'     },
  { label: 'Health',          emoji: '🌿', href: '/health',              color: '#8AB88A', desc: 'Body + wellness tracking'     },
  { label: 'Journal',         emoji: '📓', href: '/journal',             color: '#C4A9E8', desc: 'Brain dumps & reflections'    },
  { label: 'Plan My Day',     emoji: '🗓️', href: '/plan-my-day',        color: '#A8C4DA', desc: 'Daily structure with LUNA'    },
  { label: 'Night Mode',      emoji: '🌙', href: '/night',               color: '#A890D0', desc: 'Wind down & tomorrow prep'   },
  { label: 'Relationships',   emoji: '💗', href: '/relationships',        color: '#D4A8C4', desc: 'Love energy & synastry'      },
  { label: 'Manifestation',   emoji: '✨', href: '/manifestation',        color: '#C9A96E', desc: 'Intentions & vision board'  },
  { label: 'Subscriptions',   emoji: '💳', href: '/money/subscriptions',  color: '#A8C4DA', desc: 'Bills & recurring payments'  },
  { label: 'EHM Strategies',  emoji: '🏠', href: 'https://ehmstrategies.com', color: '#C9A96E', desc: 'Mortgage & real estate', external: true },
  { label: 'Dictate',         emoji: '🎙️', href: '/luna?tab=dictate',    color: '#C4A9E8', desc: 'Voice memo to LUNA'         },
  { label: 'Work Overview',   emoji: '💼', href: '/work',                 color: '#A8C4DA', desc: 'Dashboard & projects'       },
  { label: 'Check-in',        emoji: '⚡', href: '/?tab=energy',          color: '#8AB88A', desc: 'Daily energy check-in'      },
  { label: 'DRYP Digital',    emoji: '🎯', href: '/dryp-hub',             color: '#C9A96E', desc: 'Agency work & campaigns'   },
]

const CATEGORIES = [
  { id: 'all',      label: 'All Apps',    apps: ALL_APPS },
  { id: 'guide',    label: 'Guide',       apps: ALL_APPS.filter(a => ['LUNA Chat','Astrology','Plan My Day','Night Mode','Check-in','Journal'].includes(a.label)) },
  { id: 'work',     label: 'Work',        apps: ALL_APPS.filter(a => ['Tasks','Email','Calendar','DRYP Hub','Work Overview','DRYP Digital','EHM Strategies'].includes(a.label)) },
  { id: 'money',    label: 'Money',       apps: ALL_APPS.filter(a => ['Money','Subscriptions','DRYP Hub','EHM Strategies'].includes(a.label)) },
  { id: 'soul',     label: 'Soul',        apps: ALL_APPS.filter(a => ['Astrology','Relationships','Manifestation','Style Oracle','Health'].includes(a.label)) },
]

function AppGrid({ apps }: { apps: AppDef[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
      {apps.map(app => {
        const tile = (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            padding: '12px 4px 10px', borderRadius: 13,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              background: `${app.color}20`,
              border: `1px solid ${app.color}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 19,
            }}>
              {app.emoji}
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 1.2, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {app.label}
            </span>
          </div>
        )
        return app.external ? (
          <a key={app.label} href={app.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            {tile}
          </a>
        ) : (
          <Link key={app.label} href={app.href} style={{ textDecoration: 'none' }}>
            {tile}
          </Link>
        )
      })}
    </div>
  )
}

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ ...G, borderRadius: 18, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', marginBottom: 14 }}>
      <Search style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search apps…"
        style={{ flex: 1, background: 'none', border: 'none', color: 'white', fontSize: 14, outline: 'none' }}
      />
    </div>
  )
}

export default function ExplorePage() {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? ALL_APPS.filter(a =>
        a.label.toLowerCase().includes(query.toLowerCase()) ||
        a.desc.toLowerCase().includes(query.toLowerCase())
      )
    : null

  const pages = CATEGORIES.map(cat => ({
    id: cat.id,
    label: cat.label,
    content: (
      <div style={{ paddingTop: 4, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <SearchBar value={query} onChange={setQuery} />
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <AppGrid apps={filtered ?? cat.apps} />
        </div>
      </div>
    ),
  }))

  return (
    <AppLayout noScroll>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <CategoryPager pages={pages} accentColor="#8B6FB8" hidePills />
      </div>
    </AppLayout>
  )
}
