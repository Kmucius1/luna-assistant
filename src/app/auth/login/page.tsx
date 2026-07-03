'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Sparkles, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [mode, setMode]         = useState<'login' | 'signup'>('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [message, setMessage]   = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('Check your email to confirm your account.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/')
        router.refresh()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-5"
      style={{ background: 'linear-gradient(160deg, #1E1A38 0%, #141030 50%, #0D0B1E 100%)' }}
    >
      {/* Ambient orbs */}
      <div className="fixed -top-24 -right-24 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(155,92,255,0.25), transparent)', filter: 'blur(70px)' }} />
      <div className="fixed bottom-0 -left-24 w-72 h-72 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(106,79,155,0.2), transparent)', filter: 'blur(60px)' }} />

      <div className="w-full max-w-sm relative z-10">

        {/* Logo */}
        <div className="text-center mb-10">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 animate-breathe"
            style={{
              background: 'linear-gradient(135deg, #9b5cff, #7C3FE0)',
              boxShadow: '0 8px 40px rgba(155,92,255,0.45)',
            }}
          >
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1
            className="text-4xl font-bold tracking-widest mb-1"
            style={{ color: '#ffffff', fontFamily: 'var(--font-display)', letterSpacing: '0.12em' }}
          >
            LUNA
          </h1>
          <p className="text-sm italic mb-1" style={{ color: '#C4A8E8', fontFamily: 'var(--font-display)' }}>
            Your personal sanctuary
          </p>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {mode === 'login' ? 'Welcome back, Zoe.' : 'Your sanctuary awaits.'}
          </p>
        </div>

        {/* Form card */}
        <div
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.11)',
            borderRadius: 24,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            padding: '28px 24px',
          }}
        >
          <h2
            className="text-xs font-bold uppercase tracking-widest mb-5"
            style={{ color: 'rgba(196,168,232,0.9)', letterSpacing: '0.14em' }}
          >
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label
                className="text-xs font-semibold uppercase tracking-widest block mb-2"
                style={{ color: 'rgba(255,255,255,0.45)', letterSpacing: '0.11em' }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: '#ffffff',
                  border: '1.5px solid rgba(155,92,255,0.25)',
                  color: '#1a1230',
                  fontFamily: 'var(--font-sans)',
                }}
              />
            </div>

            <div>
              <label
                className="text-xs font-semibold uppercase tracking-widest block mb-2"
                style={{ color: 'rgba(255,255,255,0.45)', letterSpacing: '0.11em' }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all pr-12"
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid rgba(155,92,255,0.25)',
                    color: '#1a1230',
                    fontFamily: 'var(--font-sans)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgba(100,80,140,0.7)' }}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p
                className="text-sm px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(224,94,94,0.12)', color: '#FF8A8A', border: '1px solid rgba(224,94,94,0.2)' }}
              >
                {error}
              </p>
            )}
            {message && (
              <p
                className="text-sm px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(90,180,90,0.12)', color: '#7FD97F', border: '1px solid rgba(90,180,90,0.2)' }}
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl font-semibold text-white transition-all active:scale-95 disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, #9b5cff, #7C3FE0)',
                boxShadow: '0 4px 28px rgba(155,92,255,0.4)',
                fontSize: 15,
                letterSpacing: '0.02em',
              }}
            >
              {loading ? 'One moment…' : mode === 'login' ? 'Enter your sanctuary' : 'Create your sanctuary'}
            </button>
          </form>

          <p className="text-center text-sm mt-5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have one? '}
            <button
              onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(''); setMessage('') }}
              className="font-semibold underline"
              style={{ color: '#C4A8E8' }}
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

        <p
          className="text-center text-xs mt-8 italic"
          style={{ color: 'rgba(255,255,255,0.22)', fontFamily: 'var(--font-display)' }}
        >
          &ldquo;You are not behind. You are returning.&rdquo;
        </p>
      </div>
    </div>
  )
}
