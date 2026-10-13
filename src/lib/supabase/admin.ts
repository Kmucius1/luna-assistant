// SERVER-ONLY — never import this in client components or pages
// Uses the service role key which bypasses RLS
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !url.startsWith('http') || !key || key === 'your_supabase_service_role_key') {
    // In production a missing key must be loud. Returning an empty stub makes
    // every route "succeed" with blank data and hides a broken deploy.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Supabase admin client is not configured')
    }
    return {
      from: () => ({
        select: () => ({ eq: () => ({ data: [], error: null }), data: [], error: null }),
        insert: () => ({ data: null, error: null }),
        update: () => ({ eq: () => ({ data: null, error: null }) }),
        delete: () => ({ eq: () => ({ data: null, error: null }) }),
        upsert: () => ({ data: null, error: null }),
      }),
      auth: {
        admin: {
          listUsers: async () => ({ data: { users: [] }, error: null }),
          deleteUser: async () => ({ data: null, error: null }),
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
