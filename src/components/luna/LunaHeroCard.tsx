import { LunaCard } from './LunaCard'

interface LunaHeroCardProps {
  children: React.ReactNode
  className?: string
  backgroundImage?: string
}

/** Bounded hero card — greeting/mindset/cosmic-weather headers across Home, Work, Astrology, Atelier, LUNA, Explore. Never a full-page background. */
export function LunaHeroCard({ children, className, backgroundImage }: LunaHeroCardProps) {
  return (
    <LunaCard variant="hero" className={className} backgroundImage={backgroundImage}>
      {children}
    </LunaCard>
  )
}
