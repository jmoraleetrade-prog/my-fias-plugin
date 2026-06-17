import { useEffect, useState } from 'react';
import { usePersistentState, useFiasTheme } from '@fias/arche-sdk';
import { BRAND, FINAL_QUICK_OPTIONS } from './onboardingData';
import { OnboardingShell } from './OnboardingShell';

export function OpenFinalQuestion({ onNext, onHome, onBack, onReset }: { onNext: () => void; onHome: () => void; onBack: () => void; onReset?: () => void }) {
  const theme = useFiasTheme();
  const [mounted, setMounted] = useState(false);
  const [selectedOption, setSelectedOption] = usePersistentState<string | null>('final-selection', null);
  const [freeText, setFreeText] = usePersistentState('final-free-text', '');
  const [draft, setDraft] = useState(freeText);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    setDraft(freeText);
  }, [freeText]);

  if (!theme) return null;

  const canContinue = Boolean(selectedOption || draft.trim());

  const handleContinue = () => {
    if (!canContinue) return;
    setFreeText(draft.trim());
    onNext();
  };

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
          <section
            style={{
              borderRadius: theme.components.cardRadius,
              backgroundColor: BRAND.surface,
              boxShadow: BRAND.shadow,
              border: `1px solid ${BRAND.border}`,
              padding: theme.spacing.lg,
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
              Last one — if Elevate could do one thing that genuinely changes your career, what would that be?
            </h2>

            <div style={{ display: 'grid', gap: theme.spacing.md, marginTop: theme.spacing.lg }}>
              {FINAL_QUICK_OPTIONS.map((option) => {
                const isActive = selectedOption === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSelectedOption(option)}
                    style={{
                      width: '100%',
                      padding: theme.spacing.lg,
                      borderRadius: theme.components.cardRadius,
                      border: isActive ? `1px solid ${BRAND.teal}` : `1px solid ${BRAND.border}`,
                      backgroundColor: isActive ? 'rgba(10,175,170,0.14)' : BRAND.canvas,
                      color: BRAND.text,
                      textAlign: 'left',
                      fontFamily: theme.fonts.body,
                      fontSize: '1rem',
                      cursor: 'pointer',
                      boxShadow: isActive ? '0 16px 35px rgba(10,175,170,0.16)' : BRAND.shadow,
                      transition: 'transform 200ms ease, box-shadow 200ms ease, background-color 200ms ease, border-color 200ms ease',
                    }}
                    onMouseEnter={(event) => {
                      (event.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(event) => {
                      (event.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                    }}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            <textarea
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                if (event.target.value.trim()) {
                  setSelectedOption(null);
                }
              }}
              placeholder="Or tell us in your own words..."
              style={{
                width: '100%',
                marginTop: theme.spacing.lg,
                minHeight: '11rem',
                padding: theme.spacing.md,
                borderRadius: theme.components.inputRadius,
                border: `1px solid ${BRAND.border}`,
                backgroundColor: BRAND.canvas,
                color: BRAND.text,
                fontSize: '1rem',
                fontFamily: theme.fonts.body,
                outline: 'none',
              }}
            />

            <button
              type="button"
              onClick={handleContinue}
              disabled={!canContinue}
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
                cursor: canContinue ? 'pointer' : 'not-allowed',
                opacity: canContinue ? 1 : 0.55,
                boxShadow: canContinue ? '0 18px 40px rgba(10, 175, 170, 0.24)' : 'none',
                transition: 'transform 200ms ease, box-shadow 200ms ease',
              }}
              onMouseEnter={(event) => {
                if (canContinue) (event.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(event) => {
                (event.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              }}
            >
              Continue
            </button>
          </section>
        </div>
      </div>
    </OnboardingShell>
  );
}
