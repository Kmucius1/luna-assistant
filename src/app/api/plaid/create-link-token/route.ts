import { OWNER_USER_ID } from '@/lib/owner'
import { NextResponse } from 'next/server'
import { CountryCode, Products } from 'plaid'
import { plaidClient } from '@/lib/plaid'
import { createClient } from '@/lib/supabase/server'

const ZOE_USER_ID = OWNER_USER_ID

// A bank link token is only ever issued to a signed-in session. Previously this
// fell back to the owner id when there was no session.
async function resolveUserId(): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) return user.id
  } catch { /* fall through */ }
  return null
}

export async function POST() {
  try {
    const userId = await resolveUserId()
    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const response = await plaidClient.linkTokenCreate({
      client_name: 'LUNA',
      language: 'en',
      country_codes: [CountryCode.Us],
      user: { client_user_id: userId },
      products: [Products.Transactions],
    })
    return NextResponse.json({ link_token: response.data.link_token })
  } catch (err) {
    // Plaid errors come back nested in the axios error response body
    const plaidError = (err as { response?: { data?: unknown } })?.response?.data
    console.error('[plaid/create-link-token] error:', plaidError ?? err)
    const message = (plaidError as { error_message?: string })?.error_message
      ?? (err instanceof Error ? err.message : 'Failed to create link token')
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
