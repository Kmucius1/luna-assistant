'use client'
import { useState, useRef, ReactNode, ComponentType } from 'react'

export interface CPage {
  id: string
  label: string
  content: ReactNode
  noScroll?: boolean
  /** When provided, the tab row renders as icon buttons (like the bottom
   * dock) instead of text pills. */
  icon?: ComponentType<{ className?: string; style?: React.CSSProperties }>
}

interface Props {
  pages: CPage[]
  accentColor?: string
  activeIndex?: number
  onChangeIndex?: (i: number) => void
  hidePills?: boolean
  pageNoScroll?: boolean
}

export function CategoryPager({ pages, accentColor = '#5C4530', activeIndex, onChangeIndex, hidePills, pageNoScroll }: Props) {
  const [internalActive, setInternalActive] = useState(0)
  const [animClass, setAnimClass] = useState('')
  const [animKey, setAnimKey] = useState(0)
  const touchX = useRef(0)
  const touchY = useRef(0)

  const isControlled = activeIndex !== undefined
  const active = isControlled ? activeIndex : internalActive

  function goTo(i: number) {
    if (i === active) return
    const cls = i > active ? 'pager-enter-right' : 'pager-enter-left'
    setAnimKey(k => k + 1)
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
    if (Math.abs(dx) < 60) return
    if (Math.abs(dx) < Math.abs(dy) * 2) return
    // Stop bubbling so SwipeContainer doesn't ALSO fire for the same gesture
    e.stopPropagation()
    if (dx > 0) goTo(Math.min(active + 1, pages.length - 1))
    else goTo(Math.max(active - 1, 0))
  }

  const accent = accentColor
  const accentFaint = `${accentColor}38`

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', touchAction: 'pan-y' }}
    >
      {!hidePills && <div style={{
        flexShrink: 0,
        background: 'rgba(255,255,255,0.75)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(180,150,100,0.15)',
        paddingTop: 10, paddingBottom: 10,
        marginLeft: -24, marginRight: -24,
        paddingLeft: 24, paddingRight: 24,
        marginBottom: 16,
      }}>
        {pages.every(p => p.icon) ? (
          // Icon tabs — same visual language as the bottom dock, not text pills.
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${pages.length}, 1fr)`, gap: 2 }}>
            {pages.map((p, i) => {
              const isActive = active === i
              const Icon = p.icon!
              return (
                <button
                  key={p.id}
                  onClick={() => goTo(i)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 3, padding: '7px 2px', borderRadius: 16, border: 'none', cursor: 'pointer',
                    background: isActive ? accentFaint : 'transparent',
                    boxShadow: isActive ? `0 0 14px ${accentColor}30` : 'none',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <Icon style={{ width: 18, height: 18, color: isActive ? accent : 'rgba(50,40,74,0.35)' }} />
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: isActive ? accent : 'rgba(50,40,74,0.35)', whiteSpace: 'nowrap' }}>
                    {p.label}
                  </span>
                </button>
              )
            })}
          </div>
        ) : (
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
                    border: `1px solid ${isActive ? accent : 'rgba(180,150,100,0.18)'}`,
                    color: isActive ? accent : 'rgba(50,40,74,0.35)',
                    transition: 'all 0.18s ease',
                  }}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        )}
      </div>}

      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0 }}>
        <div
          key={`${active}-${animKey}`}
          className={animClass}
          style={{ height: '100%', overflowY: (pages[active]?.noScroll ?? pageNoScroll) ? 'hidden' : 'auto', overflowX: 'hidden', paddingBottom: (pages[active]?.noScroll ?? pageNoScroll) ? 0 : 24 }}
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
