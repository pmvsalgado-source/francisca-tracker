const F = "'Inter', system-ui, sans-serif"

export default function EmptyState({ icon = '📭', message, subMessage, t, compact = false, children }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: compact ? '20px 12px' : '48px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: compact ? '6px' : '10px',
      fontFamily: F,
    }}>
      <div style={{ fontSize: compact ? '22px' : '32px', lineHeight: 1 }}>{icon}</div>
      <div style={{ fontSize: compact ? '12px' : '14px', fontWeight: 600, color: t?.text || '#e2e8f0' }}>{message}</div>
      {subMessage && (
        <div style={{ fontSize: compact ? '11px' : '12px', color: t?.textMuted || '#94a3b8', lineHeight: 1.5, maxWidth: '280px' }}>
          {subMessage}
        </div>
      )}
      {children && <div style={{ marginTop: compact ? '4px' : '8px' }}>{children}</div>}
    </div>
  )
}
