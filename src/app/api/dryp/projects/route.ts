import { NextRequest, NextResponse } from 'next/server'
import { isConnected, createProject } from '@/lib/dryp-crm'

export async function POST(req: NextRequest) {
  if (!isConnected()) {
    return NextResponse.json({ error: 'DRYP_SUPABASE_URL and DRYP_SUPABASE_SERVICE_KEY not configured' }, { status: 503 })
  }
  try {
    const body = await req.json() as { account_id?: string; name?: string; project_type?: string; due_date?: string }
    if (!body.account_id || !body.name?.trim()) {
      return NextResponse.json({ error: 'account_id and name are required' }, { status: 400 })
    }
    const project = await createProject({
      account_id: body.account_id,
      name: body.name.trim(),
      project_type: body.project_type?.trim(),
      due_date: body.due_date,
    })
    return NextResponse.json({ project })
  } catch (err) {
    console.error('[dryp/projects] POST error:', err)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
