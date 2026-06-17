/**
 * Friendly inline error with an emoji, a message, and a retry button.
 */
export function ErrorState({
  emoji = '😕',
  message = 'Something went wrong. Please try again.',
  retryLabel = 'Try again',
  onRetry,
  darkMode = false,
}: {
  emoji?: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
  darkMode?: boolean;
}) {
  const fg = darkMode ? '#F8FAFF' : '#0F2554';
  const sub = darkMode ? 'rgba(255,255,255,0.75)' : '#6B7280';
  const bg = darkMode ? 'rgba(255,255,255,0.06)' : '#FFFFFF';
  const border = darkMode ? 'rgba(255,255,255,0.16)' : '#E5E7EB';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        padding: '40px 24px',
        textAlign: 'center',
        borderRadius: 20,
        background: bg,
        border: `1px solid ${border}`,
        color: fg,
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      <div style={{ fontSize: 48, lineHeight: 1 }} aria-hidden>
        {emoji}
      </div>
      <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: sub }}>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            padding: '12px 28px',
            borderRadius: 999,
            border: 'none',
            background: '#0AAFAA',
            color: '#FFFFFF',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 8px 20px rgba(10,175,170,0.28)',
          }}
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
