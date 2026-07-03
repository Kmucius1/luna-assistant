'use client'
import { useState } from 'react'
import { Task } from '@/types'
import {
  CheckCircle2, Circle, ExternalLink, MessageSquare,
  Sparkles, Clock, Pin, StickyNote, ChevronDown, ChevronUp
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// ─── Source config ────────────────────────────────────────────
const SOURCE_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  gmail:     { label: 'Email',    emoji: '📧', color: '#5A8A5A', bg: 'rgba(90,138,90,0.1)' },
  calendar:  { label: 'Calendar', emoji: '📅', color: '#4A7FB8', bg: 'rgba(74,127,184,0.1)' },
  messages:  { label: 'Message',  emoji: '💬', color: '#C87B7B', bg: 'rgba(200,123,123,0.1)' },
  crm:       { label: 'DRYPHub', emoji: '🏢', color: '#9b5cff', bg: 'rgba(155,92,255,0.1)' },
  slack:     { label: 'Slack',   emoji: '💼', color: '#C9A96E', bg: 'rgba(201,169,110,0.1)' },
  manual:    { label: 'Manual',  emoji: '✏️', color: '#9E95AC', bg: 'rgba(158,149,172,0.1)' },
  dictation: { label: 'Dictation',emoji: '🎙', color: '#9b5cff', bg: 'rgba(155,92,255,0.08)' },
  brain_dump:{ label: 'Brain dump',emoji: '⚡',color: '#C9A96E', bg: 'rgba(201,169,110,0.1)' },
  email:     { label: 'Email',   emoji: '📧', color: '#5A8A5A', bg: 'rgba(90,138,90,0.1)' },
}

const URGENCY_COLORS: Record<string, string> = {
  critical: '#E05E5E',
  high:     '#E08B4A',
  medium:   '#9b5cff',
  low:      '#9E95AC',
}

function getSourceUrl(task: Task): string | null {
  if (task.source_url) return task.source_url
  if (task.gmail_thread_id) return `https://mail.google.com/mail/u/0/#inbox/${task.gmail_thread_id}`
  if (task.event_id) return `https://calendar.google.com/calendar/u/0/r/eventedit/${task.event_id}`
  if (task.crm_url) return task.crm_url
  if (task.crm_record_id) return `https://dryphub.com/record/${task.crm_record_id}`
  return null
}

function getReplyUrl(task: Task): string | null {
  if (task.gmail_thread_id) return `https://mail.google.com/mail/u/0/#inbox/${task.gmail_thread_id}`
  if (task.contact_name) return `/messages`
  return null
}

interface OSTaskCardProps {
  task: Task
  onComplete?: (id: string) => void
  onSnooze?: (id: string) => void
  onPin?: (id: string) => void
  onAddNote?: (id: string, note: string) => void
  compact?: boolean
}

export function OSTaskCard({ task, onComplete, onSnooze, onPin, onAddNote, compact }: OSTaskCardProps) {
  const [showNote, setShowNote]   = useState(false)
  const [note, setNote]           = useState('')
  const [expanded, setExpanded]   = useState(false)
  const done = task.status === 'done'

  const src    = SOURCE_CONFIG[task.source] ?? SOURCE_CONFIG.manual
  const srcUrl = getSourceUrl(task)
  const replyUrl = getReplyUrl(task)

  const who   = task.created_by || task.sender || task.contact_name || task.client_name
  const when  = task.due_date ? formatDistanceToNow(new Date(task.due_date), { addSuffix: true }) : task.created_at ? formatDistanceToNow(new Date(task.created_at), { addSuffix: true }) : null
  const urgencyColor = URGENCY_COLORS[task.urgency_level] ?? '#9E95AC'

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: done ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.82)',
        border: `1px solid ${done ? 'rgba(155,92,255,0.05)' : 'rgba(155,92,255,0.1)'}`,
        boxShadow: done ? 'none' : '0 2px 16px rgba(155,92,255,0.06)',
        opacity: done ? 0.6 : 1,
      }}>

      {/* Urgency accent bar */}
      {!done && task.urgency_level !== 'low' && (
        <div className="h-0.5" style={{ background: urgencyColor }} />
      )}

      <div className="p-4">
        {/* Row 1: check + title */}
        <div className="flex items-start gap-3">
          <button onClick={() => onComplete?.(task.id)} className="flex-shrink-0 mt-0.5 transition-all">
            {done
              ? <CheckCircle2 className="h-5 w-5" style={{ color: '#5A8A5A' }} />
              : <Circle className="h-5 w-5" style={{ color: 'var(--faint)' }} />}
          </button>

          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold leading-snug ${done ? 'line-through' : ''}`}
              style={{ color: done ? 'var(--mist)' : 'var(--depth)' }}>
              {task.title}
            </p>

            {/* Source line: Who · When · Source */}
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              {who && (
                <span className="text-xs font-medium" style={{ color: 'var(--mid)' }}>{who}</span>
              )}
              {who && when && <span className="text-xs" style={{ color: 'var(--faint)' }}>·</span>}
              {when && (
                <span className="text-xs" style={{ color: 'var(--mist)' }}>{when}</span>
              )}
              {(who || when) && <span className="text-xs" style={{ color: 'var(--faint)' }}>·</span>}
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: src.bg, color: src.color }}>
                <span>{src.emoji}</span>
                {src.label}
              </span>
              {task.urgency_level && task.urgency_level !== 'low' && (
                <>
                  <span className="text-xs" style={{ color: 'var(--faint)' }}>·</span>
                  <span className="text-xs font-semibold capitalize" style={{ color: urgencyColor }}>
                    {task.urgency_level}
                  </span>
                </>
              )}
            </div>

            {/* Email snippet or description */}
            {!compact && (task.email_snippet || task.description) && (
              <p className="mt-1.5 text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--mist)' }}>
                {task.email_snippet || task.description}
              </p>
            )}
          </div>

          {/* Expand toggle */}
          {!compact && (
            <button onClick={() => setExpanded(!expanded)} className="flex-shrink-0 mt-0.5">
              {expanded
                ? <ChevronUp className="h-4 w-4" style={{ color: 'var(--faint)' }} />
                : <ChevronDown className="h-4 w-4" style={{ color: 'var(--faint)' }} />}
            </button>
          )}
        </div>

        {/* Row 2: Primary deep-link actions */}
        {!compact && !done && (
          <div className="flex gap-2 mt-3 ml-8">
            {srcUrl && (
              <a href={srcUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                style={{ background: src.bg, color: src.color }}>
                <ExternalLink className="h-3 w-3" />
                Open {src.label} →
              </a>
            )}
            {replyUrl && (
              <a href={replyUrl}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                style={{ background: 'rgba(155,92,255,0.08)', color: 'var(--violet)' }}>
                <MessageSquare className="h-3 w-3" />
                Reply →
              </a>
            )}
            <a href={`/dictation?task=${encodeURIComponent(task.title)}`}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
              style={{ background: 'rgba(201,169,110,0.1)', color: 'var(--golden)' }}>
              <Sparkles className="h-3 w-3" />
              Ask LUNA →
            </a>
          </div>
        )}

        {/* Expanded: full detail + secondary actions */}
        {expanded && (
          <div className="mt-3 ml-8 space-y-3">
            {task.next_action && (
              <div className="px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(155,92,255,0.06)' }}>
                <span className="font-semibold" style={{ color: 'var(--violet)' }}>Next: </span>
                <span style={{ color: 'var(--depth)' }}>{task.next_action}</span>
              </div>
            )}
            {task.meeting_link && (
              <a href={task.meeting_link} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#4A7FB8' }}>
                <ExternalLink className="h-3 w-3" />
                Join meeting →
              </a>
            )}

            {/* Note input */}
            {showNote && (
              <div className="rounded-xl p-3" style={{ background: 'rgba(155,92,255,0.04)', border: '1px solid rgba(155,92,255,0.1)' }}>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Add a note..."
                  rows={2}
                  autoFocus
                  className="w-full bg-transparent outline-none text-xs resize-none"
                  style={{ color: 'var(--depth)' }}
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => { onAddNote?.(task.id, note); setNote(''); setShowNote(false) }}
                    className="text-xs font-semibold px-3 py-1 rounded-lg"
                    style={{ background: 'var(--violet)', color: 'white' }}>
                    Save note
                  </button>
                  <button onClick={() => setShowNote(false)}
                    className="text-xs" style={{ color: 'var(--mist)' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Secondary action row */}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => onComplete?.(task.id)}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium"
                style={{ background: 'rgba(90,138,90,0.1)', color: '#5A8A5A' }}>
                <CheckCircle2 className="h-3 w-3" />
                Complete
              </button>
              <button onClick={() => setShowNote(!showNote)}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium"
                style={{ background: 'rgba(201,169,110,0.1)', color: 'var(--golden)' }}>
                <StickyNote className="h-3 w-3" />
                Note
              </button>
              <button onClick={() => onSnooze?.(task.id)}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium"
                style={{ background: 'rgba(168,196,218,0.15)', color: '#4A7FB8' }}>
                <Clock className="h-3 w-3" />
                Snooze
              </button>
              <button onClick={() => onPin?.(task.id)}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium"
                style={{ background: 'rgba(155,92,255,0.08)', color: 'var(--violet)' }}>
                <Pin className="h-3 w-3" />
                Pin
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
