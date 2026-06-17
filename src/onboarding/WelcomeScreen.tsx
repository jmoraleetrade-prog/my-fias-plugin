import { useEffect, useState } from 'react';
import { useFiasTheme } from '@fias/arche-sdk';

const BENEFITS = [
  'Land the job you actually want',
  "Earn what you're worth",
  "Build a career you're proud of",
];

/**
 * First screen. Full-viewport navy hero, centred, with a staggered fade-and-rise
 * for each element and a fixed teal gradient button pinned to the bottom edge.
 * If the user has earlier progress, the bottom button resumes it and a quiet
 * "Start again" link sits above.
 */
export function WelcomeScreen({
  onNext,
  onContinue,
  onRestart,
  hasResume,
}: {
  onNext: () => void;
  onHome: () => void;
  onContinue: () => void;
  onRestart: () => void;
  hasResume: boolean;
  onReset?: () => void;
}) {
  const theme = useFiasTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!theme) return null;

  // Each element fades and slides up in sequence, 100ms apart.
  const rise = (order: number) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(20px)',
    transition: `opacity 600ms ease ${order * 100}ms, transform 600ms ease ${order * 100}ms`,
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0F2554',
        fontFamily: theme.fonts.body,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 24px 96px',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Bolt with radial glow */}
      <div style={{ position: 'relative', display: 'grid', placeItems: 'center', ...rise(0) }}>
        <div
          style={{
            position: 'absolute',
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(10,175,170,0.15) 0%, transparent 70%)',
          }}
          aria-hidden
        />
        <span style={{ fontSize: 64, lineHeight: 1, color: '#0AAFAA', position: 'relative' }} aria-hidden>
          ⚡
        </span>
      </div>

      <h1
        style={{
          margin: '20px 0 0',
          fontSize: 52,
          fontWeight: 800,
          letterSpacing: '-2px',
          color: '#ffffff',
          lineHeight: 1,
          ...rise(1),
        }}
      >
        Elevate
      </h1>

      <p
        style={{
          margin: '12px 0 0',
          fontSize: 18,
          color: 'rgba(255,255,255,0.65)',
          maxWidth: 280,
          textAlign: 'center',
          lineHeight: 1.5,
          ...rise(2),
        }}
      >
        The career platform that gets you where you want to go
      </p>

      <div style={{ width: 48, height: 2, background: 'rgba(10,175,170,0.6)', margin: '32px 0', ...rise(3) }} />

      <div style={{ display: 'grid', gap: 16 }}>
        {BENEFITS.map((benefit, index) => (
          <div
            key={benefit}
            style={{ display: 'flex', alignItems: 'center', gap: 12, ...rise(4 + index) }}
          >
            <span
              style={{
                flexShrink: 0,
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: '#0AAFAA',
                color: '#0F2554',
                display: 'grid',
                placeItems: 'center',
                fontSize: 13,
                fontWeight: 800,
              }}
              aria-hidden
            >
              ✓
            </span>
            <span style={{ fontSize: 16, color: '#ffffff', fontWeight: 500 }}>{benefit}</span>
          </div>
        ))}
      </div>

      {hasResume ? (
        <button
          type="button"
          onClick={onRestart}
          style={{
            position: 'fixed',
            bottom: 80,
            left: 0,
            right: 0,
            margin: '0 auto',
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.6)',
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'underline',
            cursor: 'pointer',
            fontFamily: theme.fonts.body,
            ...rise(7),
          }}
        >
          Start again
        </button>
      ) : null}

      {/* Fixed bottom button */}
      <button
        type="button"
        onClick={hasResume ? onContinue : onNext}
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          height: 64,
          border: 'none',
          borderRadius: '20px 20px 0 0',
          background: 'linear-gradient(135deg, #0AAFAA, #0891B2)',
          color: '#ffffff',
          fontSize: 18,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: theme.fonts.body,
          boxShadow: '0 -8px 30px rgba(10,175,170,0.25)',
          ...rise(8),
        }}
      >
        {hasResume ? 'Pick up where you left off →' : 'Start my career journey →'}
      </button>
    </div>
  );
}
