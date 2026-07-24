import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// First real audio-persistence path in this app — confirmed via audit that
// no Storage bucket or upload flow existed anywhere before this (Web Speech
// API elsewhere only ever transcribes live, never saves the recording).
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('audio') as File | null
    if (!file) return NextResponse.json({ error: 'audio file required' }, { status: 400 })

    const ext = file.type.includes('webm') ? 'webm' : file.type.includes('mp4') ? 'm4a' : 'webm'
    const path = `${user.id}/${Date.now()}.${ext}`

    const { error } = await supabase.storage.from('brain-dump').upload(path, file, { contentType: file.type, upsert: false })
    if (error) throw error

    return NextResponse.json({ storage_path: path })
  } catch (error) {
    console.error('[brain-dump/audio-upload] error:', error)
    return NextResponse.json({ error: 'Upload failed — the recording is still on your device, try again' }, { status: 500 })
  }
}
