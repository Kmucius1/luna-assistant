'use client'
import { useState, useRef, ReactNode } from 'react'

export interface CPage {
  id: string
  label: string
  content: ReactNode
}

interface Props {
  pages: CPage[]
  accentColor?: string
  /** controlled mode: external index */
  activeIndex?: number
  onChangeIndex?: (i: number) => void
}

export function CategoryPager({ pages, accentColor = '#8B6FB8', activeIndex, onChangeIndex }: Props) {
  const [internalActive, setInternalActive] = useState(0)
  const [animClass, setAnimClass] = useState('')
  const touchX = useRef(0)
  const animKey = useRef(0)

  const isControlled = activeIndex !== undefined
  const active = isControlled ? activeIndex : internalActive

  function goTo(i: number) {
    if (i === active) return
    const cls = i > active ? 'pager-enter-right' : 'pager-enter-left'
    animKey.current += 1
    setAnimClass(cls)
    if (isControlled) onChangeIndex?.(i)
    else setInternalActive(i)
  }

  const touchY = useRef(0)

  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0].clientX
    touchY.current = e.touches[0].clientY
  }

  function onTouchEnd(e: React.TouchEvent) {
    const dx = touchX.current - e.changedTouches[0].clientX
    const dy = touchY.current - e.changedTouches[0].clientY
    // Require 80px horizontal swipe that is clearly more horizontal than vertical (2.5:1)
    if (Math.abs(dx) < 80) return
    if (Math.abs(dx) < Math.abs(dy) * 2.5) return
    if (dx > 0) goTo(Math.min(active + 1, pages.length - 1))
    else goTo(Math.max(active - 1, 0))
  }

  const accent = accentColor
  const accentFaint = `${accentColor}38`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Tab pills — sticky */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(8,4,26,0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        paddingTop: 10, paddingBottom: 10,
        marginLeft: -24, marginRight: -24,
        paddingLeft: 24, paddingRight: 24,
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {pages.map((p, i) => {
            const isActive = active === i
            return (
              <button
                key={p.id}
                onClick={() => goTo(i)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  flexShrink: 0,
                  background: isActive ? accentFaint : 'transparent',
                  border: `1px solid ${isActive ? accent : 'rgba(255,255,255,0.09)'}`,
                  color: isActive ? '#C4A9E8' : 'rgba(255,255,255,0.38)',
                  transition: 'all 0.18s ease',
                }}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Active page — animates on switch */}
      <div
        key={`${active}-${animKey.current}`}
        className={animClass}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{ flex: 1 }}
      >
        {pages[active]?.content}
      </div>

      {/* Dot indicators */}
      {pages.length > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 6,
          paddingTop: 24,
          paddingBottom: 8,
        }}>
          {pages.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to page ${i + 1}`}
              style={{
                width: i === active ? 22 : 6,
                height: 6,
                borderRadius: 3,
                background: i === active ? accent : 'rgba(255,255,255,0.16)',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.25s ease',
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
