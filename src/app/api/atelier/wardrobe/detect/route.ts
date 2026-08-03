import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import Groq from 'groq-sdk'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { localDateKey } from '@/lib/luna/dailyCache'

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

function detectPrompt(width: number, height: number): string {
  return `This is a ${width}x${height} pixel outfit photo of a person. Identify each distinct garment/accessory piece they are wearing or carrying (top, bottom, dress, jacket/outerwear, shoes, bag, accessories).

For each piece, be precise and specific about what it actually is — e.g. write "sneakers" not "shoes" if they are clearly sneakers, "ankle boots" not "shoes" if they are boots, "heels" only if they are actually heels. Never guess a subtype you can't see.

For each piece, give a tight bounding box in PIXEL coordinates (not percentages) for that ${width}x${height} image — x, y = top-left corner, width, height, all in pixels.

Critical rules for the bounding box:
- The box must contain ONLY that garment's visible fabric/material — no skin, no face, no hair, no background.
- A "top" box must start at or below the collarbone/shoulder line and must NOT include the person's head, neck, or face.
- A "bottom" or pants/skirt box must start at the waist and NOT include the top garment above it.
- A "shoes" box must be tightly cropped to just the footwear, not the legs above the ankle.
- Before finalizing, double-check each box's top edge — if it would include the person's head or face, move it down.

Only include pieces clearly visible. Return ONLY valid JSON, an array like: [{"category":"sneakers","x":120,"y":900,"width":200,"height":180}]. No markdown, no prose, no explanation.`
}

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

    const db = createAdminClient()

    // Log the actual outfit-of-the-day photo itself — a real day-by-day
    // record of what she wore, independent of whether garment detection
    // below succeeds.
    try {
      await db.from('worn_outfits').insert({
        user_id: userId,
        date_key: localDateKey(new Date()),
        photo_url: `data:image/jpeg;base64,${normalized.toString('base64')}`,
      })
    } catch (logErr) {
      console.error('[wardrobe/detect] worn_outfits log failed:', logErr)
    }

    // Ask the vision model where each garment is
    let regions: DetectedRegion[]
    try {
      const completion = await getGroq().chat.completions.create({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: detectPrompt(fullWidth, fullHeight) },
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

    const label = sourceLabel || new Date().toLocaleDateString()
    const created: unknown[] = []
    const fullArea = fullWidth * fullHeight
    let rejectedAsWholePhoto = 0

    for (const region of regions.slice(0, 6)) {
      try {
        const left = Math.max(0, Math.min(fullWidth - 1, Math.round(region.x)))
        const top = Math.max(0, Math.min(fullHeight - 1, Math.round(region.y)))
        const width = Math.min(fullWidth - left, Math.round(region.width))
        const height = Math.min(fullHeight - top, Math.round(region.height))
        if (width < 20 || height < 20) continue

        // The model occasionally returns a box that's basically the whole
        // photo instead of a single garment — a real single-piece crop on a
        // full-body shot essentially never covers this much of the frame.
        // Saving that as an "item" is how a full mirror selfie ends up
        // stored as one closet piece instead of being properly isolated.
        if ((width * height) / fullArea > 0.7) {
          rejectedAsWholePhoto++
          continue
        }

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

    if (!created.length && rejectedAsWholePhoto > 0) {
      return NextResponse.json({ items: [], error: "LUNA couldn't crop individual pieces tightly enough from that photo — try a full-body shot with a bit more space around you." })
    }

    return NextResponse.json({ items: created })
  } catch (err) {
    console.error('[wardrobe/detect] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: "Something went wrong reading that photo. Try again." }, { status: 200 })
  }
}
