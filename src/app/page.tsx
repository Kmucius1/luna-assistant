import { redirect } from 'next/navigation'

// /home (the 12-room grid) is the app's real landing experience, matching
// the bottom nav's Home tab. /today is a room reached from there, not a
// competing top-level destination — see LUNA_V2_MIGRATION_PLAN.md.
export default function RootPage() {
  redirect('/home')
}
