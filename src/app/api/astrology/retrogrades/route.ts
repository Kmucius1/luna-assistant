import { NextRequest, NextResponse } from 'next/server'
import { getCurrentPlanets, isRetrograde, getNextStation } from '@/lib/astrology'

const RETROGRADE_MEANINGS: Record<string, {
  theme: string; do: string[]; avoid: string[]; luna: string
}> = {
  Mercury: {
    theme: 'Communication, tech, travel, contracts, and plans slow down or reverse.',
    do: ['Review and revise existing work','Back up files and devices','Reconnect with old contacts intentionally','Slow down before sending texts or emails','Dictate before responding'],
    avoid: ['Signing contracts if possible','Launching new projects','Making major tech purchases','Sending reactive messages'],
    luna: 'Mercury retrograde is your invitation to think before speaking. Dictate first. Send second. Your Gemini Rising is affected — words matter more than usual.',
  },
  Venus: {
    theme: 'Love, values, beauty, money, and attraction go inward for review.',
    do: ['Revisit your relationship with self-worth','Review financial choices','Reconnect with past creative projects','Ask what you truly value right now'],
    avoid: ['Starting new relationships from scarcity','Overspending from emotional lack','Drastic appearance changes'],
    luna: 'Venus retrograde with your Venus in Capricorn asks: what do you actually value in love and in your style, and are you holding to standards that are really yours?',
  },
  Mars: {
    theme: 'Drive, motivation, anger, and action need rerouting.',
    do: ['Slow down your pace intentionally','Release anger through movement','Revisit what you actually want to build','Rest without guilt'],
    avoid: ['Forcing projects forward','Conflict from frustration','Starting aggressive new ventures'],
    luna: 'Mars retrograde with your Mars in Libra: the balance you crave cannot be forced right now. Let the frustration teach you what needs redesign.',
  },
  Jupiter: {
    theme: 'Expansion and abundance turn inward — growth through reflection.',
    do: ['Review beliefs and philosophies','Revisit a project that lost momentum','Expand inwardly through learning'],
    avoid: ['Overextending financially','Making bold bets without deep reflection'],
    luna: 'Jupiter retrograde with your Jupiter in Gemini: your mind is your greatest expansion tool. Study, reflect, revise your worldview.',
  },
  Saturn: {
    theme: 'Discipline, structure, and responsibility are under review.',
    do: ['Assess your long-term commitments','Review what boundaries need strengthening','Rebuild something that fell apart'],
    avoid: ['Abandoning structures prematurely','Pushing against limitations without understanding them'],
    luna: 'Saturn retrograde with your Saturn in Taurus: your relationship with money, body, and slow wealth is being restructured. Patience is the lesson.',
  },
  Uranus: {
    theme: 'Innovation and liberation go inward. Sudden changes slow to reveal their meaning.',
    do: ['Process recent disruptions','Let your unusual ideas mature','Review what needs to change in your systems'],
    avoid: ['Forcing radical change for its own sake'],
    luna: 'Uranus retrograde invites you to integrate the awakenings already in motion rather than chasing new disruption.',
  },
  Neptune: {
    theme: 'Dreams, illusions, and spiritual clarity are in flux.',
    do: ['Journal dreams with extra care','Clarify where fantasy may be clouding reality','Deepen spiritual practice'],
    avoid: ['Escaping through numbing','Making decisions based on idealized pictures'],
    luna: 'Neptune retrograde asks: what illusions are protecting you from something real? Your Scorpio Sun can see the truth if you are quiet enough to listen.',
  },
  Pluto: {
    theme: 'Transformation, power, and shadow work turn deeply inward.',
    do: ['Shadow journal — what are you avoiding?','Release old power struggles','Work with a therapist or deep practice'],
    avoid: ['Power plays or manipulation','Forcing transformation in others'],
    luna: 'Pluto retrograde is a full audit of what you are ready to leave behind. The old version of you cannot come with you into what is next.',
  },
}

export async function GET(req: NextRequest) {
  try {
    const tz = new URL(req.url).searchParams.get('tz') || 'America/New_York'
    const now = new Date()

    const planets = getCurrentPlanets(now)
    const retroPlanets = planets.filter(p => p.retrograde)

    const retroData = retroPlanets.map(p => ({
      ...p,
      meaning: RETROGRADE_MEANINGS[p.name] ?? {
        theme: `${p.name} is retrograde — its themes turn inward for review.`,
        do: ['Reflect on this planet\'s themes in your life'],
        avoid: ['Forcing its energy forward without reflection'],
        luna: `${p.name} retrograde invites you to review and revise before moving forward.`,
      },
    }))

    // Mercury's next station (most commonly tracked), exact to the minute.
    // If Mercury is retrograde now, the next station is when it turns direct.
    let nextMercuryRetro: string | null = null
    let mercuryStation: { type: 'retrograde' | 'direct'; when: string; placement: string } | null = null
    try {
      const st = getNextStation('Mercury', now)
      if (st) {
        const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
        mercuryStation = { type: st.type, when: fmt.format(st.date), placement: st.placement }
        if (st.type === 'retrograde') nextMercuryRetro = mercuryStation.when
      }
    } catch { /* ignore */ }

    return NextResponse.json({
      retrograde_count: retroPlanets.length,
      retrogrades: retroData,
      next_mercury_retro: nextMercuryRetro,
      mercury_station: mercuryStation,
      is_mercury_retrograde: isRetrograde('Mercury', now),
      calculated_at: now.toISOString(),
    })
  } catch (err) {
    console.error('retrogrades route error:', err)
    return NextResponse.json({ error: 'Retrograde calculation error' }, { status: 500 })
  }
}
