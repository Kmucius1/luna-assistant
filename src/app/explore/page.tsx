'use client'
import { useState } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { CategoryPager } from '@/components/ui/CategoryPager'
import { Search } from 'lucide-react'

const G: React.CSSProperties = {
  background: 'var(--luna-panel)',
  border: '1px solid var(--luna-border-soft)',
  borderRadius: 22,
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
}

interface AppDef { label: string; emoji: string; href: string; desc: string; color: string; external?: boolean }

/**
 * Every route in the app that isn't one of the 5 dock destinations
 * (Home/Work/LUNA/Astrology/Explore themselves), organized into the
 * locked 6-slide Explore taxonomy: Daily / Work / LUNA Tools /
 * Astrology+Spirit / Atelier+Style / Settings+Connections.
 * Nothing here is deleted from the app — this is purely a navigation
 * index merging what used to live in ALL_APPS and the orphaned
 * src/app/more/page.tsx taxonomy into one place.
 */
const ALL_APPS: AppDef[] = [
  // ── Daily ──────────────────────────────────────────────────────────
  { label: 'Morning',        emoji: '🌅', href: '/morning',              color: '#C9A96E', desc: 'Morning check-in routine'     },
  { label: 'Plan My Day',    emoji: '🗓️', href: '/plan-my-day',         color: '#A8C4DA', desc: 'Daily structure with LUNA'    },
  { label: 'Midday',         emoji: '☀️', href: '/midday',               color: '#C9A96E', desc: 'Midday check-in'              },
  { label: 'Night Mode',     emoji: '🌙', href: '/night',                color: '#A890D0', desc: 'Wind down & tomorrow prep'   },
  { label: 'Home Reset',     emoji: '😮‍💨', href: '/late-mode',           color: '#8AB88A', desc: 'Running-late recovery reset'  },
  { label: 'Rush Mode',      emoji: '⚡', href: '/rush-mode',            color: '#8AB88A', desc: 'Quick simplified morning'     },
  { label: 'Weekly Reset',   emoji: '🏠', href: '/weekly',               color: '#A8C4DA', desc: 'Home + routines'              },
  { label: 'Lessons',        emoji: '🌱', href: '/lessons',              color: '#8AB88A', desc: 'Weekly lessons tracker'       },
  { label: 'Today',          emoji: '📋', href: '/today',                color: '#A8C4DA', desc: 'Daily priorities snapshot'    },

  // ── Work ───────────────────────────────────────────────────────────
  { label: 'Work Overview',  emoji: '💼', href: '/work',                 color: '#A8C4DA', desc: 'Dashboard & projects'         },
  { label: 'Calendar',       emoji: '📅', href: '/calendar',             color: '#A8C4DA', desc: 'Events & scheduling'          },
  { label: 'Email',          emoji: '📬', href: '/email',                color: '#b98bff', desc: 'Gmail inbox triage'           },
  { label: 'Tasks',          emoji: '✅', href: '/tasks',                color: '#8AB88A', desc: 'Priorities & task tracking'   },
  { label: 'Projects',       emoji: '📁', href: '/projects',             color: '#A8C4DA', desc: 'Project tracker'              },
  { label: 'DRYP Hub',       emoji: '🏢', href: '/dryp-hub',             color: '#C9A96E', desc: 'CRM & client outreach'        },
  { label: 'Career',         emoji: '🧭', href: '/career',               color: '#C9A96E', desc: 'Career path compass'          },
  { label: 'Money',          emoji: '💰', href: '/money',                color: '#8AB88A', desc: 'Track + grow'                 },
  { label: 'Transactions',   emoji: '💳', href: '/money/transactions',   color: '#8AB88A', desc: 'Transactions'                 },
  { label: 'Bills',          emoji: '🧾', href: '/money/bills',          color: '#8AB88A', desc: 'Bill tracker'                 },
  { label: 'Subscriptions',  emoji: '🔁', href: '/money/subscriptions',  color: '#A8C4DA', desc: 'Recurring payments'           },
  { label: 'Business Exp.',  emoji: '📊', href: '/money/business-expenses', color: '#8AB88A', desc: 'Business expense tracker'  },
  { label: 'Money Insights', emoji: '📈', href: '/money/insights',       color: '#8AB88A', desc: 'AI spending insights'         },
  { label: 'Budget Planning',emoji: '🗂️', href: '/money/planning',      color: '#8AB88A', desc: 'Budget planning'              },
  { label: 'EHM Strategies', emoji: '🏠', href: 'https://ehmstrategies.com', color: '#C9A96E', desc: 'Mortgage & real estate', external: true },

  // ── LUNA Tools ─────────────────────────────────────────────────────
  { label: 'LUNA Chat',      emoji: '💬', href: '/luna',                 color: '#b98bff', desc: 'Talk to your AI guide'        },
  { label: 'Dictate',        emoji: '🎙️', href: '/luna?tab=dictate',    color: '#b98bff', desc: 'Voice memo to LUNA'           },
  { label: 'Dictation',      emoji: '🎤', href: '/dictation',            color: '#b98bff', desc: 'Voice dictation → tasks'      },
  { label: 'Brain Dump',     emoji: '🧠', href: '/brain-dump',           color: '#b98bff', desc: 'Clear your mind'              },
  { label: 'Messages',       emoji: '✉️', href: '/messages',             color: '#b98bff', desc: 'Communication coach'          },
  { label: 'Journal',        emoji: '📓', href: '/journal',              color: '#b98bff', desc: 'Brain dumps & reflections'    },
  { label: 'Highest Self',   emoji: '✨', href: '/highest-self',         color: '#b98bff', desc: 'Mirror + patterns'            },
  { label: 'Vault',          emoji: '🗄️', href: '/vault',                color: '#b98bff', desc: 'Parked ideas & projects'     },
  { label: 'Memory',         emoji: '📖', href: '/memory',               color: '#b98bff', desc: 'Past check-ins & patterns'    },
  { label: 'Growth',         emoji: '🌿', href: '/growth',               color: '#8AB88A', desc: 'Pattern & growth analytics'   },
  { label: 'Check-in',       emoji: '⚡', href: '/?tab=energy',          color: '#8AB88A', desc: 'Daily energy check-in'        },

  // ── Astrology + Spirit ─────────────────────────────────────────────
  { label: 'Astrology',      emoji: '🌙', href: '/astrology',            color: '#A890D0', desc: 'Daily horoscope & transits'   },
  { label: 'Daily Read',     emoji: '🔮', href: '/astrology/daily',      color: '#A890D0', desc: 'Daily horoscope'              },
  { label: 'Transits',       emoji: '🪐', href: '/astrology/transits',   color: '#A890D0', desc: 'Active transits + journaling' },
  { label: 'Birth Chart',    emoji: '⭐', href: '/astrology/birth-chart',color: '#A890D0', desc: 'Big 3, planets, houses'       },
  { label: 'Moon',           emoji: '🌕', href: '/astrology/moon',       color: '#A890D0', desc: 'Moon phase detail'            },
  { label: 'Crystals',       emoji: '💎', href: '/astrology/crystals',   color: '#A890D0', desc: 'Crystal recommendations'      },
  { label: 'Rituals',        emoji: '🕯️', href: '/astrology/rituals',   color: '#A890D0', desc: 'Ritual suggestions'           },
  { label: 'Forecasts',      emoji: '📅', href: '/astrology/forecasts', color: '#A890D0', desc: 'Weekly forecast'              },
  { label: 'Deep Dives',     emoji: '🔭', href: '/astrology/deep-dives',color: '#A890D0', desc: 'Big 3 deep dives'             },
  { label: 'Retrogrades',    emoji: '↩️', href: '/astrology/retrogrades',color: '#A890D0', desc: 'Retrograde tracker'          },
  { label: 'Spirit',         emoji: '🔮', href: '/spirit',               color: '#A890D0', desc: 'Tarot · moon · human design'  },
  { label: 'Tarot',          emoji: '🃏', href: '/tarot',                color: '#A890D0', desc: 'Tarot card draw + history'    },
  { label: 'Love',           emoji: '💗', href: '/love',                 color: '#D4A8C4', desc: 'Relationship guidance'        },
  { label: 'Relationships',  emoji: '💜', href: '/relationships',        color: '#D4A8C4', desc: 'People + synastry'            },
  { label: 'Manifestation',  emoji: '✨', href: '/manifestation',        color: '#C9A96E', desc: 'Intentions & vision board'    },
  { label: 'Health',         emoji: '🌿', href: '/health',               color: '#8AB88A', desc: 'Body + wellness tracking'     },

  // ── Atelier + Style ────────────────────────────────────────────────
  { label: 'Atelier',        emoji: '🪡', href: '/creative',             color: '#D4A8C4', desc: 'Style oracle + closet'        },

  // ── Settings + Connections ─────────────────────────────────────────
  { label: 'Settings',       emoji: '⚙️', href: '/settings',             color: '#b98bff', desc: 'Profile + AI preferences'     },
  { label: 'Profile',        emoji: '👤', href: '/profile',              color: '#b98bff', desc: 'Who I Am'                     },
  { label: 'Bank Accounts',  emoji: '🏦', href: '/money/accounts',       color: '#8AB88A', desc: 'Linked bank accounts'         },
  { label: 'Connect a Bank', emoji: '🔗', href: '/money/connect',        color: '#8AB88A', desc: 'Connect Plaid / Stripe'       },
  { label: 'Privacy Policy', emoji: '📜', href: '/privacy',              color: '#b98bff', desc: 'Privacy policy'               },
  { label: 'Terms',          emoji: '📄', href: '/terms',                color: '#b98bff', desc: 'Terms of service'             },
]

const CATEGORIES = [
  { id: 'all',        label: 'All',                apps: ALL_APPS },
  { id: 'daily',      label: 'Daily',              apps: ALL_APPS.filter(a => ['Morning','Plan My Day','Midday','Night Mode','Home Reset','Rush Mode','Weekly Reset','Lessons','Today'].includes(a.label)) },
  { id: 'work',       label: 'Work',               apps: ALL_APPS.filter(a => ['Work Overview','Calendar','Email','Tasks','Projects','DRYP Hub','Career','Money','Transactions','Bills','Subscriptions','Business Exp.','Money Insights','Budget Planning','EHM Strategies'].includes(a.label)) },
  { id: 'luna',       label: 'LUNA Tools',         apps: ALL_APPS.filter(a => ['LUNA Chat','Dictate','Dictation','Brain Dump','Messages','Journal','Highest Self','Vault','Memory','Growth','Check-in'].includes(a.label)) },
  { id: 'astrology',  label: 'Astrology + Spirit',  apps: ALL_APPS.filter(a => ['Astrology','Daily Read','Transits','Birth Chart','Moon','Crystals','Rituals','Forecasts','Deep Dives','Retrogrades','Spirit','Tarot','Love','Relationships','Manifestation','Health'].includes(a.label)) },
  { id: 'atelier',    label: 'Atelier + Style',    apps: ALL_APPS.filter(a => ['Atelier'].includes(a.label)) },
  { id: 'settings',   label: 'Settings',           apps: ALL_APPS.filter(a => ['Settings','Profile','Bank Accounts','Connect a Bank','Privacy Policy','Terms'].includes(a.label)) },
]

function AppGrid({ apps }: { apps: AppDef[] }) {
  return (
    <div className="grid grid-cols-4 lg:grid-cols-6 gap-x-2 gap-y-4">
      {apps.map(app => {
        const tile = (
          <>
            <div
              style={{
                width: 56, height: 56, borderRadius: 18,
                background: `linear-gradient(145deg, ${app.color}2A, rgba(17,12,42,0.65))`,
                border: `1px solid ${app.color}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22,
              }}
            >
              {app.emoji}
            </div>
            <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--luna-muted)', textAlign: 'center', margin: 0, lineHeight: 1.25, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {app.label}
            </p>
          </>
        )
        const wrapperStyle: React.CSSProperties = { textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }
        return app.external ? (
          <a key={app.label} href={app.href} target="_blank" rel="noopener noreferrer" style={wrapperStyle}>
            {tile}
          </a>
        ) : (
          <Link key={app.label} href={app.href} prefetch={false} style={wrapperStyle}>
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
    <AppLayout noScroll wide>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <CategoryPager pages={pages} accentColor="#9b5cff" hidePills />
      </div>
    </AppLayout>
  )
}
