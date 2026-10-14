'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

interface Nudge { key: string; title: string; body: string; url: string }

// A soft in-app card for the 30-day program: the same message the push
// notification carries, shown when the app is open. Dismissal is remembered per
// message per day so it never nags.
export function ThirtyNudgePopup() {
  const pathname = usePathname()
  const router = useRouter()
  const [nudge, setNudge] = useState<(Nudge & { id: string }) | null>(null)
  const hidden = pathname.startsWith('/auth') || pathname.startsWith('/thirty')

  const check = useCallback(async () => {
    try {
      const r = await fetch('/api/thirty/nudge', { cache: 'no-store' })
      if (!r.ok) return
      const d = await r.json() as { dateKey: string; nudge: Nudge | null }
      if (!d.nudge) return
      const id = `${d.dateKey}:${d.nudge.key}`
      let seen = false
      try { seen = localStorage.getItem('luna-nudge-seen') === id } catch { /* ignore */ }
      if (!seen) setNudge({ ...d.nudge, id })
    } catch { /* offline: stay quiet */ }
  }, [])

  useEffect(() => {
    if (hidden) return
    const first = setTimeout(check, 1500)
    const every = setInterval(check, 10 * 60 * 1000)
    return () => { clearTimeout(first); clearInterval(every) }
  }, [hidden, check])

  const dismiss = () => {
    if (nudge) { try { localStorage.setItem('luna-nudge-seen', nudge.id) } catch { /* ignore */ } }
    setNudge(null)
  }

  if (!nudge || hidden) return null
  return (
    <div
      role="dialog"
      aria-label={nudge.title}
      style={{
        position: 'fixed', left: 12, right: 12, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)', zIndex: 60,
        maxWidth: 520, margin: '0 auto', padding: '16px 18px', borderRadius: 24,
        background: 'var(--surface-strong, rgba(255,255,255,0.96))', border: '1px solid var(--surface-border, rgba(140,107,74,0.16))',
        boxShadow: '0 8px 30px rgba(60,40,20,0.14)', color: 'var(--text-1, #100C1E)',
      }}
    >
      <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-4, #9188A0)', fontWeight: 600 }}>{nudge.title}</div>
      <p style={{ margin: '6px 0 14px', fontSize: 16, lineHeight: 1.4 }}>{nudge.body}</p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => { dismiss(); router.push(nudge.url) }}
          style={{ flex: 1, minHeight: 46, border: 0, borderRadius: 16, background: 'var(--luna-purple, #5C4530)', color: '#fff', fontSize: 15, fontWeight: 600 }}>
          Open my day
        </button>
        <button onClick={dismiss}
          style={{ minHeight: 46, padding: '0 18px', borderRadius: 16, border: '1px solid var(--surface-border, rgba(140,107,74,0.16))', background: 'transparent', color: 'var(--text-2, #32284A)', fontSize: 15 }}>
          Got it
        </button>
      </div>
    </div>
  )
}
