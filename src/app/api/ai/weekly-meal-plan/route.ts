import { NextRequest, NextResponse } from 'next/server'
import { callAI, parseAIJson } from '@/lib/ai'
import { ZOE_LIFESTYLE_PROFILE } from '@/lib/luna/zoeLifestyleProfile'

const SYSTEM = `You are Luna, Zoe's personal meal planner and grocery assistant.

${ZOE_LIFESTYLE_PROFILE}

Create realistic meals Zoe will actually eat. Never include anything on her NEVER RECOMMEND list.
Do not silently replace her preferences with generic fitness foods.
Keep meals practical for a 5:00 AM wake-up, 5:45 AM gym arrival, and protected work hours from 10:30 AM to 5:30 PM.

Return ONLY valid JSON in this shape:
{
  "week_summary": "short explanation of the plan",
  "breakfasts": [{ "day": "Monday", "meal": "...", "prep_note": "..." }],
  "lunches": [{ "day": "Monday", "meal": "...", "prep_note": "..." }],
  "dinners": [{ "day": "Monday", "meal": "...", "prep_note": "..." }],
  "snacks": [{ "name": "...", "pairing_note": "..." }],
  "grocery_list": {
    "produce": [{ "item": "...", "quantity": "...", "used_for": ["..."] }],
    "protein": [{ "item": "...", "quantity": "...", "used_for": ["..."] }],
    "dairy": [{ "item": "...", "quantity": "...", "used_for": ["..."] }],
    "bakery_and_grains": [{ "item": "...", "quantity": "...", "used_for": ["..."] }],
    "pantry": [{ "item": "...", "quantity": "...", "used_for": ["..."] }],
    "frozen": [{ "item": "...", "quantity": "...", "used_for": ["..."] }]
  },
  "prep_plan": [{ "when": "Sunday", "task": "...", "minutes": 20 }],
  "estimated_waste_savers": ["ingredient reuse note"],
  "meals_out": [{ "day": "...", "plan": "..." }]
}`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const {
      breakfastsAtHome = 7,
      lunchesAtHome = 7,
      dinnersAtHome = 7,
      people = 1,
      groceryBudget = '',
      mealsOut = '',
      cravings = '',
      temporaryDislikes = '',
      notes = '',
    } = body

    const prompt = `Build Zoe's meal plan for this week.

Breakfasts at home: ${breakfastsAtHome}
Lunches at home: ${lunchesAtHome}
Dinners at home: ${dinnersAtHome}
People eating: ${people}
Grocery budget: ${groceryBudget || 'No budget supplied'}
Known meals out: ${mealsOut || 'None supplied'}
Current cravings: ${cravings || 'Use her stored favorites'}
Temporary dislikes or foods to skip this week: ${temporaryDislikes || 'None'}
Other notes: ${notes || 'None'}

Rules:
- Return exactly the requested number of breakfasts, lunches, and dinners.
- Use repeated ingredients intelligently so the grocery list is not wasteful.
- Keep breakfast realistic before or after her early gym session.
- Lunch must fit inside her 10:30 AM to 5:30 PM workday.
- Do not include ranch, mayonnaise, eggs, pork, shrimp, ground beef, burgers, cottage cheese, black beans, hummus, feta, lunch meat, turkey sausage, turkey taco bowls, mahi-mahi, cod, beef jerky, or tuna with crackers.
- Greek yogurt must be paired with granola, not berries.
- Frozen blueberries with peanut butter and PB&J sandwiches are welcome options.
- Chicken, salmon, steak, rice, buffalo, Caesar, chicken Alfredo, chicken parmesan, chicken-only sushi, Mexican chicken or steak, BBQ chicken pizza, Margherita pizza, chicken tenders, and crispy chicken sandwiches are preferred directions.`

    const raw = await callAI(SYSTEM, prompt, 3500)
    const parsed = parseAIJson(raw)
    return NextResponse.json(parsed)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[weekly-meal-plan]', message)
    return NextResponse.json(
      { error: 'Could not build the weekly meal plan.', detail: message },
      { status: 500 },
    )
  }
}
