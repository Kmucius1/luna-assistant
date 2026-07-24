interface LunaErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
}

/** Gentle fallback for failed loads — no raw error text/stack traces surfaced to the user. */
export function LunaErrorState({ title = 'Something went sideways', message = 'Give it a moment and try again.', onRetry }: LunaErrorStateProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10, padding: '32px 16px' }}>
      <p style={{ fontSize: 15, fontWeight: 700, color: '#100C1E', margin: 0 }}>{title}</p>
      <p style={{ fontSize: 13, color: '#5E5474', margin: 0, maxWidth: 320 }}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-5 py-2 rounded-full text-sm font-semibold mt-1"
          style={{ background: 'rgba(201,169,110,0.16)', border: '1px solid rgba(201,169,110,0.35)', color: '#100C1E', cursor: 'pointer' }}
        >
          Try again
        </button>
      )}
    </div>
  )
}
