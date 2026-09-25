// A real, plain-English headline for the "Today's Theme" card on the Astrology
// Today page — built from the actual Moon phase + Moon sign for the day, not
// AI creativity, so it's guaranteed to be accurate to the real sky and to
// change whenever the sky actually does (the Moon changes sign every ~2.5
// days and phase-bucket every ~3.7 days, so the combination is different most
// days). No astrology jargon — an eighth grader should be able to read it.
// Client-safe: no server-only imports, used directly in a client component.

const PHASE_MOOD: Record<string, string> = {
  'New Moon': 'A Fresh Start',
  'Waxing Crescent': 'Building Momentum',
  'First Quarter': 'Push Through Today',
  'Waxing Gibbous': 'Almost There',
  'Full Moon': 'Big Energy Today',
  'Waning Gibbous': 'Share What You Know',
  'Last Quarter': 'Time to Let Something Go',
  'Waning Crescent': 'Rest and Reset',
}

const SIGN_MOOD_WORD: Record<string, string> = {
  Aries: 'Bold', Taurus: 'Grounded', Gemini: 'Curious', Cancer: 'Tender',
  Leo: 'Radiant', Virgo: 'Focused', Libra: 'Balanced', Scorpio: 'Deep',
  Sagittarius: 'Adventurous', Capricorn: 'Determined', Aquarius: 'Independent', Pisces: 'Dreamy',
}

export function buildDailyThemeHeadline(phaseName: string, signName: string): string {
  const phase = PHASE_MOOD[phaseName] ?? 'A Shifting Kind of Day'
  const mood = SIGN_MOOD_WORD[signName]
  return mood ? `${phase}: A ${mood} Day` : phase
}
