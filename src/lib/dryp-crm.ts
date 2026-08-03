import { createClient } from '@supabase/supabase-js'

const DRYP_URL  = process.env.DRYP_SUPABASE_URL
const DRYP_KEY  = process.env.DRYP_SUPABASE_SERVICE_KEY

export function isConnected() {
  return !!(DRYP_URL && DRYP_KEY)
}

function db() {
  if (!DRYP_URL || !DRYP_KEY) throw new Error('DRYP_SUPABASE_URL and DRYP_SUPABASE_SERVICE_KEY are not set')
  return createClient(DRYP_URL, DRYP_KEY, { auth: { persistSession: false } })
}

export type AccountHealth = 'excellent' | 'good' | 'at_risk' | 'churning' | 'new'

export interface DryphubAccount {
  id: string
  business_name: string
  industry?: string
  website?: string
  email?: string
  phone?: string
  health_status: AccountHealth
  client_pipeline_stage?: string
  monthly_retainer?: number
  notes?: string
  notes_summary?: string
  is_active: boolean
  created_at: string
  updated_at: string
  contacts_count?: number
  services_count?: number
  projects_count?: number
}

export interface DryphubNote {
  id: string
  account_id?: string
  content: string
  note_type?: string
  created_at: string
  updated_at?: string
  account?: { id: string; business_name: string }
}

export interface DryphubTask {
  id: string
  title: string
  description?: string
  status: string
  priority?: string
  due_date?: string
  account_id?: string
  account_name?: string
  notes?: string
  tags?: string[]
  created_at: string
  updated_at: string
}

// ─── Accounts ────────────────────────────────────────────────────────────────
export async function getAccounts(): Promise<DryphubAccount[]> {
  const { data, error } = await db()
    .from('accounts')
    .select(`
      id, business_name, industry, website, email, phone,
      health_status, client_pipeline_stage, monthly_retainer,
      notes, notes_summary, is_active, created_at, updated_at,
      contacts_count:contacts(count),
      services_count:services(count),
      projects_count:projects(count)
    `)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((a: Record<string, unknown>) => ({
    ...a,
    contacts_count: (a.contacts_count as { count: number }[])?.[0]?.count ?? 0,
    services_count: (a.services_count as { count: number }[])?.[0]?.count ?? 0,
    projects_count: (a.projects_count as { count: number }[])?.[0]?.count ?? 0,
  })) as DryphubAccount[]
}

// ─── Recent changes (last N hours) ───────────────────────────────────────────
export async function getRecentChanges(hoursAgo = 24) {
  const since = new Date(Date.now() - hoursAgo * 3_600_000).toISOString()

  const [accountsRes, notesRes] = await Promise.all([
    db().from('accounts').select('id, business_name, health_status, updated_at, notes_summary, client_pipeline_stage')
      .eq('is_active', true).gte('updated_at', since).order('updated_at', { ascending: false }),
    db().from('notes').select('id, content, account_id, created_at, account:accounts(id, business_name)')
      .gte('created_at', since).order('created_at', { ascending: false }).limit(20),
  ])

  return {
    updatedAccounts: (accountsRes.data ?? []) as Array<{
      id: string; business_name: string; health_status: string; updated_at: string; notes_summary?: string; client_pipeline_stage?: string
    }>,
    newNotes: (notesRes.data ?? []) as unknown as DryphubNote[],
  }
}

// ─── New accounts (created after a timestamp) ────────────────────────────────
export async function getNewAccounts(since: string): Promise<DryphubAccount[]> {
  const { data, error } = await db()
    .from('accounts')
    .select('id, business_name, industry, health_status, client_pipeline_stage, created_at, updated_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as DryphubAccount[]
}

// ─── Notes for a specific account today ─────────────────────────────────────
export async function getAccountNotesToday(accountId: string): Promise<DryphubNote[]> {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const { data, error } = await db()
    .from('notes')
    .select('id, content, account_id, created_at')
    .eq('account_id', accountId)
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as DryphubNote[]
}

// ─── Find account by name (fuzzy — for meeting matching) ────────────────────
export async function findAccountByName(name: string): Promise<DryphubAccount | null> {
  const { data } = await db()
    .from('accounts')
    .select('id, business_name, health_status, client_pipeline_stage, updated_at')
    .ilike('business_name', `%${name}%`)
    .eq('is_active', true)
    .limit(1)
    .single()
  return data as DryphubAccount | null
}

// Zoe's user IDs in DRYP Hub (two accounts)
const ZOE_IDS = [
  '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', // zoe.taylor@advantagemediaagency.com
  'dc25215f-cda4-4e91-84ee-c9fe49678b6b', // zoe@drypdigital.com
]
// The DRYP Hub row id (not the auth id) she posts team check-ins as.
const ZOE_DRYP_ROW_ID = 'dc25215f-cda4-4e91-84ee-c9fe49678b6b'

// DRYP Hub lives in a separate Supabase project — every call here is a
// cross-project round trip. A short cache avoids repeating it on every
// Work page load.
const CACHE_TTL_MS = 30_000
const tasksCache = new Map<number, { data: DryphubTask[]; expiresAt: number }>()
let statsCache: { data: Awaited<ReturnType<typeof fetchSummaryStats>>; expiresAt: number } | null = null

// ─── Open tasks assigned to Zoe (with client name) ────────────────────────────
export async function getOpenTasks(limit = 50): Promise<DryphubTask[]> {
  const cached = tasksCache.get(limit)
  if (cached && cached.expiresAt > Date.now()) return cached.data

  const { data, error } = await db()
    .from('tasks')
    .select(`
      id, title, description, status, priority, due_date,
      account_id, notes, tags, created_at, updated_at,
      account:accounts(business_name)
    `)
    .in('assigned_to', ZOE_IDS)
    .in('status', ['not_started', 'in_progress', 'todo', 'waiting_client'])
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(limit)
  if (error) throw error
  const result = (data ?? []).map((t: Record<string, unknown>) => ({
    ...t,
    account_name: (t.account as { business_name?: string } | null)?.business_name ?? undefined,
    account: undefined,
  })) as unknown as DryphubTask[]

  tasksCache.set(limit, { data: result, expiresAt: Date.now() + CACHE_TTL_MS })
  return result
}

// ─── Summary stats ───────────────────────────────────────────────────────────
async function fetchSummaryStats() {
  const [accountsRes, tasksRes, notesTodayRes] = await Promise.all([
    db().from('accounts').select('id, health_status, client_pipeline_stage').eq('is_active', true),
    db().from('tasks').select('id, status, due_date').in('assigned_to', ZOE_IDS).in('status', ['not_started', 'in_progress', 'todo', 'waiting_client']),
    db().from('notes').select('id').gte('created_at', new Date(Date.now() - 86_400_000).toISOString()),
  ])

  const accounts  = accountsRes.data ?? []
  const tasks     = tasksRes.data ?? []
  const today     = new Date().toDateString()

  const dueTodayCount = tasks.filter((t: { due_date?: string }) => t.due_date && new Date(t.due_date).toDateString() === today).length
  const dueWeekCount  = tasks.filter((t: { due_date?: string }) => {
    if (!t.due_date) return false
    const d = new Date(t.due_date)
    const now = new Date()
    const week = new Date(); week.setDate(week.getDate() + 7)
    return d >= now && d <= week
  }).length

  return {
    activeClients:  accounts.length,
    openTasks:      tasks.length,
    dueToday:       dueTodayCount,
    dueThisWeek:    dueWeekCount,
    notesLastDay:   notesTodayRes.data?.length ?? 0,
    atRiskCount:    accounts.filter((a: { health_status: string }) => ['at_risk', 'churning'].includes(a.health_status)).length,
  }
}

export async function getSummaryStats() {
  if (statsCache && statsCache.expiresAt > Date.now()) return statsCache.data
  const data = await fetchSummaryStats()
  statsCache = { data, expiresAt: Date.now() + CACHE_TTL_MS }
  return data
}

// ─── Create a project ──────────────────────────────────────────────────────
export interface NewProjectInput {
  account_id: string
  name: string
  project_type?: string
  due_date?: string
}

export async function createProject(input: NewProjectInput) {
  const { data, error } = await db()
    .from('projects')
    .insert({
      account_id: input.account_id,
      name: input.name,
      project_type: input.project_type || null,
      due_date: input.due_date || null,
      status: 'active',
      phase: 'kickoff',
      billing_type: 'one_time',
    })
    .select('id, name, account_id, project_type, status, phase, due_date, created_at')
    .single()
  if (error) throw error
  return data
}

// ─── Team activity feed ─────────────────────────────────────────────────────
// The `notes` table already doubles as DRYP Hub's activity log — every
// completed task, new account, etc. lands here as a plain-English line
// ("Kaleb Mucius completed 'schedule David & Luke meetings'"), so the most
// recent rows across every account genuinely are "what's the team been up
// to," no separate activity table needed.
export interface TeamUpdate {
  id: string
  content: string
  account_id?: string
  account_name?: string
  created_at: string
}

export async function getTeamFeed(limit = 30): Promise<TeamUpdate[]> {
  const { data, error } = await db()
    .from('notes')
    .select('id, content, account_id, created_at, account:accounts(business_name)')
    .not('content', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map((n: Record<string, unknown>) => ({
    id: n.id as string,
    content: n.content as string,
    account_id: n.account_id as string | undefined,
    account_name: (n.account as { business_name?: string } | null)?.business_name,
    created_at: n.created_at as string,
  }))
}

export async function postTeamUpdate(message: string, accountId?: string): Promise<void> {
  const { error } = await db()
    .from('notes')
    .insert({
      content: `Zoe Taylor: ${message}`,
      raw_text: message,
      source_type: 'internal_note',
      owner_id: ZOE_DRYP_ROW_ID,
      account_id: accountId || null,
      visibility: 'internal',
    })
  if (error) throw error
}
