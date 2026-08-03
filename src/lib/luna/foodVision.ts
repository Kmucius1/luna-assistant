import Groq from 'groq-sdk'

let _groq: Groq | null = null
function getGroq() {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })
  return _groq
}

export interface ExtractedGroceryItem {
  name: string
  quantity: string
  category: 'produce' | 'protein' | 'dairy' | 'bakery_and_grains' | 'pantry' | 'frozen' | 'other'
  storage: 'fridge' | 'freezer' | 'pantry'
}

const EXTRACT_PROMPT = `This photo is either a grocery receipt or the inside of a fridge/pantry/freezer.
Identify every distinct food/grocery item visible. For each, give its name, a realistic quantity
(e.g. "1", "2 lbs", "1 gallon" — infer from the photo/receipt, don't guess wildly), which
category it belongs to: produce, protein, dairy, bakery_and_grains, pantry, frozen, or other, and
where it's actually stored: "fridge" (refrigerated), "freezer" (frozen), or "pantry" (shelf-stable,
room temperature). If the photo shows the inside of a freezer, everything is storage=freezer
regardless of category. Skip non-food line items (bags, tax, totals). Return ONLY a valid JSON
array, no markdown, no prose: [{"name":"...", "quantity":"...", "category":"produce", "storage":"fridge"}]`

const VALID_CATEGORIES = new Set(['produce', 'protein', 'dairy', 'bakery_and_grains', 'pantry', 'frozen', 'other'])
const VALID_STORAGE = new Set(['fridge', 'freezer', 'pantry'])

export async function extractGroceryItemsFromImage(imageDataUrl: string): Promise<ExtractedGroceryItem[]> {
  const completion = await getGroq().chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: EXTRACT_PROMPT },
        { type: 'image_url', image_url: { url: imageDataUrl } },
      ],
    }],
  })
  return parseExtracted(completion.choices[0]?.message?.content ?? '')
}

function parseExtracted(raw: string): ExtractedGroceryItem[] {
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) return []
  try {
    const parsed = JSON.parse(match[0]) as Array<Partial<ExtractedGroceryItem>>
    return parsed
      .filter(i => typeof i.name === 'string' && i.name.trim())
      .map(i => {
        const category = VALID_CATEGORIES.has(i.category ?? '') ? (i.category as ExtractedGroceryItem['category']) : 'other'
        return {
          name: i.name!.trim(),
          quantity: typeof i.quantity === 'string' && i.quantity.trim() ? i.quantity.trim() : '1',
          category,
          storage: VALID_STORAGE.has(i.storage ?? '') ? (i.storage as ExtractedGroceryItem['storage']) : (category === 'frozen' ? 'freezer' : category === 'pantry' || category === 'bakery_and_grains' ? 'pantry' : 'fridge'),
        }
      })
  } catch {
    return []
  }
}
