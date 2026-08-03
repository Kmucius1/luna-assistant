'use client'
import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import Link from 'next/link'
import { ArrowLeft, Sparkles } from 'lucide-react'

type MoonData = {
  phase: { name: string; emoji: string; illumination: number; description: string; angle: number; next_exact?: { name: string; time: string } }
  sign: { name: string; emoji: string; degree: number; minutes: number; formatted: string; keywords: string }
  next_ingress: string | null
  timezone: string
}

const MOON_SIGN_GUIDANCE: Record<string, {
  emotional: string; body: string; communication: string; warning: string; ritual: string
}> = {
  Aries:       { emotional:'Direct, impatient, self-focused. Feelings move fast.', body:'Move. High-energy exercise. Get out of your head.', communication:'Say it directly. No softening needed today.', warning:'Impulsive reactions. Count to 3 before sending anything heated.', ritual:'Light a red candle. Set one brave intention. Move your body.' },
  Taurus:      { emotional:'Slow, grounded, sensual. Feelings need safety to move.', body:'Eat well and slowly. Touch something that grounds you.', communication:'Take your time. Words need to feel good before they leave you.', warning:'Stubbornness. You might dig in when flexibility is needed.', ritual:'Anoint your wrists with rose or sandalwood. Write one thing you are grateful to your body for.' },
  Gemini:      { emotional:'Scattered, curious, quickly shifting. Feelings become words.', body:'Light movement. Fresh air. Change of scenery.', communication:'Best day to have hard conversations — you can find the words.', warning:'Overthinking. Information overload. Too many mental tabs.', ritual:'Write three pages of unfiltered thought. Let the mind empty itself.' },
  Cancer:      { emotional:'Extra tender. Deep feeling. Old emotions may surface.', body:'Hydrate. Soft food. Rest. Your body is sensitive today.', communication:'Be gentle with yourself and others. Emotions are close to the surface.', warning:'Taking things too personally. Emotional flooding if unsafe.', ritual:'Make something warm to drink. Sit in stillness for 10 minutes. Call someone safe.' },
  Leo:         { emotional:'Expressive, heart-forward, craving appreciation.', body:'Sun exposure. Something that makes you feel beautiful.', communication:'Say what you love. Affirm out loud. Express generously.', warning:'Ego reactions if not seen. Performing instead of feeling.', ritual:'Dress up for no reason. Look at yourself in the mirror and say something kind.' },
  Virgo:       { emotional:'Analytical, critical, anxious if things feel disordered.', body:'Organize your space. Healthy food. A routine that feels clean.', communication:'Precision matters. Choose words carefully. Edit before sending.', warning:'Perfectionism spiral. Criticizing self or others to manage anxiety.', ritual:'Clean one area of your home. Write tomorrow\'s plan. Breathe into imperfection.' },
  Libra:       { emotional:'Relational, indecisive, seeking harmony and beauty.', body:'Create beauty around you. Put on something beautiful.', communication:'Diplomatic and fair. Best day for difficult relationship conversations.', warning:'People-pleasing. Avoiding your own needs to keep peace.', ritual:'Balance your space. Buy or arrange flowers. Write what you need in your closest relationships.' },
  Scorpio:     { emotional:'Intense, deep, truth-seeking. Nothing feels shallow enough.', body:'Rest. Water. Space from noise.', communication:'You can handle depth. Others may not be ready — read the room.', warning:'Obsessive thinking. Paranoia. Emotional power plays.', ritual:'Sit in darkness for five minutes. Breathe. Write the truth you are not saying out loud.' },
  Sagittarius: { emotional:'Optimistic, restless, free-spirited. Feelings want movement.', body:'Go somewhere. Walk, drive, move.', communication:'Philosophy and vision. Best day for big-picture conversations.', warning:'Glossing over emotions with optimism. Spiritual bypassing.', ritual:'Read something that expands you. Write your biggest vision. Light a fire if possible.' },
  Capricorn:   { emotional:'Controlled, disciplined, heavy if carrying too much.', body:'Structure helps. Routine and quality sleep.', communication:'Serious and direct. Good day for professional communication.', warning:'Emotional suppression. Working to avoid feeling.', ritual:'Write your long-term goal. Take one practical step. Allow yourself to rest as part of the plan.' },
  Aquarius:    { emotional:'Detached, mental, humanitarian. Feelings become ideas.', body:'Be around community. Fresh perspective.', communication:'Innovative and visionary. Speak your uncommon truth.', warning:'Emotional distance as self-protection. Intellectualizing feelings.', ritual:'Connect with someone different from you. Write what freedom means to your soul right now.' },
  Pisces:      { emotional:'Dissolved, empathic, dreamy. Boundaries become fluid.', body:'Water. Rest. Quiet. You are absorbing everything.', communication:'Gentle and intuitive. Speak from the heart not the head.', warning:'Taking on others\' emotions. Escapism. Difficulty with reality.', ritual:'Meditate. Journal your dreams. Create something with no purpose. Let yourself be soft.' },
}

function MoonIllustration({ phase, illumination, size = 100 }: { phase: string; illumination: number; size?: number }) {
  return (
    <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: [
          'radial-gradient(circle at 58% 22%, rgba(155,150,172,0.95) 0%, rgba(135,130,155,0.5) 8%, transparent 13%)',
          'radial-gradient(circle at 26% 64%, rgba(140,135,162,0.85) 0%, transparent 10%)',
          'radial-gradient(circle at 44% 78%, rgba(125,120,148,0.9) 0%, transparent 13%)',
          'radial-gradient(ellipse at 38% 35%, rgba(252,250,255,1) 0%, rgba(228,224,240,1) 15%, rgba(196,192,212,1) 32%, rgba(162,158,180,1) 52%, rgba(124,120,145,1) 70%, rgba(88,84,108,1) 88%)',
        ].join(', '),
        boxShadow: `inset ${size*0.13}px ${size*0.07}px ${size*0.22}px rgba(0,0,0,0.32), 0 0 ${size*0.3}px ${size*0.08}px rgba(180,160,240,0.25)`,
      }} />
      {/* Shadow overlay based on phase */}
      {phase !== 'Full Moon' && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: phase.includes('Waxing')
            ? `radial-gradient(ellipse at ${70 - illumination * 0.4}% 50%, rgba(13,11,30,0.9) 0%, transparent 55%)`
            : `radial-gradient(ellipse at ${30 + illumination * 0.4}% 50%, rgba(13,11,30,0.9) 0%, transparent 55%)`,
        }} />
      )}
    </div>
  )
}

const THEME_VARS = {
  '--text-1': '#100C1E',
  '--text-2': '#32284A',
  '--text-3': '#5E5474',
  '--text-4': '#8A8098',
  '--violet': '#5C4530',
  '--surface': 'rgba(255,255,255,0.6)',
  '--surface-border': 'rgba(180,150,100,0.2)',
  background: 'linear-gradient(180deg, #FBF8F2 0%, #F6F1E7 55%, #F0E9DA 100%)',
} as React.CSSProperties

export default function MoonPortal() {
  const [moon, setMoon] = useState<MoonData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    fetch(`/api/astrology/moon?tz=${encodeURIComponent(tz)}`)
      .then(r => r.json()).then(d => { setMoon(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const guidance = moon?.sign?.name ? MOON_SIGN_GUIDANCE[moon.sign.name] : null

  return (
    <div className="min-h-screen" style={THEME_VARS}>
      <AppLayout>
        <div className="flex items-center gap-3 mb-5 pt-2">
          <Link href="/astrology">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
              <ArrowLeft className="h-4 w-4" style={{ color: 'var(--text-3)' }} />
            </div>
          </Link>
          <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-1)' }}>Moon Portal</h1>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-[20px] shimmer" />)}</div>
        ) : moon ? (
          <>
            {/* Phase hero */}
            <div className="relative rounded-[24px] p-6 mb-4 overflow-hidden"
              style={{ background: 'linear-gradient(145deg, rgba(201,169,110,0.16) 0%, rgba(201,169,110,0.24) 60%, rgba(201,169,110,0.10) 100%)', border: '1px solid rgba(201,169,110,0.3)' }}>
              <div className="absolute right-6 top-1/2 -translate-y-1/2">
                <MoonIllustration phase={moon.phase.name} illumination={moon.phase.illumination} size={90} />
              </div>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 w-28 h-28 pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(201,169,110,0.18) 0%, transparent 70%)', filter: 'blur(16px)' }} />
              <div className="relative z-10 pr-28">
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(201,169,110,0.9)' }}>Moon Phase</p>
                <p className="font-display text-2xl font-bold mb-1" style={{ color: '#100C1E' }}>{moon.phase.emoji} {moon.phase.name}</p>
                <p className="text-sm mb-3" style={{ color: 'rgba(16,12,30,0.6)' }}>
                  {moon.phase.illumination}% illuminated · {moon.phase.angle}° phase angle
                </p>
                <p className="text-sm leading-relaxed italic" style={{ color: '#5C4530' }}>{moon.phase.description}</p>
                {moon.phase.next_exact && (
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
                    style={{ background: 'rgba(201,169,110,0.2)', border: '1px solid rgba(201,169,110,0.3)' }}>
                    <span className="text-xs font-semibold" style={{ color: '#5C4530' }}>
                      ✦ {moon.phase.next_exact.name} · {moon.phase.next_exact.time}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Moon sign */}
            <div className="rounded-[22px] p-5 mb-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-4)' }}>Moon Sign Right Now</p>
                  <p className="font-display text-xl font-bold" style={{ color: 'var(--text-1)' }}>
                    {moon.sign.emoji} {moon.sign.name} · {moon.sign.formatted}
                  </p>
                </div>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>{moon.sign.keywords}</p>
              {moon.next_ingress && (
                <p className="text-xs mt-2 font-medium" style={{ color: 'var(--violet)' }}>→ {moon.next_ingress}</p>
              )}
            </div>

            {/* Moon sign guidance */}
            {guidance && (
              <div className="space-y-3 mb-4">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-4)' }}>Moon in {moon.sign.name} Guidance for You</p>
                {[
                  { emoji: '🫀', label: 'Emotional Weather', text: guidance.emotional },
                  { emoji: '🌿', label: 'Body Needs',         text: guidance.body },
                  { emoji: '💬', label: 'Communication',      text: guidance.communication },
                  { emoji: '⚠️', label: 'Watch For',          text: guidance.warning },
                  { emoji: '🕯️', label: 'Ritual',            text: guidance.ritual },
                ].map(g => (
                  <div key={g.label} className="rounded-[18px] p-4 flex items-start gap-3"
                    style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
                    <span className="text-xl flex-shrink-0">{g.emoji}</span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-4)' }}>{g.label}</p>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>{g.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Your natal moon context */}
            <div className="rounded-[20px] p-5"
              style={{ background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.18)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4" style={{ color: 'var(--violet)' }} />
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--violet)' }}>Your Natal Moon</p>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>
                Your natal Moon is in <strong>Cancer at 4°</strong> — the most feeling-centred moon placement.
                When the transiting Moon moves through Cancer (every ~27 days), it returns home to your natal Moon.
                These are your most emotionally intense and intuitive days.
                {moon.sign.name === 'Cancer' ? ' 🌙 The moon is home in Cancer right now — trust your instincts deeply today.' : ''}
              </p>
            </div>
          </>
        ) : (
          <div className="rounded-[20px] p-6 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
            <p style={{ color: 'var(--text-3)' }}>Unable to load moon data. Check your connection.</p>
          </div>
        )}
      </AppLayout>
    </div>
  )
}
