import { useEffect, useState } from 'react';
import { useFiasTheme } from '@fias/arche-sdk';

const POINTS = [
  'Your data is yours — we never sell it or share it with advertisers.',
  'We only use what you tell us to personalize your career plan.',
  'You can export or permanently delete everything at any time.',
];

/**
 * GDPR / privacy consent gate. Navy backdrop, frosted-glass card, three
 * teal-tick assurances, and a single teal CTA. A short terms note sits below.
 */
export function GdprConsent({
  onAccept,
  ctaLabel = 'I agree — let’s begin',
  termsNote = 'By continuing you agree to our Terms of Service and Privacy Policy. You can withdraw consent at any time from settings.',
}: {
  onAccept: () => void;
  ctaLabel?: string;
  termsNote?: string;
}) {
  const theme = useFiasTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!theme) return null;

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
        {`@keyframes gdprFadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}
      </style>

      <div
        style={{
          width: '100%',
          maxWidth: 560,
          padding: 40,
          borderRadius: 24,
          background: 'rgba(255,255,255,0.12)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.25)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.25)',
          display: 'grid',
          gap: 28,
          animation: mounted ? 'gdprFadeIn 0.7s ease forwards' : 'none',
          opacity: mounted ? 1 : 0,
        }}
      >
        <div style={{ display: 'grid', gap: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 44, lineHeight: 1 }} aria-hidden>
            🔒
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>
            Your privacy comes first
          </h1>
          <p style={{ margin: 0, fontSize: 15, opacity: 0.8, lineHeight: 1.65 }}>
            Before we start, here’s exactly how Elevate handles your information.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          {POINTS.map((point) => (
            <div key={point} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span
                style={{
                  flexShrink: 0,
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: '#0AAFAA',
                  color: '#FFFFFF',
                  display: 'inline-grid',
                  placeItems: 'center',
                  fontSize: 14,
                  fontWeight: 800,
                  boxShadow: '0 4px 12px rgba(10,175,170,0.4)',
                }}
                aria-hidden
              >
                ✓
              </span>
              <span style={{ fontSize: 15, lineHeight: 1.6, color: '#FFFFFF' }}>{point}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onAccept}
          style={{
            width: '100%',
            padding: '16px 32px',
            borderRadius: 50,
            border: 'none',
            background: '#0AAFAA',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: 17,
            cursor: 'pointer',
            boxShadow: '0 12px 30px rgba(10,175,170,0.4)',
            transition: 'transform 200ms ease',
          }}
          onMouseEnter={(event) => {
            (event.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(event) => {
            (event.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
          }}
        >
          {ctaLabel}
        </button>

        <p style={{ margin: 0, fontSize: 12, opacity: 0.6, lineHeight: 1.6, textAlign: 'center' }}>
          {termsNote}
        </p>
      </div>
    </div>
  );
}
