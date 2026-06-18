import { ReactNode } from 'react';
import { useFiasTheme } from '@fias/arche-sdk';
import { SettingsDropdown } from './SettingsDropdown';
import { AI_LABEL, AI_LABEL_STYLE, SALARY_NOTE } from '../../utils/elevate';

export type { FeatureProps } from '../../utils/elevate';

/**
 * The standard chrome for every full-screen Elevate feature:
 *  - animated #f0f4ff↔#f8fafc gradient background
 *  - navy 56px header with ⚡ Elevate, a pill back button, 🏠 home, and ⚙️ menu
 *  - a scroll-safe content area capped to a readable width
 *  - an optional fixed bottom CTA bar (pass `footer`)
 *
 * Built to match the working onboarding design language exactly.
 */
export function ScreenShell({
  title,
  onBack,
  onHome,
  onNavigate,
  children,
  footer,
  maxWidth = 720,
  pad = true,
}: {
  title?: string;
  onBack?: () => void;
  onHome: () => void;
  onNavigate?: (screen: string) => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: number;
  pad?: boolean;
}) {
  const theme = useFiasTheme();
  if (!theme) return null;

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        position: 'relative',
        fontFamily: theme.fonts.body,
        background: 'linear-gradient(-45deg, #f0f4ff, #f8fafc, #f0f4ff, #f8fafc)',
        backgroundSize: '400% 400%',
        animation: 'elvGradientShift 8s ease infinite',
        color: '#374151',
      }}
    >
      <style>
        {`@keyframes elvGradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
          @keyframes elvFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes elvFadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}
      </style>

      {/* Navy header */}
      <header
        style={{
          height: 56,
          background: '#0F2554',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 10,
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 50,
              padding: '8px 14px',
              minHeight: 36,
              fontSize: 13,
              fontWeight: 600,
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            ← Back
          </button>
        ) : (
          <>
            <span style={{ fontSize: 20, color: '#0AAFAA', lineHeight: 1 }} aria-hidden>
              ⚡
            </span>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#ffffff' }}>Elevate</span>
          </>
        )}

        {title ? (
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: '#ffffff',
              marginLeft: onBack ? 8 : 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </span>
        ) : null}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            type="button"
            onClick={onHome}
            aria-label="Home"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: 20,
              lineHeight: 1,
              cursor: 'pointer',
              width: 44,
              height: 44,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            🏠
          </button>
          <SettingsDropdown onNavigate={onNavigate} />
        </div>
      </header>

      <main
        style={{
          width: '100%',
          maxWidth,
          margin: '0 auto',
          padding: pad ? '20px 16px' : 0,
          paddingBottom: footer ? 120 : 32,
          boxSizing: 'border-box',
          animation: 'elvFadeIn 300ms ease',
        }}
      >
        {children}
      </main>

      {footer ? (
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            padding: '12px 16px 20px',
            background: 'linear-gradient(180deg, rgba(248,250,252,0) 0%, rgba(248,250,252,0.96) 45%)',
            zIndex: 40,
            animation: 'elvFadeUp 300ms ease',
          }}
        >
          <div style={{ maxWidth, margin: '0 auto' }}>{footer}</div>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small reusable bits used across every feature
// ---------------------------------------------------------------------------

/** A white card matching the design language. */
export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: 20,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        padding: 20,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** The mandatory teal-gradient CTA button. */
export function CTAButton({
  label,
  onClick,
  disabled,
  type = 'button',
  style,
}: {
  label: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  style?: React.CSSProperties;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        minHeight: 54,
        background: disabled ? '#cbd5e1' : 'linear-gradient(135deg, #0AAFAA, #0891B2)',
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 700,
        borderRadius: 50,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: disabled ? 'none' : '0 4px 20px rgba(10,175,170,0.35)',
        ...style,
      }}
    >
      {label}
    </button>
  );
}

/** The mandatory AI-transparency label. */
export function AILabel({ style }: { style?: React.CSSProperties }) {
  return <div style={{ ...AI_LABEL_STYLE, ...style }}>{AI_LABEL}</div>;
}

/** The mandatory salary-verification note. */
export function SalaryNote({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      style={{
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 6,
        fontStyle: 'italic',
        lineHeight: 1.4,
        ...style,
      }}
    >
      {SALARY_NOTE}
    </div>
  );
}

/** A themed text input matching the design language. */
export function TextField(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        minHeight: 48,
        padding: '12px 14px',
        borderRadius: 12,
        border: '2px solid #e2e8f0',
        fontSize: 16,
        outline: 'none',
        color: '#374151',
        background: '#ffffff',
        ...props.style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.border = '2px solid #0AAFAA';
        e.currentTarget.style.boxShadow = '0 0 0 4px rgba(10,175,170,0.15)';
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.border = '2px solid #e2e8f0';
        e.currentTarget.style.boxShadow = 'none';
        props.onBlur?.(e);
      }}
    />
  );
}

/** A themed textarea matching the design language. */
export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        minHeight: 120,
        padding: '12px 14px',
        borderRadius: 12,
        border: '2px solid #e2e8f0',
        fontSize: 16,
        outline: 'none',
        color: '#374151',
        background: '#ffffff',
        resize: 'vertical',
        fontFamily: 'inherit',
        ...props.style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.border = '2px solid #0AAFAA';
        e.currentTarget.style.boxShadow = '0 0 0 4px rgba(10,175,170,0.15)';
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.border = '2px solid #e2e8f0';
        e.currentTarget.style.boxShadow = 'none';
        props.onBlur?.(e);
      }}
    />
  );
}
