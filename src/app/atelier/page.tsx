import { redirect } from 'next/navigation'

// /creative is the canonical Atelier — this page used to be a full
// duplicate of it. Kept as a redirect so old links/bookmarks still land
// somewhere. /atelier/style-board (the onboarding flow) is unaffected.
export default function AtelierPage() {
  redirect('/creative')
}
