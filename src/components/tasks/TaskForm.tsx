'use client'
import { useState } from 'react'
import { Task, TaskCategory, UrgencyLevel } from '@/types'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { calculatePriorityScore } from '@/lib/priority'

// Ad-Vantage is old business — not offered for new tasks (still a valid
// TaskCategory value so any already-tagged task still renders correctly).
const CATEGORIES: TaskCategory[] = [
  'EHM Strategies', 'DRYP Digital', 'DRYP Studio',
  'Client Websites', 'Social Media', 'School', 'Personal', 'Health',
  'Content Creation', 'Modeling', 'Tattooing', 'Painting', 'Fashion',
  'Events', 'Follow-ups', 'Money / Invoices',
  'Urgent Fixes', 'Linked Up'
]

const PROJECTS = [
  'EHM Strategies', 'DRYP Studio', 'DRYP Digital',
  'Hoover Digital', 'Babe Coffee Lounge', "Flanagan's Irish Pub",
  'Villa Residential', 'Linked Up', 'School', 'Personal'
]

interface TaskFormProps {
  onSubmit: (task: Partial<Task>) => Promise<void>
  onCancel?: () => void
  initialValues?: Partial<Task>
}

export function TaskForm({ onSubmit, onCancel, initialValues }: TaskFormProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: initialValues?.title || '',
    description: initialValues?.description || '',
    category: initialValues?.category || 'DRYP Digital' as TaskCategory,
    project: initialValues?.project || '',
    due_date: initialValues?.due_date || '',
    urgency_level: initialValues?.urgency_level || 'medium' as UrgencyLevel,
    money_impact: initialValues?.money_impact || 0,
    emotional_weight: initialValues?.emotional_weight || 5,
    estimated_minutes: initialValues?.estimated_minutes || 30,
    status: initialValues?.status || 'todo' as Task['status'],
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setLoading(true)
    try {
      const priorityScore = calculatePriorityScore({
        urgency_level: form.urgency_level,
        due_date: form.due_date || undefined,
        money_impact: form.money_impact,
        emotional_weight: form.emotional_weight,
        estimated_minutes: form.estimated_minutes,
        category: form.category,
        project: form.project || undefined,
      })
      await onSubmit({ ...form, priority_score: priorityScore, source: 'manual' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Task title *"
        placeholder="What needs to get done?"
        value={form.title}
        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        required
      />

      <Textarea
        label="Description"
        placeholder="Any extra context..."
        value={form.description}
        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        rows={2}
      />

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Category"
          value={form.category}
          onChange={e => setForm(f => ({ ...f, category: e.target.value as TaskCategory }))}
          options={CATEGORIES.map(c => ({ value: c, label: c }))}
        />
        <Select
          label="Project"
          value={form.project}
          onChange={e => setForm(f => ({ ...f, project: e.target.value }))}
          placeholder="— pick project —"
          options={PROJECTS.map(p => ({ value: p, label: p }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Due date"
          type="date"
          value={form.due_date}
          onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
        />
        <Select
          label="Urgency"
          value={form.urgency_level}
          onChange={e => setForm(f => ({ ...f, urgency_level: e.target.value as UrgencyLevel }))}
          options={[
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
            { value: 'critical', label: 'Critical' },
          ]}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Input
          label="Time (mins)"
          type="number"
          min={1}
          value={form.estimated_minutes}
          onChange={e => setForm(f => ({ ...f, estimated_minutes: parseInt(e.target.value) || 0 }))}
        />
        <Input
          label="Money impact"
          type="number"
          min={0}
          max={100}
          placeholder="0–100"
          value={form.money_impact}
          onChange={e => setForm(f => ({ ...f, money_impact: parseInt(e.target.value) || 0 }))}
        />
        <Input
          label="Emotional weight"
          type="number"
          min={1}
          max={10}
          placeholder="1–10"
          value={form.emotional_weight}
          onChange={e => setForm(f => ({ ...f, emotional_weight: parseInt(e.target.value) || 5 }))}
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" loading={loading} className="flex-1">
          {initialValues?.id ? 'Update task' : 'Add task'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
