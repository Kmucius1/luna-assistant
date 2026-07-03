import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import Groq from 'groq-sdk'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

async function resolveUserId(): Promise<string> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) return user.id
  } catch { /* fall through */ }
  return ZOE_USER_ID
}

const VALID_CATEGORIES = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories', 'swimwear', 'lingerie', 'activewear', 'bags']

function mapCategory(raw: string): string {
  const s = raw.toLowerCase()
  if (s.includes('top') || s.includes('shirt') || s.includes('blouse')) return 'tops'
  if (s.includes('bottom') || s.includes('pant') || s.includes('jean') || s.includes('skirt') || s.includes('short')) return 'bottoms'
  if (s.includes('dress') || s.includes('set') || s.includes('jumpsuit') || s.includes('romper')) return 'dresses'
  if (s.includes('jacket') || s.includes('coat') || s.includes('outerwear') || s.includes('blazer') || s.includes('cardigan')) return 'outerwear'
  if (s.includes('shoe') || s.includes('boot') || s.includes('sneaker') || s.includes('heel')) return 'shoes'
  if (s.includes('bag') || s.includes('purse')) return 'bags'
  if (s.includes('swim') || s.includes('bikini')) return 'swimwear'
  if (s.includes('active') || s.includes('gym')) return 'activewear'
  if (s.includes('bra') || s.includes('lingerie')) return 'lingerie'
  return VALID_CATEGORIES.includes(s) ? s : 'accessories'
}

interface DetectedRegion { category: string; x: number; y: number; width: number; height: number }

let _groq: Groq | null = null
function getGroq() {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })
  return _groq
}

const DETECT_PROMPT = `This is a full-body outfit photo. Identify each distinct garment/accessory piece clearly visible (top, bottom, dress, jacket/outerwear, shoes, bag, accessories). For each, estimate a bounding box as percentages of the full image (x, y = top-left corner, width, height — all 0-100). Only include pieces you can see clearly. Return ONLY valid JSON, an array like: [{"category":"top","x":10,"y":15,"width":40,"height":30}]. No markdown, no prose, no explanation.`

export async function POST(req: NextRequest) {
  try {
    const { image, sourceLabel } = await req.json() as { image: string; sourceLabel?: string }
    if (!image?.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Send a base64 data URL image.' }, { status: 400 })
    }
    const userId = await resolveUserId()

    // Normalize the source photo so detection + cropping use consistent coordinates
    const base64Data = image.split(',')[1]
    const inputBuffer = Buffer.from(base64Data, 'base64')
    const normalized = await sharp(inputBuffer).rotate().resize(1200, null, { withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer()
    const meta = await sharp(normalized).metadata()
    const fullWidth = meta.width ?? 1200
    const fullHeight = meta.height ?? 1600

    // Ask the vision model where each garment is
    let regions: DetectedRegion[]
    try {
      const completion = await getGroq().chat.completions.create({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: DETECT_PROMPT },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${normalized.toString('base64')}` } },
          ],
        }],
      })
      const raw = completion.choices[0]?.message?.content ?? ''
      const match = raw.match(/\[[\s\S]*\]/)
      if (!match) throw new Error('No JSON array in response')
      regions = JSON.parse(match[0]) as DetectedRegion[]
    } catch (err) {
      console.error('[wardrobe/detect] vision call failed:', err instanceof Error ? err.message : err)
      return NextResponse.json(
        { error: "LUNA couldn't read the pieces in that photo. Try a clearer, well-lit full-body shot." },
        { status: 200, headers: { 'x-detect-failed': '1' } }
      )
    }

    if (!regions.length) {
      return NextResponse.json({ items: [], message: 'No distinct pieces detected — try a clearer photo.' })
    }

    const db = createAdminClient()
    const label = sourceLabel || new Date().toLocaleDateString()
    const created: unknown[] = []

    for (const region of regions.slice(0, 6)) {
      try {
        const left = Math.max(0, Math.round((region.x / 100) * fullWidth))
        const top = Math.max(0, Math.round((region.y / 100) * fullHeight))
        const width = Math.min(fullWidth - left, Math.round((region.width / 100) * fullWidth))
        const height = Math.min(fullHeight - top, Math.round((region.height / 100) * fullHeight))
        if (width < 20 || height < 20) continue

        const cropBuffer = await sharp(normalized)
          .extract({ left, top, width, height })
          .resize(500, null, { withoutEnlargement: true })
          .jpeg({ quality: 78 })
          .toBuffer()
        const photoUrl = `data:image/jpeg;base64,${cropBuffer.toString('base64')}`
        const category = mapCategory(region.category)

        const { data, error } = await db.from('wardrobe_items').insert({
          user_id: userId,
          name: `${region.category} — from ${label}`,
          category,
          photo_url: photoUrl,
          customization_notes: `Auto-detected from an outfit photo upload (${label}).`,
        }).select().single()

        if (!error && data) created.push(data)
      } catch (cropErr) {
        console.error('[wardrobe/detect] crop failed for region:', region, cropErr)
      }
    }

    return NextResponse.json({ items: created })
  } catch (err) {
    console.error('[wardrobe/detect] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: "Something went wrong reading that photo. Try again." }, { status: 200 })
  }
}
