import { useEffect, useState } from 'react';
import { useFiasTheme } from '@fias/arche-sdk';
import { BRAND } from './onboardingData';
import { OnboardingShell } from './OnboardingShell';

export function AISummaryDisplay({ summary, onNext, onHome, onBack, onReset }: { summary: string; onNext: () => void; onHome: () => void; onBack: () => void; onReset?: () => void }) {
  const theme = useFiasTheme();
  const [mounted, setMounted] = useState(false);
  if (!theme) return null;

  useEffect(() => setMounted(true), []);

  const lines = summary.split('\n').filter(Boolean);
  const insight = lines[0] || 'A tailored insight based on your goals and experience.';
  const action = lines[1] || 'Start by focusing on the most specific next step that moves your main priority forward.';

  return (
    <OnboardingShell onHome={onHome} onBack={onBack} onReset={onReset}>
      <div
        style={{
          minHeight: '100vh',
          width: '100%',
          padding: theme.spacing.xl,
          backgroundColor: BRAND.canvas,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: theme.fonts.body,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '44rem',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 320ms ease, transform 320ms ease',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: theme.fonts.heading,
              fontSize: 'clamp(2.25rem, 4vw, 3rem)',
              letterSpacing: '-0.05em',
              lineHeight: 1.05,
              color: BRAND.navy,
            }}
          >
            Here’s what Elevate sees for you.
          </h2>

          <div
            style={{
              marginTop: theme.spacing.lg,
              padding: theme.spacing.lg,
              borderRadius: theme.components.cardRadius,
              backgroundColor: BRAND.surface,
              border: `1px solid ${BRAND.border}`,
              boxShadow: BRAND.shadow,
              lineHeight: 1.8,
              fontSize: '1rem',
            }}
          >
            {lines.map((line, index) => (
              <p key={index} style={{ margin: index === 0 ? 0 : `${theme.spacing.md} 0 0`, color: BRAND.text }}>
                {line}
              </p>
            ))}
          </div>

          <div
            style={{
              marginTop: theme.spacing.lg,
              padding: theme.spacing.lg,
              borderRadius: theme.components.cardRadius,
              backgroundColor: 'rgba(10,175,170,0.12)',
              color: BRAND.navy,
              boxShadow: '0 30px 70px rgba(10, 175, 170, 0.18)',
            }}
          >
            <strong style={{ display: 'block', marginBottom: theme.spacing.sm, letterSpacing: '0.02em' }}>
              Key insight
            </strong>
            <p style={{ margin: 0, lineHeight: 1.6 }}>{insight}</p>
          </div>

          <div
            style={{
              marginTop: theme.spacing.lg,
              padding: theme.spacing.lg,
              borderRadius: theme.components.cardRadius,
              backgroundColor: BRAND.surface,
              border: `1px solid ${BRAND.border}`,
              boxShadow: BRAND.shadow,
            }}
          >
            <strong style={{ display: 'block', marginBottom: theme.spacing.sm, letterSpacing: '0.02em' }}>
              First action
            </strong>
            <p style={{ margin: 0, lineHeight: 1.6, color: BRAND.text }}>{action}</p>
          </div>

          <button
            type="button"
            onClick={onNext}
            style={{
              marginTop: theme.spacing.xl,
              width: '100%',
              padding: `${theme.spacing.md} 0`,
              fontFamily: theme.fonts.body,
              fontSize: '1rem',
              fontWeight: 700,
              color: BRAND.white,
              backgroundColor: BRAND.teal,
              border: 'none',
              borderRadius: '999px',
              cursor: 'pointer',
              boxShadow: '0 20px 40px rgba(10, 175, 170, 0.28)',
              transition: 'transform 300ms ease, box-shadow 300ms ease',
            }}
            onMouseEnter={(event) => {
              (event.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(event) => {
              (event.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </OnboardingShell>
  );
}
