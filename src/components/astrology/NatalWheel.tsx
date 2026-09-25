'use client'

const ZODIAC_SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']
const SIGN_GLYPHS: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋', Leo: '♌', Virgo: '♍',
  Libra: '♎', Scorpio: '♏', Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
}
const POINT_GLYPHS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂', Jupiter: '♃', Saturn: '♄',
  Uranus: '⛢', Neptune: '♆', Pluto: '♇', NNode: '☊', SNode: '☋', Chiron: '⚷', Lilith: '⚸',
  Midheaven: 'MC', Rising: 'AC',
}

const ASPECT_COLORS: Record<string, string> = {
  conjunction: '#5C4530', square: '#C96B5A', opposition: '#8A6D9E', trine: '#5A8A7A', sextile: '#5A7A9A',
}

export interface WheelPlacement { point: string; sign: string; degree: number; minutes: number; lon: number; house: number }
export interface WheelAspect { a: string; b: string; type: string; orb: number; interpretation?: string }

interface NatalWheelProps {
  placements: WheelPlacement[]
  aspects: WheelAspect[]
  onSelectPoint?: (point: string) => void
  selected?: string | null
}

function angleFor(lon: number, risingLon: number): number {
  return (((lon - risingLon + 180) % 360) + 360) % 360
}

function pointOnCircle(cx: number, cy: number, r: number, thetaDeg: number): { x: number; y: number } {
  const rad = (thetaDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) }
}

// Real chart wheel: whole-sign houses (sign ring == house ring, since a
// house cusp is by definition the 0° point of each sign from the Rising
// sign forward), planets placed at their true calculated longitude, and
// natal aspect lines drawn between real planet positions — nothing here is
// invented, it's all derived from src/data/astrology/natal-zoe.json's real
// computed longitudes via lib/astrology.ts.
export function NatalWheel({ placements, aspects, onSelectPoint, selected }: NatalWheelProps) {
  const rising = placements.find(p => p.point === 'Rising')
  if (!rising) return null
  const risingLon = rising.lon
  const risingSignIdx = ZODIAC_SIGNS.indexOf(rising.sign)

  const cx = 160, cy = 160
  const outerR = 148, signR = 132, houseR = 112, planetR = 82, aspectR = 78

  const byPoint = Object.fromEntries(placements.map(p => [p.point, p]))

  return (
    <svg viewBox="0 0 320 320" style={{ width: '100%', height: 'auto' }} role="img" aria-label="Natal chart wheel">
      {/* Zodiac wedges (== house wedges, whole-sign) */}
      {Array.from({ length: 12 }).map((_, i) => {
        const signIdx = (risingSignIdx + i) % 12
        const startTheta = angleFor(i * 30 + risingLon, risingLon)
        const endTheta = startTheta + 30
        const midTheta = startTheta + 15
        const p1 = pointOnCircle(cx, cy, outerR, startTheta)
        const p2 = pointOnCircle(cx, cy, outerR, endTheta)
        const signGlyphPos = pointOnCircle(cx, cy, signR, midTheta)
        const houseNumPos = pointOnCircle(cx, cy, houseR, midTheta)
        return (
          <g key={i}>
            <path d={`M ${cx} ${cy} L ${p1.x} ${p1.y} A ${outerR} ${outerR} 0 0 0 ${p2.x} ${p2.y} Z`}
              fill={i % 2 === 0 ? '#FFFDFA' : '#F8F2E4'} stroke="rgba(67,51,34,0.09)" strokeWidth={1} />
            <text x={signGlyphPos.x} y={signGlyphPos.y} textAnchor="middle" dominantBaseline="middle" fontSize={15} fill="#5C4530">{SIGN_GLYPHS[ZODIAC_SIGNS[signIdx]]}</text>
            <text x={houseNumPos.x} y={houseNumPos.y} textAnchor="middle" dominantBaseline="middle" fontSize={9} fontWeight={700} fill="#716B63">{i + 1}</text>
          </g>
        )
      })}

      <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="rgba(67,51,34,0.14)" strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={planetR + 14} fill="none" stroke="rgba(67,51,34,0.09)" strokeWidth={1} />

      {/* Aspect lines */}
      {aspects.map(asp => {
        const a = byPoint[asp.a], b = byPoint[asp.b]
        if (!a || !b) return null
        const pa = pointOnCircle(cx, cy, aspectR, angleFor(a.lon, risingLon))
        const pb = pointOnCircle(cx, cy, aspectR, angleFor(b.lon, risingLon))
        return <line key={`${asp.a}-${asp.b}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke={ASPECT_COLORS[asp.type] ?? '#5C4530'} strokeWidth={asp.orb < 2 ? 1.4 : 0.7} opacity={0.55} />
      })}

      <circle cx={cx} cy={cy} r={14} fill="#171512" />

      {/* Planet points */}
      {placements.filter(p => p.point !== 'Rising' && p.point !== 'Midheaven').map(p => {
        const theta = angleFor(p.lon, risingLon)
        const pos = pointOnCircle(cx, cy, planetR, theta)
        const isSelected = selected === p.point
        return (
          <g key={p.point} onClick={() => onSelectPoint?.(p.point)} style={{ cursor: onSelectPoint ? 'pointer' : 'default' }}>
            <circle cx={pos.x} cy={pos.y} r={isSelected ? 13 : 11} fill={isSelected ? '#5C4530' : '#FFFFFF'} stroke="#5C4530" strokeWidth={1.2} />
            <text x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill={isSelected ? '#FFFFFF' : '#171512'}>{POINT_GLYPHS[p.point] ?? p.point[0]}</text>
          </g>
        )
      })}

      {/* Ascendant + Midheaven markers (angles, not "planets") */}
      {['Rising', 'Midheaven'].map(name => {
        const p = byPoint[name]
        if (!p) return null
        const theta = angleFor(p.lon, risingLon)
        const inner = pointOnCircle(cx, cy, outerR, theta)
        const outer = pointOnCircle(cx, cy, outerR + 10, theta)
        const labelPos = pointOnCircle(cx, cy, outerR + 20, theta)
        return (
          <g key={name} onClick={() => onSelectPoint?.(name)} style={{ cursor: onSelectPoint ? 'pointer' : 'default' }}>
            <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#171512" strokeWidth={2} />
            <text x={labelPos.x} y={labelPos.y} textAnchor="middle" dominantBaseline="middle" fontSize={10} fontWeight={700} fill="#171512">{POINT_GLYPHS[name]}</text>
          </g>
        )
      })}
    </svg>
  )
}
