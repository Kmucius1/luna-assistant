'use client'
import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Moon, Check, ArrowRight } from 'lucide-react'
import Link from 'next/link'

// ─── Locked light-palette card style (bypasses the global .glass-card
// class, which forces white text + dark surfaces under [data-theme="dark"]
// regardless of local CSS var overrides) ──────────────────────────────
const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.6)',
  border: '1px solid rgba(180,150,100,0.18)',
  borderRadius: 20,
  boxShadow: '0 6px 24px rgba(60,46,24,0.08)',
}

const STEPS = [
  { id: 1, text: 'Sit up. Take one breath.',              icon: '🌿' },
  { id: 2, text: 'Drink a full glass of water.',          icon: '💧' },
  { id: 3, text: 'Wash your face.',                       icon: '🌸' },
  { id: 4, text: 'Put on something that feels like you.', icon: '✨' },
  { id: 5, text: 'Eat something small.',                  icon: '🍓' },
  { id: 6, text: 'Check your calendar — just 30 seconds.',icon: '📅' },
  { id: 7, text: 'Choose one priority for today.',        icon: '⭐' },
  { id: 8, text: 'Begin from here.',                      icon: '🌅' },
]

const AFFIRMATIONS = [
  'Nothing is ruined.',
  'The old version of you would spiral. The new version adjusts.',
  'One late morning does not cancel your progress.',
  'We are meeting the day where it is.',
  'You are not behind. You are returning.',
]

export default function LateModeScreen() {
  const [checked, setChecked] = useState<Set<number>>(new Set())

  function toggle(id: number) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const allDone = checked.size === STEPS.length

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, #FBF8F2 0%, #F6F1E7 55%, #F0E9DA 100%)',
        minHeight: '100vh',
        '--violet': '#5C4530',
        '--violet-deep': '#B08D52',
        '--depth': '#100C1E',
        '--mid': '#32284A',
        '--mist': '#5E5474',
        '--surface': 'rgba(255,255,255,0.6)',
        '--surface-border': 'rgba(180,150,100,0.18)',
        '--text-1': '#100C1E',
      } as React.CSSProperties}
    >
      <AppLayout noPad className="pt-16">
        <div className="px-6 pb-nav">

          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(201,169,110,0.15)' }}>
              <Moon className="h-5 w-5" style={{ color: 'var(--violet)' }} />
            </div>
            <p className="text-sm font-medium uppercase tracking-wider" style={{ color: 'var(--violet)' }}>Recovery Mode</p>
          </div>

          <h1 className="font-display text-3xl font-semibold mb-2" style={{ color: '#F5EFE3' }}>
            You are not behind.
          </h1>
          <p className="text-base mb-8 leading-relaxed" style={{ color: 'rgba(245,239,227,0.75)' }}>
            We are recalibrating. Nothing is ruined. We are meeting the day where it is.
          </p>

          {/* Steps */}
          <div className="space-y-3 mb-8">
            {STEPS.map((step) => {
              const done = checked.has(step.id)
              return (
                <button
                  key={step.id}
                  onClick={() => toggle(step.id)}
                  className="checklist-item w-full text-left"
                  style={{ opacity: done ? 0.5 : 1 }}
                >
                  <span className="text-xl flex-shrink-0">{step.icon}</span>
                  <span className="flex-1 text-sm font-medium" style={{ color: 'var(--depth)', textDecoration: done ? 'line-through' : 'none' }}>
                    {step.text}
                  </span>
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                    style={{
                      background: done ? 'var(--violet)' : 'rgba(201,169,110,0.12)',
                      border: done ? 'none' : '1.5px solid rgba(201,169,110,0.25)',
                    }}
                  >
                    {done && <Check className="h-3.5 w-3.5 text-white" />}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Affirmations */}
          <div className="mb-6" style={{ ...CARD, padding: '20px' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--violet)' }}>
              When the spiral tries to start:
            </p>
            {AFFIRMATIONS.map((a, i) => (
              <p key={i} className="text-sm leading-relaxed py-2" style={{
                color: 'var(--mid)',
                borderBottom: i < AFFIRMATIONS.length - 1 ? '1px solid rgba(180,150,100,0.14)' : 'none',
              }}>
                &ldquo;{a}&rdquo;
              </p>
            ))}
          </div>

          {allDone ? (
            <div className="text-center">
              <div className="text-4xl mb-3">🌅</div>
              <h2 className="font-display text-xl font-semibold mb-2" style={{ color: 'var(--depth)' }}>
                You showed up.
              </h2>
              <p className="text-sm mb-5" style={{ color: 'var(--mid)' }}>
                That is enough. Now choose one priority and begin from here.
              </p>
              <Link href="/today">
                <button className="flex items-center gap-2 mx-auto px-6 py-3 rounded-2xl font-semibold text-white transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                  See today&apos;s priorities <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </div>
          ) : (
            <p className="text-center text-sm" style={{ color: 'var(--mist)' }}>
              Work through the list. Start wherever you are.
            </p>
          )}
        </div>
      </AppLayout>
    </div>
  )
}
