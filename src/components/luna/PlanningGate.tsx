'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import styles from './PlanningGate.module.css'

const WEEKLY_PATH = '/weekly'
const DAILY_PATH = '/plan-my-day'

/**
 * Forces the Weekly Reset, then the day's Plan My Day, before anything else
 * in the app is reachable — on every fresh load/refresh and on every
 * navigation, not just Home. Once each check resolves true it's cached for
 * the rest of this session (no re-fetching a page she's already cleared);
 * while either is still false, every pathname change re-checks it, so
 * finishing the wizard unblocks the rest of the app the moment she leaves it.
 */
export function PlanningGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [weeklyDone, setWeeklyDone] = useState<boolean | null>(null)
  const [dailyDone, setDailyDone] = useState<boolean | null>(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false

    async function check() {
      let weekly = weeklyDone
      if (weekly !== true) {
        try {
          const res = await fetch('/api/luna/weekly-reset/status', { cache: 'no-store' })
          const data = await res.json()
          weekly = data.completedThisWeek !== false
        } catch {
          weekly = true // fail open — never brick the app on a transient error
        }
        if (cancelledRef.current) return
        setWeeklyDone(weekly)
      }

      if (!weekly) {
        if (pathname !== WEEKLY_PATH) router.replace(WEEKLY_PATH)
        return
      }

      let daily = dailyDone
      if (daily !== true) {
        try {
          const res = await fetch('/api/luna/plan-my-day/status', { cache: 'no-store' })
          const data = await res.json()
          daily = data.completedToday !== false
        } catch {
          daily = true
        }
        if (cancelledRef.current) return
        setDailyDone(daily)
      }

      if (!daily && pathname !== DAILY_PATH && pathname !== WEEKLY_PATH) {
        router.replace(DAILY_PATH)
      }
    }

    check()
    return () => { cancelledRef.current = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const isWeeklyPage = pathname === WEEKLY_PATH
  const isDailyPage = pathname === DAILY_PATH

  const blocked =
    weeklyDone === null ||
    (weeklyDone === false && !isWeeklyPage) ||
    (weeklyDone === true && dailyDone === null && !isWeeklyPage) ||
    (weeklyDone === true && dailyDone === false && !isDailyPage && !isWeeklyPage)

  if (blocked) {
    return (
      <div className={styles.screen}>
        <span className={styles.mark}>LUNA</span>
        <span className={styles.spinner} />
        <p className={styles.message}>
          {weeklyDone === false ? "Taking you to this week's plan…" : dailyDone === false ? "Taking you to today's plan…" : 'One moment…'}
        </p>
      </div>
    )
  }

  return <>{children}</>
}
