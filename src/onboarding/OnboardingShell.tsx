import { ReactNode } from 'react';
import { useFiasTheme } from '@fias/arche-sdk';
import { BRAND } from './onboardingData';

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11.5L12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z" />
  </svg>
);

export function OnboardingShell({
  children,
  onHome,
  onBack,
  onReset,
  showBack = true,
}: {
  children: ReactNode;
  onHome: () => void;
  onBack?: () => void;
  onReset?: () => void;
  showBack?: boolean;
}) {
  const theme = useFiasTheme();
  if (!theme) return null;

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: BRAND.canvas,
        fontFamily: theme.fonts.body,
        color: BRAND.text,
      }}
    >
      <div
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: theme.spacing.md,
            paddingTop: `calc(${theme.spacing.md} + 0.5rem)`,
            gap: theme.spacing.sm,
          }}
        >
          {showBack && onBack ? (
            <button
              type="button"
              onClick={onBack}
              style={{
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                color: '#6B7280',
                padding: '10px 14px',
                borderRadius: '999px',
                cursor: 'pointer',
                fontFamily: theme.fonts.body,
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              ← Back
            </button>
          ) : (
            <div style={{ width: '5.5rem' }} />
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
            {onReset ? (
              <button
                type="button"
                onClick={onReset}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: BRAND.muted,
                  cursor: 'pointer',
                  fontFamily: theme.fonts.body,
                  fontSize: '0.95rem',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                Reset
              </button>
            ) : null}
            <button
              type="button"
              onClick={onHome}
              style={{
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                color: '#6B7280',
                padding: '10px 14px',
                borderRadius: '999px',
                cursor: 'pointer',
                fontFamily: theme.fonts.body,
                fontSize: '13px',
                fontWeight: 600,
              }}
              aria-label="Home"
            >
              🏠
            </button>
          </div>
        </header>

        <main style={{ flex: 1, width: '100%', position: 'relative' }}>{children}</main>
      </div>
    </div>
  );
}
