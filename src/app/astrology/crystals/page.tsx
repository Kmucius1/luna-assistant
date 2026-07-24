import { redirect } from 'next/navigation'

// Crystals now live in the Spiritual room (/spirit), which owns tarot,
// crystals, rituals, and Human Design — kept separate from Astrology per
// request so none of that content gets lost or buried.
export default function CrystalsRedirect() {
  redirect('/spirit')
}
