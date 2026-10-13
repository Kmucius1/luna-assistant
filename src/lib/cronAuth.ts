import type { NextRequest } from 'next/server'

// Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
//
// Fails closed. Whenever CRON_SECRET is set it is enforced in every
// environment, including local dev (which shares the production database, so an
// unauthenticated dev call would run the real job). Only a local machine with
// no secret configured at all is let through. Previously a missing secret in
// production made the expected header `Bearer undefined`, which anyone could send.
export function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV !== 'production'
  return req.headers.get('authorization') === `Bearer ${secret}`
}
