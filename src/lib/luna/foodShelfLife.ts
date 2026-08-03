import { callAI, parseAIJson } from '@/lib/ai'

const SYSTEM = `You are a food-safety expert. Given a list of grocery/fridge/pantry item names,
estimate a typical, safe shelf life in days from today for each — using general food-safety
knowledge (e.g. fresh chicken breast ~2 days refrigerated, eggs ~21-35 days, canned beans ~2 years,
frozen items ~90+ days). Assume normal refrigeration/pantry storage unless the name implies otherwise.
Return ONLY valid JSON in this shape: {"items": [{"name": "...", "days": 5}]}`

export interface ShelfLifeEstimate {
  name: string
  days: number
}

/** Batches all items into one AI call rather than one call per item. */
export async function estimateShelfLife(items: { name: string }[]): Promise<ShelfLifeEstimate[]> {
  if (items.length === 0) return []
  const prompt = `Estimate shelf life for these items:\n${items.map(i => `- ${i.name}`).join('\n')}`
  const raw = await callAI(SYSTEM, prompt, 1024)
  const parsed = parseAIJson<{ items?: Partial<ShelfLifeEstimate>[] }>(raw)
  return (parsed.items ?? [])
    .filter((i): i is ShelfLifeEstimate => typeof i.name === 'string' && typeof i.days === 'number' && i.days > 0)
}
