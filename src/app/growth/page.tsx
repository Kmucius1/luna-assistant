'use client'
import { AppLayout } from '@/components/layout/AppLayout'
import Link from 'next/link'
import { TrendingUp, ArrowLeft, RefreshCw, Trash2 } from 'lucide-react'
import { GrowthAnalytics } from '@/components/ui/GrowthAnalytics'
import { clearPatterns } from '@/lib/patterns'
import { useState } from 'react'

export default function GrowthPage() {
  const [, setCleared] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  function handleClear() {
    clearPatterns()
    setCleared(true)
    setShowConfirm(false)
    setTimeout(() => window.location.reload(), 300)
  }

  return (
    <div className="min-h-screen bg-app" style={{
      background: 'linear-gradient(180deg, #FBF8F2 0%, #F6F1E7 55%, #F0E9DA 100%)',
      '--text-1': '#100C1E',
      '--text-3': '#5E5474',
      '--text-4': '#8A8098',
      '--violet': '#5C4530',
      '--surface': 'rgba(255,255,255,0.6)',
      '--surface-border': 'rgba(180,150,100,0.18)',
    } as React.CSSProperties}>
      {/* Ambient */}
      <div className="fixed top-0 left-0 w-full h-[400px] pointer-events-none z-0"
        style={{ background: 'radial-gradient(ellipse at 50% -10%, rgba(201,169,110,0.1) 0%, transparent 60%)', filter: 'blur(40px)' }} />

      <AppLayout>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pt-2">
          <Link href="/">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
              <ArrowLeft className="h-4 w-4" style={{ color: 'var(--text-3)' }} />
            </div>
          </Link>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold" style={{ color: '#F5EFE3' }}>Growth</h1>
            <p className="text-xs" style={{ color: 'var(--text-4)' }}>Your patterns, trends, and evolution</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.location.reload()} className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
              <RefreshCw className="h-3.5 w-3.5" style={{ color: 'var(--text-4)' }} />
            </button>
            <button onClick={() => setShowConfirm(true)} className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
              <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--text-4)' }} />
            </button>
          </div>
        </div>

        {/* Intro card */}
        <div className="relative rounded-[22px] p-5 mb-5 overflow-hidden"
          style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.6) 0%, rgba(250,244,232,0.7) 60%, rgba(255,255,255,0.6) 100%)', border: '1px solid rgba(201,169,110,0.25)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 100% 0%, rgba(201,169,110,0.2) 0%, transparent 60%)', filter: 'blur(16px)' }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4" style={{ color: '#5C4530' }} />
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#5C4530' }}>Pattern Recognition</p>
            </div>
            <p className="font-display text-lg font-bold text-[#100C1E] mb-2">
              LUNA sees what you cannot see yet.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: '#32284A' }}>
              Every check-in, voice note, selection, and journal entry builds a picture of your patterns. Energy cycles, recurring needs, emotional themes, growth momentum — all tracked, all reflected back to you.
            </p>
          </div>
        </div>

        {/* Clear confirm */}
        {showConfirm && (
          <div className="rounded-[20px] p-4 mb-4"
            style={{ background: 'rgba(201,107,90,0.1)', border: '1px solid rgba(201,107,90,0.25)' }}>
            <p className="text-sm font-semibold mb-3" style={{ color: '#C96B5A' }}>Clear all pattern data?</p>
            <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>This removes everything stored in your browser. It cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={handleClear}
                className="flex-1 py-2.5 rounded-[14px] text-sm font-semibold"
                style={{ background: '#C96B5A', color: 'white' }}>
                Yes, clear it
              </button>
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-[14px] text-sm font-semibold"
                style={{ background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--surface-border)' }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Analytics */}
        <GrowthAnalytics />

        {/* How it works */}
        <div className="mt-6 rounded-[20px] p-4"
          style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.12)' }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>How LUNA Learns You</p>
          <div className="space-y-2 text-xs" style={{ color: 'var(--text-3)' }}>
            <p>· Everything you tap, speak, or type is stored locally in your browser</p>
            <p>· LUNA tracks which moods, needs, and themes appear most often</p>
            <p>· Suggestion quality improves as LUNA learns your language patterns</p>
            <p>· Voice usage vs. typed vs. tapped shows you how you prefer to communicate</p>
            <p>· Your streak shows consecutive days you have checked in with yourself</p>
          </div>
        </div>
      </AppLayout>
    </div>
  )
}
