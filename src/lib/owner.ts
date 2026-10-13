// LUNA is a single-owner app. Every server route that reads or writes personal
// data scopes to this id, and the request gate (src/lib/supabase/proxy-utils.ts)
// only lets a signed-in session through when it belongs to an allowed id.
//
// Override with LUNA_OWNER_USER_ID, and LUNA_ALLOWED_USER_IDS (comma-separated)
// if a second person ever needs to sign in. The fallback is Zoe's account.
const DEFAULT_OWNER_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

export const OWNER_USER_ID: string =
  process.env.LUNA_OWNER_USER_ID?.trim() || DEFAULT_OWNER_USER_ID

// Zoe's other known LUNA account id (older notes list it as ZOE_USER_ID). Kept on
// the allow list so tightening the gate can never lock her out of her own app.
const KNOWN_ZOE_IDS = ['98f5b277-bb63-41d5-89ec-0edadc1e2858']

export function allowedUserIds(): string[] {
  const extra = (process.env.LUNA_ALLOWED_USER_IDS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  return Array.from(new Set([OWNER_USER_ID, ...KNOWN_ZOE_IDS, ...extra]))
}
