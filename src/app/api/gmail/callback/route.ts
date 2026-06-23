import { NextRequest, NextResponse } from 'next/server'
import { exchangeGmailCode, storeGmailTokens, getGmailProfile } from '@/lib/gmail'

export async function GET(req: NextRequest) {
  const code   = req.nextUrl.searchParams.get('code')
  const error  = req.nextUrl.searchParams.get('error')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mylunaguide.online'

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/settings?error=gmail_denied`)
  }

  try {
    const tokens  = await exchangeGmailCode(code)
    const profile = await getGmailProfile(tokens.access_token)
    await storeGmailTokens({ ...tokens, email: profile.emailAddress })
    return NextResponse.redirect(`${appUrl}/settings?connected=${encodeURIComponent(profile.emailAddress)}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Gmail OAuth callback error:', msg)
    const reason = encodeURIComponent(msg.slice(0, 200))
    return NextResponse.redirect(`${appUrl}/settings?error=gmail_failed&reason=${reason}`)
  }
}
