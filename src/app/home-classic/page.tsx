import '../home-fit.css'
import { LunaHomeExperience } from '@/components/home/LunaHomeExperience'

export const dynamic = 'force-dynamic'

// The original swipeable Home dashboard (moon/energy/outfit/money/journal/
// weekly-focus/parked-ideas). Preserved here, unchanged, after `/` was
// redesigned into the nav-only LUNA V2 Home. Linked from the new Home's
// Hero Card ("View Today"). Will eventually be decomposed into the real
// per-room cards this content belongs to (see docs/LUNA_V2_MIGRATION_PLAN.md
// Phase 4), but nothing here has been touched — it's a straight relocation.
export default function HomeClassicPage() {
  return <LunaHomeExperience />
}
