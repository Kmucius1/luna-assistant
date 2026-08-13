'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, PhoneOff, Volume2 } from 'lucide-react'

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
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null)
  const [speakLoadingIdx, setSpeakLoadingIdx] = useState<number | null>(null)
  const [failedIdx, setFailedIdx] = useState<number | null>(null)
  const [micError, setMicError] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recogRef = useRef<any>(null)
  const activeRef = useRef(false)
  const turnsRef = useRef<Turn[]>([])
  const savedRef = useRef(false)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    recogRef.current?.stop?.()
    audioRef.current?.pause()
    saveSession(true)
  }, [saveSession])

  // idx identifies which transcript turn this audio belongs to, so the UI
  // can show per-turn playing/loading/failed state and a tap-to-replay
  // affordance. Any in-flight audio is stopped first — she should never be
  // heard saying two things at once, and re-triggering the same turn always
  // restarts it from the top rather than layering a second playback.
  const speak = useCallback((text: string, idx: number, onDone: () => void) => {
    audioRef.current?.pause()
    setFailedIdx(null)
    setSpeakLoadingIdx(idx)
    setState('speaking')
    fetch('/api/chat/speak', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
      .then(res => { if (!res.ok) throw new Error(); return res.blob() })
      .then(blob => {
        if (!activeRef.current) { setSpeakLoadingIdx(null); return }
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audioRef.current = audio
        setSpeakLoadingIdx(null)
        setSpeakingIdx(idx)
        audio.onended = () => { URL.revokeObjectURL(url); setSpeakingIdx(null); onDone() }
        audio.onerror = () => { URL.revokeObjectURL(url); setSpeakingIdx(null); setFailedIdx(idx); onDone() }
        audio.play().catch(() => { setSpeakingIdx(null); setFailedIdx(idx); onDone() })
      })
      .catch(() => { setSpeakLoadingIdx(null); setFailedIdx(idx); onDone() })
  }, [])

  // Manual replay, tapped from the transcript — e.g. autoplay was blocked
  // because the turn started outside a fresh user gesture, or she just
  // wants to hear it again. Does not chain into listen() afterward.
  const replay = useCallback((idx: number, text: string) => {
    speak(text, idx, () => {})
  }, [speak])

  // How long to wait after she stops hearing new words before treating the
  // turn as finished and sending it off — mirrors the "pause to talk" feel
  // of ChatGPT voice mode instead of relying on the browser's own (flaky,
  // inconsistent-across-devices) end-of-speech detection.
  const SILENCE_MS = 1100

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }, [])

  const listen = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR || !activeRef.current) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recog = new SR() as any
    recog.continuous = true
    recog.interimResults = true
    recog.lang = 'en-US'

    // Guards against double-handling one turn — set the instant we decide
    // to stop this recognizer ourselves (turn committed, or we're tearing
    // down), so the onend restart-on-drop logic below knows not to fire.
    let settled = false

    const commit = (said: string) => {
      if (settled) return
      settled = true
      clearSilenceTimer()
      recog.stop()
      setInterim('')
      setTurns(prev => [...prev, { role: 'user', text: said }])
      setState('thinking')
      sendChatMessage(said, 'voice').then(({ response }) => {
        if (!activeRef.current) return
        setTurns(prev => {
          const next = [...prev, { role: 'assistant' as const, text: response }]
          speak(response, next.length - 1, () => { if (activeRef.current) listen() })
          return next
        })
      }).catch(() => {
        if (activeRef.current) setState('idle')
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recog.onresult = (e: any) => {
      let t = ''
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript
      setInterim(t)
      clearSilenceTimer()
      if (t.trim()) silenceTimerRef.current = setTimeout(() => commit(t.trim()), SILENCE_MS)
    }

    recog.onend = () => {
      clearSilenceTimer()
      if (settled || !activeRef.current) return
      // The browser dropped recognition on its own — a mobile Safari/Chrome
      // timeout, a brief network hiccup — before we ever heard a real pause.
      // Previously this just went idle and silently stopped listening; now
      // it picks a fresh recognizer back up so a dropped connection never
      // looks like LUNA "not responding."
      listen()
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recog.onerror = (e: any) => {
      if (settled) return
      clearSilenceTimer()
      // 'no-speech' just means nothing was said yet — harmless, onend will
      // restart it below. 'aborted' means we called recog.stop() ourselves.
      if (e.error === 'no-speech' || e.error === 'aborted') return
      settled = true
      if (!activeRef.current) return
      if (e.error === 'not-allowed' || e.error === 'audio-capture') {
        setState('idle')
        setMicError("LUNA can't hear you — check your browser's microphone permission and try again.")
      } else {
        // Transient (network, etc.) — keep the conversation alive.
        listen()
      }
    }

    recog.start()
    recogRef.current = recog
    setState('listening')
  }, [speak, clearSilenceTimer])

  function begin() {
    if (unsupported) return
    setSavedMsg(null)
    setMicError(null)
    activeRef.current = true
    if (turns.length === 0) {
      const opener = getOpener(new Date().getHours())
      setTurns([{ role: 'assistant', text: opener }])
      speak(opener, 0, () => { if (activeRef.current) listen() })
      setState('greeting')
    } else {
      listen()
    }
  }

  function end() {
    activeRef.current = false
    clearSilenceTimer()
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
    setSpeakingIdx(null)
    setSpeakLoadingIdx(null)
    setFailedIdx(null)
  }

  // Tap the orb while she's talking to cut her off and start listening
  // immediately — no waiting for her to finish, same as tapping to
  // interrupt in ChatGPT voice mode.
  function interrupt() {
    audioRef.current?.pause()
    setSpeakingIdx(null)
    setSpeakLoadingIdx(null)
    if (activeRef.current) listen()
  }

  function handleOrbTap() {
    if (unsupported) return
    if (state === 'speaking') { interrupt(); return }
    if (isActive) { end(); return }
    begin()
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
          onClick={handleOrbTap}
          aria-label={state === 'speaking' ? 'Interrupt LUNA and talk' : isActive ? 'End conversation with LUNA' : 'Start talking with LUNA'}
        >
          <div className={styles.craterGlow} />
        </button>
      </div>

      <p className={styles.status}>{statusText}</p>
      {!isActive && !savedMsg && (
        <p className={styles.hint}>Tap the moon and talk it out — LUNA listens and talks back, hands-free.</p>
      )}
      {state === 'speaking' && <p className={styles.hint}>Tap to interrupt</p>}
      {unsupported && <p className={styles.hint}>Voice conversation needs Chrome or Safari on this device.</p>}
      {micError && <p className={styles.hint}>{micError}</p>}

      {isActive && (
        <button type="button" className={styles.endButton} onClick={end}>
          <PhoneOff size={13} /> End conversation
        </button>
      )}

      {turns.length > 0 && (
        <div className={styles.transcript}>
          {turns.map((t, i) => (
            <div key={i} className={`${styles.turn} ${t.role === 'user' ? styles.turnUser : styles.turnAssistant}`}>
              <span>{t.text}</span>
              {t.role === 'assistant' && (
                <button
                  type="button"
                  onClick={() => replay(i, t.text)}
                  className={`${styles.replayBtn} ${speakingIdx === i ? styles.replayBtnActive : ''} ${failedIdx === i ? styles.replayBtnFailed : ''}`}
                  aria-label={failedIdx === i ? 'Tap to hear this message — it did not play automatically' : speakingIdx === i ? 'Restart this message' : 'Replay this message'}
                  title={failedIdx === i ? 'Tap to hear' : speakingIdx === i ? 'Restart' : 'Replay'}
                >
                  {speakLoadingIdx === i
                    ? <Loader2 size={13} className="animate-spin" />
                    : <Volume2 size={13} />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
