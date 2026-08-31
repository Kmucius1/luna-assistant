'use client'
import { useEffect, useState, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoadingPage } from '@/components/ui/loading'
import { createClient } from '@/lib/supabase/client'
import { Project } from '@/types'
import { Plus, X, Clock, CheckCircle, PauseCircle, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const GLASS: React.CSSProperties = {
  background: 'rgba(255,255,255,0.62)',
  border: '1px solid rgba(180,150,100,0.18)',
  borderRadius: 20,
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  boxShadow: '0 6px 24px rgba(60,46,24,0.08)',
}

const INPUT_S: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(180,150,100,0.18)',
  borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#100C1E', outline: 'none',
  fontFamily: 'inherit', boxSizing: 'border-box',
}

const STATUS_COLORS: Record<string, { bg: string; color: string; icon: React.ElementType }> = {
  active:    { bg: 'rgba(90,138,90,0.15)',   color: '#5A8A5A',          icon: CheckCircle },
  paused:    { bg: 'rgba(201,169,110,0.12)', color: '#8A6F2A',          icon: PauseCircle },
  on_hold:   { bg: 'rgba(94,84,116,0.1)',    color: '#5E5474',          icon: Clock },
  completed: { bg: 'rgba(90,138,164,0.12)',  color: '#4A7A96',          icon: CheckCircle },
}

const PRIORITY_STYLES: Record<string, { bg: string; color: string }> = {
  critical: { bg: 'rgba(224,94,94,0.15)',    color: '#B23B3B' },
  high:     { bg: 'rgba(224,140,94,0.15)',   color: '#B8632F' },
  medium:   { bg: 'rgba(201,169,110,0.12)',  color: '#8A6F2A' },
  low:      { bg: 'rgba(94,84,116,0.1)',     color: '#5E5474' },
}

const DEFAULT_PROJECTS = [
  { name: 'EHM Strategies',    description: 'CRM, automation, email, client management',      priority_level: 'high' as const },
  { name: 'DRYP Studio',       description: 'Video studio, content production, social media', priority_level: 'high' as const },
  { name: 'DRYP Digital',      description: 'Digital marketing, SEO, AEO, strategy',          priority_level: 'high' as const },
  { name: 'Ad-Vantage',        description: 'Agency operations, client onboarding, growth',   priority_level: 'high' as const },
  { name: 'Hoover Digital',    description: 'Website, SEO, digital presence',                 priority_level: 'medium' as const },
  { name: 'Babe Coffee Lounge',description: 'Social media, events, content',                  priority_level: 'medium' as const },
  { name: "Flanagan's Irish Pub",description:"Website, social media, events",                 priority_level: 'medium' as const },
  { name: 'Villa Residential', description: 'Real estate marketing, website, CRM',            priority_level: 'medium' as const },
  { name: 'Linked Up',         description: 'Events, flyers, promotions, social',             priority_level: 'medium' as const },
  { name: 'School (USF)',      description: 'Coursework, assignments, deadlines',             priority_level: 'high' as const },
  { name: 'Personal',          description: 'Health, appointments, personal goals',           priority_level: 'medium' as const },
]

function FieldLabel({ text }: { text: string }) {
  return <p style={{ fontSize: 10, fontWeight: 700, color: '#5E5474', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>{text}</p>
}

export default function ProjectsPage() {
  const [projects,   setProjects]   = useState<Project[]>([])
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({})
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [expanded,   setExpanded]   = useState<string | null>(null)
  const [newProject, setNewProject] = useState({ name: '', description: '', status: 'active' as Project['status'], priority_level: 'medium' as Project['priority_level'], next_action: '', deadline: '', waiting_on: '' })
  const [formError,  setFormError]  = useState('')
  const supabase = createClient()

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: projs }, { data: tasks }] = await Promise.all([
      supabase.from('projects').select('*').eq('user_id', user.id).order('priority_level'),
      supabase.from('tasks').select('project, status').eq('user_id', user.id).not('status', 'in', '("done","cancelled")'),
    ])
    if (!projs || projs.length === 0) {
      const { data: created } = await supabase.from('projects').insert(DEFAULT_PROJECTS.map(p => ({ ...p, user_id: user.id, status: 'active' as const }))).select()
      setProjects(created || [])
    } else { setProjects(projs) }
    const counts: Record<string, number> = {}
    tasks?.forEach((t: { project?: string | null }) => { if (t.project) counts[t.project] = (counts[t.project] || 0) + 1 })
    setTaskCounts(counts)
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadData() }, [loadData])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !newProject.name.trim()) return
    const { data, error } = await supabase
      .from('projects')
      .insert({ ...newProject, deadline: newProject.deadline || null, user_id: user.id })
      .select()
      .single()
    if (error) {
      console.error('[projects] insert error:', error)
      setFormError("Couldn't save that project — try again.")
      return
    }
    if (data) { setProjects(prev => [data, ...prev]); setShowForm(false); setNewProject({ name: '', description: '', status: 'active', priority_level: 'medium', next_action: '', deadline: '', waiting_on: '' }) }
  }

  async function updateProject(id: string, updates: Partial<Project>) {
    await supabase.from('projects').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
  }

  if (loading) return <AppLayout><LoadingPage /></AppLayout>

  const activeCount = projects.filter(p => p.status === 'active').length

  return (
    <div
      className="bg-app min-h-screen"
      style={{
        '--app-bg-from': '#FBF8F2',
        '--app-bg-mid': '#F6F1E7',
        '--app-bg-to': '#F0E9DA',
      } as React.CSSProperties}
    >
      <AppLayout noPad className="pt-16">
        <div style={{ padding: '0 0 180px' }}>

          {/* Header */}
          <div style={{ padding: '20px 20px 16px' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-3)', fontSize: 12, textDecoration: 'none', marginBottom: 14 }}>
              <ArrowLeft className="h-3.5 w-3.5" /> Home
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-1)' }}>Projects</h1>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{activeCount} active</p>
              </div>
              <button onClick={() => setShowForm(!showForm)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 12, border: 'none', background: '#5C4530', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                <Plus className="h-4 w-4" /> Add project
              </button>
            </div>
          </div>

          <div style={{ padding: '0 16px' }}>

            {/* New project form */}
            {showForm && (
              <div style={{ ...GLASS, padding: 18, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#100C1E' }}>New project</p>
                  <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5E5474' }}><X className="h-4 w-4" /></button>
                </div>
                <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div><FieldLabel text="Project name *" /><input value={newProject.name} onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))} required style={INPUT_S} placeholder="Client name or project title" /></div>
                  <div><FieldLabel text="Description" /><textarea value={newProject.description} onChange={e => setNewProject(p => ({ ...p, description: e.target.value }))} rows={2} style={{ ...INPUT_S, resize: 'vertical' }} /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <FieldLabel text="Status" />
                      <select value={newProject.status} onChange={e => setNewProject(p => ({ ...p, status: e.target.value as Project['status'] }))} style={INPUT_S}>
                        <option value="active">Active</option><option value="paused">Paused</option><option value="on_hold">On hold</option><option value="completed">Completed</option>
                      </select>
                    </div>
                    <div>
                      <FieldLabel text="Priority" />
                      <select value={newProject.priority_level} onChange={e => setNewProject(p => ({ ...p, priority_level: e.target.value as Project['priority_level'] }))} style={INPUT_S}>
                        <option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                      </select>
                    </div>
                  </div>
                  <div><FieldLabel text="Next action" /><input value={newProject.next_action} onChange={e => setNewProject(p => ({ ...p, next_action: e.target.value }))} style={INPUT_S} placeholder="What needs to happen next?" /></div>
                  {formError && <p style={{ fontSize: 12, color: '#B23B3B', margin: 0 }}>{formError}</p>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" style={{ flex: 1, padding: '11px 0', borderRadius: 14, border: 'none', background: '#5C4530', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Create project</button>
                    <button type="button" onClick={() => setShowForm(false)} style={{ padding: '11px 18px', borderRadius: 14, border: '1px solid rgba(180,150,100,0.16)', background: 'transparent', color: '#5E5474', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* Projects list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {projects.map(project => {
                const statusStyle = STATUS_COLORS[project.status] ?? STATUS_COLORS.active
                const priorityStyle = PRIORITY_STYLES[project.priority_level] ?? PRIORITY_STYLES.medium
                const StatusIcon = statusStyle.icon
                const openTasks = taskCounts[project.name] || 0
                const isExpanded = expanded === project.id

                return (
                  <div key={project.id} style={{ ...GLASS, overflow: 'hidden' }}>
                    <button onClick={() => setExpanded(isExpanded ? null : project.id)} style={{ width: '100%', padding: '16px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#100C1E' }}>{project.name}</p>
                            <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, textTransform: 'capitalize', background: priorityStyle.bg, color: priorityStyle.color }}>{project.priority_level}</span>
                          </div>
                          {project.description && <p style={{ fontSize: 12, color: '#5E5474', lineHeight: 1.4 }}>{project.description}</p>}
                          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: statusStyle.bg, color: statusStyle.color }}>
                              <StatusIcon className="h-3 w-3" /> {project.status.replace('_', ' ')}
                            </span>
                            {openTasks > 0 && (
                              <span style={{ padding: '3px 9px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: 'rgba(201,169,110,0.18)', color: '#8A6F2A' }}>
                                {openTasks} task{openTasks !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ color: '#8A8098', marginLeft: 10, marginTop: 2 }}>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div style={{ padding: '0 18px 18px', borderTop: '1px solid rgba(180,150,100,0.14)' }}>
                        {project.next_action && (
                          <div style={{ marginTop: 14, marginBottom: 12 }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: '#8A6F2A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Next action</p>
                            <p style={{ fontSize: 13, color: '#32284A' }}>{project.next_action}</p>
                          </div>
                        )}
                        {project.deadline && (
                          <p style={{ fontSize: 12, color: '#5E5474', marginBottom: 10 }}>
                            <span style={{ fontWeight: 600 }}>Due:</span> {new Date(project.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </p>
                        )}
                        {project.waiting_on && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                            <Clock className="h-3 w-3" style={{ color: '#5C4530', flexShrink: 0 }} />
                            <p style={{ fontSize: 12, color: '#8A6F2A' }}>Waiting on: {project.waiting_on}</p>
                          </div>
                        )}
                        {/* Status change */}
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 700, color: '#8A8098', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Update status</p>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {(['active', 'paused', 'on_hold', 'completed'] as Project['status'][]).map(s => (
                              <button key={s} onClick={() => updateProject(project.id, { status: s })} style={{ padding: '6px 12px', borderRadius: 10, fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', border: 'none', background: project.status === s ? STATUS_COLORS[s].bg : 'rgba(255,255,255,0.5)', color: project.status === s ? STATUS_COLORS[s].color : '#5E5474' }}>
                                {s.replace('_', ' ')}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </AppLayout>
    </div>
  )
}
