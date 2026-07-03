/**
 * LunaSwipePager / LunaPageDots — the required names for the app's
 * swipe-page-with-dots primitive.
 *
 * This is an alias, not a rewrite: CategoryPager (src/components/ui/CategoryPager.tsx)
 * already has proven, working swipe/touch/controlled-index logic used by 6 hub
 * pages (Home, luna, explore, work, creative, astrology). Re-implementing that
 * logic here would risk regressing all 6. Instead we re-export it under the
 * locked name, and its inline colors already read the CategoryPager's own
 * `accentColor` prop — pass `accentColor="var(--luna-purple)"`-equivalent hex
 * (`#9b5cff`) from call sites going forward to pick up the locked palette.
 */
export { CategoryPager as LunaSwipePager, CategoryPager as LunaPageDots } from '@/components/ui/CategoryPager'
export type { CPage } from '@/components/ui/CategoryPager'
