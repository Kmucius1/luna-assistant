import { redirect } from 'next/navigation'

// /today is the app's real landing experience — see LUNA_V2_MIGRATION_PLAN.md.
// This route intentionally has no competing content of its own.
export default function RootPage() {
  redirect('/today')
}
