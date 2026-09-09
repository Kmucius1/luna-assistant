import { ZOE_KNOWN_LOCATIONS, DEFAULT_MEETING_DRIVE_MINUTES } from './zoeLifestyleProfile'
import type { ClientRosterEntry } from '@/lib/dryp-crm'

export type MeetingLocationType = 'virtual' | 'in_person_office' | 'in_person_client' | 'unclear'

export interface MeetingClassificationInput {
  location?: string
  description?: string
  hangoutLink?: string
  conferenceData?: { entryPoints?: { uri?: string; entryPointType?: string }[] }
  attendeeEmails?: string[]
  title?: string
}

// Best-effort, deterministic classifier — not geolocation. Ambiguous events
// intentionally resolve to 'unclear' rather than a confident-looking guess,
// so the Sunday Weekly Reset UI can surface them for a one-tap confirm.
const VIDEO_LINK_PATTERN = /zoom\.us|meet\.google\.com|teams\.microsoft\.com|webex\.com|whereby\.com/i
const ADDRESS_PATTERN = /\d+\s+\w+.*\b(st|ave|blvd|rd|dr|way|ln|ct|hwy)\b/i
const ZIP_PATTERN = /\b\d{5}\b/

function matchesKnownLocation(text: string): string | null {
  const lower = text.toLowerCase()
  for (const loc of ZOE_KNOWN_LOCATIONS) {
    if (loc.match.some(m => lower.includes(m))) return loc.label
  }
  return null
}

function looksLikePhysicalAddress(text: string): boolean {
  return ADDRESS_PATTERN.test(text) || ZIP_PATTERN.test(text) || matchesKnownLocation(text) !== null
}

export function classifyMeetingLocation(
  event: MeetingClassificationInput,
  clientRoster: ClientRosterEntry[] = [],
): MeetingLocationType {
  // 1. Unambiguous virtual signals.
  if (event.hangoutLink) return 'virtual'
  if (event.conferenceData?.entryPoints?.length) return 'virtual'
  if (event.location && VIDEO_LINK_PATTERN.test(event.location)) return 'virtual'
  if (event.description && VIDEO_LINK_PATTERN.test(event.description)) return 'virtual'

  // 2. Physical-address candidate in location, then description as fallback.
  const physicalText = event.location && looksLikePhysicalAddress(event.location)
    ? event.location
    : event.description && looksLikePhysicalAddress(event.description)
      ? event.description
      : null

  if (physicalText) {
    const knownLabel = matchesKnownLocation(physicalText)
    if (knownLabel === 'DRYP office') return 'in_person_office'
    if (knownLabel === 'home') return 'unclear' // meeting "at home" isn't a real in-person commitment signal

    const attendeeEmails = (event.attendeeEmails ?? []).map(e => e.toLowerCase())
    const isClientMatch = clientRoster.some(r => attendeeEmails.includes(r.email))
    if (isClientMatch) return 'in_person_client'

    return 'in_person_client' // has a real address, not the office — treat as an external/client-type location
  }

  // No video link and nothing that reads like a real address — if there's
  // also no one else on the invite, this was never a meeting to begin with
  // (a solo work block like "BLOGS" or a content task she put on her own
  // calendar), not a real meeting with a genuinely unclear location. Only
  // an event with other attendees but no resolvable location stays
  // 'unclear' and gets surfaced for her to confirm.
  if ((event.attendeeEmails ?? []).length === 0) return 'virtual'

  return 'unclear'
}

export interface TravelBuffer {
  driveMinutes: number
  bufferBeforeMinutes: number
  bufferAfterMinutes: number
  locationLabel: string
}

// Estimated (not live-traffic) drive time and a getting-ready/parking
// buffer around an in-person meeting — the deterministic piece of "drive
// time, traffic, parking, buffer" this app can actually compute without a
// maps integration. Returns null for virtual/unclear events, since there's
// no real travel to buffer around.
export function estimateTravelBuffer(
  event: MeetingClassificationInput,
  clientRoster: ClientRosterEntry[] = [],
): TravelBuffer | null {
  const locationType = classifyMeetingLocation(event, clientRoster)
  if (locationType !== 'in_person_office' && locationType !== 'in_person_client') return null

  const text = event.location || event.description || ''
  const known = ZOE_KNOWN_LOCATIONS.find(loc => loc.match.some(m => text.toLowerCase().includes(m)))
  const driveMinutes = known?.driveMinutes ?? DEFAULT_MEETING_DRIVE_MINUTES
  if (driveMinutes === 0) return null // "meeting at home" — no travel to buffer

  return {
    driveMinutes,
    bufferBeforeMinutes: driveMinutes + 15, // + parking/walk-in time
    bufferAfterMinutes: driveMinutes + 5,   // just the drive back
    locationLabel: known?.label ?? 'the meeting location',
  }
}
