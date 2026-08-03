'use client'

import { useEffect, useState } from 'react'
import { FolderPlus } from 'lucide-react'

import { BottomSheet } from '@/components/ui/BottomSheet'
import styles from './WorkViews.module.css'

interface DrypAccount { id: string; business_name: string }

interface NewProjectSheetProps {
  isOpen: boolean
  onClose: () => void
}

export function NewProjectSheet({ isOpen, onClose }: NewProjectSheetProps) {
  const [accounts, setAccounts] = useState<DrypAccount[]>([])
  const [accountId, setAccountId] = useState('')
  const [name, setName] = useState('')
  const [projectType, setProjectType] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setDone(false)
    setError(null)
    fetch('/api/dryp/accounts', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setAccounts(data.accounts ?? []))
      .catch(() => setAccounts([]))
  }, [isOpen])

  async function submit() {
    if (!accountId || !name.trim()) {
      setError('Pick a client and give the project a name.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/dryp/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId, name: name.trim(), project_type: projectType.trim() || undefined, due_date: dueDate || undefined }),
      })
      if (!res.ok) throw new Error()
      setDone(true)
      setName(''); setProjectType(''); setDueDate(''); setAccountId('')
    } catch {
      setError("Couldn't create that project — try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="New Project" subtitle="Kick off a new project for a client" height="70vh">
      {done ? (
        <p className={styles.sheetMsg}>Project created — find it under the Projects tab.</p>
      ) : (
        <>
          <label className={styles.sheetLabel}>Client</label>
          <select className={styles.sheetSelect} value={accountId} onChange={e => setAccountId(e.target.value)}>
            <option value="">Select a client…</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.business_name}</option>)}
          </select>

          <label className={styles.sheetLabel}>Project name</label>
          <input className={styles.sheetInput} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Website Redesign" />

          <label className={styles.sheetLabel}>Project type (optional)</label>
          <input className={styles.sheetInput} value={projectType} onChange={e => setProjectType(e.target.value)} placeholder="e.g. Website, Branding, CRM" />

          <label className={styles.sheetLabel}>Due date (optional)</label>
          <input className={styles.sheetInput} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />

          <button type="button" className={styles.sheetSubmit} onClick={submit} disabled={saving}>
            <FolderPlus size={14} /> {saving ? 'Creating…' : 'Create Project'}
          </button>
          {error && <p className={styles.sheetErrorMsg}>{error}</p>}
        </>
      )}
    </BottomSheet>
  )
}
