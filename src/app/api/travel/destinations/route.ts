import { NextRequest, NextResponse } from 'next/server'
import { DESTINATIONS, searchDestinations } from '@/lib/travel/destinations'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  const id = searchParams.get('id')

  if (id) {
    const dest = DESTINATIONS.find(d => d.id === id)
    return dest ? NextResponse.json({ destination: dest }) : NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const results = q ? searchDestinations(q) : DESTINATIONS
  return NextResponse.json({ destinations: results, count: results.length })
}
