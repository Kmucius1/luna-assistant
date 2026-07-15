import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { localDateKey } from '@/lib/luna/dailyCache'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'
const DAILY_COUNT = 12

// Real Pinterest pin images, verified loading — starter pool until Zoe adds
// more of her own via POST /api/atelier/style-pool/add.
const SEED_PINS = [
  { image_url: 'https://i.pinimg.com/736x/43/c1/04/43c10408dafe7a122c4bfbff3b2a2f99.jpg', label: 'Chic Workwear' },
  { image_url: 'https://i.pinimg.com/736x/0b/f7/2f/0bf72f36fe8ef8c3e2260069ebc7c9b8.jpg', label: 'Business Casual' },
  { image_url: 'https://i.pinimg.com/736x/9e/22/4e/9e224e109889a66d84689073f5fd3453.jpg', label: 'Old Money' },
  { image_url: 'https://i.pinimg.com/736x/90/a0/83/90a083f4aa1d32c00d420bfdd3baa212.jpg', label: 'Classy' },
  { image_url: 'https://i.pinimg.com/736x/98/40/10/984010c8f122ff9fc08d9a918d91173a.jpg', label: 'Wide-Leg' },
  { image_url: 'https://i.pinimg.com/736x/dd/85/71/dd8571499b11785dd01ecf717acb0465.jpg', label: 'Effortless' },
  { image_url: 'https://i.pinimg.com/736x/0f/ab/ab/0fabab24cecd50492cc8a572b5665ae0.jpg', label: 'Office Chic' },
]

// Simple string hash -> seeded PRNG (mulberry32), so "random" is stable for
// a given day (reloading today shows the same set) but different tomorrow.
function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let state = h >>> 0
  function rand() {
    state |= 0; state = (state + 0x6D2B79F5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const arr = items.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export async function GET(req: NextRequest) {
  try {
    const db = createAdminClient()
    const { searchParams } = new URL(req.url)
    const tz = searchParams.get('tz') || 'America/New_York'
    const dateKey = localDateKey(new Date(), tz)

    const { data: initialPool } = await db
      .from('style_pool_images')
      .select('id, image_url, label')
      .eq('user_id', ZOE_USER_ID)

    let pool: { id: string; image_url: string; label: string | null }[] = initialPool ?? []

    if (pool.length === 0) {
      const { data: seeded } = await db
        .from('style_pool_images')
        .insert(SEED_PINS.map(p => ({ ...p, user_id: ZOE_USER_ID, added_by: 'seed' as const })))
        .select('id, image_url, label')
      pool = seeded ?? []
    }

    const { data: votesData } = await db
      .from('style_pool_votes')
      .select('image_id, vote')
      .eq('user_id', ZOE_USER_ID)

    const votes: { image_id: string; vote: string }[] = votesData ?? []
    const votedIds = new Set(votes.map(v => v.image_id))
    const unvoted = pool.filter(p => !votedIds.has(p.id))

    const todaysSet = seededShuffle(unvoted, dateKey).slice(0, DAILY_COUNT)

    return NextResponse.json({
      images: todaysSet,
      likedCount: votes.filter(v => v.vote === 'liked').length,
      deniedCount: votes.filter(v => v.vote === 'denied').length,
      poolSize: pool.length,
      remainingUnvoted: unvoted.length,
    }, { headers: { 'Cache-Control': 'no-store, must-revalidate' } })
  } catch (err) {
    console.error('[atelier/style-pool] GET error:', err)
    return NextResponse.json({ images: [], likedCount: 0, deniedCount: 0, poolSize: 0, remainingUnvoted: 0 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = createAdminClient()
    const { image_id, vote } = await req.json() as { image_id: string; vote: 'liked' | 'denied' }

    if (!image_id || (vote !== 'liked' && vote !== 'denied')) {
      return NextResponse.json({ error: 'image_id and vote (liked|denied) required' }, { status: 400 })
    }

    const { error } = await db
      .from('style_pool_votes')
      .upsert({ user_id: ZOE_USER_ID, image_id, vote }, { onConflict: 'user_id,image_id' })

    if (error) {
      console.error('[atelier/style-pool] vote error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ status: 'ok' })
  } catch (err) {
    console.error('[atelier/style-pool] POST error:', err)
    return NextResponse.json({ error: 'Failed to save vote' }, { status: 500 })
  }
}
