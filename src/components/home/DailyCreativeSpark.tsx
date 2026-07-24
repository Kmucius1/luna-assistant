'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ArrowRight, Bookmark, Check, Sparkles } from 'lucide-react'

import { dayIndex } from '@/components/home/GreetingHeader'
import styles from './DailyCreativeSpark.module.css'

// Shared by /home and /create — was previously duplicated inline in
// LunaCreatePage, which risked the two drifting apart the same way
// ZOE_HERO_FOCUS_BY_DAY did before it got consolidated.
export const CREATIVE_SPARKS = [
  { text: 'Photograph something ordinary like it belongs in a magazine.', tip: 'Look for light, texture, and tiny details.' },
  { text: 'Design an outfit around one emotion.', tip: 'Pick the feeling first, then the pieces.' },
  { text: 'Create a lock screen for the chapter of life you’re in right now.', tip: 'One photo, one word, one color.' },
  { text: 'Write four lines that begin with "Lately, I’ve been learning…"', tip: 'Don’t edit — just let them land.' },
  { text: 'Find one object in your home and redesign it.', tip: 'Sketch it, style it, or just imagine it differently.' },
  { text: 'Go outside and collect five images that feel like freedom.', tip: 'No rules — just what freedom looks like today.' },
]

export function DailyCreativeSpark() {
  const [sparkIndex, setSparkIndex] = useState(dayIndex() % CREATIVE_SPARKS.length)
  const [saved, setSaved] = useState(false)
  const [done, setDone] = useState(false)
  const spark = CREATIVE_SPARKS[sparkIndex]

  return (
    <div className={styles.sparkCard}>
      <div className={styles.sparkPhoto}><Image src="/images/create/spark-daisy.jpg" alt="" fill sizes="84px" /></div>
      <div className={styles.sparkBody}>
        <div className={styles.sparkHeader}><Sparkles /> Daily Creative Spark</div>
        <p className={styles.sparkText}>{spark.text}</p>
        <p className={styles.sparkTip}>{spark.tip}</p>
        <div className={styles.sparkActions}>
          <button type="button" onClick={() => setSaved(s => !s)} className={saved ? styles.sparkActionDone : ''}><Bookmark size={16} /> Save</button>
          <button type="button" onClick={() => setDone(d => !d)} className={done ? styles.sparkActionDone : ''}><Check size={16} /> Did It</button>
          <button type="button" onClick={() => { setSparkIndex(i => (i + 1) % CREATIVE_SPARKS.length); setSaved(false); setDone(false) }}><ArrowRight size={16} /> More Like This</button>
        </div>
      </div>
    </div>
  )
}
