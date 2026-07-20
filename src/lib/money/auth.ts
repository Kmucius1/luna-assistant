import { createClient } from '@/lib/supabase/server'

export class UnauthorizedError extends Error {
  constructor(message = 'Authentication required') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export function isUnauthorizedError(error: unknown): error is UnauthorizedError {
  return error instanceof UnauthorizedError || (error instanceof Error && error.name === 'UnauthorizedError')
}

export async function resolveMoneyUserId(): Promise<string> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user?.id) {
    throw new UnauthorizedError()
  }

  return user.id
}
