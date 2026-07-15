import { NextResponse } from 'next/server'
import { CountryCode, Products } from 'plaid'
import { plaidClient } from '@/lib/plaid'
import { createClient } from '@/lib/supabase/server'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

async function resolveUserId(): Promise<string> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) return user.id
  } catch { /* fall through */ }
  return ZOE_USER_ID
}

export async function POST() {
  try {
    const userId = await resolveUserId()
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
