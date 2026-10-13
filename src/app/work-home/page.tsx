'use client'

import { BarChart3, Briefcase, Calendar, CheckSquare, CircleDollarSign, FileText, Inbox, Users } from 'lucide-react'
import { WorkspaceLauncher, type WorkspaceApp } from '@/components/workspaces/WorkspaceLauncher'

const apps: WorkspaceApp[] = [
  { title: 'Tasks', description: 'Open your priorities, due dates, and focused task list.', href: '/tasks', icon: CheckSquare, art: 'tasks' },
  { title: 'Calendar', description: 'See your schedule and open the time block you need.', href: '/calendar', icon: Calendar, art: 'calendar' },
  { title: 'Email', description: 'Review messages that need attention and reply in context.', href: '/email', icon: Inbox, art: 'mail' },
  { title: 'Money', description: 'Bills, safe-to-spend, statements, subscriptions, and alerts.', href: '/money', icon: CircleDollarSign, art: 'money' },
  { title: 'DRYP Hub', description: 'Open the team hub and active business operations.', href: '/dryp-hub', icon: Briefcase, art: 'crm' },
  { title: 'CRM', description: 'Clients, pipeline stages, follow-ups, and account health.', href: '/dryp-hub', icon: Users, art: 'crm' },
  { title: 'Reports', description: 'Review performance, progress, and business summaries.', href: '/work', icon: BarChart3, art: 'reports' },
  { title: 'Documents', description: 'Open statements, files, notes, and saved work materials.', href: '/work/notes', icon: FileText, art: 'documents' },
  { title: 'Contacts', description: 'People, clients, collaborators, and important details.', href: '/communications', icon: Users, art: 'contacts' },
]

export default function WorkHomePage() {
  return <WorkspaceLauncher eyebrow="Your Productivity Hub" title="Work" description="Choose the exact work app you need. Everything else stays out of view until you go back." apps={apps} theme="work" />
}
