import { useEffect, useState } from 'react';
import { useFiasTheme } from '@fias/arche-sdk';
import { BRAND } from './onboardingData';
import { OnboardingShell } from './OnboardingShell';

const getBandDescription = (score: number) => {
  if (score >= 80) return 'You’re already building strong momentum — now let’s turn it into visible progress.';
  if (score >= 60) return 'You have the foundation; a few smart moves will accelerate your path.';
  if (score >= 40) return 'A focused plan can bring clarity and more consistent forward motion.';
  return 'We’ll help you turn this starting point into the momentum you want.';
};

export function VelocityScoreReveal({ onNext, onHome, onBack, onReset }: { onNext: () => void; onHome: () => void; onBack: () => void; onReset?: () => void }) {
  const theme = useFiasTheme();
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const target = 74;
    const interval = setInterval(() => {
      setScore((current) => {
        if (current >= target) {
          clearInterval(interval);
          setFinished(true);
          return target;
        }
        return current + 1;
      });
    }, 20);
    return () => clearInterval(interval);
  }, []);

  if (!theme) return null;

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
            maxWidth: '36rem',
            textAlign: 'center',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 320ms ease, transform 320ms ease',
          }}
        >
          <p style={{ margin: 0, opacity: 0.8, letterSpacing: '0.05em', textTransform: 'uppercase', color: BRAND.muted }}>
            This is your starting point — not a verdict on you.
          </p>
          <div
            style={{
              marginTop: theme.spacing.lg,
              padding: theme.spacing.xl,
              borderRadius: theme.components.cardRadius,
              backgroundColor: BRAND.surface,
              border: `1px solid ${BRAND.border}`,
              boxShadow: BRAND.shadow,
            }}
          >
            <div style={{ fontSize: '5.5rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.07em', color: BRAND.navy }}>
              {score}%
            </div>
            <p style={{ margin: theme.spacing.sm + ' 0 0', opacity: 0.9, fontSize: '1rem', color: BRAND.text }}>
              Velocity score
            </p>
          </div>

          <p style={{ marginTop: theme.spacing.lg, lineHeight: 1.8, fontSize: '1rem', opacity: 0.92, color: BRAND.text }}>
            {getBandDescription(score)}
          </p>

          <button
            type="button"
            onClick={onNext}
            disabled={!finished}
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
              cursor: finished ? 'pointer' : 'not-allowed',
              opacity: finished ? 1 : 0.6,
              boxShadow: finished ? '0 20px 40px rgba(10, 175, 170, 0.28)' : 'none',
              transition: 'transform 300ms ease, box-shadow 300ms ease',
            }}
            onMouseEnter={(event) => {
              if (finished) (event.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(event) => {
              (event.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            }}
          >
            Go to my dashboard →
          </button>
        </div>
      </div>
    </OnboardingShell>
  );
}
