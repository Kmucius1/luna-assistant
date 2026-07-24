'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Mic, MicOff, Send, RotateCcw, Volume2, Loader2 } from 'lucide-react'

const BG     = 'linear-gradient(180deg, #FBF8F2 0%, #F6F1E7 55%, #F0E9DA 100%)'
const GOLDEN = '#C9A96E'
const VIOLET = '#B8974F'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  time_period?: string
}

// ─── Time-aware label shown above LUNA opener ──────────────────
function getTimeBadge(hour: number): string {
  if (hour >= 5  && hour < 8)  return 'Early Morning'
  if (hour >= 8  && hour < 10) return 'Morning'
  if (hour >= 10 && hour < 12) return 'Mid-Morning'
  if (hour >= 12 && hour < 14) return 'Midday'
  if (hour >= 14 && hour < 17) return 'Afternoon'
  if (hour >= 17 && hour < 19) return 'Evening'
  if (hour >= 19 && hour < 21) return 'Night'
  if (hour >= 21 && hour < 23) return 'Late Night'
  return 'Late Night'
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function ChatPage() {
  const [messages,   setMessages]   = useState<Message[]>([])
  const [input,      setInput]      = useState('')
  const [sending,    setSending]    = useState(false)
  const [listening,  setListening]  = useState(false)
  const [loaded,     setLoaded]     = useState(false)
  const [historyError, setHistoryError] = useState(false)
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const [speakLoadingId, setSpeakLoadingId] = useState<string | null>(null)
  const tz = typeof window !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'America/New_York'

  const bottomRef   = useRef<HTMLDivElement>(null)
  const inputRef    = useRef<HTMLTextAreaElement>(null)
  const audioRef    = useRef<HTMLAudioElement | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recogRef    = useRef<any>(null)

  // ─── Read aloud ────────────────────────────────────────────────
  async function speak(msg: Message) {
    if (speakingId === msg.id) {
      audioRef.current?.pause()
      setSpeakingId(null)
      return
    }
    audioRef.current?.pause()
    setSpeakingId(null)
    setSpeakLoadingId(msg.id)
    try {
      const res = await fetch('/api/chat/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: msg.content }),
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => { setSpeakingId(null); URL.revokeObjectURL(url) }
      audio.onerror = () => { setSpeakingId(null); URL.revokeObjectURL(url) }
      await audio.play()
      setSpeakingId(msg.id)
    } catch {
      /* voice unavailable — fail silently, text is already on screen */
    } finally {
      setSpeakLoadingId(null)
    }
  }

  useEffect(() => () => { audioRef.current?.pause() }, [])

  // ─── Load history ──────────────────────────────────────────────
  // Mobile PWAs frequently hit a transient network blip right as a
  // backgrounded tab comes back to the foreground — retry once before
  // giving up, and if it still fails, show a visible retry affordance
  // instead of silently leaving the conversation looking empty/lost.
  const loadHistory = useCallback(async (isRetry = false) => {
    setHistoryError(false)
    try {
      const res = await fetch(`/api/chat/history?tz=${encodeURIComponent(tz)}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { messages: Message[] }
      if (data.messages?.length) setMessages(data.messages)
      setLoaded(true)
    } catch {
      if (!isRetry) {
        await new Promise(r => setTimeout(r, 1200))
        return loadHistory(true)
      }
      setHistoryError(true)
      setLoaded(true)
    }
  }, [tz])

  useEffect(() => { void loadHistory() }, [loadHistory])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ─── Send ──────────────────────────────────────────────────────
  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setInput('')

    const userMsg: Message = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setSending(true)

    // Optimistic LUNA typing indicator
    const typingId = `typing_${Date.now()}`
    setMessages(prev => [...prev, {
      id: typingId,
      role: 'assistant',
      content: '…',
      created_at: new Date().toISOString(),
    }])

    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, tz }),
      })
      const data = await res.json() as { response?: string; error?: string }
      const reply = data.response ?? "I'm here with you — try again in a moment."
      setMessages(prev => prev.map(m =>
        m.id === typingId
          ? { ...m, id: `a_${Date.now()}`, content: reply }
          : m
      ))
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === typingId
          ? { ...m, id: `a_${Date.now()}`, content: "Something got in the way. I'm still here — try again." }
          : m
      ))
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  // ─── Voice input ───────────────────────────────────────────────
  function toggleVoice() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('Speech recognition not available in this browser. Try Chrome.'); return }

    if (listening) {
      recogRef.current?.stop()
      setListening(false)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recog = new SR() as any
    recog.continuous = false
    recog.interimResults = true
    recog.lang = 'en-US'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recog.onresult = (e: any) => {
      let transcript = ''
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript
      }
      setInput(transcript)
    }

    recog.onend = () => {
      setListening(false)
      // Auto-send if there's content from voice
      setInput(prev => {
        if (prev.trim()) void send(prev)
        return ''
      })
    }

    recog.onerror = () => setListening(false)

    recog.start()
    recogRef.current = recog
    setListening(true)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send(input)
    }
  }

  async function clearChat() {
    setMessages([])
    await loadHistory()
  }

  const hour = new Date().getHours()

  return (
    <div style={{ background: BG, minHeight: '100vh' }}>
      <AppLayout noPad>

        {/* ── Header ── */}
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(180,150,100,0.16)',
          padding: '14px 20px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: `linear-gradient(135deg, ${VIOLET}, ${GOLDEN})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, color: '#FFFFFF',
            }}>✦</div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#100C1E', letterSpacing: '-0.01em' }}>LUNA</p>
              <p style={{ fontSize: 11, color: '#5E5474', letterSpacing: '0.06em' }}>{getTimeBadge(hour)} · listening</p>
            </div>
          </div>
          <button
            onClick={() => void clearChat()}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5E5474', padding: 6 }}
            title="Start fresh">
            <RotateCcw style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* ── Messages ── */}
        <div style={{ padding: '80px 16px 140px', maxWidth: 600, margin: '0 auto' }}>
          {!loaded && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: 22, opacity: 0.4, color: '#100C1E' }}>✦</div>
            </div>
          )}

          {loaded && historyError && messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <p style={{ fontSize: 14, color: '#5E5474', marginBottom: 14 }}>
                Couldn&apos;t load your conversation — it&apos;s still there, this is just a connection hiccup.
              </p>
              <button
                onClick={() => { setLoaded(false); void loadHistory() }}
                style={{ padding: '10px 20px', borderRadius: 14, border: '1px solid rgba(180,150,100,0.3)', background: 'rgba(255,255,255,0.6)', color: '#100C1E', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Try again
              </button>
            </div>
          )}

          {loaded && messages.map((msg, idx) => {
            const isLuna = msg.role === 'assistant'
            const isTyping = msg.content === '…'
            const showTime = idx === 0 || (
              new Date(msg.created_at).getTime() - new Date(messages[idx - 1].created_at).getTime() > 5 * 60 * 1000
            )
            return (
              <div key={msg.id}>
                {showTime && (
                  <p style={{ textAlign: 'center', fontSize: 11, color: '#8A8098', margin: '16px 0 8px', letterSpacing: '0.06em' }}>
                    {formatTime(msg.created_at)}
                  </p>
                )}
                <div style={{
                  display: 'flex',
                  justifyContent: isLuna ? 'flex-start' : 'flex-end',
                  marginBottom: 6,
                  alignItems: 'flex-end',
                  gap: 8,
                }}>
                  {/* LUNA avatar */}
                  {isLuna && (
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: `linear-gradient(135deg, ${VIOLET}, ${GOLDEN})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, marginBottom: 2, color: '#FFFFFF',
                    }}>✦</div>
                  )}
                  <div style={{
                    maxWidth: '78%',
                    padding: isTyping ? '12px 18px' : '13px 16px',
                    borderRadius: isLuna ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
                    background: isLuna
                      ? 'rgba(255,255,255,0.7)'
                      : `linear-gradient(135deg, ${GOLDEN}, #B8903A)`,
                    border: isLuna ? '1px solid rgba(180,150,100,0.18)' : 'none',
                    boxShadow: '0 6px 24px rgba(60,46,24,0.08)',
                    backdropFilter: isLuna ? 'blur(12px)' : 'none',
                    WebkitBackdropFilter: isLuna ? 'blur(12px)' : 'none',
                  }}>
                    {isTyping ? (
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center', height: 16 }}>
                        {[0, 1, 2].map(i => (
                          <div key={i} style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: '#8A8098',
                            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                          }} />
                        ))}
                      </div>
                    ) : (
                      <>
                        <p style={{
                          fontSize: 15,
                          fontWeight: isLuna ? 450 : 500,
                          color: '#100C1E',
                          lineHeight: 1.65,
                          whiteSpace: 'pre-wrap',
                          margin: 0,
                        }}>{msg.content}</p>
                        {isLuna && (
                          <button
                            onClick={() => void speak(msg)}
                            title={speakingId === msg.id ? 'Stop' : 'Read aloud'}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5, marginTop: 8,
                              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                              color: speakingId === msg.id ? GOLDEN : '#8A8098',
                            }}
                          >
                            {speakLoadingId === msg.id
                              ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" />
                              : <Volume2 style={{ width: 13, height: 13 }} />}
                            <span style={{ fontSize: 10.5, fontWeight: 600 }}>
                              {speakingId === msg.id ? 'Stop' : 'Read aloud'}
                            </span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* ── Input bar ── */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(180,150,100,0.16)',
          padding: '12px 16px 28px',
        }}>
          <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            {/* Voice button */}
            <button
              onClick={toggleVoice}
              style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                border: listening ? 'none' : '1px solid rgba(180,150,100,0.2)',
                cursor: 'pointer',
                background: listening
                  ? `linear-gradient(135deg, #C96B5A, #A84040)`
                  : 'rgba(255,255,255,0.5)',
                color: listening ? 'white' : '#5E5474',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}>
              {listening ? <MicOff style={{ width: 18, height: 18 }} /> : <Mic style={{ width: 18, height: 18 }} />}
            </button>

            {/* Text input */}
            <div style={{ flex: 1, position: 'relative' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={listening ? 'Listening…' : 'Talk to LUNA…'}
                rows={1}
                style={{
                  width: '100%', resize: 'none', border: '1px solid rgba(180,150,100,0.2)',
                  borderRadius: 22, padding: '11px 16px',
                  background: 'rgba(255,255,255,0.6)', color: '#100C1E',
                  fontSize: 15, lineHeight: 1.5, outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  maxHeight: 120, overflowY: 'auto',
                }}
                onInput={e => {
                  const el = e.currentTarget
                  el.style.height = 'auto'
                  el.style.height = `${Math.min(el.scrollHeight, 120)}px`
                }}
              />
            </div>

            {/* Send button */}
            <button
              onClick={() => void send(input)}
              disabled={!input.trim() || sending}
              style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0, border: 'none',
                cursor: input.trim() && !sending ? 'pointer' : 'default',
                background: input.trim() && !sending
                  ? `linear-gradient(135deg, ${GOLDEN}, #B8903A)`
                  : 'rgba(255,255,255,0.5)',
                color: input.trim() && !sending ? '#100C1E' : '#8A8098',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}>
              <Send style={{ width: 17, height: 17 }} />
            </button>
          </div>
        </div>

      </AppLayout>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}
