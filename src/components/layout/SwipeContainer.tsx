'use client'
import { useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const TAB_ROUTES = ['/', '/work', '/luna', '/astrology', '/creative', '/explore']

interface SwipeContainerProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  /** Rooms with their own internal sub-nav (Work, Style, Fitness, Food,
      Astrology) pass their own ordered tab hrefs here so a swipe moves
      between THEIR tabs instead of jumping out to the next top-level room. */
  tabs?: string[]
}

export function SwipeContainer({ children, className, style, tabs }: SwipeContainerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const tx = useRef(0)
  const ty = useRef(0)
  const routes = tabs && tabs.length > 0 ? tabs : TAB_ROUTES

  function onTouchStart(e: React.TouchEvent) {
    tx.current = e.touches[0].clientX
    ty.current = e.touches[0].clientY
  }

  function onTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - tx.current
    const dy = e.changedTouches[0].clientY - ty.current
    // Must be a strong horizontal swipe: 120px min, and clearly more horizontal than vertical (3:1 ratio)
    if (Math.abs(dx) < 120) return
    if (Math.abs(dx) < Math.abs(dy) * 3) return
    // Longest matching href wins — a sub-tab list where '/work' is itself a
    // route AND a prefix of '/work/tasks' etc. would otherwise always match
    // '/work' first regardless of which sub-tab is actually active.
    let idx = -1
    let bestLen = -1
    routes.forEach((r, i) => {
      const matches = r === '/' ? pathname === '/' : pathname.startsWith(r)
      if (matches && r.length > bestLen) { idx = i; bestLen = r.length }
    })
    if (idx === -1) return
    if (dx < 0 && idx < routes.length - 1) router.push(routes[idx + 1])
    else if (dx > 0 && idx > 0) router.push(routes[idx - 1])
  }

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className={className}
      style={{ touchAction: 'pan-y', ...style }}
    >
      {children}
    </div>
  )
}
