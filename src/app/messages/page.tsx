'use client'
import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { MessageSquare, Sparkles, Copy, Check, AlertTriangle, Shield, ChevronDown, ChevronUp, ArrowLeft, ArrowRight } from 'lucide-react'
import { SmartInput } from '@/components/ui/SmartInput'

const ACTIVATED_LEVELS = [
  { value: 1, label: 'Calm',      emoji: '😌', color: '#8AB88A' },
  { value: 2, label: 'Mild',      emoji: '🌀', color: '#8B9BC4' },
  { value: 3, label: 'Stirred',   emoji: '😤', color: '#C9A96E' },
  { value: 4, label: 'Activated', emoji: '🔥', color: '#E05E5E' },
  { value: 5, label: 'Reactive',  emoji: '⚡', color: '#E05E5E' },
]

const RELATIONSHIP_TYPES = [
  { label: '💼 Client',             short: 'Client'   },
  { label: '🤝 Business partner',   short: 'Business' },
  { label: '👨‍👩‍👧 Family',           short: 'Family'   },
  { label: '💕 Partner / romantic', short: 'Romantic' },
  { label: '👯 Friend',             short: 'Friend'   },
  { label: '👥 Team member',        short: 'Team'     },
  { label: '🙍 Acquaintance',       short: 'Acquaint' },
]

const STEPS = [
  { id: 1, label: 'Sender',       question: 'Who sent this?'                    },
  { id: 2, label: 'Relationship', question: 'What is your relationship?'        },
  { id: 3, label: 'Your energy',  question: 'How activated are you right now?'  },
  { id: 4, label: 'The message',  question: 'Paste or speak the message'        },
]

const GLASS: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.11)',
  borderRadius: 20,
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
}

interface CoachResult {
  what_they_mean?: string
  emotional_tone?: string
  reactive_warning?: 'yes' | 'no'
  reactive_reason?: string
  what_not_to_say?: string
  wound_reply?: string
  soft_reply?: string
  direct_reply?: string
  confident_reply?: string
  wisdom_reply?: string
  reflection?: string
}

function ReplyCard({ label, text, highlight, onEdit }: {
  label: string; text: string; highlight?: boolean; onEdit: (t: string) => void
}) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div style={{ ...GLASS, padding: '16px', background: highlight ? 'rgba(139,111,184,0.12)' : 'rgba(255,255,255,0.06)', border: `1.5px solid ${highlight ? 'rgba(139,111,184,0.3)' : 'rgba(255,255,255,0.1)'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: highlight ? '#C4A8E8' : 'rgba(255,255,255,0.45)' }}>{label}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onEdit(text)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, background: 'rgba(139,111,184,0.15)', color: '#C4A8E8', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            Edit & Use
          </button>
          <button onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>
            {copied ? <Check style={{ width: 14, height: 14, color: '#7FD97F' }} /> : <Copy style={{ width: 14, height: 14 }} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.65, color: 'rgba(255,255,255,0.88)' }}>{text}</p>
    </div>
  )
}

// ─── Progress bar with completed answers ─────────────────────────────────────
function ProgressBar({ step, sender, relationship, activated }: {
  step: number; sender: string; relationship: string; activated: number
}) {
  const activatedInfo = ACTIVATED_LEVELS.find(l => l.value === activated)
  const relShort = RELATIONSHIP_TYPES.find(r => r.label === relationship)?.short ?? relationship.split(' ').slice(-1)[0] ?? ''

  const answers = [
    sender || null,
    relShort || null,
    activatedInfo ? `${activatedInfo.emoji} ${activatedInfo.label}` : null,
    null,
  ]

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Segment bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 14 }}>
        {STEPS.map((s, i) => {
          const done    = step > s.id
          const current = step === s.id
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              {/* Connector line before */}
              {i > 0 && (
                <div style={{ flex: 1, height: 2, background: done || current ? 'rgba(139,111,184,0.7)' : 'rgba(255,255,255,0.1)', transition: 'background 0.3s ease' }} />
              )}
              {/* Step dot */}
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? 'rgba(139,111,184,0.9)' : current ? 'rgba(139,111,184,0.15)' : 'rgba(255,255,255,0.07)',
                border: done ? '2px solid #8B6FB8' : current ? '2px solid rgba(139,111,184,0.8)' : '2px solid rgba(255,255,255,0.12)',
                transition: 'all 0.3s ease',
                boxShadow: current ? '0 0 12px rgba(139,111,184,0.35)' : undefined,
              }}>
                {done ? (
                  <Check style={{ width: 13, height: 13, color: 'white' }} />
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 800, color: current ? '#C4A8E8' : 'rgba(255,255,255,0.3)' }}>{s.id}</span>
                )}
              </div>
              {/* Connector line after (last step) */}
              {i === STEPS.length - 1 && (
                <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.1)' }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Answer chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {answers.map((ans, i) => {
          if (!ans || i >= step - 1) return null
          return (
            <span key={i} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(139,111,184,0.15)', border: '1px solid rgba(139,111,184,0.25)', color: '#C4A8E8' }}>
              {ans}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function CommunicationCoach() {
  const [step,         setStep]         = useState(1)
  const [sender,       setSender]       = useState('')
  const [relationship, setRelationship] = useState('')
  const [activated,    setActivated]    = useState(1)
  const [message,      setMessage]      = useState('')
  const [loading,      setLoading]      = useState(false)
  const [result,       setResult]       = useState<CoachResult | null>(null)
  const [showWound,    setShowWound]    = useState(false)
  const [showNotSay,   setShowNotSay]   = useState(false)
  const [editText,     setEditText]     = useState('')
  const [editCopied,   setEditCopied]   = useState(false)

  function next() { if (step < 4) setStep(s => s + 1) }
  function back() { if (step > 1) setStep(s => s - 1) }

  function handleEdit(text: string) {
    setEditText(text)
    setTimeout(() => document.getElementById('edit-reply-box')?.focus(), 50)
  }
  function copyEdit() {
    navigator.clipboard.writeText(editText)
    setEditCopied(true)
    setTimeout(() => setEditCopied(false), 2000)
  }

  async function analyze() {
    if (!message.trim()) return
    setLoading(true)
    setResult(null)
    setEditText('')
    try {
      const res = await fetch('/api/ai/message-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sender_name: sender, context: relationship, activated_level: activated }),
      })
      if (!res.ok) throw new Error('non-2xx')
      setResult(await res.json())
    } catch {
      setResult({
        what_they_mean: 'Take a breath before responding.',
        reactive_warning: activated >= 3 ? 'yes' : 'no',
        reactive_reason: activated >= 3 ? 'Your activation level is high. Wait before sending.' : undefined,
        soft_reply: 'Thank you for reaching out. Let me get back to you with clarity.',
        direct_reply: "I'll look into this and follow up shortly.",
        confident_reply: 'I hear you. I will respond when I am ready.',
        wisdom_reply: 'I appreciate your message. Give me a moment to respond with intention.',
        reflection: 'Am I responding from my wound or from my wisdom right now?',
      })
    } finally {
      setLoading(false)
    }
  }

  function reset() { setResult(null); setMessage(''); setSender(''); setRelationship(''); setActivated(1); setStep(1) }

  const isReactive = result?.reactive_warning === 'yes' || activated >= 4
  const activatedInfo = ACTIVATED_LEVELS.find(l => l.value === activated)!

  return (
    <div className="bg-app min-h-screen">
      <AppLayout noPad className="pt-16">
        <div style={{ padding: '20px 20px 180px' }}>

          {/* Page header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(232,192,194,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare style={{ width: 18, height: 18, color: '#C87B7B' }} />
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#C87B7B' }}>Communication Coach</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Respond from wisdom, not wound.</p>
            </div>
          </div>

          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 20 }}>
            Before you respond.
          </h1>

          {!result ? (
            <>
              {/* Progress bar */}
              <ProgressBar step={step} sender={sender} relationship={relationship} activated={activated} />

              {/* Step label */}
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.13em', color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>
                Step {step} of 4
              </p>
              <h2 style={{ fontSize: 19, fontWeight: 700, color: 'white', marginBottom: 20, fontFamily: 'var(--font-display)' }}>
                {STEPS[step - 1].question}
              </h2>

              {/* ── Step 1: Who sent this ── */}
              {step === 1 && (
                <div style={{ ...GLASS, padding: '20px' }}>
                  <input
                    type="text"
                    value={sender}
                    onChange={e => setSender(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && next()}
                    placeholder="Kaleb, a client, mom, team member…"
                    autoFocus
                    className="luna-input"
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 12, padding: '12px 16px', fontSize: 15, color: 'white',
                      outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', colorScheme: 'dark',
                    }}
                  />
                </div>
              )}

              {/* ── Step 2: Relationship ── */}
              {step === 2 && (
                <div style={{ ...GLASS, padding: '20px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {RELATIONSHIP_TYPES.map(r => (
                      <button key={r.label} onClick={() => setRelationship(relationship === r.label ? '' : r.label)}
                        style={{
                          padding: '9px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
                          background: relationship === r.label ? 'rgba(139,111,184,0.85)' : 'rgba(255,255,255,0.07)',
                          color: relationship === r.label ? 'white' : 'rgba(255,255,255,0.72)',
                          outline: relationship === r.label ? '1.5px solid rgba(139,111,184,0.7)' : '1px solid rgba(255,255,255,0.1)',
                          transition: 'all 0.15s ease',
                        }}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Step 3: Activation level ── */}
              {step === 3 && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 12 }}>
                    {ACTIVATED_LEVELS.map(l => (
                      <button key={l.value} onClick={() => setActivated(l.value)}
                        style={{
                          padding: '14px 0', borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer', border: 'none', transition: 'all 0.15s ease',
                          background: activated === l.value ? `${l.color}18` : 'rgba(255,255,255,0.06)',
                          outline: activated === l.value ? `2px solid ${l.color}60` : '1px solid rgba(255,255,255,0.1)',
                        }}>
                        <span style={{ fontSize: 22 }}>{l.emoji}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: activated === l.value ? l.color : 'rgba(255,255,255,0.4)' }}>{l.label}</span>
                      </button>
                    ))}
                  </div>
                  {activated >= 4 && (
                    <div style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(224,94,94,0.08)', border: '1px solid rgba(224,94,94,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <AlertTriangle style={{ width: 15, height: 15, flexShrink: 0, color: '#E05E5E' }} />
                      <p style={{ fontSize: 12, color: '#E05E5E' }}>You are activated. LUNA will add extra protection in your replies.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 4: The message ── */}
              {step === 4 && (
                <SmartInput
                  context="a message I received that I need help responding to wisely — not reactively"
                  placeholder="Paste or speak the message here…"
                  value={message}
                  onChange={setMessage}
                  patternType="messages"
                  rows={6}
                />
              )}

              {/* Navigation */}
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                {step > 1 && (
                  <button onClick={back} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '13px 18px', borderRadius: 16, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    <ArrowLeft style={{ width: 16, height: 16 }} /> Back
                  </button>
                )}
                {step < 4 ? (
                  <button
                    onClick={next}
                    disabled={step === 1 && !sender.trim()}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', borderRadius: 16, background: 'linear-gradient(135deg, #8B6FB8, #6A4F9B)', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', border: 'none', opacity: step === 1 && !sender.trim() ? 0.45 : 1, boxShadow: '0 4px 20px rgba(139,111,184,0.3)', transition: 'opacity 0.2s ease' }}>
                    Continue <ArrowRight style={{ width: 16, height: 16 }} />
                  </button>
                ) : (
                  <button
                    onClick={analyze}
                    disabled={!message.trim() || loading}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', borderRadius: 16, background: 'linear-gradient(135deg, #8B6FB8, #6A4F9B)', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', border: 'none', opacity: !message.trim() || loading ? 0.45 : 1, boxShadow: '0 4px 20px rgba(139,111,184,0.3)', transition: 'opacity 0.2s ease' }}>
                    <Sparkles style={{ width: 16, height: 16 }} />
                    {loading ? 'Reading between the lines…' : 'Help me respond from wisdom'}
                  </button>
                )}
              </div>
            </>
          ) : (
            // ── Results ────────────────────────────────────────────────────
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Answer recap chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                {[sender, relationship, `${activatedInfo.emoji} ${activatedInfo.label}`].filter(Boolean).map((v, i) => (
                  <span key={i} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(139,111,184,0.15)', border: '1px solid rgba(139,111,184,0.25)', color: '#C4A8E8' }}>{v}</span>
                ))}
              </div>

              {isReactive && (
                <div style={{ ...GLASS, padding: 16, background: 'rgba(224,94,94,0.07)', border: '1.5px solid rgba(224,94,94,0.22)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <AlertTriangle style={{ width: 18, height: 18, flexShrink: 0, color: '#E05E5E', marginTop: 2 }} />
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#E05E5E', marginBottom: 5 }}>Pause before sending.</p>
                      <p style={{ fontSize: 12, color: '#C87070', lineHeight: 1.6 }}>{result.reactive_reason ?? 'Breathe first. The replies below come from your highest self.'}</p>
                    </div>
                  </div>
                </div>
              )}

              {result.reflection && (
                <div style={{ ...GLASS, padding: '18px 20px', textAlign: 'center' }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontStyle: 'italic', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
                    &ldquo;{result.reflection}&rdquo;
                  </p>
                </div>
              )}

              {result.what_they_mean && (
                <div style={{ ...GLASS, padding: 16 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#C4A8E8', marginBottom: 8 }}>What they actually mean</p>
                  <p style={{ fontSize: 14, lineHeight: 1.65, color: 'rgba(255,255,255,0.85)' }}>{result.what_they_mean}</p>
                  {result.emotional_tone && (
                    <span style={{ display: 'inline-block', marginTop: 8, fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(139,111,184,0.12)', color: '#C4A8E8', textTransform: 'capitalize' }}>{result.emotional_tone}</span>
                  )}
                </div>
              )}

              {result.what_not_to_say && (
                <div>
                  <button onClick={() => setShowNotSay(!showNotSay)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.45)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8, fontWeight: 600 }}>
                    <Shield style={{ width: 14, height: 14 }} />
                    {showNotSay ? 'Hide' : 'Show'} what not to say
                    {showNotSay ? <ChevronUp style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />}
                  </button>
                  {showNotSay && (
                    <div style={{ ...GLASS, padding: 14, background: 'rgba(201,169,110,0.07)', border: '1px solid rgba(201,169,110,0.2)' }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C9A96E', marginBottom: 8 }}>Do not say this right now</p>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)' }}>{result.what_not_to_say}</p>
                    </div>
                  )}
                </div>
              )}

              {result.wisdom_reply && <ReplyCard label="✨ Wisdom reply — send this one" text={result.wisdom_reply} highlight onEdit={handleEdit} />}

              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>Or choose your tone</p>
              {result.soft_reply      && <ReplyCard label="🌸 Soft + Warm"      text={result.soft_reply}      onEdit={handleEdit} />}
              {result.direct_reply    && <ReplyCard label="🎯 Direct + Clear"    text={result.direct_reply}    onEdit={handleEdit} />}
              {result.confident_reply && <ReplyCard label="🛡 Confident + Calm"  text={result.confident_reply} onEdit={handleEdit} />}

              {editText && (
                <div style={{ ...GLASS, padding: 16, background: 'rgba(90,180,90,0.07)', border: '1.5px solid rgba(90,180,90,0.2)' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#7FD97F', marginBottom: 10 }}>Edit before sending</p>
                  <textarea id="edit-reply-box" value={editText} onChange={e => setEditText(e.target.value)} rows={4}
                    className="luna-input" style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 14px', fontSize: 14, color: 'white', outline: 'none', fontFamily: 'inherit', resize: 'none', lineHeight: 1.6, colorScheme: 'dark' as React.CSSProperties['colorScheme'], boxSizing: 'border-box' }} />
                  <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                    <button onClick={copyEdit} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 12, background: 'rgba(90,180,90,0.15)', color: '#7FD97F', border: '1px solid rgba(90,180,90,0.25)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      {editCopied ? <><Check style={{ width: 14, height: 14 }} /> Copied!</> : <><Copy style={{ width: 14, height: 14 }} /> Copy final reply</>}
                    </button>
                    <button onClick={() => setEditText('')} style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
                  </div>
                </div>
              )}

              {result.wound_reply && (
                <div>
                  <button onClick={() => setShowWound(!showWound)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    {showWound ? <ChevronUp style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />}
                    {showWound ? 'Hide' : 'See'} wound reply (awareness only — do not send)
                  </button>
                  {showWound && (
                    <div style={{ ...GLASS, padding: 14, marginTop: 8, background: 'rgba(224,94,94,0.05)', border: '1px solid rgba(224,94,94,0.12)' }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#E05E5E', marginBottom: 8 }}>Wound reply — do not send</p>
                      <p style={{ fontSize: 13, fontStyle: 'italic', color: 'rgba(255,255,255,0.6)' }}>{result.wound_reply}</p>
                    </div>
                  )}
                </div>
              )}

              <button onClick={reset} style={{ width: '100%', padding: '14px', borderRadius: 16, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 8 }}>
                New message
              </button>
            </div>
          )}
        </div>
      </AppLayout>
    </div>
  )
}
