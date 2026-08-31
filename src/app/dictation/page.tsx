'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Mic, Square, ChevronDown, Check, Sparkles, Archive } from 'lucide-react'
import { SmartInput } from '@/components/ui/SmartInput'

// ─── Locked light-palette card styles (bypass the shared GlassCard
// component's .glass-card / .soul-card classes, which force white text +
// dark surfaces under [data-theme="dark"] regardless of local CSS var
// overrides — GlassCard itself is out of scope for this retheme) ──────
const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.6)',
  border: '1px solid rgba(180,150,100,0.18)',
  borderRadius: 20,
  boxShadow: '0 6px 24px rgba(60,46,24,0.08)',
}
const SOUL_CARD: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(201,169,110,0.14) 0%, rgba(201,169,110,0.06) 100%)',
  border: '1px solid rgba(201,169,110,0.22)',
  borderRadius: 20,
}

type DictationType = 'journal' | 'dream' | 'task' | 'work_note' | 'message_draft' | 'spiritual' | 'career' | 'money_note'

const TYPES: { value: DictationType; label: string; emoji: string; prompt: string }[] = [
  { value: 'journal',       label: 'Journal',       emoji: '📓', prompt: 'Speak what is on your heart...' },
  { value: 'dream',         label: 'Dream',         emoji: '🌙', prompt: 'Tell me what you remember from the dream...' },
  { value: 'task',          label: 'Brain dump',    emoji: '⚡', prompt: 'Say every task, idea, or thing on your mind...' },
  { value: 'work_note',     label: 'Work note',     emoji: '💼', prompt: 'Talk through what needs to get done...' },
  { value: 'message_draft', label: 'Draft reply',   emoji: '💬', prompt: 'Tell me what happened and what you want to say...' },
  { value: 'spiritual',     label: 'Spiritual',     emoji: '✨', prompt: 'What are you feeling, sensing, or wondering...' },
  { value: 'career',        label: 'Career',        emoji: '🧭', prompt: 'Talk through your work thoughts and what feels true...' },
  { value: 'money_note',    label: 'Money',         emoji: '💰', prompt: 'What is on your mind about money or trading...' },
]

const DICTATION_PROMPTS = [
  'Talk it out. I will help you hear what is true.',
  'Say everything. Nothing needs to be organized yet.',
  'Speak the feeling before you speak the plan.',
  'Your voice knows the answer before your mind does.',
  'What is sitting in your body right now?',
  'Speak freely. I am listening.',
]

interface DictResult {
  emotional_read: string
  summary: string
  key_feelings: string[]
  extracted_tasks: Array<{ title: string; urgency: string }>
  extracted_people: string[]
  next_step: string
  affirmation: string
  suggested_type?: string
  human_design_note?: string
}

export default function DictationScreen() {
  const [type, setType]           = useState<DictationType>('journal')
  const [text, setText]           = useState('')
  const [recording, setRecording] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [result, setResult]       = useState<DictResult | null>(null)
  const [saved, setSaved]         = useState(false)
  const [promptIdx]               = useState(Math.floor(Math.random() * DICTATION_PROMPTS.length))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recogRef = useRef<any>(null)
  const selectedType = TYPES.find(t => t.value === type)!

  function startRecording() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('Your browser does not support speech recognition. Type instead.'); return }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recog = new SR() as any
    recog.continuous = true
    recog.interimResults = true
    recog.lang = 'en-US'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recog.onresult = (e: any) => {
      let transcript = ''
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript
      }
      setText(transcript)
    }

    recog.onerror = () => { setRecording(false) }
    recog.onend   = () => { setRecording(false) }

    recog.start()
    recogRef.current = recog
    setRecording(true)
  }

  function stopRecording() {
    recogRef.current?.stop()
    setRecording(false)
  }

  useEffect(() => {
    return () => { recogRef.current?.stop() }
  }, [])

  async function process() {
    if (!text.trim()) return
    setProcessing(true)
    setResult(null)
    try {
      const res = await fetch('/api/ai/dictation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, type }),
      })
      setResult(await res.json())
    } catch {
      setResult({
        emotional_read: 'There is a lot in what you shared. Take a breath.',
        summary: text.slice(0, 200),
        key_feelings: ['reflective'],
        extracted_tasks: [],
        extracted_people: [],
        next_step: 'Write down the one thing that matters most right now.',
        affirmation: 'You are allowed to feel everything and still choose clearly.',
      })
    } finally {
      setProcessing(false)
    }
  }

  function reset() {
    setText('')
    setResult(null)
    setSaved(false)
    stopRecording()
  }

  const URGENCY_COLORS: Record<string, string> = { critical: '#E05E5E', high: '#E08B4A', medium: 'var(--violet)', low: 'var(--mist)' }

  return (
    <div
      className="bg-sanctuary min-h-screen"
      style={{
        '--violet': '#5C4530',
        '--violet-deep': '#B08D52',
        '--depth': '#100C1E',
        '--mid': '#32284A',
        '--mist': '#5E5474',
        '--faint': '#8A8098',
      } as React.CSSProperties}
    >
      <AppLayout noPad className="pt-16">
        <div className="px-6 pb-nav">

          {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(201,169,110,0.12)' }}>
                <Mic className="h-5 w-5" style={{ color: 'var(--violet)' }} />
              </div>
              <div>
                <p className="text-sm font-medium uppercase tracking-wider" style={{ color: 'var(--violet)' }}>Dictation</p>
                <p className="text-xs" style={{ color: 'var(--mist)' }}>Speak. I am listening.</p>
              </div>
            </div>
            <a href="/chat" style={{
              fontSize: 12, fontWeight: 700, color: '#5C4530', textDecoration: 'none',
              padding: '6px 12px', borderRadius: 20, background: 'rgba(201,169,110,0.10)',
              border: '1px solid rgba(201,169,110,0.22)',
            }}>Talk to LUNA →</a>
          </div>

          <h1 className="font-display text-2xl font-semibold mb-1" style={{ color: '#F5EFE3' }}>
            {DICTATION_PROMPTS[promptIdx]}
          </h1>
          <p className="text-sm mb-6" style={{ color: 'rgba(245,239,227,0.75)' }}>
            Your voice holds the answer. Say everything. I will help you hear what is true.
          </p>

          {!result ? (
            <>
              {/* Type selector */}
              <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
                {TYPES.map(t => (
                  <button key={t.value} onClick={() => setType(t.value)}
                    className="flex-none px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all"
                    style={{
                      background: type === t.value ? 'var(--violet)' : 'rgba(201,169,110,0.08)',
                      color: type === t.value ? 'white' : 'var(--mid)',
                    }}>
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>

              {/* Mic / recording area */}
              <div className="mb-4">
                {recording ? (
                  <div className="p-6 text-center" style={CARD}>
                    <div className="flex justify-center gap-1 mb-4 h-5 items-end">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="mic-bar" />
                      ))}
                    </div>
                    <p className="text-sm font-medium mb-4" style={{ color: 'var(--violet)' }}>Listening...</p>
                    <button onClick={stopRecording}
                      className="w-14 h-14 rounded-full mx-auto flex items-center justify-center"
                      style={{ background: '#E05E5E' }}>
                      <Square className="h-5 w-5 text-white" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center mb-4">
                    <button onClick={startRecording}
                      className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3 transition-all active:scale-95 animate-pulse-glow"
                      style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))', boxShadow: '0 8px 32px rgba(201,169,110,0.35)' }}>
                      <Mic className="h-8 w-8 text-white" />
                    </button>
                    <p className="text-sm" style={{ color: 'var(--mist)' }}>Tap to speak</p>
                  </div>
                )}
              </div>

              {/* OR type */}
              <div className="relative flex items-center gap-3 mb-4">
                <div className="flex-1 h-px" style={{ background: 'rgba(201,169,110,0.1)' }} />
                <p className="text-xs" style={{ color: 'var(--faint)' }}>or type</p>
                <div className="flex-1 h-px" style={{ background: 'rgba(201,169,110,0.1)' }} />
              </div>

              <div className="mb-5">
                <SmartInput
                  context={selectedType?.prompt ?? 'what is on your mind right now'}
                  placeholder={selectedType?.prompt ?? 'Speak or type...'}
                  value={text}
                  onChange={setText}
                  patternType="dictation"
                  rows={5}
                />
              </div>

              <button onClick={process} disabled={!text.trim() || processing}
                className="w-full py-4 rounded-2xl font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                <Sparkles className="inline h-4 w-4 mr-2" />
                {processing ? 'Listening to what is true...' : 'Help me hear what is true'}
              </button>
            </>
          ) : (
            /* Results */
            <div className="space-y-4 animate-fade-up">
              {/* Emotional read */}
              <div className="p-5" style={SOUL_CARD}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>What I heard</p>
                <p className="text-base leading-relaxed font-display italic" style={{ color: 'var(--depth)' }}>
                  &ldquo;{result.emotional_read}&rdquo;
                </p>
              </div>

              {/* Key feelings */}
              {result.key_feelings?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {result.key_feelings.map((f, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-full text-xs font-medium"
                      style={{ background: 'rgba(201,169,110,0.1)', color: 'var(--violet)' }}>
                      {f}
                    </span>
                  ))}
                </div>
              )}

              {/* Summary */}
              <div className="p-5" style={CARD}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--mist)' }}>Summary</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--depth)' }}>{result.summary}</p>
              </div>

              {/* Tasks */}
              {result.extracted_tasks?.length > 0 && (
                <div className="p-5" style={CARD}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--violet)' }}>
                    Mentioned tasks ({result.extracted_tasks.length})
                  </p>
                  <div className="space-y-2">
                    {result.extracted_tasks.map((t, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: URGENCY_COLORS[t.urgency] ?? 'var(--mist)' }} />
                        <p className="text-sm" style={{ color: 'var(--depth)' }}>{t.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next step */}
              <div className="p-5" style={CARD}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>Next step</p>
                <p className="text-base font-medium" style={{ color: 'var(--depth)' }}>{result.next_step}</p>
              </div>

              {/* HD note */}
              {result.human_design_note && (
                <div className="p-5" style={CARD}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>Design note</p>
                  <p className="text-sm" style={{ color: 'var(--mid)' }}>{result.human_design_note}</p>
                </div>
              )}

              {/* Affirmation */}
              <div className="rounded-2xl p-5 text-center" style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.1)' }}>
                <p className="font-display text-base italic" style={{ color: 'var(--depth)' }}>
                  &ldquo;{result.affirmation}&rdquo;
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={reset}
                  className="flex-1 py-3.5 rounded-2xl font-semibold text-center transition-all"
                  style={{ background: 'rgba(201,169,110,0.08)', color: 'var(--violet)' }}>
                  Speak again
                </button>
                <button
                  onClick={() => setSaved(true)}
                  className="flex-1 py-3.5 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 transition-all active:scale-95"
                  style={{ background: saved ? 'var(--herb)' : 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                  {saved ? <><Check className="h-4 w-4" /> Saved</> : <><Archive className="h-4 w-4" /> Save</>}
                </button>
              </div>
            </div>
          )}

        </div>
      </AppLayout>
    </div>
  )
}
