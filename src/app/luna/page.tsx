'use client'
import { useState, useRef, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { CategoryPager } from '@/components/ui/CategoryPager'
import { sendChatMessage } from '@/lib/chat/sendChatMessage'
import { LunaLoadingState } from '@/components/luna'
import {
  Sparkles, Mic, MessageCircle, BookOpen, Star, Archive,
  Send, ChevronRight, ArrowRight, RotateCcw, Pause
} from 'lucide-react'
import Link from 'next/link'

// ─── Shared glass card style (matches Home) ─────────────────────────────────
const G: React.CSSProperties = {
  background: 'rgba(255,255,255,0.6)',
  border: '1px solid rgba(180,150,100,0.18)',
  borderRadius: 22,
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  boxShadow: '0 6px 24px rgba(60,46,24,0.08)',
}

// ─── Section label inside cards ─────────────────────────────────────────────
const LBL: React.CSSProperties = {
  fontSize: 9.5, fontWeight: 800, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: '#C9A96E',
  display: 'flex', alignItems: 'center', gap: 6,
  marginBottom: 10, flexShrink: 0,
}

// ─── Text input style ────────────────────────────────────────────────────────
const INPUT: React.CSSProperties = {
  background: 'rgba(255,255,255,0.5)',
  border: '1px solid rgba(180,150,100,0.2)',
  color: '#100C1E',
  borderRadius: 18,
}

// ─── Primary gradient CTA — send / save actions ─────────────────────────────
const CTA_PRIMARY: React.CSSProperties = {
  background: 'linear-gradient(135deg, #C9A96E 0%, #B8974F 100%)',
  boxShadow: '0 0 18px rgba(201,169,110,0.35)',
  color: '#100C1E',
  border: 'none',
}

// ─── Secondary "go deeper" CTA — Full X → links ─────────────────────────────
const CTA_SECONDARY: React.CSSProperties = {
  background: 'rgba(201,169,110,0.12)',
  border: '1px solid rgba(201,169,110,0.3)',
  color: '#C9A96E',
}

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
  { label: 'Soft', color: '#C9A96E',  desc: 'Vulnerable, open, non-attacking' },
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

const VALID_LUNA_TABS: LunaPage[] = ['chat', 'dictate', 'messages', 'journal', 'self', 'vault']

function LunaPageInner() {
  const searchParams = useSearchParams()
  const requestedTab = searchParams.get('tab') as LunaPage | null
  const initialTab = (requestedTab && VALID_LUNA_TABS.includes(requestedTab)) ? requestedTab : 'chat'
  const [page, setPage] = useState<LunaPage>(initialTab)
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
  const [sending, setSending]         = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  async function sendMessage() {
    if (!chatInput.trim() || sending) return
    const userMsg = chatInput.trim()
    setChatInput('')
    setMessages(m => [...m, { role: 'user', text: userMsg }])
    setSending(true)
    try {
      // Same 'default' session as /chat so both surfaces show one continuous conversation.
      const { response } = await sendChatMessage(userMsg, 'default')
      setMessages(m => [...m, { role: 'luna', text: response }])
    } finally {
      setSending(false)
    }
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
    { id: 'chat', label: 'Chat', icon: MessageCircle, content: (
      <div className="flex flex-col h-full">
                {/* Starter prompts */}
                {messages.length <= 1 && (
                  <div className="mb-3.5 flex flex-wrap gap-2 flex-shrink-0">
                    {STARTERS.map(s => (
                      <button key={s} onClick={() => { setChatInput(s); }}
                        className="text-xs font-semibold px-3.5 py-2 rounded-full cursor-pointer"
                        style={{ background: 'rgba(201,169,110,0.12)', color: '#C9A96E', border: '1px solid rgba(201,169,110,0.3)' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {/* Messages */}
                <div className="space-y-3 mb-3.5" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[80%] px-4 py-3 text-sm leading-relaxed"
                        style={msg.role === 'user'
                          ? { borderRadius: 20, background: 'linear-gradient(135deg, #C9A96E 0%, #B8974F 100%)', color: '#100C1E' }
                          : { ...G, borderRadius: 20, color: '#100C1E' }
                        }>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {sending && <LunaLoadingState compact />}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="flex gap-2 mt-auto sticky bottom-0 pb-2">
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && void sendMessage()}
                    placeholder="Talk to LUNA..."
                    className="flex-1 px-4 py-3 text-sm outline-none"
                    style={INPUT}
                    disabled={sending}
                  />
                  <button onClick={() => void sendMessage()} disabled={sending}
                    className="w-11 h-11 flex items-center justify-center flex-shrink-0 cursor-pointer"
                    style={{ ...CTA_PRIMARY, borderRadius: 16 }}>
                    <Send className="h-4 w-4" style={{ color: '#100C1E' }} />
                  </button>
                </div>
              </div>
    ) },
    { id: 'dictate', label: 'Dictate', icon: Mic, content: (
      <div className="space-y-3.5">
                <div className="p-5 text-center" style={{ ...G, borderRadius: 24 }}>
                  <button onClick={() => setDictating(d => !d)}
                    className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4 transition-all cursor-pointer"
                    style={{
                      background: dictating ? 'rgba(224,94,94,0.15)' : 'rgba(201,169,110,0.15)',
                      border: `2px solid ${dictating ? '#E05E5E' : 'rgba(201,169,110,0.35)'}`,
                      boxShadow: dictating ? '0 0 0 8px rgba(224,94,94,0.08)' : 'none',
                    }}>
                    {dictating
                      ? <Pause className="h-8 w-8" style={{ color: '#E05E5E' }} />
                      : <Mic className="h-8 w-8" style={{ color: '#C9A96E' }} />
                    }
                  </button>
                  <p className="text-sm font-semibold mb-1" style={{ color: '#100C1E' }}>
                    {dictating ? 'Recording...' : 'Tap to start'}
                  </p>
                  <p className="text-xs" style={{ color: '#8A8098' }}>
                    Brain dump anything. LUNA will sort it into tasks, journal entries, ideas, or work items.
                  </p>
                </div>

                <div className="p-4" style={{ ...G, borderRadius: 22 }}>
                  <div style={LBL}>Or type it</div>
                  <Link href="/brain-dump" style={{ textDecoration: 'none' }}>
                    <div className="flex items-center justify-between py-2.5">
                      <p className="text-sm font-medium" style={{ color: '#100C1E' }}>Brain Dump</p>
                      <ChevronRight className="h-4 w-4" style={{ color: '#C9A96E' }} />
                    </div>
                  </Link>
                  <Link href="/dictation" style={{ textDecoration: 'none' }}>
                    <div className="flex items-center justify-between py-2.5" style={{ borderTop: '1px solid rgba(180,150,100,0.15)' }}>
                      <p className="text-sm font-medium" style={{ color: '#100C1E' }}>Dictation Studio</p>
                      <ChevronRight className="h-4 w-4" style={{ color: '#C9A96E' }} />
                    </div>
                  </Link>
                </div>
              </div>
    ) },
    { id: 'messages', label: 'Messages', icon: Sparkles, content: (
      <div className="space-y-3.5">
                <div className="p-4"
                  style={{ ...G, borderRadius: 22, background: 'linear-gradient(135deg, #5E5474, rgba(250,244,232,0.7))', border: '1px solid rgba(201,169,110,0.25)' }}>
                  <p className="text-xs font-bold mb-2" style={{ color: '#C9A96E' }}>Communication Coach</p>
                  <p className="text-sm" style={{ color: '#32284A' }}>
                    Paste a draft. LUNA rewrites it in 3 versions — soft, clear, and boundary-setting.
                  </p>
                </div>

                <textarea
                  value={draftText}
                  onChange={e => setDraftText(e.target.value)}
                  placeholder="Paste your draft message here..."
                  rows={4}
                  className="w-full px-4 py-3 text-sm outline-none resize-none"
                  style={INPUT}
                />

                {draftText && (
                  <div className="p-3 mb-2"
                    style={{ borderRadius: 18, background: 'rgba(230,184,74,0.10)', border: '1px solid rgba(230,184,74,0.22)' }}>
                    <p className="text-xs font-bold mb-1" style={{ color: '#E6B84A' }}>Pause before sending.</p>
                    <p className="text-xs" style={{ color: '#5E5474' }}>What are you actually needing? Are you trying to be understood, or get relief?</p>
                  </div>
                )}

                <div className="space-y-3">
                  {REWRITES.map(r => (
                    <div key={r.label} className="p-4" style={{ ...G, borderRadius: 20 }}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                        <p className="text-xs font-bold" style={{ color: r.color }}>{r.label} version</p>
                        <p className="text-xs" style={{ color: '#8A8098' }}>· {r.desc}</p>
                      </div>
                      <p className="text-sm italic" style={{ color: '#8A8098' }}>
                        {draftText ? '(Rewrite will appear here when connected to AI)' : 'Paste a draft above to generate this version.'}
                      </p>
                    </div>
                  ))}
                </div>

                <Link href="/messages" style={{ textDecoration: 'none' }}>
                  <button className="w-full py-3 text-sm font-semibold mt-2 cursor-pointer"
                    style={{ ...CTA_SECONDARY, borderRadius: 18 }}>
                    Full Messages &amp; Communication Coach →
                  </button>
                </Link>
              </div>
    ) },
    { id: 'journal', label: 'Journal', icon: BookOpen, content: (
      <div className="space-y-3.5">
                <div className="p-4" style={{ ...G, borderRadius: 22 }}>
                  <div style={LBL}>Today&apos;s prompt</div>
                  <p className="text-sm font-display italic leading-relaxed" style={{ color: '#100C1E' }}>
                    &ldquo;{prompt}&rdquo;
                  </p>
                </div>

                <textarea
                  value={journalText}
                  onChange={e => setJournalText(e.target.value)}
                  placeholder="Write freely. This is just for you."
                  rows={8}
                  className="w-full px-4 py-3 text-sm outline-none resize-none"
                  style={{ ...INPUT, lineHeight: 1.7 }}
                />

                <div className="flex gap-3">
                  <button className="flex-1 py-3 text-sm font-semibold cursor-pointer"
                    style={{ ...CTA_PRIMARY, borderRadius: 18 }}>
                    Save entry
                  </button>
                  <Link href="/journal" className="flex-1" style={{ textDecoration: 'none' }}>
                    <button className="w-full py-3 text-sm font-semibold cursor-pointer"
                      style={{ ...CTA_SECONDARY, borderRadius: 18 }}>
                      Full journal →
                    </button>
                  </Link>
                </div>
              </div>
    ) },
    { id: 'self', label: 'Highest Self', icon: Star, content: (
      <div className="space-y-3.5">
                <div className="p-5 relative overflow-hidden"
                  style={{
                    ...G, borderRadius: 24,
                    background: 'linear-gradient(135deg, #5E5474, rgba(250,244,232,0.7))',
                    border: '1px solid rgba(201,169,110,0.3)',
                  }}>
                  <div className="text-xl mb-3">🌟</div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#C9A96E' }}>Current Pattern</p>
                  <p className="text-sm mb-4" style={{ color: '#5E5474' }}>{highestSelf.current}</p>
                  <div className="w-full h-px mb-4" style={{ background: 'rgba(201,169,110,0.25)' }} />
                  <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#B8C9B4' }}>Aligned Move</p>
                  <p className="text-base font-semibold leading-snug" style={{ color: '#100C1E' }}>{highestSelf.aligned}</p>
                </div>

                <div className="p-4" style={{ ...G, borderRadius: 22 }}>
                  <div style={LBL}>Ask LUNA</div>
                  {[
                    'What would my highest self do right now?',
                    'What pattern am I repeating that I want to break?',
                    'What is the most aligned next move in my relationship?',
                    'Am I operating from fear or clarity?',
                  ].map((q, i, arr) => (
                    <button key={q} onClick={() => { setPage('chat'); setChatInput(q) }}
                      className="w-full text-left py-3 text-sm flex items-center justify-between cursor-pointer"
                      style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(180,150,100,0.15)' : 'none', color: '#100C1E' }}>
                      {q}
                      <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 ml-2" style={{ color: '#C9A96E' }} />
                    </button>
                  ))}
                </div>

                <Link href="/highest-self" style={{ textDecoration: 'none' }}>
                  <button className="w-full py-3 text-sm font-semibold cursor-pointer"
                    style={{ ...CTA_SECONDARY, borderRadius: 18 }}>
                    Full Highest Self Guide →
                  </button>
                </Link>
              </div>
    ) },
    { id: 'vault', label: 'Vault', icon: Archive, content: (
      <div className="space-y-3.5">
                <div className="p-4" style={{ ...G, borderRadius: 22 }}>
                  <div style={LBL}>Park something</div>
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {(['Idea', 'Loop', 'Dream', 'Future'] as const).map(t => (
                      <button key={t} onClick={() => setVaultTag(t)}
                        className="px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer"
                        style={vaultTag === t
                          ? { background: 'rgba(201,169,110,0.3)', border: '1px solid rgba(201,169,110,0.5)', color: '#C9A96E' }
                          : { background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(180,150,100,0.15)', color: '#8A8098' }
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
                      className="flex-1 px-3.5 py-2.5 text-sm outline-none"
                      style={{ ...INPUT, borderRadius: 16 }}
                    />
                    <button onClick={addToVault}
                      className="px-4 py-2.5 text-sm font-semibold flex-shrink-0 cursor-pointer"
                      style={{ ...CTA_PRIMARY, borderRadius: 16 }}>
                      Save
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {vault.map(item => (
                    <div key={item.id} className="p-4 flex items-start gap-3" style={{ ...G, borderRadius: 20 }}>
                      <span className="text-xs px-2.5 py-1 rounded-full flex-shrink-0 font-semibold"
                        style={{ background: 'rgba(201,169,110,0.18)', color: '#C9A96E' }}>
                        {item.tag}
                      </span>
                      <p className="text-sm flex-1" style={{ color: '#32284A' }}>{item.text}</p>
                    </div>
                  ))}
                </div>

                <Link href="/vault" style={{ textDecoration: 'none' }}>
                  <button className="w-full py-3 text-sm font-semibold cursor-pointer"
                    style={{ ...CTA_SECONDARY, borderRadius: 18 }}>
                    Full Vault →
                  </button>
                </Link>
              </div>
    ) },
  ]

  return (
    <AppLayout noScroll>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, paddingTop: 8, flexShrink: 0 }}>
        <div style={{ width: 40, height: 40, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(201,169,110,0.15)', border: '1px solid rgba(201,169,110,0.25)' }}>
          <Sparkles className="h-5 w-5" style={{ color: '#C9A96E' }} strokeWidth={1.6} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold" style={{ color: '#100C1E' }}>LUNA</h1>
          <p style={{ fontSize: 11, color: '#8A8098' }}>Talk. Process. Decide.</p>
        </div>
      </div>

      <CategoryPager
        pages={lunaPages}
        activeIndex={lunaPageIndex}
        onChangeIndex={(i) => setPage(PAGE_IDS[i])}
        hidePills
      />
    </AppLayout>
  )
}

export default function LunaPage() {
  return (
    <Suspense fallback={null}>
      <LunaPageInner />
    </Suspense>
  )
}
