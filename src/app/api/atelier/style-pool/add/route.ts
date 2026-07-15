import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolvePinterestImageUrl } from '@/lib/pinterest'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

export async function POST(req: NextRequest) {
  try {
    const { image_url, label } = await req.json() as { image_url: string; label?: string }

    if (!image_url?.trim() || !/^https?:\/\//.test(image_url.trim())) {
      return NextResponse.json({ error: 'A valid image_url is required' }, { status: 400 })
    }

    // Pinterest's share button gives a pin.it/pinterest.com page link, not a
    // direct image file — resolve it to the real image URL so it renders.
    const resolvedUrl = await resolvePinterestImageUrl(image_url.trim())

    const db = createAdminClient()
    const { data, error } = await db
      .from('style_pool_images')
      .insert({ user_id: ZOE_USER_ID, image_url: resolvedUrl, label: label?.trim() || null, added_by: 'zoe' })
      .select()
      .single()

    if (error) {
      console.error('[atelier/style-pool/add] insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ image: data })
  } catch (err) {
    console.error('[atelier/style-pool/add] error:', err)
    return NextResponse.json({ error: 'Failed to add image' }, { status: 500 })
  }
}
