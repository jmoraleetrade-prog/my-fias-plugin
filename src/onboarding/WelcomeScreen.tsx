import { useEffect, useState } from 'react';
import { useFiasTheme } from '@fias/arche-sdk';
import { BRAND } from './onboardingData';
import { OnboardingShell } from './OnboardingShell';

const BENEFITS = [
  'Land the job you actually want',
  'Earn what you’re worth',
  'Build a career you’re proud of',
];

export function WelcomeScreen({
  onNext,
  onHome,
  onContinue,
  onRestart,
  hasResume,
  onReset,
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
    setMounted(true);
  }, []);

  if (!theme) return null;

  return (
    <OnboardingShell onHome={onHome} showBack={false} onReset={onReset}>
      <div
        style={{
          minHeight: '100vh',
          width: '100%',
          padding: 0,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: theme.fonts.body,
          color: '#fff',
        }}
      >
        <style>
          {`@keyframes fadeInCard { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes buttonPop { from { transform: translateY(8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          `}
        </style>

        <div
          style={{
            width: '100%',
            maxWidth: 620,
            padding: '48px',
            borderRadius: 24,
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.3)',
            boxShadow: '0 40px 80px rgba(0,0,0,0.18)',
            display: 'grid',
            gap: '28px',
            animation: mounted ? 'fadeInCard 0.8s ease forwards' : 'none',
            opacity: mounted ? 1 : 0,
          }}
        >
          <div style={{ display: 'grid', gap: '18px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, lineHeight: 1 }}>{'🚀'}</div>
            <h1
              style={{
                margin: 0,
                fontSize: 48,
                fontWeight: 800,
                letterSpacing: '-1px',
                color: '#ffffff',
              }}
            >
              Elevate
            </h1>
            <p style={{ margin: 0, fontSize: 18, opacity: 0.8, lineHeight: 1.7 }}>
              The premium career coaching experience built to help high performers move faster.
            </p>
          </div>

          <div style={{ display: 'grid', gap: '14px' }}>
            {BENEFITS.map((benefit) => (
              <div key={benefit} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 600, color: '#ffffff' }}>
                <span style={{ minWidth: 24, display: 'inline-grid', placeItems: 'center' }}>✅</span>
                <span>{benefit}</span>
              </div>
            ))}
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.2)', borderRadius: 999 }} />

          {hasResume ? (
            <div style={{ display: 'grid', gap: '16px' }}>
              <button
                type="button"
                onClick={onContinue}
                style={{
                  width: '100%',
                  padding: '16px 32px',
                  borderRadius: 50,
                  border: 'none',
                  background: '#ffffff',
                  color: '#667eea',
                  fontWeight: 700,
                  fontSize: 18,
                  cursor: 'pointer',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                  animation: 'buttonPop 0.5s ease',
                }}
              >
                Continue where you left off
              </button>
              <button
                type="button"
                onClick={onRestart}
                style={{
                  width: '100%',
                  padding: '16px 32px',
                  borderRadius: 50,
                  border: '1px solid rgba(255,255,255,0.35)',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: 18,
                  cursor: 'pointer',
                  animation: 'buttonPop 0.55s ease',
                }}
              >
                Start again
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onNext}
              style={{
                width: '100%',
                padding: '16px 32px',
                borderRadius: 50,
                border: 'none',
                background: '#ffffff',
                color: '#667eea',
                fontWeight: 700,
                fontSize: 18,
                cursor: 'pointer',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                animation: 'buttonPop 0.5s ease',
              }}
              onMouseEnter={(event) => {
                (event.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(event) => {
                (event.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              }}
            >
              Start my career journey →
            </button>
          )}
        </div>
      </div>
    </OnboardingShell>
  );
}
