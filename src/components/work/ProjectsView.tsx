'use client'

import { useEffect, useState } from 'react'

import styles from './WorkViews.module.css'

interface DrypAccount { id: string; business_name: string; health_status?: string; projects_count?: number }

function healthClass(status?: string): string {
  const key = (status ?? 'new').toLowerCase()
  if (key === 'at_risk') return styles.healthAt_risk
  if (key === 'churning') return styles.healthChurning
  if (key === 'excellent' || key === 'good') return styles.healthGood
  return styles.healthNew
}

function healthLabel(status?: string): string {
  if (!status) return 'New'
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase().slice(0, 4)
}

export function ProjectsView() {
  const [accounts, setAccounts] = useState<DrypAccount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dryp/accounts', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setAccounts(data.accounts ?? []))
      .catch(() => setAccounts([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <div className={styles.sectionHeader}>Active Projects</div>
      <div className={styles.card}>
        {loading ? (
          <div className={styles.emptyNote}>Loading…</div>
        ) : accounts.length === 0 ? (
          <div className={styles.emptyNote}>No active client projects right now.</div>
        ) : (
          accounts.map(acc => (
            <div key={acc.id} className={styles.projectRow}>
              <div className={styles.projectBadge}>{initials(acc.business_name)}</div>
              <div className={styles.projectBody}>
                <div className={styles.projectTop}>
                  <strong>{acc.business_name}</strong>
                  <span className={`${styles.healthBadge} ${healthClass(acc.health_status)}`}>{healthLabel(acc.health_status)}</span>
                </div>
                <div className={styles.projectMeta}>{acc.projects_count ?? 0} open project{acc.projects_count === 1 ? '' : 's'}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}
