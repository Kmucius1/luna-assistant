'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { CategoryPager, type CPage } from '@/components/ui/CategoryPager'
import {
  Sparkles, Star, Scissors, ShirtIcon, Image, BookOpen, Gem, Plus,
  ChevronDown, ChevronRight, Check, RotateCcw, Wand2, Camera,
  Layers, ArrowRight, Moon, Sun, Wind, Zap, Heart, Music,
  Package, Hammer, Coffee, AlertCircle, Loader2, ShoppingBag
} from 'lucide-react'

interface OracleResult {
  style_lane?: string
  outfit_energy?: string
  recommended_outfit?: {
    top?: string; bottom?: string; shoes?: string; jacket?: string; accessories?: string[]
  }
  hair?: string
  makeup?: string
  scent?: string
  why_it_works?: string
  confidence_note?: string
  highest_self_message?: string
  image_prompt?: string
}

interface SewingProject {
  id: string
  title: string
  description: string
  project_type: string
  skill_level: string
  estimated_time: string
  style_lane: string
  status: string
  materials_needed: string[]
  is_starter: boolean
  sort_order: number
}

interface VaultConcept {
  id: string
  brand_name: string
  concept: string
  category: string
  description: string
  style_notes: string
  product_ideas: { name: string; description: string }[]
  status: string
}

interface WardrobeItem {
  id: string
  name: string
  category: string
  color: string
  vibe_tags: string[]
  clean_status: string
  favorite_rating: number
}

const SECTIONS = [
  { id: 'oracle',      label: 'Today',         icon: Sparkles    },
  { id: 'closet',      label: 'Closet',         icon: ShirtIcon   },
  { id: 'inspiration', label: 'Inspo',          icon: Image       },
  { id: 'projects',    label: 'Sewing',         icon: Scissors    },
  { id: 'studio',      label: 'Generated',      icon: Layers      },
  { id: 'vault',       label: 'Fashion Vault',  icon: Gem         },
  { id: 'shopping',    label: 'Wishlist',       icon: ShoppingBag },
]

const MOOD_GRID = [
  { emoji: '🌙', label: 'Mysterious' },
  { emoji: '🔥', label: 'Confident'  },
  { emoji: '🌸', label: 'Soft'       },
  { emoji: '⚡', label: 'Bold'       },
  { emoji: '🌿', label: 'Grounded'   },
  { emoji: '✨', label: 'Ethereal'   },
  { emoji: '🖤', label: 'Dark'       },
  { emoji: '💗', label: 'Romantic'   },
  { emoji: '🌊', label: 'Fluid'      },
  { emoji: '👑', label: 'Regal'      },
  { emoji: '🌺', label: 'Tropical'   },
  { emoji: '🪐', label: 'Cosmic'     },
]

const ENERGY_LEVELS = ['1','2','3','4','5','6','7','8','9','10']
const WEATHER_OPTIONS = ['☀️ Hot', '🌤 Warm', '🌥 Mild', '🌧 Rainy', '❄️ Cold', '🌙 Night Out']

const PROJECT_STAGES = ['idea','sketch','materials needed','cut','pinned','sewn','adjusted','finished','photographed','posted']

const WARDROBE_CATEGORIES = ['tops','bottoms','dresses','outerwear','shoes','accessories','swimwear','lingerie','activewear','bags']

function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: 'var(--text-3)', fontSize: '0.7rem', letterSpacing: '0.12em' }}
      className="font-semibold uppercase tracking-widest mb-2">
      {children}
    </p>
  )
}

function ACard({ children, className = '', style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`dark-card p-5 ${className}`} style={style}>
      {children}
    </div>
  )
}

function SectionHeader({ icon: Icon, title, sub }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(155,92,255,0.15)', border: '1px solid rgba(155,92,255,0.2)' }}>
        <Icon className="w-5 h-5" style={{ color: 'var(--violet)' }} />
      </div>
      <div>
        <h2 className="font-display text-xl font-bold" style={{ color: 'var(--text-1)' }}>{title}</h2>
        {sub && <p className="text-sm" style={{ color: 'var(--text-3)' }}>{sub}</p>}
      </div>
    </div>
  )
}

interface StylePoolImage { id: string; image_url: string; label?: string }

function StylePoolBoard() {
  const [images,   setImages]   = useState<StylePoolImage[]>([])
  const [loading,  setLoading]  = useState(true)
  const [likedCount,  setLikedCount]  = useState(0)
  const [deniedCount, setDeniedCount] = useState(0)
  const [remainingUnvoted, setRemainingUnvoted] = useState(0)
  const [pending,  setPending]  = useState<Set<string>>(new Set())
  const [addUrl,   setAddUrl]   = useState('')
  const [adding,   setAdding]   = useState(false)
  const [addMsg,   setAddMsg]   = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    fetch(`/api/atelier/style-pool?tz=${encodeURIComponent(tz)}`)
      .then(r => r.json())
      .then(d => {
        setImages(d.images ?? [])
        setLikedCount(d.likedCount ?? 0)
        setDeniedCount(d.deniedCount ?? 0)
        setRemainingUnvoted(d.remainingUnvoted ?? 0)
      })
      .catch(() => setImages([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function vote(img: StylePoolImage, choice: 'liked' | 'denied') {
    setPending(p => new Set(p).add(img.id))
    setImages(prev => prev.filter(i => i.id !== img.id))
    choice === 'liked' ? setLikedCount(c => c + 1) : setDeniedCount(c => c + 1)
    try {
      await fetch('/api/atelier/style-pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_id: img.id, vote: choice }),
      })
    } catch { /* vote is optimistic; a failed save just means it may resurface tomorrow */ }
    finally {
      setPending(p => { const n = new Set(p); n.delete(img.id); return n })
    }
  }

  async function addPin() {
    if (!addUrl.trim() || adding) return
    setAdding(true)
    setAddMsg('')
    try {
      const res = await fetch('/api/atelier/style-pool/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: addUrl.trim() }),
      })
      if (!res.ok) throw new Error()
      setAddUrl('')
      setAddMsg('Added — it\'ll show up in a future rotation.')
      setRemainingUnvoted(c => c + 1)
    } catch {
      setAddMsg('Couldn\'t add that one — check the URL and try again.')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-4">
      <ACard>
        <SLabel>Today's style pull</SLabel>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          A new random set every day. Heart what feels like you, deny what doesn't —
          LUNA uses this to learn your actual taste.
        </p>
        <div className="flex items-center gap-4 mt-3">
          <span className="text-xs font-semibold" style={{ color: 'var(--violet)' }}>♥ {likedCount} liked</span>
          <span className="text-xs font-semibold" style={{ color: 'var(--text-3)' }}>✕ {deniedCount} denied</span>
        </div>
      </ACard>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="rounded-2xl shimmer" style={{ aspectRatio: '3/4' }} />)}
        </div>
      ) : images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map(img => (
            <div key={img.id} style={{
              position: 'relative', borderRadius: 18, overflow: 'hidden', aspectRatio: '3/4',
              background: 'var(--surface)', opacity: pending.has(img.id) ? 0.5 : 1, transition: 'opacity 0.15s',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.image_url} alt={img.label ?? ''} loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, display: 'flex', gap: 6 }}>
                <button onClick={() => vote(img, 'denied')} disabled={pending.has(img.id)}
                  style={{
                    flex: 1, height: 34, borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: 'rgba(10,4,28,0.6)', backdropFilter: 'blur(6px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  <span style={{ color: 'white', fontSize: 15, fontWeight: 700 }}>✕</span>
                </button>
                <button onClick={() => vote(img, 'liked')} disabled={pending.has(img.id)}
                  style={{
                    flex: 1, height: 34, borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: 'rgba(155,92,255,0.85)', backdropFilter: 'blur(6px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  <Heart size={15} color="white" fill="white" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ACard>
          <p className="text-sm text-center leading-relaxed" style={{ color: 'var(--text-2)' }}>
            {remainingUnvoted === 0 && (likedCount > 0 || deniedCount > 0)
              ? 'You\'ve reviewed everything in your style pool — add more pins below to keep going.'
              : 'No pins yet — add one below to start.'}
          </p>
        </ACard>
      )}

      <ACard>
        <SLabel>Add a pin</SLabel>
        <p className="text-xs mb-3" style={{ color: 'var(--text-3)' }}>
          Paste an image URL from a Pinterest pin (or anywhere) to grow the pool.
        </p>
        <div className="flex gap-2">
          <input
            value={addUrl}
            onChange={e => setAddUrl(e.target.value)}
            placeholder="https://i.pinimg.com/..."
            className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
            style={{ background: 'var(--surface-subtle)', border: '1px solid var(--surface-border)', color: 'var(--text-1)' }}
          />
          <button onClick={() => void addPin()} disabled={!addUrl.trim() || adding}
            className="rounded-xl px-4 py-2 text-sm font-semibold"
            style={{ background: addUrl.trim() ? 'var(--violet)' : 'var(--surface)', color: addUrl.trim() ? 'white' : 'var(--text-3)', border: 'none', cursor: addUrl.trim() ? 'pointer' : 'default' }}>
            {adding ? '...' : 'Add'}
          </button>
        </div>
        {addMsg && <p className="text-xs mt-2" style={{ color: 'var(--text-3)' }}>{addMsg}</p>}
      </ACard>
    </div>
  )
}

function OracleSection() {
  const [selectedMood, setSelectedMood] = useState('')
  const [desiredFeel, setDesiredFeel] = useState('')
  const [event, setEvent] = useState('')
  const [weather, setWeather] = useState('')
  const [energy, setEnergy] = useState('7')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<OracleResult | null>(null)
  const [error, setError] = useState('')

  async function askOracle() {
    if (!selectedMood && !desiredFeel) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/atelier/oracle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood: selectedMood,
          desired_feel: desiredFeel,
          event,
          weather,
          energy_level: energy,
        })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
    } catch {
      setError('Oracle is resting — try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <SectionHeader icon={Sparkles} title="Style Oracle" sub="Tell her how you feel — she'll dress you perfectly." />

      <ACard>
        <SLabel>Your mood today</SLabel>
        <div className="grid grid-cols-4 gap-2">
          {MOOD_GRID.map(m => (
            <button key={m.label}
              onClick={() => setSelectedMood(m.label)}
              className="flex flex-col items-center gap-1 rounded-2xl py-3 px-2 transition-all"
              style={{
                background: selectedMood === m.label ? 'rgba(155,92,255,0.20)' : 'var(--surface-subtle)',
                border: selectedMood === m.label ? '1.5px solid rgba(155,92,255,0.5)' : '1.5px solid var(--surface-border)',
              }}>
              <span className="text-xl">{m.emoji}</span>
              <span style={{ color: selectedMood === m.label ? 'var(--violet)' : 'var(--text-3)', fontSize: '0.72rem' }}
                className="font-medium text-center leading-tight">{m.label}</span>
            </button>
          ))}
        </div>
      </ACard>

      <ACard>
        <SLabel>Give her context</SLabel>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>What feeling are you going for?</p>
            <input
              value={desiredFeel}
              onChange={e => setDesiredFeel(e.target.value)}
              placeholder="e.g. powerful but soft, like a goddess"
              className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
              style={{ background: 'var(--surface-subtle)', border: '1px solid var(--surface-border)', color: 'var(--text-1)' }}
            />
          </div>
          <div>
            <p className="text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Today&apos;s event or occasion?</p>
            <input
              value={event}
              onChange={e => setEvent(e.target.value)}
              placeholder="e.g. content shoot, errands, dinner date"
              className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
              style={{ background: 'var(--surface-subtle)', border: '1px solid var(--surface-border)', color: 'var(--text-1)' }}
            />
          </div>
          <div>
            <p className="text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Weather</p>
            <div className="flex flex-wrap gap-2">
              {WEATHER_OPTIONS.map(w => (
                <button key={w}
                  onClick={() => setWeather(weather === w ? '' : w)}
                  className="rounded-full px-3 py-1.5 text-sm font-medium transition-all"
                  style={{
                    background: weather === w ? 'rgba(155,92,255,0.20)' : 'var(--surface-subtle)',
                    border: weather === w ? '1.5px solid rgba(155,92,255,0.5)' : '1px solid var(--surface-border)',
                    color: weather === w ? 'var(--violet)' : 'var(--text-2)',
                  }}>
                  {w}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Energy level: {energy}/10</p>
            <div className="flex gap-1.5">
              {ENERGY_LEVELS.map(n => (
                <button key={n}
                  onClick={() => setEnergy(n)}
                  className="flex-1 rounded-full py-1.5 text-xs font-bold transition-all"
                  style={{
                    background: energy === n ? 'var(--violet)' : 'var(--surface-subtle)',
                    color: energy === n ? '#fff' : 'var(--text-3)',
                  }}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      </ACard>

      <button
        onClick={askOracle}
        disabled={loading || (!selectedMood && !desiredFeel)}
        className="w-full rounded-2xl py-4 font-bold text-base transition-all flex items-center justify-center gap-2"
        style={{
          background: (!selectedMood && !desiredFeel) ? 'var(--surface)' : 'linear-gradient(135deg, #9b5cff, #7C3FE0)',
          color: (!selectedMood && !desiredFeel) ? 'var(--text-3)' : '#fff',
          opacity: loading ? 0.7 : 1,
        }}>
        {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Reading your energy...</> : <><Sparkles className="w-5 h-5" /> Ask the Oracle</>}
      </button>

      {error && <p className="text-center text-sm" style={{ color: 'var(--blush)' }}>{error}</p>}

      {result && (
        <div className="rounded-3xl p-6 space-y-5"
          style={{ background: 'linear-gradient(135deg, rgba(155,92,255,0.18) 0%, rgba(106,79,155,0.12) 100%)', border: '1px solid rgba(155,92,255,0.25)' }}>
          {result.style_lane && (
            <div className="flex items-center gap-2">
              <div className="rounded-full px-3 py-1 text-sm font-bold"
                style={{ background: 'rgba(155,92,255,0.25)', color: 'var(--violet)' }}>
                {result.style_lane}
              </div>
              {result.outfit_energy && (
                <p className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>{result.outfit_energy}</p>
              )}
            </div>
          )}
          {result.recommended_outfit && (
            <div className="space-y-2">
              <SLabel>Your look</SLabel>
              {Object.entries(result.recommended_outfit).map(([key, val]) => {
                if (!val) return null
                const label = key.charAt(0).toUpperCase() + key.slice(1)
                const value = Array.isArray(val) ? val.join(', ') : String(val)
                return (
                  <div key={key} className="flex gap-3 items-start">
                    <span className="text-sm font-semibold w-24 flex-shrink-0" style={{ color: 'var(--violet)' }}>{label}</span>
                    <span className="text-sm flex-1" style={{ color: 'var(--text-1)' }}>{value}</span>
                  </div>
                )
              })}
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            {result.hair && (
              <div className="rounded-2xl p-3 text-center"
                style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-3)' }}>HAIR</p>
                <p className="text-sm" style={{ color: 'var(--text-1)' }}>{result.hair}</p>
              </div>
            )}
            {result.makeup && (
              <div className="rounded-2xl p-3 text-center"
                style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-3)' }}>MAKEUP</p>
                <p className="text-sm" style={{ color: 'var(--text-1)' }}>{result.makeup}</p>
              </div>
            )}
            {result.scent && (
              <div className="rounded-2xl p-3 text-center"
                style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-3)' }}>SCENT</p>
                <p className="text-sm" style={{ color: 'var(--text-1)' }}>{result.scent}</p>
              </div>
            )}
          </div>
          {result.why_it_works && (
            <div className="rounded-2xl p-4"
              style={{ background: 'rgba(155,92,255,0.10)', border: '1px solid rgba(155,92,255,0.15)' }}>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>✨ {result.why_it_works}</p>
            </div>
          )}
          {result.highest_self_message && (
            <div className="text-center pt-2">
              <p className="font-display text-lg font-bold leading-relaxed" style={{ color: 'var(--text-1)' }}>
                &ldquo;{result.highest_self_message}&rdquo;
              </p>
            </div>
          )}
          {result.image_prompt && (
            <div className="rounded-2xl p-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-3)' }}>AI IMAGE PROMPT</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{result.image_prompt}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ClosetSection() {
  const [items, setItems] = useState<WardrobeItem[]>([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', category: 'tops', color: '' })
  const [saving, setSaving] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [detectMsg, setDetectMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/atelier/wardrobe')
      const data = await res.json()
      setItems(data.items ?? [])
    } catch { /* table might not exist yet */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = activeCategory === 'all' ? items : items.filter(i => i.category === activeCategory)

  async function addItem() {
    if (!newItem.name || !newItem.category) return
    setSaving(true)
    try {
      const res = await fetch('/api/atelier/wardrobe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newItem, analyze: false }),
      })
      const data = await res.json()
      if (data.item) {
        setItems(prev => [data.item, ...prev])
        setNewItem({ name: '', category: 'tops', color: '' })
        setShowAdd(false)
      }
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setDetecting(true)
    setDetectMsg(null)
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const res = await fetch('/api/atelier/wardrobe/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: reader.result, sourceLabel: new Date().toLocaleDateString() }),
        })
        const data = await res.json() as { items?: WardrobeItem[]; error?: string; message?: string }
        if (data.items?.length) {
          setItems(prev => [...data.items!, ...prev])
          setDetectMsg(`Added ${data.items.length} piece${data.items.length === 1 ? '' : 's'} from that photo.`)
        } else {
          setDetectMsg(data.error || data.message || 'No pieces detected in that photo — try a clearer shot.')
        }
      } catch {
        setDetectMsg("Couldn't process that photo. Try again.")
      } finally {
        setDetecting(false)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-5">
      <SectionHeader icon={ShirtIcon} title="My Closet" sub="Track every piece — what you have, what it goes with." />

      <label
        className="w-full rounded-2xl py-3.5 flex items-center justify-center gap-2 font-semibold text-sm transition-all cursor-pointer"
        style={{ background: 'linear-gradient(135deg, rgba(155,92,255,0.16), rgba(124,63,224,0.16))', border: '1.5px solid rgba(155,92,255,0.3)', color: 'var(--luna-purple-2, #b98bff)', opacity: detecting ? 0.7 : 1 }}>
        {detecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
        {detecting ? 'Reading your outfit…' : 'Upload today\'s outfit — auto-sort into pieces'}
        <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} disabled={detecting} className="hidden" />
      </label>
      {detectMsg && (
        <p className="text-xs text-center" style={{ color: 'var(--text-3)' }}>{detectMsg}</p>
      )}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {['all', ...WARDROBE_CATEGORIES].map(cat => (
          <button key={cat}
            onClick={() => setActiveCategory(cat)}
            className="flex-shrink-0 rounded-full px-4 py-2 text-sm font-semibold capitalize transition-all"
            style={{
              background: activeCategory === cat ? 'var(--violet)' : 'var(--surface)',
              color: activeCategory === cat ? '#fff' : 'var(--text-2)',
              border: activeCategory === cat ? 'none' : '1px solid var(--surface-border)',
            }}>
            {cat}
          </button>
        ))}
      </div>
      <button
        onClick={() => setShowAdd(!showAdd)}
        className="w-full rounded-2xl py-3.5 flex items-center justify-center gap-2 font-semibold text-sm transition-all"
        style={{ background: 'var(--surface)', border: '1.5px dashed var(--surface-border)', color: 'var(--text-2)' }}>
        <Plus className="w-4 h-4" />
        Add piece to closet
      </button>
      {showAdd && (
        <ACard>
          <SLabel>New closet item</SLabel>
          <div className="space-y-3">
            <input
              value={newItem.name}
              onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))}
              placeholder="Item name (e.g. Black cargo pants)"
              className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
              style={{ background: 'var(--surface-subtle)', border: '1px solid var(--surface-border)', color: 'var(--text-1)' }}
            />
            <div className="flex gap-3">
              <select
                value={newItem.category}
                onChange={e => setNewItem(p => ({ ...p, category: e.target.value }))}
                className="flex-1 rounded-2xl px-4 py-3 text-sm outline-none capitalize"
                style={{ background: 'var(--surface-subtle)', border: '1px solid var(--surface-border)', color: 'var(--text-1)' }}>
                {WARDROBE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                value={newItem.color}
                onChange={e => setNewItem(p => ({ ...p, color: e.target.value }))}
                placeholder="Color"
                className="flex-1 rounded-2xl px-4 py-3 text-sm outline-none"
                style={{ background: 'var(--surface-subtle)', border: '1px solid var(--surface-border)', color: 'var(--text-1)' }}
              />
            </div>
            <button
              onClick={addItem}
              disabled={saving || !newItem.name}
              className="w-full rounded-2xl py-3 font-bold text-sm transition-all"
              style={{ background: 'linear-gradient(135deg, #9b5cff, #7C3FE0)', color: '#fff', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving...' : 'Add to Closet'}
            </button>
          </div>
        </ACard>
      )}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--violet)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <ACard className="text-center py-8">
          <p className="text-3xl mb-3">👗</p>
          <p className="font-semibold text-base mb-1" style={{ color: 'var(--text-1)' }}>Your closet is empty</p>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Add your first piece above to start tracking your wardrobe</p>
        </ACard>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(item => (
            <ACard key={item.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
                  style={{ background: item.color ? `${item.color}20` : 'var(--surface-subtle)', border: '1px solid var(--surface-border)' }}>
                  👗
                </div>
                <div className="flex items-center gap-1">
                  {item.clean_status === 'clean' ? (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(184,201,180,0.2)', color: '#8BAB87' }}>Clean</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,169,110,0.2)', color: '#C9A96E' }}>Worn</span>
                  )}
                </div>
              </div>
              <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-1)' }}>{item.name}</p>
              <p className="text-xs capitalize" style={{ color: 'var(--text-3)' }}>{item.category}{item.color ? ` · ${item.color}` : ''}</p>
              {item.vibe_tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {item.vibe_tags.slice(0, 2).map(t => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(155,92,255,0.12)', color: 'var(--violet)' }}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </ACard>
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectsSection() {
  const [projects, setProjects] = useState<SewingProject[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/atelier/projects')
      const data = await res.json()
      setProjects(data.projects ?? [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function seedProjects() {
    setSeeding(true)
    try {
      const res = await fetch('/api/atelier/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seed_starters: true }) })
      const data = await res.json()
      if (data.projects) setProjects(data.projects)
    } catch { /* ignore */ }
    finally { setSeeding(false) }
  }

  async function advanceStage(project: SewingProject) {
    const currentIdx = PROJECT_STAGES.indexOf(project.status)
    const nextStage = PROJECT_STAGES[currentIdx + 1]
    if (!nextStage) return
    try {
      const res = await fetch('/api/atelier/projects', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: project.id, status: nextStage }) })
      const data = await res.json()
      if (data.project) setProjects(prev => prev.map(p => p.id === project.id ? data.project : p))
    } catch { /* ignore */ }
  }

  const stageColor = (status: string) => {
    const idx = PROJECT_STAGES.indexOf(status)
    if (idx < 3) return '#9E95AC'
    if (idx < 7) return '#9b5cff'
    return '#B8C9B4'
  }

  return (
    <div className="space-y-5">
      <SectionHeader icon={Scissors} title="Sewing Projects" sub="7 starter projects to build your skills." />
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--violet)' }} /></div>
      ) : projects.length === 0 ? (
        <ACard className="text-center py-8">
          <p className="text-3xl mb-3">🧵</p>
          <p className="font-semibold text-base mb-1" style={{ color: 'var(--text-1)' }}>No projects yet</p>
          <p className="text-sm mb-5" style={{ color: 'var(--text-3)' }}>Load the 7 beginner starter projects built for your style</p>
          <button onClick={seedProjects} disabled={seeding} className="rounded-2xl px-6 py-3 font-bold text-sm transition-all" style={{ background: 'linear-gradient(135deg, #9b5cff, #7C3FE0)', color: '#fff', opacity: seeding ? 0.7 : 1 }}>
            {seeding ? 'Loading...' : 'Load Starter Projects'}
          </button>
        </ACard>
      ) : (
        <div className="space-y-3">
          {projects.map(project => {
            const stageIdx = PROJECT_STAGES.indexOf(project.status)
            const progress = Math.round(((stageIdx + 1) / PROJECT_STAGES.length) * 100)
            const isExpanded = expandedId === project.id
            const isDone = project.status === 'posted'
            return (
              <ACard key={project.id}>
                <button className="w-full text-left" onClick={() => setExpandedId(isExpanded ? null : project.id)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(155,92,255,0.12)', color: 'var(--violet)' }}>{project.style_lane}</span>
                        <span className="text-xs" style={{ color: 'var(--text-3)' }}>{project.estimated_time}</span>
                      </div>
                      <p className="font-semibold text-base" style={{ color: 'var(--text-1)' }}>{project.title}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--surface-subtle)' }}>
                          <div className="h-1.5 rounded-full transition-all" style={{ width: `${progress}%`, background: stageColor(project.status) }} />
                        </div>
                        <span className="text-xs font-medium flex-shrink-0" style={{ color: stageColor(project.status) }}>{project.status}</span>
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 flex-shrink-0 mt-1 transition-transform" style={{ color: 'var(--text-3)', transform: isExpanded ? 'rotate(180deg)' : undefined }} />
                  </div>
                </button>
                {isExpanded && (
                  <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--surface-border)' }}>
                    <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-2)' }}>{project.description}</p>
                    {project.materials_needed?.length > 0 && (
                      <div className="mb-4">
                        <SLabel>Materials needed</SLabel>
                        <div className="flex flex-wrap gap-2">
                          {project.materials_needed.map(m => (
                            <span key={m} className="text-sm px-3 py-1 rounded-full" style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--text-2)' }}>{m}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="mb-4">
                      <SLabel>Stage progress</SLabel>
                      <div className="flex flex-wrap gap-1">
                        {PROJECT_STAGES.map((stage, idx) => (
                          <span key={stage} className="text-xs px-2 py-1 rounded-full font-medium capitalize"
                            style={{ background: idx <= stageIdx ? 'rgba(155,92,255,0.2)' : 'var(--surface-subtle)', color: idx <= stageIdx ? 'var(--violet)' : 'var(--text-4)', border: idx === stageIdx ? '1px solid rgba(155,92,255,0.4)' : '1px solid transparent' }}>
                            {idx <= stageIdx ? '✓ ' : ''}{stage}
                          </span>
                        ))}
                      </div>
                    </div>
                    {!isDone && (
                      <button onClick={() => advanceStage(project)} className="w-full rounded-2xl py-3 font-semibold text-sm transition-all flex items-center justify-center gap-2"
                        style={{ background: 'rgba(155,92,255,0.15)', border: '1px solid rgba(155,92,255,0.25)', color: 'var(--violet)' }}>
                        <ArrowRight className="w-4 h-4" />
                        Mark as &ldquo;{PROJECT_STAGES[stageIdx + 1]}&rdquo;
                      </button>
                    )}
                    {isDone && (
                      <div className="text-center py-2">
                        <p className="text-lg">🎉</p>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>Project complete!</p>
                      </div>
                    )}
                  </div>
                )}
              </ACard>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StudioSection() {
  const [projectTitle, setProjectTitle] = useState('')
  const [projectType, setProjectType] = useState('new_piece')
  const [styleLane, setStyleLane] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const STYLE_LANES = ['LUNA Street Fairy','Jersey Siren','Soft Grunge Fairy','Street Oracle','Resort Street','Crystal Goddess','Dark Founder','Siren Mode']
  const PROJECT_TYPES = [
    { value: 'new_piece', label: 'New piece' },
    { value: 'crop', label: 'Crop & cut' },
    { value: 'embellish', label: 'Embellish' },
    { value: 'alter', label: 'Alter fit' },
    { value: 'swimwear', label: 'Swimwear' },
  ]

  async function createProject() {
    if (!projectTitle || !styleLane) return
    setSaving(true)
    try {
      const res = await fetch('/api/atelier/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: projectTitle, project_type: projectType, style_lane: styleLane, description, skill_level: 'intermediate', status: 'idea' }) })
      const data = await res.json()
      if (data.project) { setSaved(true); setProjectTitle(''); setDescription(''); setTimeout(() => setSaved(false), 3000) }
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-5">
      <SectionHeader icon={Layers} title="Design Studio" sub="Plan a new piece, crop, or custom creation." />
      <ACard>
        <SLabel>Project title</SLabel>
        <input value={projectTitle} onChange={e => setProjectTitle(e.target.value)} placeholder="e.g. Lace-insert cargos with crystal waist chain" className="w-full rounded-2xl px-4 py-3 text-sm outline-none mb-4" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--surface-border)', color: 'var(--text-1)' }} />
        <SLabel>Project type</SLabel>
        <div className="flex flex-wrap gap-2 mb-4">
          {PROJECT_TYPES.map(t => (
            <button key={t.value} onClick={() => setProjectType(t.value)} className="rounded-full px-4 py-2 text-sm font-medium transition-all"
              style={{ background: projectType === t.value ? 'var(--violet)' : 'var(--surface)', color: projectType === t.value ? '#fff' : 'var(--text-2)', border: projectType === t.value ? 'none' : '1px solid var(--surface-border)' }}>
              {t.label}
            </button>
          ))}
        </div>
        <SLabel>Style lane</SLabel>
        <div className="flex flex-wrap gap-2 mb-4">
          {STYLE_LANES.map(lane => (
            <button key={lane} onClick={() => setStyleLane(lane)} className="rounded-full px-3 py-1.5 text-sm font-medium transition-all"
              style={{ background: styleLane === lane ? 'rgba(155,92,255,0.20)' : 'var(--surface-subtle)', color: styleLane === lane ? 'var(--violet)' : 'var(--text-3)', border: styleLane === lane ? '1.5px solid rgba(155,92,255,0.4)' : '1px solid var(--surface-border)' }}>
              {lane}
            </button>
          ))}
        </div>
        <SLabel>Notes & vision</SLabel>
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the vision — fabrics, fit, details, inspiration..." rows={4} className="w-full rounded-2xl px-4 py-3 text-sm outline-none resize-none mb-4" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--surface-border)', color: 'var(--text-1)' }} />
        <button onClick={createProject} disabled={saving || !projectTitle || !styleLane} className="w-full rounded-2xl py-3.5 font-bold text-sm transition-all flex items-center justify-center gap-2"
          style={{ background: !projectTitle || !styleLane ? 'var(--surface)' : 'linear-gradient(135deg, #9b5cff, #7C3FE0)', color: !projectTitle || !styleLane ? 'var(--text-3)' : '#fff', opacity: saving ? 0.7 : 1 }}>
          {saved ? <><Check className="w-4 h-4" /> Saved to Projects</> : saving ? 'Saving...' : <><Scissors className="w-4 h-4" /> Create Project</>}
        </button>
      </ACard>
    </div>
  )
}

function VaultSection() {
  const [concepts, setConcepts] = useState<VaultConcept[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/atelier/vault')
      const data = await res.json()
      setConcepts(data.concepts ?? [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function seedVault() {
    setSeeding(true)
    try {
      const res = await fetch('/api/atelier/vault', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seed_vault: true }) })
      const data = await res.json()
      if (data.concepts) setConcepts(data.concepts)
    } catch { /* ignore */ }
    finally { setSeeding(false) }
  }

  const categoryGradient = (category: string) => {
    if (category === 'swimwear')   return 'linear-gradient(135deg, rgba(168,196,218,0.2), rgba(184,159,216,0.15))'
    if (category === 'streetwear') return 'linear-gradient(135deg, rgba(155,92,255,0.2), rgba(106,79,155,0.15))'
    return 'linear-gradient(135deg, rgba(201,169,110,0.15), rgba(232,192,194,0.1))'
  }

  return (
    <div className="space-y-5">
      <SectionHeader icon={Gem} title="Fashion Line Vault" sub="Your brand concepts — from idea to empire." />
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--violet)' }} /></div>
      ) : concepts.length === 0 ? (
        <ACard className="text-center py-8">
          <p className="text-3xl mb-3">💎</p>
          <p className="font-semibold text-base mb-1" style={{ color: 'var(--text-1)' }}>Vault is empty</p>
          <p className="text-sm mb-5" style={{ color: 'var(--text-3)' }}>Load your 5 pre-seeded brand concepts</p>
          <button onClick={seedVault} disabled={seeding} className="rounded-2xl px-6 py-3 font-bold text-sm transition-all" style={{ background: 'linear-gradient(135deg, #9b5cff, #7C3FE0)', color: '#fff', opacity: seeding ? 0.7 : 1 }}>
            {seeding ? 'Loading...' : 'Open the Vault'}
          </button>
        </ACard>
      ) : (
        <div className="space-y-4">
          {concepts.map(concept => {
            const isExpanded = expandedId === concept.id
            return (
              <div key={concept.id} className="rounded-3xl overflow-hidden" style={{ background: categoryGradient(concept.category), border: '1px solid var(--surface-border)' }}>
                <button className="w-full text-left p-5" onClick={() => setExpandedId(isExpanded ? null : concept.id)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold capitalize" style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--text-2)' }}>{concept.category}</span>
                        <span className="text-xs" style={{ color: 'var(--text-3)' }}>{concept.status === 'vault' ? '🔒 In Vault' : '🚀 Active'}</span>
                      </div>
                      <h3 className="font-display text-lg font-bold" style={{ color: 'var(--text-1)' }}>{concept.brand_name}</h3>
                      <p className="text-sm" style={{ color: 'var(--text-3)' }}>{concept.concept}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 flex-shrink-0 mt-1 transition-transform" style={{ color: 'var(--text-3)', transform: isExpanded ? 'rotate(180deg)' : undefined }} />
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-5 pb-5 space-y-4" style={{ borderTop: '1px solid var(--surface-border)' }}>
                    <div className="pt-4">
                      <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-2)' }}>{concept.description}</p>
                      {concept.style_notes && (
                        <div className="rounded-2xl p-3 mb-3" style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
                          <SLabel>Style notes</SLabel>
                          <p className="text-sm" style={{ color: 'var(--text-2)' }}>{concept.style_notes}</p>
                        </div>
                      )}
                      {concept.product_ideas?.length > 0 && (
                        <div>
                          <SLabel>Product ideas</SLabel>
                          <div className="space-y-2">
                            {concept.product_ideas.map((prod, idx) => (
                              <div key={idx} className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
                                <p className="text-sm font-bold mb-0.5" style={{ color: 'var(--text-1)' }}>{prod.name}</p>
                                <p className="text-sm" style={{ color: 'var(--text-3)' }}>{prod.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          <div className="rounded-3xl p-5 flex flex-col items-center justify-center gap-2 text-center" style={{ background: 'var(--surface)', border: '1.5px dashed var(--surface-border)' }}>
            <Plus className="w-6 h-6" style={{ color: 'var(--text-3)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>Add a new brand concept</p>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>Coming soon — full brand builder</p>
          </div>
        </div>
      )}
    </div>
  )
}

interface WishlistItem {
  id: string
  list: 'Buy' | 'Thrift' | 'Fabric' | 'Accessory'
  text: string
}

function ShoppingSection() {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newItem, setNewItem] = useState('')
  const [newList, setNewList] = useState<'Thrift' | 'Fabric' | 'Buy' | 'Accessory'>('Buy')
  const [saving, setSaving] = useState(false)
  const lists = ['Buy', 'Thrift', 'Fabric', 'Accessory'] as const

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/atelier/shopping')
      const data = await res.json()
      setItems(data.items ?? [])
    } catch { /* table might not exist yet */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function addItem() {
    if (!newItem.trim() || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/atelier/shopping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ list: newList, text: newItem.trim() }),
      })
      const data = await res.json()
      if (data.item) {
        setItems(prev => [...prev, data.item])
        setNewItem('')
      }
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  async function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    try {
      await fetch('/api/atelier/shopping', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    } catch { /* ignore — item already removed from view */ }
  }

  return (
    <div className="space-y-4">
      <SectionHeader icon={ShoppingBag} title="Shopping & Wishlist" sub="What you're hunting for" />
      <ACard>
        <SLabel>Add to list</SLabel>
        <div className="flex gap-2 mb-3 flex-wrap">
          {lists.map(l => (
            <button key={l} onClick={() => setNewList(l)} className="px-3 py-1.5 rounded-full text-xs font-semibold"
              style={newList === l ? { background: 'var(--violet)', color: 'white' } : { background: 'rgba(155,92,255,0.1)', color: 'var(--text-2)' }}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()} placeholder="What are you looking for?"
            className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-1)', border: '1px solid rgba(155,92,255,0.15)' }} />
          <button onClick={addItem} disabled={saving || !newItem.trim()} className="px-4 py-2.5 rounded-xl text-sm font-semibold flex-shrink-0" style={{ background: 'var(--violet)', color: 'white', opacity: saving ? 0.7 : 1 }}>Add</button>
        </div>
      </ACard>
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-3)' }} />
        </div>
      )}
      {!loading && lists.map(list => {
        const listItems = items.filter(i => i.list === list)
        if (!listItems.length) return null
        return (
          <ACard key={list}>
            <SLabel>{list === 'Buy' ? 'Buy New' : list === 'Thrift' ? 'Thrift List' : list === 'Fabric' ? 'Fabric List' : 'Accessories'}</SLabel>
            <div className="space-y-2">
              {listItems.map(item => (
                <div key={item.id} className="flex items-center gap-3">
                  <button onClick={() => removeItem(item.id)} className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{ background: 'rgba(155,92,255,0.1)', border: '1px solid rgba(155,92,255,0.2)' }}>
                    <Check className="w-3 h-3" style={{ color: 'var(--violet)' }} />
                  </button>
                  <p className="text-sm flex-1" style={{ color: 'var(--text-1)' }}>{item.text}</p>
                </div>
              ))}
            </div>
          </ACard>
        )
      })}
      {!loading && !items.length && (
        <p className="text-sm text-center py-4" style={{ color: 'var(--text-3)' }}>Nothing on your list yet — add what you're hunting for above.</p>
      )}
    </div>
  )
}

// Order here is the pager's tab order — also what `?tab=` matches against.
const TAB_IDS = ['style', 'oracle', 'closet', 'sewing', 'studio', 'vault', 'shopping'] as const

function CreativePageInner() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab')
  const [activeIndex, setActiveIndex] = useState(() => {
    const i = TAB_IDS.indexOf((initialTab ?? '') as typeof TAB_IDS[number])
    return i === -1 ? 0 : i
  })

  const creativePages: CPage[] = [
    { id: 'style',       label: '✨ Style',    content: <StylePoolBoard /> },
    { id: 'oracle',      label: 'Oracle',      content: <OracleSection /> },
    { id: 'closet',      label: 'Closet',      content: <ClosetSection /> },
    { id: 'sewing',      label: 'Sewing',      content: <ProjectsSection /> },
    { id: 'studio',      label: 'Generated',   content: <StudioSection /> },
    { id: 'vault',       label: 'Vault',       content: <VaultSection /> },
    { id: 'shopping',    label: 'Wishlist',    content: <ShoppingSection /> },
  ]

  return (
    <AppLayout noScroll>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, paddingTop: 8 }}>
        <div style={{ width: 40, height: 40, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(155,92,255,0.12)', border: '1px solid rgba(155,92,255,0.2)' }}>
          <Scissors className="h-5 w-5" style={{ color: 'var(--violet)' }} strokeWidth={1.6} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold" style={{ color: 'white' }}>Creative</h1>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Your fashion world, fully yours.</p>
        </div>
      </div>

      <CategoryPager pages={creativePages} accentColor="#C9A96E" activeIndex={activeIndex} onChangeIndex={setActiveIndex} />
    </AppLayout>
  )
}

export default function AtelierPage() {
  return (
    <Suspense fallback={null}>
      <CreativePageInner />
    </Suspense>
  )
}
