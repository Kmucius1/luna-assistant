interface LunaEmptyStateProps {
  icon?: React.ReactNode
  title: string
  message?: string
  action?: React.ReactNode
}

export function LunaEmptyState({ icon, title, message, action }: LunaEmptyStateProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8, padding: '32px 16px' }}>
      {icon && <div style={{ color: 'var(--luna-purple-2)', opacity: 0.7 }}>{icon}</div>}
      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--luna-text)', margin: 0 }}>{title}</p>
      {message && <p style={{ fontSize: 13, color: 'var(--luna-muted)', margin: 0, maxWidth: 320 }}>{message}</p>}
      {action}
    </div>
  )
}
