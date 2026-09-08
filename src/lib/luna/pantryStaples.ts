// Zoe's own recurring pantry staples — a small, fixed, personal list, not
// arbitrary items. Grouped by HER mental model (Protein/Meals/Breakfast/
// Easy backup), distinct from food_pantry_items.category (grocery-store
// sections) which stays as-is for grocery-list bucketing. Ground beef and
// ranch appear here even though ZOE_NEVER_FOODS excludes them from meal
// suggestions — what's stocked at home and what LUNA suggests cooking are
// different concerns (confirmed with Zoe).

export type StapleGroup = 'protein' | 'meals' | 'breakfast' | 'easy_backup'
export type StapleStatus = 'in_stock' | 'low' | 'empty'
type GroceryCategory = 'produce' | 'protein' | 'dairy' | 'bakery_and_grains' | 'pantry' | 'frozen' | 'other'

export interface StapleDef {
  name: string
  group: StapleGroup
  /** food_pantry_items.category (grocery-store section) for grocery-list bucketing. */
  category: GroceryCategory
  /**
   * Deterministic keyword match against a logged meal's title — how
   * automatic depletion decides a staple was likely used, without any AI
   * guessing. Explicit per-staple, same pattern as ZOE_KNOWN_LOCATIONS'
   * `match` arrays, chosen specifically to avoid collisions between
   * similar staples (e.g. "chicken breast" vs "chicken tender").
   * Omitted for staples too generic to safely match a meal title against.
   */
  matchKeywords?: string[]
}

export const STAPLE_GROUP_LABEL: Record<StapleGroup, string> = {
  protein: 'Protein',
  meals: 'Meals',
  breakfast: 'Breakfast',
  easy_backup: 'Easy backup food',
}

export const ZOE_PANTRY_STAPLES: StapleDef[] = [
  // Protein
  { name: 'Chicken breasts', group: 'protein', category: 'protein', matchKeywords: ['chicken breast'] },
  { name: 'Crispy chicken tenders', group: 'protein', category: 'frozen', matchKeywords: ['chicken tender'] },
  { name: 'Salmon', group: 'protein', category: 'protein', matchKeywords: ['salmon'] },
  { name: 'Ground beef/turkey', group: 'protein', category: 'protein', matchKeywords: ['ground beef', 'ground turkey'] },
  // Meals
  { name: 'Tortillas', group: 'meals', category: 'bakery_and_grains', matchKeywords: ['tortilla', 'wrap', 'quesadilla'] },
  { name: 'Rice', group: 'meals', category: 'pantry', matchKeywords: ['rice'] },
  { name: 'Pasta', group: 'meals', category: 'pantry', matchKeywords: ['pasta', 'spaghetti', 'penne', 'alfredo'] },
  { name: 'Lettuce', group: 'meals', category: 'produce', matchKeywords: ['lettuce'] },
  { name: 'Buffalo sauce', group: 'meals', category: 'pantry', matchKeywords: ['buffalo'] },
  { name: 'Ranch', group: 'meals', category: 'pantry', matchKeywords: ['ranch'] },
  { name: 'Shredded cheese', group: 'meals', category: 'dairy', matchKeywords: ['cheese'] },
  { name: 'Salad kits', group: 'meals', category: 'produce', matchKeywords: ['salad', 'caesar'] },
  { name: 'Frozen vegetables', group: 'meals', category: 'frozen', matchKeywords: ['vegetable', 'veggies'] },
  { name: 'Potatoes/fries', group: 'meals', category: 'frozen', matchKeywords: ['potato', 'fries', 'sweet potato'] },
  // Breakfast
  { name: 'Bagels', group: 'breakfast', category: 'bakery_and_grains', matchKeywords: ['bagel'] },
  { name: 'Oatmeal', group: 'breakfast', category: 'pantry', matchKeywords: ['oatmeal', 'overnight oats'] },
  { name: 'Frozen waffles', group: 'breakfast', category: 'frozen', matchKeywords: ['waffle'] },
  { name: 'Yogurt', group: 'breakfast', category: 'dairy', matchKeywords: ['yogurt'] },
  { name: 'Fruit', group: 'breakfast', category: 'produce', matchKeywords: ['fruit', 'blueberries', 'berries'] },
  { name: 'Granola', group: 'breakfast', category: 'pantry', matchKeywords: ['granola'] },
  // Easy backup food
  { name: 'Crackers', group: 'easy_backup', category: 'pantry', matchKeywords: ['cracker'] },
  { name: 'Salsa', group: 'easy_backup', category: 'pantry', matchKeywords: ['salsa'] },
  { name: 'Soup', group: 'easy_backup', category: 'pantry', matchKeywords: ['soup'] },
  { name: 'Frozen pizza', group: 'easy_backup', category: 'frozen', matchKeywords: ['pizza'] },
  { name: 'Frozen meals', group: 'easy_backup', category: 'frozen' },
]

export const STAPLE_GROUPS_ORDER: StapleGroup[] = ['protein', 'meals', 'breakfast', 'easy_backup']
