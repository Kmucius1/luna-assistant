import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { allowedUserIds } from '@/lib/owner'
import { rateLimited } from '@/lib/rateLimit'

// Pages anyone can open (the login flow and legal pages).
const PUBLIC_PAGES = ['/auth', '/privacy', '/terms']

// Static files the browser fetches before or without a session.
const PUBLIC_FILES = ['/sw.js', '/manifest.json', '/clear.html']

// API routes that do their own non-session authentication, or are safe open:
//  - /api/health                      uptime probe, returns only ok/unavailable
//  - /api/gmail/callback              Google's OAuth redirect
//  - /api/cron, generate-readings,
//    nightly-memory                   Vercel Cron, checked against CRON_SECRET
//  - /api/luna/messages/incoming      iPhone Shortcut, checked against LUNA_INCOMING_SECRET
const PUBLIC_API = [
  '/api/health',
  '/api/gmail/callback',
  '/api/cron/',
  '/api/luna/generate-readings',
  '/api/luna/nightly-memory',
  '/api/luna/messages/incoming',
]

// Paid or heavy routes: AI text, voice, image/vision generation.
const THROTTLED_PREFIXES = [
  '/api/ai/',
  '/api/chat/',
  '/api/atelier/',
  '/api/astrology/',
  '/api/brain-dump/analyze',
  '/api/brain-dump/audio-upload',
  '/api/food/pantry/photo-extract',
  '/api/food/pantry/nl-update',
  '/api/luna/drafts/',
  '/api/luna/plan-my-day',
  '/api/home/daily-glance-art',
]
const THROTTLE_LIMIT = 40        // requests
const THROTTLE_WINDOW_MS = 60_000 // per minute, per signed-in user

function matches(path: string, list: string[]) {
  return list.some(p => (p.endsWith('/') ? path.startsWith(p) : path === p || path.startsWith(p + '/')))
}

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const path = request.nextUrl.pathname
  const isApi = path.startsWith('/api/')

  const configured = Boolean(url && url.startsWith('http') && key && key !== 'your_supabase_anon_key')

  // Fail closed in production: a missing or placeholder Supabase config must
  // never turn the whole app into an open one. Local dev without Supabase still runs.
  if (!configured) {
    if (process.env.NODE_ENV === 'production') {
      return isApi
        ? NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
        : new NextResponse('Service unavailable', { status: 503 })
    }
    return NextResponse.next({ request })
  }

  const isPublicPage = matches(path, PUBLIC_PAGES) || PUBLIC_FILES.includes(path)
  const isPublicApi = matches(path, PUBLIC_API)

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(url!, key!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options))
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  // Signed-in owners do not need the login page.
  if (user && path.startsWith('/auth/login')) {
    const redirect = request.nextUrl.clone()
    redirect.pathname = '/'
    return NextResponse.redirect(redirect)
  }

  if (isPublicPage || isPublicApi) return supabaseResponse

  // Everything else needs a session that belongs to the owner. Anyone can
  // create a Supabase account from the login form, so being signed in is not
  // enough: the id must be on the allow list.
  if (!user) {
    if (isApi) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const redirect = request.nextUrl.clone()
    redirect.pathname = '/auth/login'
    redirect.search = ''
    return NextResponse.redirect(redirect)
  }

  if (!allowedUserIds().includes(user.id)) {
    if (isApi) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return new NextResponse('Forbidden', { status: 403 })
  }

  if (isApi && matches(path, THROTTLED_PREFIXES)) {
    if (rateLimited(`${user.id}:throttle`, THROTTLE_LIMIT, THROTTLE_WINDOW_MS)) {
      return NextResponse.json(
        { error: 'Too many requests, slow down for a moment' },
        { status: 429, headers: { 'Retry-After': '30' } },
      )
    }
  }

  return supabaseResponse
}
