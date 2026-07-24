import { redirect } from 'next/navigation'

// This used to be a WorkspaceLauncher hub with several dead links
// (/astrology/love, /astrology/calendar never existed; /astrology/chart
// didn't exist until this rebuild). The dock now points straight at
// /astrology (the real Today screen with its own 5-tab nav), so this page
// just redirects rather than staying as a second, inconsistent front door.
export default function AstrologyHomeRedirect() {
  redirect('/astrology')
}
