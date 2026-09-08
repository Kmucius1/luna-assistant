// Zoe's known bathroom/self-care restock items — seeded once as real rows on
// first use (see /api/wellness/bathroom-inventory GET), not a hardcoded
// virtual list like ZOE_PANTRY_STAPLES. She can rename, delete, or add to
// these freely from then on.

export type BathroomItemStatus = 'in_stock' | 'low' | 'empty'

export const ZOE_BATHROOM_STAPLES = [
  'Body wash',
  'Shampoo',
  'Conditioner',
  'Naturium Glow Getter Body Oil',
  'Tile / grime cleaner',
  'Skincare',
  'Hair products',
  'Curl product',
]
