import type { MeetingLocationType } from './meetingLocation'

export type OutfitOccasion = 'gym' | 'casual_work' | 'office' | 'client_meeting' | 'presentation_pitch' | 'social_after_work'

// Minutes budgeted for getting ready — generalizes the hairWashDay +20/+5
// pattern already used in plan-my-day/route.ts to a full occasion taxonomy.
// Meeting-type days get real prep time (makeup, hair, jewelry, outfit);
// WFH-only days don't.
export const OCCASION_PREP_MINUTES: Record<OutfitOccasion, number> = {
  gym: 0,
  casual_work: 10,
  office: 20,
  client_meeting: 35,
  presentation_pitch: 45,
  social_after_work: 25,
}

export const OCCASION_LABEL: Record<OutfitOccasion, string> = {
  gym: 'Gym',
  casual_work: 'Casual work',
  office: 'Office',
  client_meeting: 'Client meeting',
  presentation_pitch: 'Presentation / pitch',
  social_after_work: 'Social after work',
}

const PITCH_KEYWORDS = /\b(pitch|presentation|demo)\b/i
const SOCIAL_KEYWORDS = /\b(dinner|drinks|party|social|date night|birthday|celebration)\b/i

interface OccasionInput {
  title: string
  locationType: MeetingLocationType
  attendeeEmails?: string[]
}

/**
 * Derives today's outfit occasion from already-classified calendar events —
 * no second classification pass, just a priority-ordered read of what
 * classifyMeetingLocation already produced for the day-rank step.
 */
export function deriveOutfitOccasion(params: {
  events: OccasionInput[]
  workLocationDefault: 'home' | 'office'
  isSaturdayWithNothingScheduled: boolean
  eveningPlansText?: string
  clientEmails?: Set<string>
}): { occasion: OutfitOccasion; eveningAddOn: boolean } {
  const { events, workLocationDefault, isSaturdayWithNothingScheduled, eveningPlansText, clientEmails } = params

  const eveningAddOn = !!eveningPlansText && SOCIAL_KEYWORDS.test(eveningPlansText)

  if (isSaturdayWithNothingScheduled) {
    return { occasion: 'casual_work', eveningAddOn }
  }

  if (events.some(e => PITCH_KEYWORDS.test(e.title))) {
    return { occasion: 'presentation_pitch', eveningAddOn }
  }
  if (events.some(e => e.locationType === 'in_person_client')) {
    return { occasion: 'client_meeting', eveningAddOn }
  }
  if (events.some(e => e.locationType === 'in_person_office')) {
    return { occasion: 'office', eveningAddOn }
  }
  const hasExternalVirtual = events.some(e =>
    e.locationType === 'virtual' && clientEmails && (e.attendeeEmails ?? []).some(email => clientEmails.has(email.toLowerCase()))
  )
  if (hasExternalVirtual) {
    return { occasion: 'casual_work', eveningAddOn }
  }
  if (events.length === 0 && workLocationDefault === 'office') {
    return { occasion: 'office', eveningAddOn }
  }
  return { occasion: 'casual_work', eveningAddOn }
}
