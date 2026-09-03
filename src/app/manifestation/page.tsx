'use client'
import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Sparkles, Plus, Check, Star } from 'lucide-react'

const G: React.CSSProperties = {
  background: 'rgba(255,255,255,0.6)',
  border: '1px solid rgba(180,150,100,0.18)',
  borderRadius: 24,
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  boxShadow: '0 6px 24px rgba(60,46,24,0.08)',
}
const LBL: React.CSSProperties = {
  fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: '#5C4530',
  display: 'flex', alignItems: 'center', gap: 6,
  marginBottom: 10,
}

interface Intention { id: string; text: string; done: boolean }

const AFFIRMATIONS = [
  'I am becoming, not behind.',
  'Aligned action creates aligned results.',
  'What I water, grows.',
]

export default function ManifestationPage() {
  const [intentions, setIntentions] = useState<Intention[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const affirmation = AFFIRMATIONS[new Date().getDate() % AFFIRMATIONS.length]

  useEffect(() => {
    fetch('/api/intentions')
      .then(res => res.json())
      .then(data => setIntentions(data.intentions ?? []))
      .catch(err => console.error('[manifestation] failed to load intentions:', err))
      .finally(() => setLoading(false))
  }, [])

  async function addIntention() {
    const text = draft.trim()
    if (!text) return
    setDraft('')

    const tempId = `temp-${Date.now()}`
    setIntentions(list => [{ id: tempId, text, done: false }, ...list])

    try {
      const res = await fetch('/api/intentions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error('save failed')
      const { intention } = await res.json()
      setIntentions(list => list.map(i => i.id === tempId ? intention : i))
    } catch (err) {
      console.error('[manifestation] failed to save intention:', err)
      setIntentions(list => list.filter(i => i.id !== tempId))
      setDraft(text)
    }
  }

  async function toggle(id: string) {
    const prev = intentions
    const target = intentions.find(i => i.id === id)
    if (!target) return
    const nextDone = !target.done
    setIntentions(list => list.map(i => i.id === id ? { ...i, done: nextDone } : i))

    try {
      const res = await fetch('/api/intentions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, done: nextDone }),
      })
      if (!res.ok) throw new Error('update failed')
    } catch (err) {
      console.error('[manifestation] failed to update intention:', err)
      setIntentions(prev)
    }
  }

  return (
    <AppLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>

        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#F5EFE3', margin: 0 }}>Manifestation</h1>
        <p style={{ fontSize: 13, color: 'rgba(245,239,227,0.72)', margin: '-8px 0 0' }}>Intentions &amp; vision board</p>

        {/* Affirmation */}
        <div style={{ ...G, padding: '18px 20px', background: 'linear-gradient(140deg, rgba(255,255,255,0.6) 0%, rgba(250,244,232,0.7) 100%)' }}>
          <div style={LBL}><Sparkles style={{ width: 11, height: 11 }} />Today&apos;s Affirmation</div>
          <p style={{ fontSize: 15, fontStyle: 'italic', color: '#32284A', margin: 0 }}>&quot;{affirmation}&quot;</p>
        </div>

        {/* Add intention */}
        <div style={{ ...G, padding: '14px 16px' }}>
          <div style={LBL}><Star style={{ width: 11, height: 11 }} />Set an Intention</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addIntention()}
              placeholder="What are you calling in?"
              style={{
                flex: 1, background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(180,150,100,0.2)',
                borderRadius: 12, padding: '10px 14px', color: '#100C1E', fontSize: 13, outline: 'none',
              }}
            />
            <button
              onClick={addIntention}
              style={{
                flexShrink: 0, width: 40, height: 40, borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #5C4530 0%, #B8974F 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Plus style={{ width: 18, height: 18, color: '#100C1E' }} />
            </button>
          </div>
        </div>

        {/* Vision board list */}
        <div style={{ ...G, padding: '16px 18px' }}>
          <div style={LBL}><Sparkles style={{ width: 11, height: 11 }} />Vision Board</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {!loading && intentions.length === 0 && (
              <p style={{ fontSize: 13, color: '#8A8098', margin: 0 }}>
                Nothing here yet — set an intention above to start your vision board.
              </p>
            )}
            {intentions.map(i => (
              <button
                key={i.id}
                onClick={() => toggle(i.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 14,
                  border: `1px solid ${i.done ? 'rgba(107,227,139,0.35)' : 'rgba(180,150,100,0.18)'}`,
                  background: i.done ? 'rgba(107,227,139,0.08)' : 'rgba(255,255,255,0.5)',
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  border: `1px solid ${i.done ? '#6BE38B' : 'rgba(201,169,110,0.5)'}`,
                  background: i.done ? 'rgba(107,227,139,0.18)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {i.done && <Check style={{ width: 12, height: 12, color: '#6BE38B' }} strokeWidth={2.5} />}
                </div>
                <p style={{
                  fontSize: 13, margin: 0, flex: 1, lineHeight: 1.4,
                  color: i.done ? '#8A8098' : '#100C1E',
                  textDecoration: i.done ? 'line-through' : 'none',
                }}>
                  {i.text}
                </p>
              </button>
            ))}
          </div>
        </div>

      </div>
    </AppLayout>
  )
}
