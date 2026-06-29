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
  activeIndex?: number
  onChangeIndex?: (i: number) => void
}

export function CategoryPager({ pages, accentColor = '#8B6FB8', activeIndex, onChangeIndex }: Props) {
  const [internalActive, setInternalActive] = useState(0)
  const [animClass, setAnimClass] = useState('')
  const touchX = useRef(0)
  const touchY = useRef(0)
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

  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0].clientX
    touchY.current = e.touches[0].clientY
  }

  function onTouchEnd(e: React.TouchEvent) {
    const dx = touchX.current - e.changedTouches[0].clientX
    const dy = touchY.current - e.changedTouches[0].clientY
    if (Math.abs(dx) < 80) return
    if (Math.abs(dx) < Math.abs(dy) * 2.5) return
    if (dx > 0) goTo(Math.min(active + 1, pages.length - 1))
    else goTo(Math.max(active - 1, 0))
  }

  const accent = accentColor
  const accentFaint = `${accentColor}38`

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <div style={{
        flexShrink: 0,
        background: 'rgba(8,4,26,0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        paddingTop: 10, paddingBottom: 10,
        marginLeft: -24, marginRight: -24,
        paddingLeft: 24, paddingRight: 24,
        marginBottom: 16,
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

      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div
          key={`${active}-${animKey.current}`}
          className={animClass}
          style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden', paddingBottom: 24 }}
        >
          {pages[active]?.content}
        </div>
      </div>

      {pages.length > 1 && (
        <div style={{
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 6,
          paddingTop: 10,
          paddingBottom: 10,
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
