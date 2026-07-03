'use client'

/**
 * Ambient moonlit background layer — used inside LunaShell.
 * Never sits directly behind text; page content always renders in bounded
 * LunaCard/LunaHeroCard tiles on top of this.
 */
export function LunaBackground() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        background: `
          radial-gradient(circle at 72% 8%, rgba(155,92,255,0.18), transparent 26%),
          radial-gradient(circle at 12% 22%, rgba(96,55,170,0.14), transparent 28%),
          linear-gradient(180deg, var(--luna-bg-2) 0%, #050512 48%, var(--luna-bg) 100%)
        `,
      }}
    />
  )
}
