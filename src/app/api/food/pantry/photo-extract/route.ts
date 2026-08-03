import { NextRequest, NextResponse } from 'next/server'
import { extractGroceryItemsFromImage } from '@/lib/luna/foodVision'

// Reads a fridge/pantry or receipt photo and returns a parsed item list —
// does NOT insert anything. The client shows this for review/edit first;
// confirmed items are posted separately to POST /api/food/pantry.
export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json() as { image?: string }
    if (!image?.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Send a base64 data URL image.' }, { status: 400 })
    }

    const items = await extractGroceryItemsFromImage(image)
    return NextResponse.json({ items })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[food/pantry/photo-extract] error:', message)
    return NextResponse.json({ error: 'Could not read that photo', detail: message }, { status: 500 })
  }
}
