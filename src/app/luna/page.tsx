'use client'
import { useState, useRef, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { CategoryPager } from '@/components/ui/CategoryPager'
import {
  Sparkles, Mic, MessageCircle, BookOpen, Star, Archive,
  Send, ChevronRight, ArrowRight, RotateCcw, Pause
} from 'lucide-react'
import Link from 'next/link'

type LunaPage = 'chat' | 'dictate' | 'messages' | 'journal' | 'self' | 'vault'

const PAGES: { id: LunaPage; label: string; emoji: string }[] = [
  { id: 'chat',     label: 'Chat',       emoji: '✦'  },
  { id: 'dictate',  label: 'Dictate',    emoji: '🎙' },
  { id: 'messages', label: 'Messages',   emoji: '💬' },
  { id: 'journal',  label: 'Journal',    emoji: '📓' },
  { id: 'self',     label: 'Highest Self', emoji: '🌟' },
  { id: 'vault',    label: 'Vault',      emoji: '🗄' },
]

const STARTERS = [
  'How do I start my day with intention?',
  'Help me draft a message to a client.',
  'What should I prioritize right now?',
  'I need to think something through.',
  'Give me an emotional check-in.',
]

const REWRITES = [
  { label: 'Soft', color: '#C4A9E8',  desc: 'Vulnerable, open, non-attacking' },
  { label: 'Clear', color: '#A8C4DA', desc: 'Direct, needs-forward' },
  { label: 'Boundary', color: '#B8C9B4', desc: 'Firm, self-protecting' },
]

const JOURNAL_PROMPTS = [
  'What is sitting with me today that I haven\'t said out loud yet?',
  'Where did I lose myself this week, and what brought me back?',
  'What does the most grounded version of me want right now?',
  'What am I holding that isn\'t mine to carry?',
  'What would I do if I wasn\'t afraid of being too much?',
]

const VAULT_ITEMS = [
  { id: 1, tag: 'Idea',    text: 'Crystal swimwear drop — summer 2027. Colorful, handmade, limited.' },
  { id: 2, tag: 'Loop',    text: 'Finish the DRYP newsletter template before Friday.' },
  { id: 3, tag: 'Dream',   text: 'Open a creative studio space in Tampa by 2028.' },
  { id: 4, tag: 'Future',  text: 'Build a capsule wardrobe around neutrals + one statement color.' },
]

const HIGHEST_SELF_MOVES = [
  { current: 'Checking his socials again',     aligned: 'Go do something that makes you feel powerful' },
  { current: 'Sending a message from hurt',    aligned: 'Pause. Ground first. Write it — then decide if you send it.' },
  { current: 'Avoiding the email',             aligned: 'Two sentences. Send it. Done.' },
  { current: 'Spiraling about money',          aligned: 'One concrete money move today. Even a small one.' },
  { current: 'Saying yes when you mean no',    aligned: 'Say: "Let me check my capacity and get back to you."' },
]

function getTodayIndex<T>(arr: T[]) { return new Date().getDate() % arr.length }

export default function LunaPage() {
  const [page, setPage] = useState<LunaPage>('chat')
  const [chatInput, setChatInput]     = useState('')
  const [messages, setMessages]       = useState<{ role: 'user' | 'luna'; text: string }[]>([
    { role: 'luna', text: 'Hey Zoe ✦ I\'m here. What do you need right now?' }
  ])
  const [draftText, setDraftText]     = useState('')
  const [journalText, setJournalText] = useState('')
  const [vaultInput, setVaultInput]   = useState('')
  const [vaultTag, setVaultTag]       = useState<'Idea' | 'Loop' | 'Dream' | 'Future'>('Idea')
  const [vault, setVault]             = useState(VAULT_ITEMS)
  const [dictating, setDictating]     = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function sendMessage() {
    if (!chatInput.trim()) return
    const userMsg = chatInput.trim()
    setChatInput('')
    setMessages(m => [...m, { role: 'user', text: userMsg }])
    setTimeout(() => {
      setMessages(m => [...m, {
        role: 'luna',
        text: 'That makes sense. Let\'s think through this together — what feels most important to you about it right now?'
      }])
    }, 900)
  }

  function addToVault() {
    if (!vaultInput.trim()) return
    setVault(v => [{ id: Date.now(), tag: vaultTag, text: vaultInput.trim() }, ...v])
    setVaultInput('')
  }

  const prompt = JOURNAL_PROMPTS[getTodayIndex(JOURNAL_PROMPTS)]
  const highestSelf = HIGHEST_SELF_MOVES[getTodayIndex(HIGHEST_SELF_MOVES)]

  const PAGE_IDS: LunaPage[] = ['chat', 'dictate', 'messages', 'journal', 'self', 'vault']
  const lunaPageIndex = PAGE_IDS.indexOf(page)

  const lunaPages = [
    { id: 'chat', label: '✦ Chat', content: (
      <div className="flex flex-col h-full">
                {/* Starter prompts */}
                {messages.length <= 1 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {STARTERS.map(s => (
                      <button key={s} onClick={() => { setChatInput(s); }}
                        className="text-xs px-3 py-1.5 rounded-full"
                        style={{ background: 'rgba(139,111,184,0.1)', color: 'var(--violet)', border: '1px solid rgba(139,111,184,0.2)' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {/* Messages */}
                <div className="space-y-3 mb-4" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
                        style={msg.role === 'user'
                          ? { background: 'var(--violet)', color: 'white' }
                          : { background: 'var(--surface)', color: 'var(--text-1)', border: '1px solid var(--surface-border)' }
                        }>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="flex gap-2 mt-auto sticky bottom-0 pb-2">
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    placeholder="Talk to LUNA..."
                    className="flex-1 rounded-2xl px-4 py-3 text-sm outline-none"
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--surface-border)',
                      color: 'var(--text-1)',
                    }}
                  />
                  <button onClick={sendMessage}
                    className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--violet)' }}>
                    <Send className="h-4 w-4 text-white" />
                  </button>
                </div>
              </div>
    ) },
    { id: 'dictate', label: '🎙 Dictate', content: (
      <div className="space-y-4">
                <div className="rounded-2xl p-5 text-center"
                  style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
                  <button onClick={() => setDictating(d => !d)}
                    className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4 transition-all"
                    style={{
                      background: dictating ? 'rgba(224,94,94,0.15)' : 'rgba(139,111,184,0.12)',
                      border: `2px solid ${dictating ? '#E05E5E' : 'rgba(139,111,184,0.3)'}`,
                      boxShadow: dictating ? '0 0 0 8px rgba(224,94,94,0.08)' : 'none',
                    }}>
                    {dictating
                      ? <Pause className="h-8 w-8" style={{ color: '#E05E5E' }} />
                      : <Mic className="h-8 w-8" style={{ color: 'var(--violet)' }} />
                    }
                  </button>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-1)' }}>
                    {dictating ? 'Recording...' : 'Tap to start'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                    Brain dump anything. LUNA will sort it into tasks, journal entries, ideas, or work items.
                  </p>
                </div>

                <div className="rounded-2xl p-4"
                  style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>Or type it</p>
                  <Link href="/brain-dump">
                    <div className="flex items-center justify-between py-2">
                      <p className="text-sm" style={{ color: 'var(--text-1)' }}>Brain Dump</p>
                      <ChevronRight className="h-4 w-4" style={{ color: 'var(--text-3)' }} />
                    </div>
                  </Link>
                  <Link href="/dictation">
                    <div className="flex items-center justify-between py-2" style={{ borderTop: '1px solid var(--surface-border)' }}>
                      <p className="text-sm" style={{ color: 'var(--text-1)' }}>Dictation Studio</p>
                      <ChevronRight className="h-4 w-4" style={{ color: 'var(--text-3)' }} />
                    </div>
                  </Link>
                </div>
              </div>
    ) },
    { id: 'messages', label: '💬 Messages', content: (
      <div className="space-y-4">
                <div className="rounded-2xl p-4"
                  style={{ background: 'linear-gradient(135deg, rgba(26,21,53,0.97), rgba(36,28,72,0.97))', border: '1px solid rgba(139,111,184,0.2)' }}>
                  <p className="text-xs font-bold mb-2" style={{ color: '#C4A9E8' }}>Communication Coach</p>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    Paste a draft. LUNA rewrites it in 3 versions — soft, clear, and boundary-setting.
                  </p>
                </div>

                <textarea
                  value={draftText}
                  onChange={e => setDraftText(e.target.value)}
                  placeholder="Paste your draft message here..."
                  rows={4}
                  className="w-full rounded-2xl px-4 py-3 text-sm outline-none resize-none"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--surface-border)',
                    color: 'var(--text-1)',
                  }}
                />

                {draftText && (
                  <div className="rounded-2xl p-3 mb-2"
                    style={{ background: 'rgba(224,170,94,0.1)', border: '1px solid rgba(224,170,94,0.2)' }}>
                    <p className="text-xs font-bold mb-1" style={{ color: '#E0AA5E' }}>Pause before sending.</p>
                    <p className="text-xs" style={{ color: 'var(--text-2)' }}>What are you actually needing? Are you trying to be understood, or get relief?</p>
                  </div>
                )}

                <div className="space-y-3">
                  {REWRITES.map(r => (
                    <div key={r.label} className="rounded-2xl p-4"
                      style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                        <p className="text-xs font-bold" style={{ color: r.color }}>{r.label} version</p>
                        <p className="text-xs" style={{ color: 'var(--text-3)' }}>· {r.desc}</p>
                      </div>
                      <p className="text-sm italic" style={{ color: 'var(--text-3)' }}>
                        {draftText ? '(Rewrite will appear here when connected to AI)' : 'Paste a draft above to generate this version.'}
                      </p>
                    </div>
                  ))}
                </div>

                <Link href="/messages">
                  <button className="w-full py-3 rounded-2xl text-sm font-semibold mt-2"
                    style={{ background: 'rgba(139,111,184,0.08)', color: 'var(--violet)' }}>
                    Full Messages & Communication Coach →
                  </button>
                </Link>
              </div>
    ) },
    { id: 'journal', label: '📓 Journal', content: (
      <div className="space-y-4">
                <div className="rounded-2xl p-4"
                  style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Today&apos;s prompt</p>
                  <p className="text-sm font-display italic leading-relaxed" style={{ color: 'var(--text-1)' }}>
                    &ldquo;{prompt}&rdquo;
                  </p>
                </div>

                <textarea
                  value={journalText}
                  onChange={e => setJournalText(e.target.value)}
                  placeholder="Write freely. This is just for you."
                  rows={8}
                  className="w-full rounded-2xl px-4 py-3 text-sm outline-none resize-none"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--surface-border)',
                    color: 'var(--text-1)',
                    lineHeight: 1.7,
                  }}
                />

                <div className="flex gap-3">
                  <button className="flex-1 py-3 rounded-2xl text-sm font-semibold"
                    style={{ background: 'rgba(139,111,184,0.08)', color: 'var(--violet)' }}>
                    Save entry
                  </button>
                  <Link href="/journal" className="flex-1">
                    <button className="w-full py-3 rounded-2xl text-sm font-semibold"
                      style={{ background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--surface-border)' }}>
                      Full journal →
                    </button>
                  </Link>
                </div>
              </div>
    ) },
    { id: 'self', label: '🌟 Highest Self', content: (
      <div className="space-y-4">
                <div className="rounded-2xl p-5 relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, rgba(26,21,53,0.97), rgba(36,28,72,0.97))',
                    border: '1px solid rgba(139,111,184,0.25)',
                  }}>
                  <div className="text-xl mb-3">🌟</div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#C4A9E8' }}>Current Pattern</p>
                  <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.6)' }}>{highestSelf.current}</p>
                  <div className="w-full h-px mb-4" style={{ background: 'rgba(139,111,184,0.2)' }} />
                  <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#B8C9B4' }}>Aligned Move</p>
                  <p className="text-base font-semibold text-white leading-snug">{highestSelf.aligned}</p>
                </div>

                <div className="rounded-2xl p-4"
                  style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>Ask LUNA</p>
                  {[
                    'What would my highest self do right now?',
                    'What pattern am I repeating that I want to break?',
                    'What is the most aligned next move in my relationship?',
                    'Am I operating from fear or clarity?',
                  ].map(q => (
                    <button key={q} onClick={() => { setPage('chat'); setChatInput(q) }}
                      className="w-full text-left py-3 text-sm flex items-center justify-between"
                      style={{ borderBottom: '1px solid var(--surface-border)', color: 'var(--text-1)' }}>
                      {q}
                      <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 ml-2" style={{ color: 'var(--text-3)' }} />
                    </button>
                  ))}
                </div>

                <Link href="/highest-self">
                  <button className="w-full py-3 rounded-2xl text-sm font-semibold"
                    style={{ background: 'rgba(139,111,184,0.08)', color: 'var(--violet)' }}>
                    Full Highest Self Guide →
                  </button>
                </Link>
              </div>
    ) },
    { id: 'vault', label: '🗄 Vault', content: (
      <div className="space-y-4">
                <div className="rounded-2xl p-4"
                  style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>Park something</p>
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {(['Idea', 'Loop', 'Dream', 'Future'] as const).map(t => (
                      <button key={t} onClick={() => setVaultTag(t)}
                        className="px-3 py-1 rounded-full text-xs font-semibold"
                        style={vaultTag === t
                          ? { background: 'var(--violet)', color: 'white' }
                          : { background: 'rgba(139,111,184,0.1)', color: 'var(--text-2)' }
                        }>
                        {t}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={vaultInput}
                      onChange={e => setVaultInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addToVault()}
                      placeholder="What do you want to park?"
                      className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none"
                      style={{ background: 'var(--surface-subtle)', color: 'var(--text-1)', border: '1px solid var(--surface-border)' }}
                    />
                    <button onClick={addToVault}
                      className="px-4 py-2.5 rounded-xl text-sm font-semibold flex-shrink-0"
                      style={{ background: 'var(--violet)', color: 'white' }}>
                      Save
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {vault.map(item => (
                    <div key={item.id} className="rounded-2xl p-4 flex items-start gap-3"
                      style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
                      <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-semibold"
                        style={{ background: 'rgba(139,111,184,0.12)', color: 'var(--violet)' }}>
                        {item.tag}
                      </span>
                      <p className="text-sm flex-1" style={{ color: 'var(--text-1)' }}>{item.text}</p>
                    </div>
                  ))}
                </div>

                <Link href="/vault">
                  <button className="w-full py-3 rounded-2xl text-sm font-semibold"
                    style={{ background: 'rgba(139,111,184,0.08)', color: 'var(--violet)' }}>
                    Full Vault →
                  </button>
                </Link>
              </div>
    ) },
  ]

  return (
    <AppLayout noScroll>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, paddingTop: 8 }}>
        <div style={{ width: 40, height: 40, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(139,111,184,0.12)', border: '1px solid rgba(139,111,184,0.2)' }}>
          <Sparkles className="h-5 w-5" style={{ color: 'var(--violet)' }} strokeWidth={1.6} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold" style={{ color: 'white' }}>LUNA</h1>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Talk. Process. Decide.</p>
        </div>
      </div>

      <CategoryPager
        pages={lunaPages}
        activeIndex={lunaPageIndex}
        onChangeIndex={(i) => setPage(PAGE_IDS[i])}
      />
    </AppLayout>
  )
}
