// ─── Task & Project ──────────────────────────────────────────
export type TaskStatus = 'todo' | 'in_progress' | 'waiting' | 'done' | 'cancelled'
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical'
export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical'
export type TaskSource = 'manual' | 'email' | 'calendar' | 'brain_dump' | 'crm' | 'message' | 'dictation'

export interface Task {
  id: string
  user_id: string
  title: string
  description?: string
  category?: string
  project?: string
  client_name?: string
  status: TaskStatus
  due_date?: string
  priority_score: number
  urgency_level: UrgencyLevel
  money_impact: number
  emotional_weight: number
  estimated_minutes?: number
  source: TaskSource
  source_id?: string
  next_action?: string
  created_at: string
  updated_at: string
  completed_at?: string

  // ── Deep link fields ──────────────────────────────────────
  source_url?: string          // Direct link back to the source
  thread_id?: string           // Gmail thread ID or conversation ID
  created_by?: string          // Person/system that created this task
  assigned_to?: string
  metadata?: Record<string, unknown>

  // Gmail-specific
  gmail_message_id?: string
  gmail_thread_id?: string
  sender?: string
  email_subject?: string
  email_snippet?: string

  // Calendar-specific
  event_id?: string
  calendar_id?: string
  meeting_link?: string

  // CRM-specific
  crm_record_id?: string
  crm_record_type?: string
  crm_url?: string

  // Messages-specific
  conversation_id?: string
  contact_name?: string
  last_message?: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  description?: string
  type?: string
  status: 'active' | 'paused' | 'completed' | 'on_hold'
  priority_level: PriorityLevel
  next_action?: string
  deadline?: string
  waiting_on?: string
  notes?: string
  parked?: boolean
  created_at: string
  updated_at: string
}

// ─── Email ───────────────────────────────────────────────────
export interface Email {
  id: string
  user_id: string
  gmail_message_id?: string
  sender: string
  sender_email: string
  subject: string
  snippet: string
  body: string
  received_at: string
  urgency_level: UrgencyLevel
  needs_response: boolean
  client_name?: string
  ai_summary?: string
  suggested_action?: string
  extracted_tasks?: string[]
  suggested_reply?: string
  source_url?: string
  created_at: string
}

// ─── Calendar ────────────────────────────────────────────────
export interface CalendarEvent {
  id: string
  user_id: string
  title: string
  start_time: string
  end_time: string
  attendees?: string[]
  location?: string
  description?: string
  meeting_link?: string
  prep_notes?: string
  priority?: PriorityLevel
}

// ─── Dictation ───────────────────────────────────────────────
export type DictationEntryType =
  | 'journal' | 'dream' | 'task' | 'work_note' | 'message_draft'
  | 'email_draft' | 'project_note' | 'money_note' | 'spiritual' | 'career'

export interface DictationEntry {
  id: string
  user_id: string
  raw_text: string
  summary?: string
  emotional_read?: string
  tags?: string[]
  entry_type?: DictationEntryType
  extracted_tasks?: Array<{ title: string; urgency: string }>
  extracted_people?: string[]
  extracted_dates?: string[]
  next_step?: string
  affirmation?: string
  created_at: string
}

// ─── Journal & Dreams ─────────────────────────────────────────
export interface JournalEntry {
  id: string
  user_id: string
  date: string
  mood_rating: number
  energy_rating: number
  sleep_rating: number
  body_state?: string
  entry_text?: string
  assistant_reflection?: string
  wake_time?: string
  created_at: string
}

export interface DreamLog {
  id: string
  user_id: string
  date: string
  raw_text: string
  emotions?: string[]
  symbols?: string[]
  people?: string[]
  reflection?: string
  prompt?: string
  created_at: string
}

// ─── Money & Trading ─────────────────────────────────────────
export interface MoneyLog {
  id: string
  user_id: string
  date: string
  type: 'expense' | 'income' | 'saving' | 'investment'
  amount: number
  category?: string
  note?: string
  created_at: string
}

export interface TradingEntry {
  id: string
  user_id: string
  date: string
  asset: string
  setup: string
  entry?: number
  exit?: number
  risk?: string
  result?: 'win' | 'loss' | 'breakeven' | 'open'
  pnl?: number
  emotion_before?: string
  emotion_after?: string
  lesson?: string
  followed_rules?: boolean
  created_at: string
}

// ─── Bedtime ─────────────────────────────────────────────────
export interface BedtimePlan {
  stop_work_time: string
  leave_time?: string
  home_time?: string
  bed_time: string
  lights_out_time: string
  current_location?: string
  drive_home_minutes?: number
  prep_minutes: number
  wake_goal: string
  sleep_goal_hours: number
  message?: string
}

// ─── Daily Brief ─────────────────────────────────────────────
export interface DailyBrief {
  mood_summary?: string
  work_summary?: string
  email_summary?: string
  calendar_summary?: string
  top_3: string[]
  can_wait: string[]
  spiritual_message?: string
  human_design_message?: string
  chart_reflection?: string
  affirmation?: string
  first_step?: string
  ai_message?: string
}

// ─── Career ──────────────────────────────────────────────────
export interface CareerReflection {
  career_energy?: string
  highest_use_work?: string[]
  recognition_check?: string
  voice_clarity_prompt?: string
  career_lesson?: string
  current_pattern?: string
  highest_self_action?: string
  chart_theme?: string
}

// ─── Lesson Tracker ──────────────────────────────────────────
export interface LessonEntry {
  id: string
  user_id: string
  week_start: string
  triggers?: string
  avoided_items?: string
  completed_items?: string
  lessons?: string
  overgave_to?: string
  protected_peace?: string
  highest_self_moments?: string
  chart_theme?: string
  created_at: string
}

// ─── Legacy category type (for backwards compat) ─────────────
// 'Ad-Vantage' kept only so old tagged tasks still render correctly — it's
// old business, no longer offered as a choice for new tasks (see TaskForm).
// Modeling/Tattooing/Painting/Fashion added for her actual current focus.
export type TaskCategory =
  | 'EHM Strategies' | 'DRYP Digital' | 'Ad-Vantage' | 'Client Websites'
  | 'Social Media' | 'School' | 'Personal' | 'Health' | 'Content Creation'
  | 'Events' | 'Follow-ups' | 'Money / Invoices' | 'Urgent Fixes'
  | 'DRYP Studio' | 'Linked Up'
  | 'Modeling' | 'Tattooing' | 'Painting' | 'Fashion'

// ─── Legacy ──────────────────────────────────────────────────
export interface AssistantProfile {
  id: string
  user_id: string
  preferred_tone: string
  business_context: string
  personal_context: string
  banned_phrases: string[]
  response_style: string
  main_projects: string[]
  common_contacts: string
  daily_routine: string
  personal_goals: string
  created_at: string
  updated_at: string
}

export interface BrainDump {
  id: string
  user_id: string
  raw_text: string
  ai_summary?: string
  created_tasks?: Task[]
  created_at: string
}

export interface DailyPlan {
  must_do: Task[]
  quick_wins: Task[]
  admin_tasks: Task[]
  creative_tasks: Task[]
  client_follow_ups: Task[]
  personal_tasks: Task[]
  schedule_blocks: ScheduleBlock[]
  can_wait: Task[]
  ai_message: string
}

export interface ScheduleBlock {
  time: string
  task: string
  duration_minutes: number
  type: 'work' | 'admin' | 'creative' | 'personal' | 'break'
}
