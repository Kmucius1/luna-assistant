import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DESTINATIONS } from '@/lib/travel/destinations'
import { scoreDestination } from '@/lib/travel/matchScore'
import { getAstrocartographyLines, findNearbyAstroLines, ZOE_BIRTH_DATE } from '@/lib/astrology'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const useAstrology = searchParams.get('astrology') === '1'
    const filter = searchParams.get('filter')

    const { data: profile } = await supabase.from('travel_profiles').select('*').eq('user_id', user.id).maybeSingle()
    const astroLines = useAstrology ? getAstrocartographyLines(ZOE_BIRTH_DATE) : null

    let candidates = DESTINATIONS
    if (filter && filter !== 'all') {
      candidates = DESTINATIONS.filter(d => d.vibe_tags.includes(filter) || d.budget_tier === filter)
    }

    const scored = candidates.map(dest => {
      const nearby = astroLines ? findNearbyAstroLines(astroLines, dest.lat, dest.lon, 4) : undefined
      const result = scoreDestination(dest, profile ?? {}, nearby)
      return { destination: dest, ...result }
    }).sort((a, b) => b.score - a.score)

    return NextResponse.json({ recommendations: scored, profileExists: !!profile })
  } catch (error) {
    console.error('[travel/recommendations] error:', error)
    return NextResponse.json({ recommendations: [], profileExists: false })
  }
}

// Save a like/dislike/save decision so future recommendations improve.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { destinationId, status } = await req.json()
    if (!destinationId || !status) return NextResponse.json({ error: 'destinationId and status required' }, { status: 400 })

    const { data: profile } = await supabase.from('travel_profiles').select('liked_destination_ids, rejected_destination_ids').eq('user_id', user.id).maybeSingle()
    let liked = profile?.liked_destination_ids ?? []
    let rejected = profile?.rejected_destination_ids ?? []
    if (status === 'liked') { liked = [...new Set([...liked, destinationId])]; rejected = rejected.filter((d: string) => d !== destinationId) }
    if (status === 'rejected') { rejected = [...new Set([...rejected, destinationId])]; liked = liked.filter((d: string) => d !== destinationId) }

    await supabase.from('travel_profiles').upsert({ user_id: user.id, liked_destination_ids: liked, rejected_destination_ids: rejected, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    await supabase.from('travel_recommendations').insert({ user_id: user.id, destination_id: destinationId, status })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[travel/recommendations] POST error:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
