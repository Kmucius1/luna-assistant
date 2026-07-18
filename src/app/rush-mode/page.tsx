'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { Zap, Check, Home } from 'lucide-react'

const STEPS = [
  { id: 1, emoji: '🦷', text: 'Teeth'               },
  { id: 2, emoji: '💧', text: 'Wash face'           },
  { id: 3, emoji: '👗', text: 'Outfit'              },
  { id: 4, emoji: '💇', text: 'Hair — quick fix'    },
  { id: 5, emoji: '🥤', text: 'Drink something'     },
  { id: 6, emoji: '🍌', text: 'Grab food'           },
  { id: 7, emoji: '📅', text: 'Check calendar'      },
  { id: 8, emoji: '⭐', text: 'Name one priority'   },
  { id: 9, emoji: '🚪', text: 'Leave'               },
]

export default function RushModeScreen() {
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [priority, setPriority] = useState('')
  const [saving, setSaving] = useState(false)
  const savedTaskId = useRef<string | null>(null)

  async function savePriority() {
    const title = priority.trim()
    if (!title) return
    setSaving(true)
    try {
      if (savedTaskId.current) {
        await fetch('/api/tasks/update', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: savedTaskId.current, title }),
        })
      } else {
        const res = await fetch('/api/tasks/create', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, status: 'todo', source: 'manual', urgency_level: 'high', priority_score: 90 }),
        })
        const { task } = await res.json()
        if (task?.id) savedTaskId.current = task.id
      }
    } catch { /* non-fatal */ }
    finally { setSaving(false) }
  }

  function toggle(id: number) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const pct = Math.round((checked.size / STEPS.length) * 100)

  return (
    <div style={{ background: 'linear-gradient(160deg, #FDF8F3 0%, #F5EEE0 100%)', minHeight: '100vh' }}>
      <AppLayout noPad className="pt-16">
        <div className="px-6 pb-nav">

          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(201,169,110,0.15)' }}>
              <Zap className="h-5 w-5" style={{ color: 'var(--golden)' }} />
            </div>
            <p className="text-sm font-medium uppercase tracking-wider" style={{ color: 'var(--golden)' }}>Rush Mode</p>
          </div>

          <h1 className="font-display text-3xl font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
            Sacred minimum.
          </h1>
          <p className="text-base mb-6 leading-relaxed" style={{ color: 'var(--text-2)' }}>
            We are not doing the perfect morning. We are doing what matters.
          </p>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex justify-between text-xs mb-2" style={{ color: 'var(--text-3)' }}>
              <span>Progress</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 rounded-full w-full" style={{ background: 'rgba(155,92,255,0.1)' }}>
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--violet), var(--golden))' }}
              />
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-2.5 mb-6">
            {STEPS.map(step => {
              const done = checked.has(step.id)
              return (
                <button
                  key={step.id}
                  onClick={() => toggle(step.id)}
                  className="checklist-item w-full text-left"
                  style={{ opacity: done ? 0.45 : 1 }}
                >
                  <span className="text-xl">{step.emoji}</span>
                  <span className="flex-1 font-medium" style={{
                    color: 'var(--text-1)',
                    textDecoration: done ? 'line-through' : 'none',
                    fontSize: 15,
                  }}>
                    {step.text}
                  </span>
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center transition-all"
                    style={{
                      background: done ? 'var(--golden)' : 'transparent',
                      border: done ? 'none' : '1.5px solid rgba(201,169,110,0.3)',
                    }}
                  >
                    {done && <Check className="h-3.5 w-3.5 text-white" />}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Priority input — saved as a real task on blur, editable after */}
          <div className="glass-card mb-6" style={{ padding: '16px' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--violet)' }}>
                ⭐ One priority today
              </p>
              {saving && <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>saving…</span>}
              {!saving && savedTaskId.current && <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>saved · editable</span>}
            </div>
            <input
              type="text"
              value={priority}
              onChange={e => setPriority(e.target.value)}
              onBlur={savePriority}
              placeholder="What is the one thing that matters most?"
              className="w-full bg-transparent outline-none text-sm"
              style={{ color: 'var(--text-1)' }}
            />
          </div>

          {/* Closing message */}
          <div className="text-center py-4">
            <p className="font-display text-lg font-medium italic mb-2" style={{ color: 'var(--text-2)' }}>
              &ldquo;You are already doing it.&rdquo;
            </p>
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>
              Go. You are ready enough.
            </p>
          </div>

          <Link href="/" className="block">
            <button className="w-full py-4 rounded-2xl font-semibold text-white transition-all active:scale-95 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
              <Home className="h-4 w-4" />
              Return to Home
            </button>
          </Link>

        </div>
      </AppLayout>
    </div>
  )
}
