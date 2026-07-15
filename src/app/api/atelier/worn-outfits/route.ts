import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

// Recent outfit-of-the-day photos, newest first — Zoe's real worn-outfit
// history, separate from the AI-suggested daily outfit and the auto-cropped
// garment catalog.
export async function GET() {
  try {
    const db = createAdminClient()
    const { data, error } = await db
      .from('worn_outfits')
      .select('id, date_key, photo_url, created_at')
      .eq('user_id', ZOE_USER_ID)
      .order('created_at', { ascending: false })
      .limit(12)

    if (error) throw error
    return NextResponse.json({ outfits: data ?? [] }, { headers: { 'Cache-Control': 'no-store, must-revalidate' } })
  } catch (err) {
    console.error('[atelier/worn-outfits] GET error:', err)
    return NextResponse.json({ outfits: [] })
  }
}
