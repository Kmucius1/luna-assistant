import { NextRequest, NextResponse } from 'next/server'
import { isConnected, getTeamFeed, postTeamUpdate } from '@/lib/dryp-crm'

export async function GET() {
  if (!isConnected()) {
    return NextResponse.json({ connected: false, updates: [], error: 'DRYP_SUPABASE_URL and DRYP_SUPABASE_SERVICE_KEY not configured' })
  }
  try {
    const updates = await getTeamFeed(30)
    return NextResponse.json({ connected: true, updates })
  } catch (err) {
    console.error('[dryp/team-updates] GET error:', err)
    return NextResponse.json({ connected: false, updates: [], error: 'Failed to load team updates' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!isConnected()) {
    return NextResponse.json({ error: 'DRYP_SUPABASE_URL and DRYP_SUPABASE_SERVICE_KEY not configured' }, { status: 503 })
  }
  try {
    const body = await req.json() as { message?: string; account_id?: string }
    if (!body.message?.trim()) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }
    await postTeamUpdate(body.message.trim(), body.account_id)
    return NextResponse.json({ status: 'ok' })
  } catch (err) {
    console.error('[dryp/team-updates] POST error:', err)
    return NextResponse.json({ error: 'Failed to post update' }, { status: 500 })
  }
}
