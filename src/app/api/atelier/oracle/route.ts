import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callAI, STYLE_ORACLE_SYSTEM_PROMPT, parseAIJson } from '@/lib/ai'
import { todayKey } from '@/lib/luna/today'

export async function POST(request: NextRequest) {
  try {
    const {
      mood,
      desired_feel,
      event,
      weather,
      energy_level,
      sleep_quality,
      moon_phase,
      schedule_notes,
      wardrobe_notes,
    } = await request.json()

    if (!mood && !desired_feel) {
      return NextResponse.json({ error: 'Mood or desired feel is required' }, { status: 400 })
    }

    const context = [
      mood          ? `Mood: ${mood}` : '',
      desired_feel  ? `Desired feel: ${desired_feel}` : '',
      event         ? `Today's event or schedule: ${event}` : '',
      weather       ? `Weather: ${weather}` : '',
      energy_level  ? `Energy level (1–10): ${energy_level}` : '',
      sleep_quality ? `Sleep last night: ${sleep_quality}` : '',
      moon_phase    ? `Moon phase: ${moon_phase}` : '',
      schedule_notes ? `Schedule notes: ${schedule_notes}` : '',
      wardrobe_notes ? `Available wardrobe notes: ${wardrobe_notes}` : '',
    ].filter(Boolean).join('\n')

    const result = await callAI(
      STYLE_ORACLE_SYSTEM_PROMPT,
      `Generate today's style oracle for Zoe.\n\n${context}`,
      2000
    )

    const parsed = parseAIJson(result)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('outfit_ideas').insert({
        user_id: user.id,
        date: todayKey(),
        title: (parsed as { outfit_energy?: string }).outfit_energy ?? 'Daily Look',
        style_lane: (parsed as { style_lane?: string }).style_lane,
        mood_target: desired_feel ?? mood,
        outfit_formula: JSON.stringify((parsed as { recommended_outfit?: unknown }).recommended_outfit),
        hair: (parsed as { hair?: string }).hair,
        makeup: (parsed as { makeup?: string }).makeup,
        scent: (parsed as { scent?: string }).scent,
        reason: (parsed as { why_it_works?: string }).why_it_works,
        ai_prompt: (parsed as { image_prompt?: string }).image_prompt,
        status: 'generated',
      })
    }

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('Style oracle error:', err)
    return NextResponse.json({ error: 'Style oracle error' }, { status: 500 })
  }
}
