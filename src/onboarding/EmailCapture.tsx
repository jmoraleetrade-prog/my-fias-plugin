import { useState } from 'react';
import { useFiasTheme } from '@fias/arche-sdk';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Optional email capture. Full-screen navy, a single glass email field, a teal
 * button whose label adapts to whether an address has been entered, and a quiet
 * skip link below.
 */
export function EmailCapture({
  onSubmit,
  onSkip,
  initialEmail = '',
}: {
  onSubmit: (email: string) => void;
  onSkip: () => void;
  initialEmail?: string;
}) {
  const theme = useFiasTheme();
  const [email, setEmail] = useState(initialEmail);
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);

  if (!theme) return null;

  const trimmed = email.trim();
  const hasInput = trimmed.length > 0;
  const isValid = EMAIL_PATTERN.test(trimmed);
  const showError = touched && hasInput && !isValid;

  const handleSubmit = () => {
    setTouched(true);
    if (!isValid) return;
    onSubmit(trimmed);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: '#0F2554',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 24px 140px',
        fontFamily: theme.fonts.body,
        color: '#ffffff',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <div style={{ fontSize: 48, lineHeight: 1 }} aria-hidden>
          📧
        </div>
        <h2 style={{ margin: '16px 0 0', fontSize: 24, fontWeight: 800, color: '#ffffff' }}>One last thing</h2>
        <p style={{ margin: '8px 0 24px', fontSize: 16, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
          Want tips and updates from Elevate by email?
        </p>

        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setTouched(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleSubmit();
          }}
          placeholder="you@example.com"
          autoComplete="email"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            height: 56,
            padding: '0 20px',
            borderRadius: 16,
            border: `2px solid ${showError ? '#FCA5A5' : focused ? '#0AAFAA' : 'rgba(255,255,255,0.2)'}`,
            background: 'rgba(255,255,255,0.1)',
            color: '#ffffff',
            fontSize: 16,
            fontFamily: theme.fonts.body,
            outline: 'none',
            boxShadow: focused ? '0 0 0 4px rgba(10,175,170,0.2)' : 'none',
            transition: 'border-color 200ms ease, box-shadow 200ms ease',
          }}
        />
        {showError ? (
          <p style={{ margin: '8px 0 0', fontSize: 13, color: '#FCA5A5' }}>Please enter a valid email address.</p>
        ) : (
          <p style={{ margin: '12px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
            We'll never spam you. Unsubscribe any time.
          </p>
        )}
      </div>

      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '12px 16px 20px', zIndex: 25, display: 'grid', gap: 14, justifyItems: 'center' }}>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={hasInput && !isValid}
          style={{
            width: '100%',
            maxWidth: 460,
            height: 54,
            background: 'linear-gradient(135deg, #0AAFAA, #0891B2)',
            color: '#ffffff',
            fontSize: 16,
            fontWeight: 700,
            borderRadius: 50,
            border: 'none',
            cursor: hasInput && !isValid ? 'not-allowed' : 'pointer',
            opacity: hasInput && !isValid ? 0.6 : 1,
            boxShadow: '0 4px 20px rgba(10,175,170,0.35)',
            transition: 'opacity 200ms ease',
          }}
        >
          {hasInput ? 'Sign me up →' : 'Keep me posted'}
        </button>
        <button
          type="button"
          onClick={onSkip}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.7)',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            textDecoration: 'underline',
            fontFamily: theme.fonts.body,
          }}
        >
          No thanks, take me in
        </button>
      </div>
    </div>
  );
}
