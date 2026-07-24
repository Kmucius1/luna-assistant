import { redirect } from 'next/navigation'

// Rituals now live in the Spiritual room (/spirit), which owns tarot,
// crystals, rituals, and Human Design — kept separate from Astrology per
// request so none of that content gets lost or buried.
export default function RitualsRedirect() {
  redirect('/spirit')
}
