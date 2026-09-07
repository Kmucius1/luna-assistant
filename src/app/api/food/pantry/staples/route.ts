import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ZOE_PANTRY_STAPLES, type StapleStatus } from '@/lib/luna/pantryStaples'

export interface StapleWithStatus {
  name: string
  group: string
  category: string
  status: StapleStatus | null
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // staple_group/status may not exist yet if the migration hasn't been
    // run — fail soft to "no existing statuses" rather than erroring the
    // whole Sunday flow.
    let existing: { name: string; status: string | null }[] = []
    try {
      const { data, error } = await supabase
        .from('food_pantry_items')
        .select('name, status')
        .eq('user_id', user.id)
        .not('staple_group', 'is', null)
        .is('consumed_at', null)
      if (error) throw error
      existing = data ?? []
    } catch {
      existing = []
    }

    const byName = new Map(existing.map(r => [r.name.toLowerCase(), r.status as StapleStatus | null]))
    const staples: StapleWithStatus[] = ZOE_PANTRY_STAPLES.map(s => ({
      name: s.name,
      group: s.group,
      category: s.category,
      status: byName.get(s.name.toLowerCase()) ?? null,
    }))

    return NextResponse.json({ staples })
  } catch (error) {
    console.error('[food/pantry/staples] GET error:', error)
    return NextResponse.json({ staples: [] })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const confirmed: Record<string, StapleStatus> = body.statuses ?? {}

    const { data: existingRows } = await supabase
      .from('food_pantry_items')
      .select('id, name')
      .eq('user_id', user.id)
      .not('staple_group', 'is', null)
      .is('consumed_at', null)

    const existingByName = new Map((existingRows ?? []).map((r: { id: string; name: string }) => [r.name.toLowerCase(), r.id]))
    const staplesByName = new Map(ZOE_PANTRY_STAPLES.map(s => [s.name.toLowerCase(), s]))

    for (const [name, status] of Object.entries(confirmed)) {
      const def = staplesByName.get(name.toLowerCase())
      if (!def) continue
      const existingId = existingByName.get(name.toLowerCase())
      if (existingId) {
        await supabase.from('food_pantry_items').update({ status }).eq('id', existingId).eq('user_id', user.id)
      } else {
        await supabase.from('food_pantry_items').insert({
          user_id: user.id,
          name: def.name,
          category: def.category,
          storage: def.category === 'frozen' ? 'freezer' : def.category === 'pantry' || def.category === 'bakery_and_grains' ? 'pantry' : 'fridge',
          status,
          staple_group: def.group,
          source: 'manual',
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[food/pantry/staples] PATCH error:', message)
    return NextResponse.json({ error: 'Could not save your pantry check-in', detail: message }, { status: 500 })
  }
}
