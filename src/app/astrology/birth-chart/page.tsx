import { redirect } from 'next/navigation'

// This page used to be a fully hardcoded/fabricated chart mockup. It's been
// replaced by /astrology/chart, which computes real placements from
// src/data/astrology/natal-zoe.json via lib/astrology.ts — redirecting
// rather than deleting so no old link 404s.
export default function BirthChartRedirect() {
  redirect('/astrology/chart')
}
