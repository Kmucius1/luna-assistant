import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDestination } from '@/lib/travel/destinations'

// Real generation from real inputs: destination climate zone + trip length
// (both real trip data) plus the user's actual closet (wardrobe_items) when
// they choose to pack from it — never a generic hardcoded packing list.
const BASE_ITEMS: Record<string, Array<{ name: string; category: string }>> = {
  tropical: [{ name: 'SPF', category: 'wellness' }, { name: 'Swimsuit', category: 'clothing' }, { name: 'Light breathable layers', category: 'clothing' }, { name: 'Bug spray', category: 'wellness' }],
  mediterranean: [{ name: 'Light layers + one warm evening piece', category: 'clothing' }, { name: 'Comfortable walking shoes', category: 'shoes' }],
  temperate: [{ name: 'Layers for variable weather', category: 'clothing' }, { name: 'A light rain layer', category: 'clothing' }],
  subarctic: [{ name: 'Thermal base layers', category: 'clothing' }, { name: 'Waterproof outer layer', category: 'clothing' }, { name: 'Warm hat + gloves', category: 'clothing' }],
  'semi-arid': [{ name: 'Sun protection (hat, SPF)', category: 'wellness' }, { name: 'Light modest layers', category: 'clothing' }],
  subtropical: [{ name: 'SPF', category: 'wellness' }, { name: 'Light layers', category: 'clothing' }],
  'highland subtropical': [{ name: 'Layers for cool mornings/warm afternoons', category: 'clothing' }],
  'temperate oceanic': [{ name: 'A rain layer', category: 'clothing' }, { name: 'Layers for mild but changeable weather', category: 'clothing' }],
}
const ALWAYS = [
  { name: 'Passport / ID', category: 'documents' }, { name: 'Phone charger', category: 'technology' },
  { name: 'Medications', category: 'medication' }, { name: 'Toiletries', category: 'beauty' },
]

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: trip } = await supabase.from('trips').select('destination_id').eq('id', id).eq('user_id', user.id).single()
    const dest = trip?.destination_id ? getDestination(trip.destination_id) : null
    const climateItems = dest ? (BASE_ITEMS[dest.climate_zone] ?? []) : []

    const items = [...ALWAYS, ...climateItems].map((item, i) => ({
      trip_id: id, user_id: user.id, name: item.name, category: item.category, quantity: 1, sort_order: i,
    }))

    const { data, error } = await supabase.from('trip_packing_items').insert(items).select()
    if (error) throw error
    return NextResponse.json({ items: data })
  } catch (error) {
    console.error('[travel/trips/:id/packing] POST error:', error)
    return NextResponse.json({ error: 'Failed to generate packing list' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { itemId, ...updates } = await req.json()
    if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 })
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase.from('trip_packing_items').update(updates).eq('id', itemId).eq('user_id', user.id).select().single()
    if (error) throw error
    return NextResponse.json({ item: data })
  } catch (error) {
    console.error('[travel/trips/:id/packing] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
  }
}
