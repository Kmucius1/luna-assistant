interface LunaLoadingStateProps {
  message?: string
  compact?: boolean
}

export function LunaLoadingState({ message = 'Loading…', compact }: LunaLoadingStateProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8,
      padding: compact ? '12px 8px' : '32px 16px',
    }}>
      <div style={{ display: 'flex', gap: 5 }}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--luna-purple-2)',
              animation: `breathe 1.1s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>
      {!compact && <p style={{ fontSize: 13, color: 'var(--luna-muted)', margin: 0 }}>{message}</p>}
    </div>
  )
}
