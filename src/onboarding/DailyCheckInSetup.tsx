import { useEffect, useState } from 'react';
import { usePersistentState, useFiasTheme } from '@fias/arche-sdk';
import { BRAND } from './onboardingData';
import { OnboardingShell } from './OnboardingShell';

const TIMES = ['8am', '9am', '12pm', '5pm', '8pm', "I'll set this later"];

export function DailyCheckInSetup({ onNext, onHome, onBack, onReset }: { onNext: () => void; onHome: () => void; onBack: () => void; onReset?: () => void }) {
  const theme = useFiasTheme();
  const [mounted, setMounted] = useState(false);
  const [selectedTime, setSelectedTime] = usePersistentState<string | null>('daily-checkin-time', null);

  useEffect(() => setMounted(true), []);

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
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 320ms ease, transform 320ms ease',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: theme.fonts.heading,
              fontSize: 'clamp(2.25rem, 4vw, 3.25rem)',
              letterSpacing: '-0.05em',
              lineHeight: 1.05,
              color: BRAND.navy,
            }}
          >
            When would you like Elevate to check in with you each day?
          </h2>

          <div style={{ display: 'grid', gap: theme.spacing.md, marginTop: theme.spacing.lg }}>
            {TIMES.map((time) => {
              const active = selectedTime === time;
              return (
                <button
                  key={time}
                  type="button"
                  onClick={() => setSelectedTime(time)}
                  style={{
                    width: '100%',
                    padding: theme.spacing.lg,
                    borderRadius: theme.components.cardRadius,
                    border: active ? `1px solid ${BRAND.teal}` : `1px solid ${BRAND.border}`,
                    backgroundColor: active ? 'rgba(10,175,170,0.14)' : BRAND.surface,
                    color: BRAND.text,
                    cursor: 'pointer',
                    textAlign: 'left',
                    boxShadow: active ? '0 16px 35px rgba(10,175,170,0.16)' : BRAND.shadow,
                    fontFamily: theme.fonts.body,
                    fontSize: '1rem',
                    transition: 'transform 200ms ease, box-shadow 200ms ease, background-color 200ms ease, border-color 200ms ease',
                  }}
                  onMouseEnter={(event) => {
                    (event.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(event) => {
                    (event.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                  }}
                >
                  {time}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onNext}
            disabled={!selectedTime}
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
              cursor: selectedTime ? 'pointer' : 'not-allowed',
              opacity: selectedTime ? 1 : 0.55,
              boxShadow: selectedTime ? '0 20px 40px rgba(10, 175, 170, 0.28)' : 'none',
              transition: 'transform 200ms ease, box-shadow 200ms ease',
            }}
            onMouseEnter={(event) => {
              if (selectedTime) (event.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(event) => {
              (event.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            }}
          >
            {selectedTime ? 'Save check-in time' : 'Choose a time'}
          </button>
        </div>
      </div>
    </OnboardingShell>
  );
}
