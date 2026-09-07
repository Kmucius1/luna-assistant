'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// The old 9-step check-in wizard here is superseded by the Weekday
// Planner's condensed morning-routine screens (energy/mood, journal,
// movement) at /plan-my-day — see docs in that page's step flow. Redirect
// rather than delete the route outright, so any existing links/bookmarks
// still land somewhere useful.
export default function MorningRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/plan-my-day') }, [router])
  return null
}
