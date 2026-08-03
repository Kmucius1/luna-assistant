import { NextRequest, NextResponse } from 'next/server'
import { callAI, parseAIJson } from '@/lib/ai'
import { createClient } from '@/lib/supabase/server'

const SYSTEM = `You match a free-text sentence about food against a person's pantry item list and decide what
happened to each item mentioned. Only match items that are actually in the provided list — do not invent items.
For each matched item, classify the action:
- "consumed": she ate it, finished it, used it up, or threw it away/it went bad — remove from active inventory.
- "frozen": she froze it — keep it, but it's now in the freezer.
- "opened": she opened/started it but it's not gone — no inventory change, just acknowledged.
Return ONLY valid JSON: {"matches": [{"name": "<exact name from the list>", "action": "consumed"}]}`

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const text: string = typeof body.text === 'string' ? body.text.trim() : ''
    if (!text) return NextResponse.json({ error: 'Say what happened' }, { status: 400 })

    const { data: pantryRows } = await supabase
      .from('food_pantry_items')
      .select('id, name')
      .eq('user_id', user.id)
      .is('consumed_at', null)

    const pantry = (pantryRows ?? []) as { id: string; name: string }[]
    if (pantry.length === 0) return NextResponse.json({ applied: [] })

    const prompt = `Pantry items:\n${pantry.map(p => `- ${p.name}`).join('\n')}\n\nWhat she said: "${text}"`
    const raw = await callAI(SYSTEM, prompt, 800)
    const parsed = parseAIJson<{ matches?: { name: string; action: string }[] }>(raw)

    const applied: { name: string; action: string }[] = []
    for (const match of parsed.matches ?? []) {
      const item = pantry.find(p => p.name.toLowerCase() === match.name.toLowerCase())
      if (!item) continue
      if (match.action === 'consumed') {
        await supabase.from('food_pantry_items').update({ consumed_at: new Date().toISOString() }).eq('id', item.id).eq('user_id', user.id)
        applied.push({ name: item.name, action: 'consumed' })
      } else if (match.action === 'frozen') {
        await supabase.from('food_pantry_items').update({ category: 'frozen' }).eq('id', item.id).eq('user_id', user.id)
        applied.push({ name: item.name, action: 'frozen' })
      } else if (match.action === 'opened') {
        applied.push({ name: item.name, action: 'opened' })
      }
    }

    return NextResponse.json({ applied })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[food/pantry/nl-update]', message)
    return NextResponse.json({ error: 'Could not update your pantry', detail: message }, { status: 500 })
  }
}
