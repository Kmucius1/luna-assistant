import { NextRequest, NextResponse } from 'next/server'
import { disconnectGmail } from '@/lib/gmail'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  await disconnectGmail(body.email)
  return NextResponse.json({ success: true })
}
