'use client'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import styles from './TilePager.module.css'

const DESKTOP_BREAKPOINT = '(min-width: 1024px)'

function useIsDesktop(query: string): boolean {
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(query)
    setIsDesktop(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return isDesktop
}

export interface TilePagerProps<T> {
  items: T[]
  keyFor: (item: T) => string
  renderItem: (item: T) => React.ReactNode
  /** default 2 — matches Home's mobile room grid */
  mobilePageSize?: number
  /** default 4 — matches Home's desktop room grid */
  desktopPageSize?: number
  desktopBreakpoint?: string
}

export function TilePager<T>({
  items,
  keyFor,
  renderItem,
  mobilePageSize = 2,
  desktopPageSize = 4,
  desktopBreakpoint = DESKTOP_BREAKPOINT,
}: TilePagerProps<T>) {
  const isDesktop = useIsDesktop(desktopBreakpoint)
  const pageSize = isDesktop ? desktopPageSize : mobilePageSize

  const pages = useMemo(() => {
    const chunks: T[][] = []
    for (let i = 0; i < items.length; i += pageSize) chunks.push(items.slice(i, i + pageSize))
    return chunks
  }, [items, pageSize])

  const scrollerRef = useRef<HTMLDivElement>(null)
  const [pageIndex, setPageIndex] = useState(0)

  useEffect(() => {
    setPageIndex(0)
    scrollerRef.current?.scrollTo({ left: 0 })
  }, [pageSize])

  function handleScroll() {
    const el = scrollerRef.current
    if (!el || el.clientWidth === 0) return
    setPageIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  function goToPage(i: number) {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.pager} ref={scrollerRef} onScroll={handleScroll}>
        {pages.map((page, i) => (
          <div key={i} className={styles.page}>
            {page.map(item => (
              <Fragment key={keyFor(item)}>{renderItem(item)}</Fragment>
            ))}
          </div>
        ))}
      </div>

      {pages.length > 1 && (
        <div className={styles.dots}>
          {pages.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`${styles.dot} ${i === pageIndex ? styles.dotActive : ''}`}
              onClick={() => goToPage(i)}
              aria-label={`Page ${i + 1} of ${pages.length}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
