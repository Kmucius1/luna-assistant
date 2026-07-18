import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveMoneyUserId } from '@/lib/money/auth'

export async function GET() {
  try {
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const { data, error } = await db.from('merchant_aliases').select('*').eq('user_id', userId).order('normalized_name')
    if (error) throw error
    return NextResponse.json({ aliases: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[money/merchant-aliases] GET error:', error)
    return NextResponse.json({ aliases: [] })
  }
}

// Zoe can merge two merchant spellings into one normalized name, or split
// one back apart by adding a more specific pattern. Either way this just
// saves an alias; re-running normalization (next import, or a manual
// "reapply" pass) is what actually relabels existing transactions.
export async function POST(req: NextRequest) {
  try {
    const { raw_pattern, normalized_name, default_category, default_ownership_type, reapply_to_existing } = await req.json() as {
      raw_pattern: string; normalized_name: string; default_category?: string; default_ownership_type?: string; reapply_to_existing?: boolean
    }
    if (!raw_pattern || !normalized_name) return NextResponse.json({ error: 'raw_pattern and normalized_name are required' }, { status: 400 })

    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const { data, error } = await db.from('merchant_aliases').upsert({
      user_id: userId, raw_pattern, normalized_name, default_category: default_category ?? null, default_ownership_type: default_ownership_type ?? null,
    }, { onConflict: 'user_id,raw_pattern' }).select().single()
    if (error) throw error

    let relabeled = 0
    if (reapply_to_existing) {
      const { data: matches } = await db.from('transactions')
        .select('id').eq('user_id', userId).ilike('merchant_raw', `%${raw_pattern}%`)
      const matchRows = (matches ?? []) as { id: string }[]
      if (matchRows.length) {
        await db.from('transactions').update({ merchant_normalized: normalized_name }).in('id', matchRows.map(m => m.id))
        relabeled = matchRows.length
      }
    }

    return NextResponse.json({ alias: data, relabeled })
  } catch (error) {
    console.error('[money/merchant-aliases] POST error:', error)
    return NextResponse.json({ error: 'Failed to save alias' }, { status: 500 })
  }
}
