'use client'
import { useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const TAB_ROUTES = ['/', '/work', '/luna', '/astrology', '/creative']

interface SwipeContainerProps {
  children: React.ReactNode
  className?: string
}

export function SwipeContainer({ children, className }: SwipeContainerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const tx = useRef(0)
  const ty = useRef(0)

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
    const idx = TAB_ROUTES.findIndex(r => r === '/' ? pathname === '/' : pathname.startsWith(r))
    if (idx === -1) return
    if (dx < 0 && idx < TAB_ROUTES.length - 1) router.push(TAB_ROUTES[idx + 1])
    else if (dx > 0 && idx > 0) router.push(TAB_ROUTES[idx - 1])
  }

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className={className}>
      {children}
    </div>
  )
}
