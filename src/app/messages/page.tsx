'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  MessageSquare, Sparkles, Copy, Check, Mic, MicOff, Camera, X,
  Loader2, ChevronDown, ChevronUp, RotateCcw, Plus, AlertCircle,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────
interface Contact { id: string; name: string; relationship_type: string; notes: string | null }
interface Analysis {
  relationship: string; tone_detected: string; likely_intent: string
  zoe_goal: string; recommended_approach: string; confidence: number
}
interface ReplyOption { label: string; strategy?: string; text: string; reason?: string }
interface CoachResult {
  needs_clarification: boolean
  clarifying_question?: string | null
  analysis?: Analysis
  best_response?: ReplyOption
  alternatives?: ReplyOption[]
  response_id?: string | null
}

const RELATIONSHIP_TYPES = [
  { value: '', label: 'Detect automatically' },
  { value: 'romantic', label: 'Romantic' },
  { value: 'friend', label: 'Friend' },
  { value: 'family', label: 'Family' },
  { value: 'client', label: 'Client' },
  { value: 'business_partner', label: 'Business partner' },
  { value: 'employee', label: 'Employee' },
]

const GOALS = [
  '', 'Respond naturally', 'Be warm', 'Set a boundary', 'Clear up confusion',
  'Say no', 'Repair the conversation', 'Follow up', 'Be playful', 'Be professional',
]

const FEEDBACK_TAGS: { tag: string; label: string }[] = [
  { tag: 'sounds_like_me', label: 'Sounds like me' },
  { tag: 'too_soft', label: 'Too soft' },
  { tag: 'too_harsh', label: 'Too harsh' },
  { tag: 'too_long', label: 'Too long' },
  { tag: 'too_formal', label: 'Too formal' },
  { tag: 'not_what_i_meant', label: 'Not what I meant' },
]

const GLASS: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.11)',
  borderRadius: 20,
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
}

interface SpeechRecognitionEvent extends Event { results: SpeechRecognitionResultList; resultIndex: number }
interface SpeechRecognitionErrorEvent extends Event { error: string }
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean; interimResults: boolean; lang: string
  start(): void; stop(): void
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance
    webkitSpeechRecognition: new () => SpeechRecognitionInstance
  }
}

// ─── Chip row ─────────────────────────────────────────────────────────────
function ChipRow({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
      {options.map(o => (
        <button key={o.value || '_none'} onClick={() => onChange(value === o.value ? '' : o.value)}
          style={{
            padding: '8px 14px', borderRadius: 12, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: 'none',
            background: value === o.value ? 'rgba(155,92,255,0.85)' : 'rgba(255,255,255,0.07)',
            color: value === o.value ? 'white' : 'rgba(255,255,255,0.72)',
            outline: value === o.value ? '1.5px solid rgba(155,92,255,0.7)' : '1px solid rgba(255,255,255,0.1)',
            transition: 'all 0.15s ease',
          }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ─── Feedback row under a reply ────────────────────────────────────────────
function FeedbackRow({ responseId, onGiven }: { responseId: string | null; onGiven: (tag: string) => void }) {
  const [given, setGiven] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  async function send(tag: string) {
    if (!responseId || sending || given) return
    setSending(true)
    try {
      await fetch('/api/ai/communication-coach/feedback', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response_id: responseId, tag }),
      })
      setGiven(tag)
      onGiven(tag)
    } catch { /* non-fatal */ }
    finally { setSending(false) }
  }

  if (!responseId) return null

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
      {FEEDBACK_TAGS.map(f => (
        <button key={f.tag} onClick={() => send(f.tag)} disabled={sending || !!given}
          style={{
            padding: '4px 9px', borderRadius: 10, fontSize: 10.5, fontWeight: 600, cursor: given ? 'default' : 'pointer', border: 'none',
            background: given === f.tag ? 'rgba(155,92,255,0.35)' : 'rgba(255,255,255,0.05)',
            color: given === f.tag ? '#C4A8E8' : 'rgba(255,255,255,0.4)',
            opacity: given && given !== f.tag ? 0.4 : 1,
          }}>
          {given === f.tag ? '✓ ' : ''}{f.label}
        </button>
      ))}
    </div>
  )
}

// ─── Reply card (best response or alternative) ─────────────────────────────
function ReplyCard({ option, responseId, highlight, extraActions }: {
  option: ReplyOption; responseId: string | null; highlight?: boolean
  extraActions?: React.ReactNode
}) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(option.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div style={{ ...GLASS, padding: 16, background: highlight ? 'rgba(155,92,255,0.12)' : 'rgba(255,255,255,0.06)', border: `1.5px solid ${highlight ? 'rgba(155,92,255,0.3)' : 'rgba(255,255,255,0.1)'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: highlight ? '#C4A8E8' : 'rgba(255,255,255,0.45)', margin: 0 }}>
            {option.label}
          </p>
          {option.strategy && (
            <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>{option.strategy}</p>
          )}
        </div>
        <button onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', flexShrink: 0 }}>
          {copied ? <Check style={{ width: 13, height: 13, color: '#7FD97F' }} /> : <Copy style={{ width: 13, height: 13 }} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.65, color: 'rgba(255,255,255,0.9)', whiteSpace: 'pre-wrap' }}>{option.text}</p>
      {option.reason && (
        <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', marginTop: 8, fontStyle: 'italic' }}>{option.reason}</p>
      )}
      {extraActions}
      <FeedbackRow responseId={responseId} onGiven={() => {}} />
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function CommunicationCoach() {
  const [message, setMessage] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [direction, setDirection] = useState<'received' | 'written'>('received')
  const [relationshipType, setRelationshipType] = useState('')
  const [goal, setGoal] = useState('')

  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactId, setContactId] = useState<string | null>(null)
  const [showNewContact, setShowNewContact] = useState(false)
  const [newContactName, setNewContactName] = useState('')
  const [newContactType, setNewContactType] = useState('friend')
  const [savingContact, setSavingContact] = useState(false)

  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CoachResult | null>(null)
  const [clarifyAnswer, setClarifyAnswer] = useState('')
  const [editText, setEditText] = useState('')
  const [showAllAlts, setShowAllAlts] = useState(true)
  const [adjusting, setAdjusting] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/coach-contacts').then(r => r.json()).then(d => setContacts(d.contacts ?? [])).catch(() => {})
  }, [])

  const selectedContact = contacts.find(c => c.id === contactId) ?? null

  function selectContact(id: string) {
    if (contactId === id) { setContactId(null); return }
    setContactId(id)
    const c = contacts.find(x => x.id === id)
    if (c?.relationship_type) setRelationshipType(c.relationship_type)
  }

  async function saveNewContact() {
    if (!newContactName.trim()) return
    setSavingContact(true)
    try {
      const res = await fetch('/api/coach-contacts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newContactName.trim(), relationship_type: newContactType }),
      })
      const data = await res.json()
      if (data.contact) {
        setContacts(prev => [...prev, data.contact].sort((a, b) => a.name.localeCompare(b.name)))
        setContactId(data.contact.id)
        setRelationshipType(data.contact.relationship_type)
        setNewContactName('')
        setShowNewContact(false)
      }
    } catch { /* ignore */ }
    finally { setSavingContact(false) }
  }

  function startListening() {
    const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Voice dictation is not supported in this browser. Try Chrome or Safari.')
      return
    }
    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = message
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) finalText += (finalText ? ' ' : '') + transcript
        else interimText += transcript
      }
      setMessage(finalText)
      setInterim(interimText)
    }
    recognition.onend = () => { setListening(false); setInterim('') }
    recognition.onerror = () => { setListening(false); setInterim('') }
    recognition.start()
    setListening(true)
  }
  function stopListening() {
    recognitionRef.current?.stop()
    setListening(false)
    setInterim('')
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImage(reader.result as string)
    reader.readAsDataURL(file)
  }

  const submit = useCallback(async (opts?: { adjust?: string; previousResponseId?: string | null; overrideMessage?: string }) => {
    const msgToSend = opts?.overrideMessage ?? message
    if (!msgToSend.trim() && !image) return
    setLoading(true)
    setError(null)
    if (!opts?.adjust) setResult(null)
    try {
      const res = await fetch('/api/ai/communication-coach', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msgToSend,
          image: opts?.adjust ? undefined : image,
          direction,
          relationship: relationshipType,
          goal,
          contact_id: contactId,
          contact_name: selectedContact?.name ?? null,
          adjust: opts?.adjust ?? null,
          previous_response_id: opts?.previousResponseId ?? result?.response_id ?? null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Try again.')
        return
      }
      if (opts?.adjust && opts.adjust !== 'regenerate') {
        // Lightweight adjust — only best_response comes back, keep the rest.
        setResult(prev => prev ? { ...prev, best_response: data.best_response } : prev)
      } else {
        setResult(data)
        setEditText('')
      }
    } catch {
      setError('Network error — check your connection and try again.')
    } finally {
      setLoading(false)
      setAdjusting(null)
    }
  }, [message, image, direction, relationshipType, goal, contactId, selectedContact, result])

  async function answerClarification() {
    if (!clarifyAnswer.trim()) return
    const combined = `${message}\n\n(Additional context: ${clarifyAnswer.trim()})`
    setMessage(combined)
    setClarifyAnswer('')
    await submit({ overrideMessage: combined })
  }

  function handleAdjust(kind: 'shorter' | 'warmer' | 'firmer' | 'regenerate') {
    if (!result?.response_id) return
    setAdjusting(kind)
    submit({ adjust: kind, previousResponseId: result.response_id })
  }

  function reset() {
    setResult(null); setMessage(''); setImage(null); setError(null)
    setContactId(null); setRelationshipType(''); setGoal('')
  }

  const canSubmit = (message.trim() || image) && !loading

  return (
    <div className="bg-app min-h-screen">
      <AppLayout noPad className="pt-16">
        <div style={{ padding: '20px 20px 180px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(232,192,194,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare style={{ width: 18, height: 18, color: '#C87B7B' }} />
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#C87B7B' }}>LUNA Communication Coach</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Paste it. Talk it out. Get the response that sounds like you.</p>
            </div>
          </div>

          {!result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>

              {/* Message input */}
              <div style={{ ...GLASS, padding: 16 }}>
                <div style={{ position: 'relative' }}>
                  <textarea
                    value={message + (interim ? ' ' + interim : '')}
                    onChange={e => setMessage(e.target.value)}
                    placeholder={listening ? '🎙 Listening…' : 'Paste or type the message here…'}
                    rows={6}
                    className="luna-input"
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.07)',
                      border: `1px solid ${listening ? 'rgba(155,92,255,0.55)' : 'rgba(255,255,255,0.12)'}`,
                      borderRadius: 14, padding: '12px 46px 12px 14px', fontSize: 14.5, color: 'white',
                      outline: 'none', fontFamily: 'inherit', resize: 'none', lineHeight: 1.6,
                      colorScheme: 'dark', boxSizing: 'border-box',
                    }}
                  />
                  <button
                    onClick={listening ? stopListening : startListening}
                    className="absolute right-3 bottom-3 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      background: listening ? 'var(--violet)' : 'rgba(155,92,255,0.12)',
                      border: `1px solid ${listening ? 'var(--violet)' : 'rgba(155,92,255,0.25)'}`,
                    }}
                    title={listening ? 'Stop dictation' : 'Dictate'}>
                    {listening ? <MicOff className="h-3.5 w-3.5 text-white" /> : <Mic className="h-3.5 w-3.5" style={{ color: 'var(--violet)' }} />}
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.55)', cursor: 'pointer', padding: '6px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.05)' }}>
                    <Camera style={{ width: 14, height: 14 }} />
                    Upload screenshot
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  {image && (
                    <div style={{ position: 'relative', display: 'inline-flex' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image} alt="Screenshot" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }} />
                      <button onClick={() => setImage(null)} style={{ position: 'absolute', top: -5, right: -5, width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <X style={{ width: 10, height: 10, color: 'white' }} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Message type */}
              <div>
                <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Message type</p>
                <ChipRow
                  options={[{ value: 'received', label: 'Message I received' }, { value: 'written', label: 'Draft I wrote' }]}
                  value={direction}
                  onChange={v => setDirection((v || 'received') as 'received' | 'written')}
                />
              </div>

              {/* Contact selector */}
              <div>
                <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Who&apos;s this about?</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {contacts.map(c => (
                    <button key={c.id} onClick={() => selectContact(c.id)}
                      style={{
                        padding: '8px 14px', borderRadius: 12, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: 'none',
                        background: contactId === c.id ? 'rgba(155,92,255,0.85)' : 'rgba(255,255,255,0.07)',
                        color: contactId === c.id ? 'white' : 'rgba(255,255,255,0.72)',
                        outline: contactId === c.id ? '1.5px solid rgba(155,92,255,0.7)' : '1px solid rgba(255,255,255,0.1)',
                      }}>
                      {c.name}
                    </button>
                  ))}
                  <button onClick={() => setShowNewContact(v => !v)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 12, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.55)' }}>
                    <Plus style={{ width: 12, height: 12 }} /> New contact
                  </button>
                </div>
                {showNewContact && (
                  <div style={{ ...GLASS, padding: 14, marginTop: 10 }}>
                    <input
                      value={newContactName}
                      onChange={e => setNewContactName(e.target.value)}
                      placeholder="Name (e.g. Kaleb, Mom, a client's name)"
                      className="luna-input"
                      style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 14px', fontSize: 13.5, color: 'white', outline: 'none', marginBottom: 10, boxSizing: 'border-box', colorScheme: 'dark' }}
                    />
                    <select
                      value={newContactType}
                      onChange={e => setNewContactType(e.target.value)}
                      className="luna-input"
                      style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 14px', fontSize: 13.5, color: 'white', outline: 'none', marginBottom: 10 }}>
                      {RELATIONSHIP_TYPES.filter(r => r.value).map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    <button onClick={saveNewContact} disabled={savingContact || !newContactName.trim()}
                      style={{ width: '100%', padding: '10px', borderRadius: 12, background: 'linear-gradient(135deg, #9b5cff, #7C3FE0)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', opacity: savingContact || !newContactName.trim() ? 0.5 : 1 }}>
                      {savingContact ? 'Saving…' : 'Save contact'}
                    </button>
                  </div>
                )}
              </div>

              {/* Relationship */}
              <div>
                <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Relationship</p>
                <ChipRow options={RELATIONSHIP_TYPES} value={relationshipType} onChange={setRelationshipType} />
              </div>

              {/* Goal */}
              <div>
                <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Goal</p>
                <ChipRow options={GOALS.map(g => ({ value: g, label: g || 'Choose for me' }))} value={goal} onChange={setGoal} />
              </div>

              {error && (
                <div style={{ ...GLASS, padding: 14, background: 'rgba(224,94,94,0.08)', border: '1px solid rgba(224,94,94,0.22)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AlertCircle style={{ width: 16, height: 16, color: '#E05E5E', flexShrink: 0 }} />
                  <p style={{ fontSize: 12.5, color: '#E88F8F' }}>{error}</p>
                </div>
              )}

              <button
                onClick={() => submit()}
                disabled={!canSubmit}
                style={{ padding: '15px', borderRadius: 16, background: 'linear-gradient(135deg, #9b5cff, #7C3FE0)', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', border: 'none', opacity: canSubmit ? 1 : 0.45, boxShadow: '0 4px 20px rgba(155,92,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles style={{ width: 16, height: 16 }} />}
                {loading ? 'Writing your best response…' : 'Write my best response ✦'}
              </button>
            </div>
          )}

          {/* ── Results ── */}
          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>

              {result.needs_clarification ? (
                <div style={{ ...GLASS, padding: 18 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C4A8E8', marginBottom: 8 }}>LUNA needs one more thing</p>
                  <p style={{ fontSize: 14.5, color: 'white', lineHeight: 1.6, marginBottom: 14 }}>{result.clarifying_question}</p>
                  <textarea
                    value={clarifyAnswer}
                    onChange={e => setClarifyAnswer(e.target.value)}
                    placeholder="Your answer…"
                    rows={2}
                    className="luna-input"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 14px', fontSize: 13.5, color: 'white', outline: 'none', resize: 'none', marginBottom: 10, boxSizing: 'border-box', colorScheme: 'dark' }}
                  />
                  <button onClick={answerClarification} disabled={!clarifyAnswer.trim() || loading}
                    style={{ width: '100%', padding: '12px', borderRadius: 14, background: 'linear-gradient(135deg, #9b5cff, #7C3FE0)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', opacity: !clarifyAnswer.trim() || loading ? 0.5 : 1 }}>
                    {loading ? 'Thinking…' : 'Continue'}
                  </button>
                </div>
              ) : (
                <>
                  {/* LUNA's Read */}
                  {result.analysis && (
                    <div style={{ ...GLASS, padding: 16 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#C4A8E8', marginBottom: 10 }}>LUNA&apos;s Read</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {[
                          ['Relationship', result.analysis.relationship],
                          ['Tone detected', result.analysis.tone_detected],
                          ['What they may need', result.analysis.likely_intent],
                          ['Your goal', result.analysis.zoe_goal],
                          ['Best approach', result.analysis.recommended_approach],
                        ].map(([k, v]) => v && (
                          <div key={k} style={{ display: 'flex', gap: 8, fontSize: 13 }}>
                            <span style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0, minWidth: 130 }}>{k}</span>
                            <span style={{ color: 'rgba(255,255,255,0.88)' }}>{v}</span>
                          </div>
                        ))}
                      </div>
                      {typeof result.analysis.confidence === 'number' && (
                        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, Math.max(0, result.analysis.confidence))}%`, height: '100%', background: 'linear-gradient(90deg, #9b5cff, #C4A8E8)' }} />
                          </div>
                          <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.4)' }}>{result.analysis.confidence}% confident</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Best response */}
                  {result.best_response && (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>Best response</p>
                      <ReplyCard
                        option={result.best_response}
                        responseId={result.response_id ?? null}
                        highlight
                        extraActions={
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                            <button onClick={() => setEditText(result.best_response!.text)} style={{ fontSize: 11.5, padding: '6px 12px', borderRadius: 10, background: 'rgba(155,92,255,0.15)', color: '#C4A8E8', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                            <button onClick={() => handleAdjust('regenerate')} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, padding: '6px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                              {adjusting === 'regenerate' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw style={{ width: 11, height: 11 }} />} Regenerate
                            </button>
                            <button onClick={() => handleAdjust('shorter')} disabled={loading} style={{ fontSize: 11.5, padding: '6px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                              {adjusting === 'shorter' ? 'Shortening…' : 'Make shorter'}
                            </button>
                            <button onClick={() => handleAdjust('warmer')} disabled={loading} style={{ fontSize: 11.5, padding: '6px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                              {adjusting === 'warmer' ? 'Warming…' : 'Make warmer'}
                            </button>
                            <button onClick={() => handleAdjust('firmer')} disabled={loading} style={{ fontSize: 11.5, padding: '6px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                              {adjusting === 'firmer' ? 'Firming…' : 'Make firmer'}
                            </button>
                          </div>
                        }
                      />
                    </div>
                  )}

                  {editText && (
                    <div style={{ ...GLASS, padding: 16, background: 'rgba(90,180,90,0.07)', border: '1.5px solid rgba(90,180,90,0.2)' }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#7FD97F', marginBottom: 10 }}>Edit before sending</p>
                      <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={4}
                        className="luna-input" style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 14px', fontSize: 14, color: 'white', outline: 'none', fontFamily: 'inherit', resize: 'none', lineHeight: 1.6, colorScheme: 'dark', boxSizing: 'border-box' }} />
                      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                        <button onClick={() => navigator.clipboard.writeText(editText)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 12, background: 'rgba(90,180,90,0.15)', color: '#7FD97F', border: '1px solid rgba(90,180,90,0.25)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                          <Copy style={{ width: 14, height: 14 }} /> Copy final reply
                        </button>
                        <button onClick={() => setEditText('')} style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
                      </div>
                    </div>
                  )}

                  {/* Alternatives */}
                  {result.alternatives && result.alternatives.length > 0 && (
                    <div>
                      <button onClick={() => setShowAllAlts(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8 }}>
                        Different approaches
                        {showAllAlts ? <ChevronUp style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />}
                      </button>
                      {showAllAlts && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {result.alternatives.map((alt, i) => (
                            <ReplyCard key={i} option={alt} responseId={result.response_id ?? null} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <button onClick={reset} style={{ width: '100%', padding: '14px', borderRadius: 16, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 8 }}>
                    New message
                  </button>
                </>
              )}
            </div>
          )}

        </div>
      </AppLayout>
    </div>
  )
}
