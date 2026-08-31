'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { LunaLoadingState, LunaErrorState } from '@/components/luna'
import { Heart, ArrowLeft } from 'lucide-react'

interface BoardItem {
  ref_number: number
  image_url: string
  liked: boolean
}

// --luna-purple-2 / --luna-panel are global constants (always purple/dark,
// not theme-toggled) and --text-1/--text-3 are theme-toggled globally —
// pinning all four here locks this page to the warm ivory palette
// regardless of which theme is active elsewhere, so text/panels never go
// invisible against the light background.
const LIGHT_PALETTE_VARS = {
  '--text-1': '#100C1E',
  '--text-3': '#5E5474',
  '--luna-purple-2': '#5C4530',
  '--luna-panel': 'rgba(255,255,255,0.6)',
} as React.CSSProperties

export default function StyleBoardPage() {
  const [board, setBoard] = useState<BoardItem[] | null>(null)
  const [likedCount, setLikedCount] = useState(0)
  const [error, setError] = useState(false)
  const [pending, setPending] = useState<Set<number>>(new Set())

  const load = useCallback(() => {
    setError(false)
    fetch('/api/atelier/style-board')
      .then(r => r.json())
      .then(d => { setBoard(d.board); setLikedCount(d.likedCount ?? 0) })
      .catch(() => setError(true))
  }, [])

  useEffect(() => { load() }, [load])

  async function toggleLike(item: BoardItem) {
    if (!board) return
    const nextLiked = !item.liked
    setPending(p => new Set(p).add(item.ref_number))
    // optimistic update
    setBoard(b => b!.map(x => x.ref_number === item.ref_number ? { ...x, liked: nextLiked } : x))
    setLikedCount(c => c + (nextLiked ? 1 : -1))
    try {
      await fetch('/api/atelier/style-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref_number: item.ref_number, liked: nextLiked }),
      })
    } catch {
      // revert on failure
      setBoard(b => b!.map(x => x.ref_number === item.ref_number ? { ...x, liked: item.liked } : x))
      setLikedCount(c => c + (nextLiked ? -1 : 1))
    } finally {
      setPending(p => { const n = new Set(p); n.delete(item.ref_number); return n })
    }
  }

  return (
    <div className="bg-app min-h-screen" style={LIGHT_PALETTE_VARS}>
      <AppLayout wide>
        <div className="pt-4 pb-2">
          <Link href="/creative" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={14} style={{ color: 'var(--luna-purple-2)' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--luna-purple-2)' }}>Atelier</span>
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#F5EFE3', margin: '10px 0 4px' }}>Style Board</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
            Tap the ones that feel like you. {likedCount > 0 && `${likedCount} liked so far.`}
          </p>
        </div>

        {error && <LunaErrorState onRetry={load} />}
        {!board && !error && <LunaLoadingState message="Loading looks…" />}

        {board && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pb-8">
            {board.map(item => (
              <button
                key={item.ref_number}
                onClick={() => toggleLike(item)}
                style={{
                  position: 'relative', border: 'none', padding: 0, cursor: 'pointer',
                  borderRadius: 18, overflow: 'hidden', aspectRatio: '3/4',
                  background: 'var(--luna-panel)',
                  outline: item.liked ? '2px solid var(--luna-purple-2)' : 'none',
                  opacity: pending.has(item.ref_number) ? 0.6 : 1,
                  transition: 'opacity 0.15s, outline 0.15s',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image_url}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  loading="lazy"
                />
                <div
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    width: 30, height: 30, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: item.liked ? 'rgba(201,169,110,0.85)' : 'rgba(10,4,28,0.55)',
                    backdropFilter: 'blur(6px)',
                  }}
                >
                  <Heart size={15} fill={item.liked ? 'white' : 'none'} color="white" strokeWidth={2} />
                </div>
              </button>
            ))}
          </div>
        )}
      </AppLayout>
    </div>
  )
}
