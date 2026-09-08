import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { estimateShelfLife } from '@/lib/luna/foodShelfLife'

type Category = 'produce' | 'protein' | 'dairy' | 'bakery_and_grains' | 'pantry' | 'frozen' | 'other'
type Storage = 'fridge' | 'freezer' | 'pantry'

interface PantryItemInput {
  name: string
  category?: Category
  storage?: Storage
  quantity?: string
  expires_on?: string
  source?: 'manual' | 'photo' | 'grocery_list'
}

function defaultStorage(category: Category | undefined): Storage {
  if (category === 'frozen') return 'freezer'
  if (category === 'pantry' || category === 'bakery_and_grains') return 'pantry'
  return 'fridge'
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('food_pantry_items')
      .select('*')
      .eq('user_id', user.id)
      .is('consumed_at', null)
      .order('expires_on', { ascending: true, nullsFirst: false })

    if (error) throw error
    return NextResponse.json({ items: data ?? [] })
  } catch (error) {
    console.error('[food/pantry] GET error:', error)
    return NextResponse.json({ items: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const items: PantryItemInput[] = Array.isArray(body.items) ? body.items : []
    const valid = items.filter(i => i.name?.trim())
    if (valid.length === 0) return NextResponse.json({ error: 'At least one item with a name is required' }, { status: 400 })

    const needsEstimate = valid.filter(i => !i.expires_on)
    const estimates = needsEstimate.length > 0
      ? await estimateShelfLife(needsEstimate.map(i => ({ name: i.name })))
      : []

    const today = new Date()
    const rows = valid.map(i => {
      let expiresOn = i.expires_on ?? null
      if (!expiresOn) {
        const match = estimates.find(e => e.name.toLowerCase() === i.name.toLowerCase())
        if (match) {
          const d = new Date(today)
          d.setDate(d.getDate() + match.days)
          expiresOn = d.toISOString().split('T')[0]
        }
      }
      return {
        user_id: user.id,
        name: i.name.trim(),
        category: i.category ?? 'pantry',
        storage: i.storage ?? defaultStorage(i.category),
        quantity: i.quantity?.trim() || null,
        expires_on: expiresOn,
        source: i.source ?? 'manual',
        // A newly added item is, by definition, something she just
        // confirmed having — default it into the universal in-stock/low/
        // empty tracking from day one rather than leaving it "unknown."
        status: 'in_stock',
      }
    })

    const { data, error } = await supabase.from('food_pantry_items').insert(rows).select()
    if (error) throw error
    return NextResponse.json({ items: data ?? [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[food/pantry] POST error:', message)
    return NextResponse.json({ error: 'Failed to add pantry items', detail: message }, { status: 500 })
  }
}
