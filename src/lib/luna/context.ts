import { createAdminClient } from '@/lib/supabase/admin'

export interface LunaContext {
  identity: {
    fullName: string | null
    birthDate: string | null
    birthTime: string | null
    birthPlace: string | null
    personalitySummary: string | null
    strengths: string[]
    shadowPatterns: string[]
    appVoice: string | null
    coreNeed: string | null
  } | null
  humanDesign: {
    type: string | null
    authority: string | null
    profile: string | null
    strategy: string | null
    notSelfTheme: string | null
    signature: string | null
    definedCenters: string[]
    undefinedCenters: string[]
    incarnationCross: string | null
  } | null
  astrology: {
    sunSign: string | null
    moonSign: string | null
    risingSign: string | null
    birthDate: string | null
    birthTime: string | null
    birthLocation: string | null
  } | null
  preferences: {
    tonePreference: string | null
    spiritualPreferences: string[]
    notificationStyle: string | null
  } | null
  assistantProfile: {
    preferredTone: string | null
    businessContext: string | null
    personalContext: string | null
    bannedPhrases: string[]
    responseStyle: string | null
    mainProjects: string[]
    dailyRoutine: string | null
    personalGoals: string | null
    commonContacts: string | null
  } | null
  /** Most recent daily memory summaries, newest first — the durable record
   *  built by the nightly-memory cron. Survives the chat's midnight reset. */
  recentMemory: { dateKey: string; summary: string }[]
}

type Row = Record<string, unknown> | null | undefined

function settledRow(r: PromiseSettledResult<{ data: Row }>): Row {
  return r.status === 'fulfilled' ? r.value.data : null
}

/**
 * Assembles Zoe's real context from the profile/chart/HD tables. These
 * rows may not be seeded yet — every section independently degrades to
 * null on a missing row or query error. Never throws.
 *
 * userId is caller-resolved (route decides auth.getUser() vs the
 * documented single-tenant fallback) — this function never does auth.
 */
export async function buildLunaContext(userId: string): Promise<LunaContext> {
  const db = createAdminClient()

  const [identityR, hdR, astroR, prefsR, assistantR, memoryR] = await Promise.allSettled([
    db.from('luna_identity_profile').select('*').eq('user_id', userId).maybeSingle(),
    db.from('human_design_profile').select('*').eq('user_id', userId).maybeSingle(),
    db.from('astrology_profiles').select('*').eq('user_id', userId).maybeSingle(),
    db.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
    db.from('assistant_profile').select('*').eq('user_id', userId).maybeSingle(),
    db.from('luna_memory').select('date_key, summary').eq('user_id', userId).order('date_key', { ascending: false }).limit(10),
  ])

  const identity = settledRow(identityR)
  const hd = settledRow(hdR)
  const astro = settledRow(astroR)
  const prefs = settledRow(prefsR)
  const assistant = settledRow(assistantR)
  const memoryRows = memoryR.status === 'fulfilled' ? (memoryR.value.data as { date_key: string; summary: string }[] | null) : null

  return {
    identity: identity ? {
      fullName: (identity.full_name as string) ?? null,
      birthDate: (identity.birth_date as string) ?? null,
      birthTime: (identity.birth_time as string) ?? null,
      birthPlace: (identity.birth_place as string) ?? null,
      personalitySummary: (identity.personality_summary as string) ?? null,
      strengths: (identity.strengths as string[]) ?? [],
      shadowPatterns: (identity.shadow_patterns as string[]) ?? [],
      appVoice: (identity.app_voice as string) ?? null,
      coreNeed: (identity.core_need as string) ?? null,
    } : null,
    humanDesign: hd ? {
      type: (hd.type as string) ?? null,
      authority: (hd.authority as string) ?? null,
      profile: (hd.profile as string) ?? null,
      strategy: (hd.strategy as string) ?? null,
      notSelfTheme: (hd.not_self_theme as string) ?? null,
      signature: (hd.signature as string) ?? null,
      definedCenters: (hd.defined_centers as string[]) ?? [],
      undefinedCenters: (hd.undefined_centers as string[]) ?? [],
      incarnationCross: (hd.incarnation_cross as string) ?? null,
    } : null,
    astrology: astro ? {
      sunSign: (astro.sun_sign as string) ?? null,
      moonSign: (astro.moon_sign as string) ?? null,
      risingSign: (astro.rising_sign as string) ?? null,
      birthDate: (astro.birth_date as string) ?? null,
      birthTime: (astro.birth_time as string) ?? null,
      birthLocation: (astro.birth_location as string) ?? null,
    } : null,
    preferences: prefs ? {
      tonePreference: (prefs.tone_preference as string) ?? null,
      spiritualPreferences: (prefs.spiritual_preferences as string[]) ?? [],
      notificationStyle: (prefs.notification_style as string) ?? null,
    } : null,
    assistantProfile: assistant ? {
      preferredTone: (assistant.preferred_tone as string) ?? null,
      businessContext: (assistant.business_context as string) ?? null,
      personalContext: (assistant.personal_context as string) ?? null,
      bannedPhrases: (assistant.banned_phrases as string[]) ?? [],
      responseStyle: (assistant.response_style as string) ?? null,
      mainProjects: (assistant.main_projects as string[]) ?? [],
      dailyRoutine: (assistant.daily_routine as string) ?? null,
      personalGoals: (assistant.personal_goals as string) ?? null,
      commonContacts: (assistant.common_contacts as string) ?? null,
    } : null,
    recentMemory: (memoryRows ?? []).map(r => ({ dateKey: r.date_key, summary: r.summary })),
  }
}

/**
 * Compact text block for injecting into AI prompts. Only includes sections
 * that have real data — returns '' if everything is null, so prompt
 * behavior is unchanged until profile data actually exists.
 */
export function formatLunaContextForPrompt(ctx: LunaContext): string {
  const lines: string[] = []

  if (ctx.humanDesign && (ctx.humanDesign.type || ctx.humanDesign.authority)) {
    const hd = ctx.humanDesign
    const parts = [hd.type, hd.profile && `${hd.profile} profile`, hd.authority && `${hd.authority} authority`]
      .filter(Boolean).join(', ')
    lines.push(`Human Design: ${parts}.`)
    if (hd.strategy) lines.push(`Strategy: ${hd.strategy}.`)
    if (hd.notSelfTheme) lines.push(`Not-self theme to watch for: ${hd.notSelfTheme}.`)
  }

  if (ctx.astrology && (ctx.astrology.sunSign || ctx.astrology.moonSign)) {
    const a = ctx.astrology
    const parts = [a.sunSign && `Sun ${a.sunSign}`, a.moonSign && `Moon ${a.moonSign}`, a.risingSign && `Rising ${a.risingSign}`]
      .filter(Boolean).join(', ')
    if (parts) lines.push(`Astrology: ${parts}.`)
  }

  if (ctx.identity) {
    const id = ctx.identity
    if (id.coreNeed) lines.push(`Core need right now: ${id.coreNeed}.`)
    if (id.shadowPatterns.length) lines.push(`Shadow patterns to name gently: ${id.shadowPatterns.join(', ')}.`)
    if (id.strengths.length) lines.push(`Strengths: ${id.strengths.join(', ')}.`)
  }

  if (ctx.preferences?.tonePreference) lines.push(`Preferred tone: ${ctx.preferences.tonePreference}.`)
  if (ctx.assistantProfile?.bannedPhrases.length) {
    lines.push(`Never use these phrases: ${ctx.assistantProfile.bannedPhrases.join(', ')}.`)
  }
  if (ctx.assistantProfile?.mainProjects.length) {
    lines.push(`Currently focused on: ${ctx.assistantProfile.mainProjects.join(', ')}.`)
  }
  if (ctx.assistantProfile?.dailyRoutine) {
    lines.push(`Her daily routine: ${ctx.assistantProfile.dailyRoutine}`)
  }
  if (ctx.assistantProfile?.personalGoals) {
    lines.push(`Her personal goals: ${ctx.assistantProfile.personalGoals}`)
  }
  if (ctx.assistantProfile?.commonContacts) {
    lines.push(`People in her orbit: ${ctx.assistantProfile.commonContacts}`)
  }

  const memoryBlock = ctx.recentMemory.length
    ? `\n\nWHAT YOU'VE LEARNED ABOUT ZOE RECENTLY (most recent first — use this, don't ask her to repeat herself):\n${
        ctx.recentMemory.map(m => `- [${m.dateKey}] ${m.summary}`).join('\n')
      }`
    : ''

  if (!lines.length && !memoryBlock) return ''
  const base = lines.length ? `REAL CONTEXT ON ZOE TODAY:\n${lines.map(l => `- ${l}`).join('\n')}` : ''
  return `${base}${memoryBlock}`.trim()
}
