import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isMickContact } from '@/lib/calendarPeople'

function adminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Default priority contacts — always present even before table exists
const DEFAULTS = [
  { name: 'Shannon Martin', email: null },
  { name: 'Kaleb Mucius',   email: null },
]

async function ensureDefaults(db: ReturnType<typeof adminDb>) {
  for (const c of DEFAULTS) {
    await db.from('priority_contacts').upsert({ name: c.name, email: c.email }, { onConflict: 'name', ignoreDuplicates: true })
  }
}

export async function GET() {
  const db = adminDb()
  try {
    await ensureDefaults(db)
    const { data, error } = await db.from('priority_contacts').select('*').order('name')
    if (error) throw error
    return NextResponse.json({ contacts: (data ?? []).filter(c => !isMickContact(c)) })
  } catch {
    // Table may not exist yet — return defaults
    return NextResponse.json({ contacts: DEFAULTS.map((c, i) => ({ id: String(i), ...c, created_at: new Date().toISOString() })) })
  }
}

export async function POST(req: NextRequest) {
  const { name, email } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })
  const db = adminDb()
  const { data, error } = await db.from('priority_contacts').upsert({ name: name.trim(), email: email?.trim() ?? null }, { onConflict: 'name' }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contact: data })
}

export async function DELETE(req: NextRequest) {
  const { name } = await req.json()
  const db = adminDb()
  await db.from('priority_contacts').delete().eq('name', name)
  return NextResponse.json({ success: true })
}
