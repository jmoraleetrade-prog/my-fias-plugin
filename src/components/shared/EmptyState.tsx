/**
 * Empty-state placeholder: an emoji, a heading, supporting copy, a primary
 * CTA, and an optional secondary CTA.
 */
export function EmptyState({
  emoji = '✨',
  heading,
  message,
  ctaLabel,
  onCta,
  secondaryLabel,
  onSecondary,
  darkMode = false,
}: {
  emoji?: string;
  heading: string;
  message?: string;
  ctaLabel?: string;
  onCta?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  darkMode?: boolean;
}) {
  const fg = darkMode ? '#F8FAFF' : '#0F2554';
  const sub = darkMode ? 'rgba(255,255,255,0.75)' : '#6B7280';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: '48px 24px',
        textAlign: 'center',
        color: fg,
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      <div style={{ fontSize: 52, lineHeight: 1 }} aria-hidden>
        {emoji}
      </div>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1.25 }}>{heading}</h2>
      {message && (
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: sub, maxWidth: 380 }}>
          {message}
        </p>
      )}

      {(ctaLabel || secondaryLabel) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8, width: 'min(320px, 100%)' }}>
          {ctaLabel && onCta && (
            <button
              type="button"
              onClick={onCta}
              style={{
                padding: '13px 28px',
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
              {ctaLabel}
            </button>
          )}
          {secondaryLabel && onSecondary && (
            <button
              type="button"
              onClick={onSecondary}
              style={{
                padding: '13px 28px',
                borderRadius: 999,
                border: `1px solid ${darkMode ? 'rgba(255,255,255,0.3)' : '#E5E7EB'}`,
                background: 'transparent',
                color: fg,
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
