import { useState } from 'react';
import { useFiasTheme } from '@fias/arche-sdk';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Optional email capture. Full-screen navy, a single frosted email field, a
 * primary button whose label adapts to whether an address has been entered,
 * and a quiet skip link below.
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
        padding: '24px 24px 120px',
        fontFamily: theme.fonts.body,
        color: '#ffffff',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <div style={{ fontSize: 48, lineHeight: 1 }} aria-hidden>
          📬
        </div>
        <h2 style={{ margin: '16px 0 0', fontSize: 24, fontWeight: 800, color: '#ffffff' }}>One last thing</h2>
        <p style={{ margin: '8px 0 24px', fontSize: 16, color: '#ffffff', opacity: 0.7, lineHeight: 1.6 }}>
          Want your personalized plan and gentle weekly nudges in your inbox?
        </p>

        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onBlur={() => setTouched(true)}
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
            border: `2px solid ${showError ? '#FCA5A5' : 'rgba(255,255,255,0.2)'}`,
            background: 'rgba(255,255,255,0.1)',
            color: '#ffffff',
            fontSize: 16,
            fontFamily: theme.fonts.body,
            outline: 'none',
            transition: 'border-color 200ms ease',
          }}
          onFocus={(event) => {
            event.currentTarget.style.border = '2px solid #0AAFAA';
          }}
        />
        {showError ? (
          <p style={{ margin: '8px 0 0', fontSize: 13, color: '#FCA5A5' }}>Please enter a valid email address.</p>
        ) : null}
      </div>

      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '12px 16px 20px', zIndex: 25, display: 'grid', gap: 12, justifyItems: 'center' }}>
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
          {hasInput ? 'Send me my plan →' : 'Add my email'}
        </button>
        <button
          type="button"
          onClick={onSkip}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#ffffff',
            opacity: 0.7,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            textDecoration: 'underline',
            fontFamily: theme.fonts.body,
          }}
        >
          Skip for now
        </button>
        <span style={{ fontSize: 12, color: '#ffffff', opacity: 0.5 }}>We’ll never spam you. Unsubscribe any time.</span>
      </div>
    </div>
  );
}
