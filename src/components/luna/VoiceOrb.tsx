'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { PhoneOff } from 'lucide-react'

import { sendChatMessage } from '@/lib/chat/sendChatMessage'
import styles from './VoiceOrb.module.css'

type OrbState = 'idle' | 'greeting' | 'listening' | 'thinking' | 'speaking'

interface Turn { role: 'user' | 'assistant'; text: string }

// Mirrors the opener LUNA already uses to open a text chat session (see
// /api/chat/history) so the voice greeting sounds like the same person —
// generated locally so she hears LUNA speak first the instant she taps,
// with no network round trip before the greeting starts.
function getOpener(hour: number): string {
  if (hour >= 5  && hour < 8)  return "Hey. You're up early — how are you feeling before the day starts?"
  if (hour >= 8  && hour < 10) return "Good morning. How did you wake up today — grounded, or already in your head?"
  if (hour >= 10 && hour < 12) return "Hey, how's your day going so far?"
  if (hour >= 12 && hour < 14) return "Hey — midday check-in. How's it actually going, not the plan, the reality?"
  if (hour >= 14 && hour < 17) return "Hey. Are you still in flow this afternoon, or pushing against something?"
  if (hour >= 17 && hour < 19) return "Hey, the day's wrapping up — what actually got done today?"
  if (hour >= 19 && hour < 21) return "Hey. Winding down, or still in work mode?"
  if (hour >= 21 && hour < 23) return "Hey, it's getting late — what's still on your mind?"
  return "Hey. You're up late. What is it?"
}

export function VoiceOrb() {
  const [state, setState] = useState<OrbState>('idle')
  const [turns, setTurns] = useState<Turn[]>([])
  const [interim, setInterim] = useState('')
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const [unsupported, setUnsupported] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recogRef = useRef<any>(null)
  const activeRef = useRef(false)
  const turnsRef = useRef<Turn[]>([])
  const savedRef = useRef(false)

  useEffect(() => { turnsRef.current = turns }, [turns])

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) setUnsupported(true)
  }, [])

  const saveSession = useCallback((beacon = false) => {
    if (savedRef.current || turnsRef.current.length < 2) return
    savedRef.current = true
    const payload = JSON.stringify({ turns: turnsRef.current })
    if (beacon && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon('/api/chat/voice-session', new Blob([payload], { type: 'application/json' }))
      return
    }
    fetch('/api/chat/voice-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload }).catch(() => {})
  }, [])

  useEffect(() => () => {
    activeRef.current = false
    recogRef.current?.stop?.()
    audioRef.current?.pause()
    saveSession(true)
  }, [saveSession])

  const speak = useCallback((text: string, onDone: () => void) => {
    setState('speaking')
    fetch('/api/chat/speak', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
      .then(res => { if (!res.ok) throw new Error(); return res.blob() })
      .then(blob => {
        if (!activeRef.current) return
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audioRef.current = audio
        audio.onended = () => { URL.revokeObjectURL(url); onDone() }
        audio.onerror = () => { URL.revokeObjectURL(url); onDone() }
        audio.play().catch(() => onDone())
      })
      .catch(() => onDone())
  }, [])

  const listen = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR || !activeRef.current) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recog = new SR() as any
    recog.continuous = false
    recog.interimResults = true
    recog.lang = 'en-US'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recog.onresult = (e: any) => {
      let t = ''
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript
      setInterim(t)
    }

    recog.onend = () => {
      if (!activeRef.current) return
      setInterim(current => {
        const said = current.trim()
        if (!said) {
          setState('idle')
          return ''
        }
        setTurns(prev => [...prev, { role: 'user', text: said }])
        setState('thinking')
        sendChatMessage(said, 'voice').then(({ response }) => {
          if (!activeRef.current) return
          setTurns(prev => [...prev, { role: 'assistant', text: response }])
          speak(response, () => { if (activeRef.current) listen() })
        }).catch(() => {
          if (activeRef.current) setState('idle')
        })
        return ''
      })
    }

    recog.onerror = () => { if (activeRef.current) setState('idle') }

    recog.start()
    recogRef.current = recog
    setState('listening')
  }, [speak])

  function begin() {
    if (unsupported) return
    setSavedMsg(null)
    activeRef.current = true
    if (turns.length === 0) {
      const opener = getOpener(new Date().getHours())
      setTurns([{ role: 'assistant', text: opener }])
      speak(opener, () => { if (activeRef.current) listen() })
      setState('greeting')
    } else {
      listen()
    }
  }

  function end() {
    activeRef.current = false
    recogRef.current?.stop?.()
    audioRef.current?.pause()
    setInterim('')
    setState('idle')
    if (turns.length >= 2) {
      saveSession()
      setSavedMsg('Saved to your notes.')
    }
    setTurns([])
    savedRef.current = false
  }

  const isActive = state !== 'idle'
  const statusText =
    state === 'greeting'  ? 'LUNA is greeting you…' :
    state === 'listening' ? (interim || "Listening — go ahead…") :
    state === 'thinking'  ? 'LUNA is thinking…' :
    state === 'speaking'  ? 'LUNA is speaking…' :
    savedMsg ?? 'Tap to start talking with LUNA'

  return (
    <div className={styles.wrap}>
      <div className={styles.orbStage}>
        {state === 'listening' && (
          <>
            <div className={`${styles.ring} ${styles.ringActive}`} />
            <div className={`${styles.ring} ${styles.ringActive}`} />
          </>
        )}
        <button
          type="button"
          className={`${styles.orb} ${state === 'listening' ? styles.orbListening : ''} ${state === 'thinking' ? styles.orbThinking : ''} ${state === 'speaking' ? styles.orbSpeaking : ''}`}
          onClick={isActive ? end : begin}
          aria-label={isActive ? 'End conversation with LUNA' : 'Start talking with LUNA'}
        >
          <div className={styles.craterGlow} />
        </button>
      </div>

      <p className={styles.status}>{statusText}</p>
      {!isActive && !savedMsg && (
        <p className={styles.hint}>Tap the moon and talk it out — LUNA listens and talks back, hands-free.</p>
      )}
      {unsupported && <p className={styles.hint}>Voice conversation needs Chrome or Safari on this device.</p>}

      {isActive && (
        <button type="button" className={styles.endButton} onClick={end}>
          <PhoneOff size={13} /> End conversation
        </button>
      )}

      {turns.length > 0 && (
        <div className={styles.transcript}>
          {turns.map((t, i) => (
            <div key={i} className={`${styles.turn} ${t.role === 'user' ? styles.turnUser : styles.turnAssistant}`}>
              {t.text}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
