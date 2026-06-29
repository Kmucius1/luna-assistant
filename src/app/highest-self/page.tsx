'use client'
import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Zap, Sparkles, RefreshCw, ArrowLeft, CheckCircle, Plus, Clock, ChevronRight } from 'lucide-react'
import Link from 'next/link'

const GLASS: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.11)',
  borderRadius: 20,
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
}

const PATTERNS = [
  'I woke up late and feel like my whole day is ruined.',
  'I have too many ideas and want to start all of them at once.',
  'I keep carrying tasks in my head instead of writing them down.',
  'I overthink messages and react before I think it through.',
  'I feel like I need to prove I can do everything myself.',
  'I feel behind — like I should be further along by now.',
  'I avoid the things that matter most and stay busy with small tasks.',
  'I say yes to things I don\'t actually want to do.',
  'I spiral at night and can\'t shut my brain off.',
  'I compare myself to others and feel like I\'m losing.',
]

interface ExtractedTask {
  title:      string
  how_long:   string
  nudge:      string
  first_step: string
}

interface MirrorResult {
  reflection:           string
  current_pattern:      string
  current_description:  string
  highest_self_action:  string
  bridge_step:          string
  chart_connection:     string
  affirmation:          string
  closing:              string
  tasks?:               ExtractedTask[]
}

// View flow: select → elaborate → result
type View = 'select' | 'elaborate' | 'result'

export default function HighestSelfPage() {
  const [view,       setView]       = useState<View>('select')
  const [selected,   setSelected]   = useState<Set<number>>(new Set())
  const [freeText,   setFreeText]   = useState('')
  // Elaboration step: one pattern at a time
  const [eStep,      setEStep]      = useState(0)
  const [answers,    setAnswers]    = useState<Record<number, string>>({})
  const [currentAns, setCurrentAns] = useState('')
  // Result
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState<MirrorResult | null>(null)
  const [added,   setAdded]   = useState<Set<string>>(new Set())
  const [adding,  setAdding]  = useState<Set<string>>(new Set())

  const selectedArr = [...selected].sort((a, b) => a - b)

  function togglePattern(i: number) {
    setSelected(prev => {
      const n = new Set(prev)
      n.has(i) ? n.delete(i) : n.add(i)
      return n
    })
  }

  function startElaborate() {
    setEStep(0)
    setAnswers({})
    setCurrentAns('')
    setView('elaborate')
  }

  function nextStep() {
    // Save current answer
    const patternIdx = selectedArr[eStep]
    const newAnswers = { ...answers, [patternIdx]: currentAns.trim() }
    setAnswers(newAnswers)
    setCurrentAns('')

    if (eStep < selectedArr.length - 1) {
      setEStep(e => e + 1)
    } else {
      // Done elaborating — build combined situation and submit
      generateReading(newAnswers)
    }
  }

  async function generateReading(finalAnswers: Record<number, string>) {
    setLoading(true)
    setView('result')

    // Build combined situation text from selected patterns + answers
    const patternLines = selectedArr.map(i => {
      const pattern = PATTERNS[i]
      const ans     = finalAnswers[i]
      return ans
        ? `Pattern: "${pattern}"\nWhat Zoe shared about it: ${ans}`
        : `Pattern: "${pattern}"`
    }).join('\n\n')

    const situation = [
      patternLines,
      freeText.trim() ? `\nAdditional context: ${freeText.trim()}` : '',
    ].filter(Boolean).join('\n')

    try {
      const res = await fetch('/api/ai/highest-self-mirror', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ situation }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
    } catch {
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  async function addToBoard(task: ExtractedTask) {
    const key = task.title
    setAdding(prev => new Set(prev).add(key))
    try {
      await fetch('/api/tasks/create', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          title:       task.title,
          description: `${task.nudge}\n\nFirst step: ${task.first_step}`,
          priority:    'medium',
          status:      'todo',
        }),
      })
      setAdded(prev => new Set(prev).add(key))
    } catch { /* silent */ }
    finally {
      setAdding(prev => { const n = new Set(prev); n.delete(key); return n })
    }
  }

  function reset() {
    setView('select'); setSelected(new Set()); setFreeText('')
    setEStep(0); setAnswers({}); setCurrentAns('')
    setResult(null); setAdded(new Set())
  }

  // ── Elaboration prompts — LUNA asks specifically about each pattern ──────────
  const ELABORATIONS: Record<string, string> = {
    'I woke up late and feel like my whole day is ruined.':
      'What happened this morning? What were you supposed to do that now feels off?',
    'I have too many ideas and want to start all of them at once.':
      'Which ideas are actually competing right now? Name them — even the ones you feel guilty about.',
    'I keep carrying tasks in my head instead of writing them down.':
      'What is actually in your head right now? Say everything — even the small stuff.',
    'I overthink messages and react before I think it through.':
      'What situation or person is this about? What did you do or almost do?',
    'I feel like I need to prove I can do everything myself.':
      'What are you trying to prove, and to who? What would it feel like to ask for help?',
    'I feel behind — like I should be further along by now.':
      'Where exactly do you feel behind? What does "on track" look like to you right now?',
    'I avoid the things that matter most and stay busy with small tasks.':
      'What is the real thing you\'ve been avoiding? How long has it been sitting there?',
    'I say yes to things I don\'t actually want to do.':
      'What did you say yes to recently that you didn\'t want? What stopped you from saying no?',
    'I spiral at night and can\'t shut my brain off.':
      'What is your brain actually running through tonight? What keeps coming back up?',
    'I compare myself to others and feel like I\'m losing.':
      'Who are you comparing yourself to right now? What specifically feels like you\'re losing?',
  }

  return (
    <div className="bg-app min-h-screen">
      <AppLayout noPad className="pt-16">
        <div style={{ padding: '0 0 180px' }}>

          {/* Hero — always visible */}
          <div style={{ background: 'linear-gradient(160deg, rgba(201,169,110,0.2) 0%, rgba(80,40,120,0.15) 50%, transparent 100%)', padding: '20px 20px 24px' }}>
            <button onClick={reset} style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.4)', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 14, padding: 0 }}>
              <ArrowLeft className="h-3.5 w-3.5" /> {view === 'select' ? 'Home' : 'Start over'}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(201,169,110,0.15)', border: '1px solid rgba(201,169,110,0.25)' }}>
                <Zap className="h-5 w-5" style={{ color: '#C9A96E' }} />
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C9A96E' }}>Highest Self Mirror</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Current You → Highest You</p>
              </div>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'white', lineHeight: 1.25, marginBottom: 8 }}>
              {view === 'select'    ? 'No shame here. Only recognition.'
               : view === 'elaborate' ? `${eStep + 1} of ${selectedArr.length} — tell me more`
               : 'Your highest self sees you.'}
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
              {view === 'select'    ? 'Choose every pattern that is true right now. You can pick as many as you need.'
               : view === 'elaborate' ? 'The more you share, the more real this becomes.'
               : 'Here is what she has to say.'}
            </p>
          </div>

          <div style={{ padding: '16px 16px 0' }}>

            {/* ── SELECT VIEW ─────────────────────────────────── */}
            {view === 'select' && (
              <>
                {/* Pattern grid — multi-select */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                  {PATTERNS.map((p, i) => {
                    const isSelected = selected.has(i)
                    return (
                      <button key={i} onClick={() => togglePattern(i)} style={{
                        ...GLASS,
                        padding: '12px 16px', textAlign: 'left', cursor: 'pointer',
                        border: isSelected ? '1.5px solid rgba(201,169,110,0.55)' : '1px solid rgba(255,255,255,0.09)',
                        background: isSelected ? 'rgba(201,169,110,0.1)' : 'rgba(255,255,255,0.04)',
                        transition: 'all 0.15s',
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                      }}>
                        {/* Checkbox */}
                        <div style={{
                          width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: isSelected ? '#C9A96E' : 'rgba(255,255,255,0.06)',
                          border: isSelected ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
                          transition: 'all 0.15s',
                        }}>
                          {isSelected && <span style={{ color: 'white', fontSize: 11, fontWeight: 800 }}>✓</span>}
                        </div>
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 700, color: isSelected ? '#C9A96E' : '#E05E5E', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Pattern</p>
                          <p style={{ fontSize: 13, color: isSelected ? 'white' : 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>{p}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Free text (optional) */}
                <div style={{ ...GLASS, padding: 16, marginBottom: 14 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>
                    Anything else on your mind? (optional)
                  </p>
                  <textarea
                    value={freeText}
                    onChange={e => setFreeText(e.target.value)}
                    rows={3}
                    placeholder="Add your own words..."
                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'white', fontSize: 14, lineHeight: 1.65, resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>

                {/* CTA */}
                {(selected.size > 0 || freeText.trim()) && (
                  <button onClick={selected.size > 0 ? startElaborate : () => generateReading({})}
                    style={{
                      width: '100%', padding: '15px 0', borderRadius: 18, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700,
                      background: 'linear-gradient(135deg, #C9A96E, #A88040)',
                      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8,
                    }}>
                    {selected.size > 0
                      ? <><ChevronRight className="h-4 w-4" /> Tell LUNA about {selected.size} pattern{selected.size > 1 ? 's' : ''}</>
                      : <><Sparkles className="h-4 w-4" /> Show me my highest self</>
                    }
                  </button>
                )}

                {selected.size > 0 && (
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginBottom: 20 }}>
                    LUNA will ask you to explain each one
                  </p>
                )}
              </>
            )}

            {/* ── ELABORATE VIEW ──────────────────────────────── */}
            {view === 'elaborate' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* Progress bar */}
                <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', marginBottom: 4 }}>
                  <div style={{ height: '100%', borderRadius: 2, background: '#C9A96E', width: `${((eStep + 1) / selectedArr.length) * 100}%`, transition: 'width 0.4s ease' }} />
                </div>

                {/* Current pattern being elaborated */}
                <div style={{ ...GLASS, padding: '14px 16px', background: 'rgba(201,169,110,0.07)', border: '1px solid rgba(201,169,110,0.2)' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#E05E5E', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>You said</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'white', lineHeight: 1.5 }}>{PATTERNS[selectedArr[eStep]]}</p>
                </div>

                {/* LUNA's question */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '0 4px' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(201,169,110,0.15)', border: '1px solid rgba(201,169,110,0.3)' }}>
                    <span style={{ fontSize: 14 }}>🌙</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#C9A96E', marginBottom: 4 }}>LUNA</p>
                    <p style={{ fontSize: 15, color: 'white', lineHeight: 1.65, fontStyle: 'italic' }}>
                      {ELABORATIONS[PATTERNS[selectedArr[eStep]]] ?? 'Tell me more about what\'s really going on with this.'}
                    </p>
                  </div>
                </div>

                {/* Answer input */}
                <div style={{ ...GLASS, padding: 16 }}>
                  <textarea
                    key={eStep}
                    autoFocus
                    value={currentAns}
                    onChange={e => setCurrentAns(e.target.value)}
                    rows={5}
                    placeholder="Say it here — no judgment, no filter..."
                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'white', fontSize: 14, lineHeight: 1.7, resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Skip / Next */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => {
                    setAnswers(prev => ({ ...prev, [selectedArr[eStep]]: '' }))
                    setCurrentAns('')
                    if (eStep < selectedArr.length - 1) { setEStep(e => e + 1) }
                    else { generateReading({ ...answers }) }
                  }} style={{ flex: 1, padding: '12px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Skip this one
                  </button>
                  <button onClick={nextStep}
                    style={{ flex: 2, padding: '12px', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700,
                      background: currentAns.trim() ? 'linear-gradient(135deg, #C9A96E, #A88040)' : 'rgba(255,255,255,0.08)',
                      color: currentAns.trim() ? 'white' : 'rgba(255,255,255,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                    {eStep < selectedArr.length - 1 ? (
                      <><ChevronRight className="h-4 w-4" /> Next pattern</>
                    ) : (
                      <><Sparkles className="h-4 w-4" /> Show me my highest self</>
                    )}
                  </button>
                </div>

                {/* Previously answered patterns */}
                {eStep > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 8 }}>Already shared</p>
                    {selectedArr.slice(0, eStep).map((idx, j) => (
                      <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, opacity: 0.5 }}>
                        <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#C9A96E' }} />
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{PATTERNS[idx]}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── RESULT VIEW ─────────────────────────────────── */}
            {view === 'result' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                {loading && (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(201,169,110,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid rgba(201,169,110,0.25)' }}>
                      <RefreshCw className="h-5 w-5 animate-spin" style={{ color: '#C9A96E' }} />
                    </div>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Seeing you clearly…</p>
                  </div>
                )}

                {!loading && result && (
                  <>
                    {/* Reflection */}
                    <div style={{ ...GLASS, padding: 20, background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.2)', textAlign: 'center' }}>
                      <p style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'white', lineHeight: 1.65, fontStyle: 'italic' }}>
                        &ldquo;{result.reflection}&rdquo;
                      </p>
                    </div>

                    {/* Tasks extracted */}
                    {result.tasks && result.tasks.length > 0 && (
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8B6FB8', marginBottom: 10 }}>
                          I heard these in what you shared
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {result.tasks.map((task, i) => {
                            const isAdded  = added.has(task.title)
                            const isAdding = adding.has(task.title)
                            return (
                              <div key={i} style={{ borderRadius: 18, overflow: 'hidden', border: isAdded ? '1px solid rgba(90,138,90,0.35)' : '1px solid rgba(139,111,184,0.25)', background: isAdded ? 'rgba(90,138,90,0.06)' : 'rgba(139,111,184,0.07)' }}>
                                <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 3 }}>{task.title}</p>
                                    {task.how_long && (
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#C9A96E', fontWeight: 600 }}>
                                        <Clock className="h-3 w-3" /> {task.how_long}
                                      </span>
                                    )}
                                  </div>
                                  <button onClick={() => addToBoard(task)} disabled={isAdded || isAdding} style={{
                                    flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
                                    padding: '7px 12px', borderRadius: 12, fontSize: 11, fontWeight: 700, cursor: isAdded ? 'default' : 'pointer',
                                    border: isAdded ? '1px solid rgba(90,138,90,0.4)' : '1px solid rgba(139,111,184,0.4)',
                                    background: isAdded ? 'rgba(90,138,90,0.12)' : 'rgba(139,111,184,0.15)',
                                    color: isAdded ? '#8AB88A' : '#C4AAEE',
                                  }}>
                                    {isAdded ? <><CheckCircle className="h-3.5 w-3.5" /> Added</> : isAdding ? <>…</> : <><Plus className="h-3.5 w-3.5" /> Add to board</>}
                                  </button>
                                </div>
                                <div style={{ padding: '0 16px 12px' }}>
                                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.65, marginBottom: 8 }}>{task.nudge}</p>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <span style={{ fontSize: 10 }}>▶</span>
                                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>Start: {task.first_step}</span>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        <Link href="/tasks" style={{ textDecoration: 'none' }}>
                          <div style={{ marginTop: 10, padding: '10px 16px', borderRadius: 14, border: '1px solid rgba(139,111,184,0.2)', background: 'rgba(139,111,184,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>View task board</p>
                            <span style={{ fontSize: 12, color: '#8B6FB8' }}>→</span>
                          </div>
                        </Link>
                      </div>
                    )}

                    {/* Pattern → Highest Self */}
                    <div style={{ ...GLASS, padding: 18, background: 'rgba(224,94,94,0.06)', border: '1px solid rgba(224,94,94,0.18)' }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: '#E05E5E', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Current Pattern</p>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 6 }}>{result.current_pattern}</p>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>{result.current_description}</p>
                    </div>

                    <div style={{ ...GLASS, padding: 18, background: 'rgba(90,138,90,0.07)', border: '1px solid rgba(90,138,90,0.2)' }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: '#8AB88A', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Highest Self Action</p>
                      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 1.65 }}>{result.highest_self_action}</p>
                    </div>

                    <div style={{ ...GLASS, padding: 18 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: '#C9A96E', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Bridge Step</p>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'white', lineHeight: 1.6 }}>{result.bridge_step}</p>
                    </div>

                    <div style={{ ...GLASS, padding: 18 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: '#8B6FB8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Design + Chart Insight</p>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.65 }}>{result.chart_connection}</p>
                    </div>

                    <div style={{ padding: 20, borderRadius: 20, background: 'linear-gradient(135deg, rgba(201,169,110,0.12), rgba(80,40,120,0.12))', border: '1px solid rgba(201,169,110,0.2)', textAlign: 'center' }}>
                      <Sparkles className="h-5 w-5" style={{ color: '#C9A96E', margin: '0 auto 10px' }} />
                      <p style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'white', lineHeight: 1.6, fontStyle: 'italic' }}>
                        &ldquo;{result.affirmation}&rdquo;
                      </p>
                    </div>

                    {result.closing && (
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', textAlign: 'center', fontStyle: 'italic', padding: '0 20px' }}>{result.closing}</p>
                    )}

                    <button onClick={reset} style={{ width: '100%', padding: '14px 0', borderRadius: 18, border: '1px solid rgba(201,169,110,0.25)', cursor: 'pointer', background: 'rgba(201,169,110,0.08)', color: '#C9A96E', fontSize: 14, fontWeight: 600 }}>
                      Reflect again
                    </button>
                  </>
                )}

                {!loading && !result && (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>Something went wrong. Try again.</p>
                    <button onClick={reset} style={{ padding: '12px 24px', borderRadius: 14, background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.25)', color: '#C9A96E', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Start over</button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </AppLayout>
    </div>
  )
}
