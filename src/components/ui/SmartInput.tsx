'use client'
/**
 * SmartInput — voice-first, suggestion-driven input for LUNA.
 * Every text area in the app becomes this.
 * - 5 AI suggestion chips above (tap to select, no typing)
 * - Mic button for Web Speech API dictation
 * - Tracks everything via pattern lib
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { Mic, MicOff, Sparkles, RotateCcw, ArrowRight, Check } from 'lucide-react'
import { addPattern } from '@/lib/patterns'

interface SmartInputProps {
  context:       string          // the field label / question (used for suggestions)
  placeholder?:  string
  value:         string
  onChange:      (v: string) => void
  onSubmit?:     (v: string) => void   // if provided, shows submit button
  patternType?:  string                 // e.g. 'morning' | 'journal' | 'night'
  multiline?:    boolean
  rows?:         number
  history?:      string[]               // recent answers to this field for better suggestions
  autoSuggest?:  boolean               // auto-load suggestions on mount (default true)
  className?:    string
  style?:        React.CSSProperties
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
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

export function SmartInput({
  context, placeholder, value, onChange, onSubmit,
  patternType = 'general', multiline = true, rows = 3,
  history = [], autoSuggest = true, className, style,
}: SmartInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loadingSug, setLoadingSug] = useState(false)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const hasFetched = useRef(false)

  const fetchSuggestions = useCallback(async () => {
    if (loadingSug) return
    setLoadingSug(true)
    try {
      const tz = typeof window !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'America/New_York'
      const localDate = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())
      const localTime = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date())
      const res = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, history: history.slice(-3), type: patternType, tz, localDate, localTime }),
      })
      if (res.ok) {
        const { suggestions } = await res.json()
        setSuggestions(suggestions ?? [])
      }
    } catch {}
    setLoadingSug(false)
  }, [context, history, patternType, loadingSug])

  useEffect(() => {
    if (autoSuggest && !hasFetched.current) {
      hasFetched.current = true
      fetchSuggestions()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function selectSuggestion(s: string) {
    onChange(s)
    addPattern({ type: patternType, context, value: s, source: 'suggestion' })
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
      let finalText = value
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalText += (finalText ? ' ' : '') + transcript
        } else {
          interimText += transcript
        }
      }
      onChange(finalText)
      setInterim(interimText)
    }

    recognition.onend = () => {
      setListening(false)
      setInterim('')
      if (value) addPattern({ type: patternType, context, value, source: 'voice' })
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech error:', event.error)
      setListening(false)
      setInterim('')
    }

    recognition.start()
    setListening(true)
  }

  function stopListening() {
    recognitionRef.current?.stop()
    setListening(false)
    setInterim('')
  }

  function handleChange(v: string) {
    onChange(v)
  }

  function handleBlur() {
    if (value.trim()) {
      addPattern({ type: patternType, context, value: value.trim(), source: 'typed' })
    }
  }

  function handleSubmit() {
    if (value.trim() && onSubmit) {
      addPattern({ type: patternType, context, value: value.trim(), source: 'typed' })
      onSubmit(value.trim())
    }
  }

  return (
    <div className={className} style={style}>
      {/* Suggestions row */}
      <div className="mb-2">
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles className="h-3 w-3 flex-shrink-0" style={{ color: 'var(--violet)', opacity: 0.7 }} />
          <p style={{ fontSize: '0.65rem', color: 'var(--text-4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Tap to select
          </p>
          <button onClick={fetchSuggestions} disabled={loadingSug}
            className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded-full"
            style={{ background: 'transparent' }}>
            <RotateCcw className={`h-3 w-3 ${loadingSug ? 'animate-spin' : ''}`} style={{ color: 'var(--text-4)' }} />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {loadingSug && suggestions.length === 0 ? (
            [1,2,3].map(i => (
              <div key={i} className="h-7 rounded-full shimmer" style={{ width: i === 1 ? 100 : i === 2 ? 140 : 90 }} />
            ))
          ) : suggestions.map(s => {
            const selected = value === s
            return (
              <button key={s} onClick={() => selectSuggestion(s)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  background: selected ? 'var(--violet)' : 'var(--surface)',
                  color: selected ? 'white' : 'var(--text-2)',
                  border: `1px solid ${selected ? 'var(--violet)' : 'var(--surface-border)'}`,
                  transform: selected ? 'scale(1.02)' : undefined,
                }}>
                {selected && <Check className="h-3 w-3" />}
                {s}
              </button>
            )
          })}
        </div>
      </div>

      {/* Input area */}
      <div className="relative">
        {multiline ? (
          <textarea
            value={value + (interim ? ' ' + interim : '')}
            onChange={e => handleChange(e.target.value)}
            onBlur={handleBlur}
            placeholder={listening ? '🎙 Listening...' : (placeholder ?? `Or speak / type your own...`)}
            rows={rows}
            className="w-full rounded-[16px] px-4 py-3 text-sm resize-none focus:outline-none transition-all"
            style={{
              background: 'var(--surface)',
              border: `1px solid ${listening ? 'rgba(139,111,184,0.5)' : 'var(--surface-border)'}`,
              color: 'var(--text-1)',
              paddingRight: 48,
              fontFamily: 'inherit',
              lineHeight: 1.6,
              boxShadow: listening ? '0 0 0 3px rgba(139,111,184,0.1)' : undefined,
            }}
          />
        ) : (
          <input
            type="text"
            value={value + (interim ? ' ' + interim : '')}
            onChange={e => handleChange(e.target.value)}
            onBlur={handleBlur}
            placeholder={listening ? '🎙 Listening...' : (placeholder ?? `Or speak / type...`)}
            className="w-full rounded-[16px] px-4 py-3 text-sm focus:outline-none transition-all"
            style={{
              background: 'var(--surface)',
              border: `1px solid ${listening ? 'rgba(139,111,184,0.5)' : 'var(--surface-border)'}`,
              color: 'var(--text-1)',
              paddingRight: 48,
              fontFamily: 'inherit',
            }}
          />
        )}

        {/* Mic button */}
        <button
          onClick={listening ? stopListening : startListening}
          className="absolute right-3 bottom-3 w-8 h-8 rounded-full flex items-center justify-center transition-all"
          style={{
            background: listening ? 'var(--violet)' : 'rgba(139,111,184,0.12)',
            border: `1px solid ${listening ? 'var(--violet)' : 'rgba(139,111,184,0.25)'}`,
            boxShadow: listening ? '0 0 0 4px rgba(139,111,184,0.2)' : undefined,
          }}
          title={listening ? 'Stop recording' : 'Tap to dictate'}>
          {listening
            ? <MicOff className="h-3.5 w-3.5 text-white" />
            : <Mic className="h-3.5 w-3.5" style={{ color: 'var(--violet)' }} />}
        </button>
      </div>

      {/* Listening indicator */}
      {listening && (
        <div className="flex items-center gap-2 mt-2">
          <div className="flex gap-0.5">
            {[0.4, 0.7, 1, 0.7, 0.4].map((o, i) => (
              <div key={i} className="w-1 rounded-full"
                style={{
                  height: 12,
                  background: 'var(--violet)',
                  opacity: o,
                  animation: `pulse 1s ease-in-out ${i * 0.1}s infinite alternate`,
                }} />
            ))}
          </div>
          <p className="text-xs" style={{ color: 'var(--violet)' }}>Listening — speak now</p>
        </div>
      )}

      {/* Submit button */}
      {onSubmit && value.trim() && (
        <button onClick={handleSubmit}
          className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-[14px] text-sm font-semibold transition-all"
          style={{ background: 'var(--violet)', color: 'white' }}>
          Continue <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
