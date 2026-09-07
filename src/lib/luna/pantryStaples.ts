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
}

export const STAPLE_GROUP_LABEL: Record<StapleGroup, string> = {
  protein: 'Protein',
  meals: 'Meals',
  breakfast: 'Breakfast',
  easy_backup: 'Easy backup food',
}

export const ZOE_PANTRY_STAPLES: StapleDef[] = [
  // Protein
  { name: 'Chicken breasts', group: 'protein', category: 'protein' },
  { name: 'Crispy chicken tenders', group: 'protein', category: 'frozen' },
  { name: 'Salmon', group: 'protein', category: 'protein' },
  { name: 'Ground beef/turkey', group: 'protein', category: 'protein' },
  // Meals
  { name: 'Tortillas', group: 'meals', category: 'bakery_and_grains' },
  { name: 'Rice', group: 'meals', category: 'pantry' },
  { name: 'Pasta', group: 'meals', category: 'pantry' },
  { name: 'Lettuce', group: 'meals', category: 'produce' },
  { name: 'Buffalo sauce', group: 'meals', category: 'pantry' },
  { name: 'Ranch', group: 'meals', category: 'pantry' },
  { name: 'Shredded cheese', group: 'meals', category: 'dairy' },
  { name: 'Salad kits', group: 'meals', category: 'produce' },
  { name: 'Frozen vegetables', group: 'meals', category: 'frozen' },
  { name: 'Potatoes/fries', group: 'meals', category: 'frozen' },
  // Breakfast
  { name: 'Bagels', group: 'breakfast', category: 'bakery_and_grains' },
  { name: 'Oatmeal', group: 'breakfast', category: 'pantry' },
  { name: 'Frozen waffles', group: 'breakfast', category: 'frozen' },
  { name: 'Yogurt', group: 'breakfast', category: 'dairy' },
  { name: 'Fruit', group: 'breakfast', category: 'produce' },
  { name: 'Granola', group: 'breakfast', category: 'pantry' },
  // Easy backup food
  { name: 'Crackers', group: 'easy_backup', category: 'pantry' },
  { name: 'Salsa', group: 'easy_backup', category: 'pantry' },
  { name: 'Soup', group: 'easy_backup', category: 'pantry' },
  { name: 'Frozen pizza', group: 'easy_backup', category: 'frozen' },
  { name: 'Frozen meals', group: 'easy_backup', category: 'frozen' },
]

export const STAPLE_GROUPS_ORDER: StapleGroup[] = ['protein', 'meals', 'breakfast', 'easy_backup']
