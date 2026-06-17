import { useEffect, useState } from 'react';
import { useFiasTheme } from '@fias/arche-sdk';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Optional email capture. Navy backdrop, a single email field, a teal
 * "yes" submit and a quiet "skip" button, plus a no-spam reassurance note.
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
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [touched, setTouched] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!theme) return null;

  const trimmed = email.trim();
  const isValid = EMAIL_PATTERN.test(trimmed);
  const showError = touched && trimmed.length > 0 && !isValid;

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
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        fontFamily: theme.fonts.body,
        color: '#FFFFFF',
      }}
    >
      <style>
        {`@keyframes emailFadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}
      </style>

      <div
        style={{
          width: '100%',
          maxWidth: 520,
          padding: 40,
          borderRadius: 24,
          background: 'rgba(255,255,255,0.12)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.25)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.25)',
          display: 'grid',
          gap: 24,
          animation: mounted ? 'emailFadeIn 0.7s ease forwards' : 'none',
          opacity: mounted ? 1 : 0,
        }}
      >
        <div style={{ display: 'grid', gap: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 44, lineHeight: 1 }} aria-hidden>
            📬
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>
            Want your plan in your inbox?
          </h1>
          <p style={{ margin: 0, fontSize: 15, opacity: 0.8, lineHeight: 1.65 }}>
            We’ll send your personalized career summary and gentle weekly nudges.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
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
              padding: '14px 16px',
              borderRadius: 12,
              border: `2px solid ${showError ? '#FCA5A5' : 'rgba(255,255,255,0.3)'}`,
              background: 'rgba(255,255,255,0.1)',
              color: '#FFFFFF',
              fontSize: 16,
              fontFamily: theme.fonts.body,
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 200ms ease, box-shadow 200ms ease',
            }}
            onFocus={(event) => {
              event.currentTarget.style.border = '2px solid #0AAFAA';
              event.currentTarget.style.boxShadow = '0 0 0 3px rgba(10,175,170,0.25)';
            }}
          />
          {showError && (
            <span style={{ fontSize: 13, color: '#FCA5A5' }}>
              Please enter a valid email address.
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid}
            style={{
              width: '100%',
              padding: '16px 32px',
              borderRadius: 50,
              border: 'none',
              background: '#0AAFAA',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: 17,
              cursor: isValid ? 'pointer' : 'not-allowed',
              opacity: isValid ? 1 : 0.55,
              boxShadow: '0 12px 30px rgba(10,175,170,0.4)',
              transition: 'transform 200ms ease, opacity 200ms ease',
            }}
          >
            Yes, send it to me →
          </button>
          <button
            type="button"
            onClick={onSkip}
            style={{
              width: '100%',
              padding: '14px 32px',
              borderRadius: 50,
              border: '1px solid rgba(255,255,255,0.35)',
              background: 'rgba(255,255,255,0.06)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            Skip for now
          </button>
        </div>

        <p style={{ margin: 0, fontSize: 12, opacity: 0.6, lineHeight: 1.6, textAlign: 'center' }}>
          We’ll never spam you or share your email. Unsubscribe in one click, any time.
        </p>
      </div>
    </div>
  );
}
