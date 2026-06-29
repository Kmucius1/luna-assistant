'use client'
import { useState } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { CategoryPager } from '@/components/ui/CategoryPager'
import { Search, Moon, Briefcase, DollarSign, Heart, Star, Sparkles, Calendar, MessageCircle, Scissors, Home, Zap, BookOpen, Clock, Target, Brain, Mic, Sun } from 'lucide-react'

const GLASS: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 22,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
}

interface AppDef { label: string; emoji: string; href: string; desc: string; color: string }

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
  { label: 'Subscriptions',   emoji: '💳', href: '/subscriptions',        color: '#A8C4DA', desc: 'Bills & recurring payments'  },
  { label: 'EHM Strategies',  emoji: '🏠', href: '/ehm',                  color: '#C9A96E', desc: 'Mortgage & real estate'     },
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
      {apps.map(app => (
        <Link key={app.label} href={app.href} style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 2px' }}>
            <div style={{
              width: 46, height: 46, borderRadius: 14, flexShrink: 0,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.09)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
            }}>
              {app.emoji}
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 1.2, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {app.label}
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ ...GLASS, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 14 }}>
      <Search style={{ width: 15, height: 15, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
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
        <CategoryPager pages={pages} accentColor="#8B6FB8" />
      </div>
    </AppLayout>
  )
}
