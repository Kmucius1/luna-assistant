import { NextRequest, NextResponse } from 'next/server'

// LUNA's voice — locked to "Alesha" (ElevenLabs shared voice: laid-back,
// young Black/African American woman, warm chill energy) for a vibing,
// good-energy read-aloud tone. Keep these settings in sync if the voice is
// ever intentionally changed.
const LUNA_VOICE_ID = 'g2ojWlDmz1i80BHVnl6v'
const LUNA_VOICE_SETTINGS = {
  stability: 0.4,
  similarity_boost: 0.85,
  style: 0.55,
  use_speaker_boost: true,
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json() as { text?: string }
    if (!text?.trim()) {
      return NextResponse.json({ error: 'Text required' }, { status: 400 })
    }

    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Voice not configured' }, { status: 503 })
    }

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${LUNA_VOICE_ID}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.slice(0, 2000),
          // eleven_v3 is built for expressive quality, not latency — it was
          // making every LUNA reply (live voice call and text read-aloud)
          // feel slow to start. Flash v2.5 is ElevenLabs' low-latency model
          // built for conversational agents.
          model_id: 'eleven_flash_v2_5',
          voice_settings: LUNA_VOICE_SETTINGS,
        }),
      }
    )

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error('[chat/speak] ElevenLabs error:', res.status, errText)
      return NextResponse.json({ error: 'Voice generation failed' }, { status: 502 })
    }

    const audio = await res.arrayBuffer()
    return new NextResponse(audio, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (err) {
    console.error('[chat/speak] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Voice generation failed' }, { status: 500 })
  }
}
