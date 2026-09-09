'use client'
import type { LucideIcon } from 'lucide-react'

// Extracted from the inline button-choice pattern already used in
// morning/page.tsx, creative/page.tsx, midday/page.tsx, spirit/page.tsx —
// centralized here so new flows don't re-inline it, and rendered in the
// Design Bible's icon style (no emoji labels).

// Backgrounds below are intentionally hardcoded, not theme tokens — this
// chip stays the same pale cream / deep bronze in both light and dark
// mode. Its text must be hardcoded to match for the same reason: a theme
// token that flips to white for dark-mode page text would go invisible
// against a background that never flips.
export function YesNoChoice({ value, onChange, yesLabel = 'Yes', noLabel = 'No' }: {
  value: boolean | null
  onChange: (v: boolean) => void
  yesLabel?: string
  noLabel?: string
}) {
  return (
    <div className="flex gap-3">
      {[true, false].map(v => (
        <button key={String(v)} type="button" onClick={() => onChange(v)}
          className="flex-1 py-4 rounded-2xl font-semibold transition-all"
          style={{
            background: value === v ? '#5C4530' : 'rgba(244,235,212,0.9)',
            color: value === v ? '#FFFFFF' : '#5C4530',
          }}>
          {v ? yesLabel : noLabel}
        </button>
      ))}
    </div>
  )
}

export interface ChoiceOption {
  value: string
  label: string
  desc?: string
  icon?: LucideIcon
}

export function ChoiceGrid({ options, value, onChange, columns = 2 }: {
  options: ChoiceOption[]
  value: string | null
  onChange: (v: string) => void
  columns?: 1 | 2 | 3
}) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {options.map(opt => {
        const Icon = opt.icon
        const active = value === opt.value
        return (
          <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
            className="p-4 rounded-2xl text-left transition-all"
            style={{
              background: active ? '#F4F0FA' : 'rgba(255,255,255,0.6)',
              border: `1.5px solid ${active ? '#5C4530' : 'rgba(180,150,100,0.2)'}`,
              backdropFilter: 'blur(16px)',
            }}>
            {Icon && <Icon className="h-4 w-4 mb-2" style={{ color: active ? '#5C4530' : '#5E5474' }} strokeWidth={1.8} />}
            <p className="text-sm font-semibold mb-0.5" style={{ color: '#100C1E' }}>{opt.label}</p>
            {opt.desc && <p className="text-xs" style={{ color: '#5E5474' }}>{opt.desc}</p>}
          </button>
        )
      })}
    </div>
  )
}
