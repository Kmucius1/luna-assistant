'use client'

import { useEffect } from 'react'

type Reading = { title: string; detail: string; support: string }

const TIME_READINGS: Record<string, Reading[]> = {
  lateNight: [
    { title: 'Quiet mind, softer pace', detail: 'It is late. Protect tomorrow by closing one loose end, then let your body rest.', support: 'wind down' },
    { title: 'Your body is asking for less', detail: 'Choose the smallest useful action, then step away from the screen and settle.', support: 'rest' },
    { title: 'Close the loop gently', detail: 'Finish only what truly needs tonight. Everything else can wait for daylight.', support: 'release' },
    { title: 'Low light, low pressure', detail: 'Your best next move is simple: hydrate, reset the room, and prepare for sleep.', support: 'sleep' },
  ],
  morning: [
    { title: 'Clear start, one direction', detail: 'Your attention is freshest now. Choose one priority before messages and noise take over.', support: 'focus' },
    { title: 'Build momentum softly', detail: 'Start with water, food, and one concrete task. You do not need to rush the beginning.', support: 'steady start' },
    { title: 'Ready for a clean first move', detail: 'Use the next block for the task that will make the rest of the day feel lighter.', support: 'one priority' },
    { title: 'Grounded start, open energy', detail: 'Keep the morning simple. Complete one meaningful action before switching lanes.', support: 'grounding' },
  ],
  afternoon: [
    { title: 'Midday focus needs a reset', detail: 'Pause before switching tasks. Water, breathe, and finish one clear action first.', support: 'reset' },
    { title: 'Capable, but protect your attention', detail: 'Your next win comes from fewer tabs, fewer decisions, and one completed block.', support: 'single-tasking' },
    { title: 'Steady energy, tighter focus', detail: 'Do the most concrete part of your top task now, then reassess after the block.', support: 'momentum' },
    { title: 'Your attention needs one lane', detail: 'Reduce the noise around you and give the next 25 minutes to one result.', support: 'focus block' },
  ],
  evening: [
    { title: 'Shift from pushing to finishing', detail: 'Close one important loop, then lower the pressure and leave room to recover.', support: 'completion' },
    { title: 'Energy is turning inward', detail: 'Choose a realistic finish line for tonight instead of carrying the whole list.', support: 'boundaries' },
    { title: 'Finish gently, not perfectly', detail: 'Complete the next useful step and release what does not need your attention tonight.', support: 'soft landing' },
    { title: 'Protect the rest of your night', detail: 'Wrap one priority, tidy your space, and let your nervous system come down.', support: 'wind down' },
  ],
}

function timeBucket(hour: number) {
  if (hour < 5) return 'lateNight'
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  if (hour < 22) return 'evening'
  return 'lateNight'
}

function parseRating(text: string, label: string): number | null {
  const match = text.match(new RegExp(`${label}:\\s*(\\d+)(?:\\/10)?`, 'i'))
  return match ? Number(match[1]) : null
}

function findEnergyCard(): HTMLElement | null {
  const labels = Array.from(document.querySelectorAll('span'))
  const label = labels.find(node => node.textContent?.trim().toLowerCase() === 'energy read')
  return label?.closest('section') as HTMLElement | null
}

function buildReading(card: HTMLElement): Reading {
  const now = new Date()
  const slot = Math.floor(now.getMinutes() / 15)
  const base = TIME_READINGS[timeBucket(now.getHours())][slot]
  const text = card.textContent ?? ''
  const mood = parseRating(text, 'Mood')
  const energy = parseRating(text, 'Energy')
  const sleep = parseRating(text, 'Sleep')

  if (sleep != null && sleep <= 4) {
    return { title: 'Running on less rest', detail: 'Keep the next block small and concrete. Food, water, and fewer decisions will help more than forcing speed.', support: 'recovery' }
  }
  if (energy != null && energy <= 4) {
    return { title: 'Lower energy, clear priorities', detail: 'Do the easiest meaningful part of your top task, then pause before committing to more.', support: 'conserve energy' }
  }
  if (mood != null && mood <= 4) {
    return { title: 'Tender energy, steady next step', detail: 'Lower the emotional pressure. Choose one task with a visible finish line and move slowly.', support: 'gentleness' }
  }
  if (energy != null && energy >= 8 && mood != null && mood >= 7) {
    return { title: 'Strong energy, use it cleanly', detail: 'You have enough capacity for focused progress. Put it into one high-value task before switching.', support: 'deep focus' }
  }
  return base
}

function updateEnergyRead() {
  const card = findEnergyCard()
  if (!card) return
  const title = card.querySelector('h2')
  const detail = title?.nextElementSibling
  if (!title || !(detail instanceof HTMLElement)) return

  const reading = buildReading(card)
  title.textContent = reading.title
  detail.textContent = reading.detail

  const supportPill = Array.from(card.querySelectorAll('span')).find(node => node.textContent?.trim().toLowerCase().startsWith('support:'))
  if (supportPill) {
    const icon = supportPill.querySelector('svg')
    supportPill.replaceChildren(...(icon ? [icon] : []), document.createTextNode(` Support: ${reading.support}`))
  }
}

export function EnergyReadUpdater() {
  useEffect(() => {
    const observerOptions = { childList: true, subtree: true }
    const observer = new MutationObserver(() => run())

    // updateEnergyRead() writes to the DOM (textContent, replaceChildren),
    // which the observer above would otherwise see as a new mutation and
    // react to again, looping forever. Disconnect while we write, then
    // resume observing — this is what actually caused the runaway loop
    // that was pinning the main thread on every page with this card.
    function run() {
      observer.disconnect()
      updateEnergyRead()
      observer.observe(document.body, observerOptions)
    }

    run()

    const now = new Date()
    const msToNextQuarter = ((15 - (now.getMinutes() % 15)) * 60 - now.getSeconds()) * 1000 - now.getMilliseconds()
    let interval: number | undefined
    const timeout = window.setTimeout(() => {
      run()
      interval = window.setInterval(run, 15 * 60 * 1000)
    }, Math.max(1000, msToNextQuarter))

    const onVisibility = () => { if (document.visibilityState === 'visible') run() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      observer.disconnect()
      window.clearTimeout(timeout)
      if (interval) window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return null
}
