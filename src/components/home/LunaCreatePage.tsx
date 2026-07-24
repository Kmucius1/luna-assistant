'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Aperture,
  Bookmark,
  Camera,
  Clock,
  Compass,
  Dice5,
  Feather,
  Heart,
  History,
  MapPin,
  Package,
  Palette,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react'

import { AppLayout } from '@/components/layout/AppLayout'
import { DailyCreativeSpark } from '@/components/home/DailyCreativeSpark'
import styles from './LunaCreatePage.module.css'

interface CreativePath {
  kind: 'easy_win' | 'main_activity' | 'get_out'
  title: string
  why: string
  duration: string
  needs: string[]
  steps: string[]
}

const KIND_LABEL: Record<string, string> = {
  easy_win: 'Easy Creative Win',
  main_activity: 'Main Creative Activity',
  get_out: 'Get Out of the House',
}

const QUESTIONS = [
  { id: 'energy', label: 'Energy', question: 'How much energy do you have?', image: '/images/create/spark-daisy.jpg', options: ['Low', 'Medium', 'Ready to go'] },
  { id: 'where', label: 'Where', question: 'Where do you want to be?', image: '/images/rooms/style.jpg', options: ['Home', 'Outside', 'Somewhere new', 'No preference'] },
  { id: 'activity', label: 'What Sounds Best?', question: 'What kind of creative activity calls to you?', image: '/images/rooms/atelier.jpg', options: ['Hands-on making', 'Photos', 'Writing', 'Styling', 'Designing', 'Moving around', 'Exploring'] },
  { id: 'time', label: 'Time', question: 'How much time do you have?', image: '/images/rooms/brain.jpg', options: ['15 min', 'An hour', 'A few hours', 'The whole day'] },
  { id: 'want', label: 'What Do You Want?', question: 'What do you want from today?', image: '/images/create/creative-board.jpg', options: ['Relax', 'Express myself', 'Make something beautiful', 'Try something new', 'Capture a memory', 'Feel accomplished'] },
  { id: 'capture', label: 'Capture It?', question: 'Do you want this to become content?', image: '/images/rooms/travel.jpg', options: ['Just for me', 'Maybe', 'Yes'] },
] as const

const CATEGORIES = [
  { label: 'Make Something', desc: 'Art, fashion, writing, design, music.', icon: Palette, href: '/creative' },
  { label: 'Experience Something', desc: 'Nature, exploring, new places.', icon: Compass, soon: true },
  { label: 'Express Something', desc: 'Journal prompts, poetry, storytelling.', icon: Feather, href: '/journal' },
  { label: 'Reinvent Something', desc: 'Restyle, redesign, edit, redo.', icon: RefreshCw, soon: true },
  { label: 'Capture Something', desc: 'A mood, a memory, a small moment.', icon: Aperture, href: '/brain-dump' },
  { label: 'Continue Something', desc: 'Projects and ideas already started.', icon: History, soon: true },
]

export function LunaCreatePage() {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [paths, setPaths] = useState<CreativePath[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [saved, setSaved] = useState<Set<string>>(new Set())

  function selectAnswer(qid: string, option: string) {
    setAnswers(a => ({ ...a, [qid]: option }))
  }

  async function generatePaths(surpriseMe = false) {
    setLoading(true)
    setError(false)
    setPaths(null)
    try {
      const res = await fetch('/api/ai/creative-paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(surpriseMe ? { surpriseMe: true } : answers),
      })
      if (!res.ok) throw new Error('failed')
      const data = await res.json()
      setPaths(data.paths ?? [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  function toggleSave(title: string) {
    setSaved(s => {
      const next = new Set(s)
      next.has(title) ? next.delete(title) : next.add(title)
      return next
    })
  }

  return (
    <AppLayout noPad>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1>Create with Luna <Sparkles size={18} /></h1>
            <p>Your creative world, inspired by you.</p>
          </div>
          <Link href="/home" className={styles.closeButton} aria-label="Close"><X size={17} /></Link>
        </div>

        <p className={styles.prompt}><Sparkles size={16} /> What would feel good to create today?</p>

        <div className={styles.board}>
          <Image src="/images/create/creative-board.jpg" alt="Today's creative board" fill sizes="(max-width: 640px) 100vw, 640px" priority />
          <div className={styles.boardOverlay} />
          <div className={styles.boardLabel}>
            <strong>Today&apos;s Creative Board</strong>
            <span>Pieces to inspire your day.</span>
          </div>
          <button type="button" className={styles.boardButton}>View Full Board</button>
        </div>

        <div className={styles.actionGrid}>
          <a href="#checkin" className={styles.actionCard}><Sparkles size={20} /><strong>Help Me Choose</strong><span>Short creative check-in</span></a>
          <button type="button" className={styles.actionCard} onClick={() => generatePaths(true)}><Dice5 size={20} /><strong>Surprise Me</strong><span>One unexpected idea</span></button>
          <div className={styles.actionCard}><span className={styles.actionBadge}>Soon</span><MapPin size={20} /><strong>Go Somewhere</strong><span>A creative outing</span></div>
          <div className={styles.actionCard}><span className={styles.actionBadge}>Soon</span><Camera size={20} /><strong>Use What I Have</strong><span>From what you own</span></div>
          <div className={styles.actionCard}><span className={styles.actionBadge}>Soon</span><History size={20} /><strong>Finish Something</strong><span>An unfinished idea</span></div>
          <div className={styles.actionCard}><span className={styles.actionBadge}>Soon</span><Heart size={20} /><strong>Capture My Day</strong><span>Turn it into a memory</span></div>
        </div>

        <div id="checkin">
          <div className={styles.sectionHeader}>
            <h2>What Do I Want To Do?</h2>
            <span><Sparkles size={12} /> Quick check-in</span>
          </div>
          <div className={styles.checkinRow}>
            {QUESTIONS.map(q => (
              <div key={q.id} className={styles.checkinCard}>
                <div className={styles.checkinPhoto}><Image src={q.image} alt={q.label} fill sizes="140px" /></div>
                <div className={styles.checkinBody}>
                  <p className={styles.checkinQuestion}>{q.question}</p>
                  <div className={styles.checkinOptions}>
                    {q.options.map(opt => (
                      <button
                        key={opt}
                        type="button"
                        className={`${styles.checkinChip} ${answers[q.id] === opt ? styles.checkinChipActive : ''}`}
                        onClick={() => selectAnswer(q.id, opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button type="button" className={styles.showPathsButton} onClick={() => generatePaths(false)} disabled={loading}>
          <Sparkles size={15} /> {loading ? 'Luna is thinking…' : 'Show My Creative Paths'}
        </button>

        {error && <p className={styles.errorNote}>Couldn&apos;t generate ideas right now — try again in a moment.</p>}

        {paths && (
          <div className={styles.pathsWrap}>
            {paths.map(path => (
              <div key={path.title} className={styles.pathCard}>
                <div className={styles.pathKind}>{KIND_LABEL[path.kind] ?? path.kind}</div>
                <h3>{path.title}</h3>
                <p className={styles.pathWhy}>{path.why}</p>
                <div className={styles.pathMeta}>
                  <span><Clock size={12} /> {path.duration}</span>
                  {path.needs?.length > 0 && <span><Package size={12} /> {path.needs.join(', ')}</span>}
                </div>
                <ul className={styles.pathSteps}>
                  {path.steps?.map((step, i) => <li key={i}><b>{i + 1}.</b> {step}</li>)}
                </ul>
                <div className={styles.pathActions}>
                  <button type="button" onClick={() => toggleSave(path.title)} className={saved.has(path.title) ? styles.pathActionSave : ''}>
                    <Bookmark size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: '-2px' }} /> {saved.has(path.title) ? 'Saved' : 'Save for Later'}
                  </button>
                  <button type="button">Not My Mood</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <DailyCreativeSpark />

        <div className={styles.categoryGrid}>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon
            const content = (
              <>
                {cat.soon && <span className={styles.actionBadge}>Soon</span>}
                <Icon size={18} />
                <strong>{cat.label}</strong>
                <span>{cat.desc}</span>
              </>
            )
            return cat.href ? (
              <Link key={cat.label} href={cat.href} className={styles.categoryCard}>{content}</Link>
            ) : (
              <div key={cat.label} className={styles.categoryCard}>{content}</div>
            )
          })}
        </div>
      </div>
    </AppLayout>
  )
}
