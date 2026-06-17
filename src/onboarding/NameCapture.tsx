import { useEffect, useState } from 'react';
import { usePersistentState, useFiasTheme } from '@fias/arche-sdk';
import { BRAND, SituationType, SITUATION_LABELS } from './onboardingData';
import { OnboardingShell } from './OnboardingShell';

const SITUATION_RESPONSES: Record<SituationType, string> = {
  job_hunting: 'That edge is closer than you think. Let’s shape the story that gets attention.',
  earn_more: 'Smart choice. Growth is a momentum game, and we’ll help you make the next move count.',
  career_change: 'Bold move — let’s make it feel possible and purpose-driven.',
  work_for_myself: 'Great. Your independence is a powerful asset, and we’ll make it feel intentional.',
  business_growth: 'Scaled growth starts with clarity. Let’s make your next move more strategic.',
  starting_out: 'Let’s build the steps that feel right for where you are today.',
  return_to_work: 'We’ll make your return strong, smart, and ready for what comes next.',
  future_proof: 'Future-ready careers are built today. We’ll help you make your next move more resilient.',
};

export function NameCapture({ onNext, onHome, onBack, onReset }: { onNext: () => void; onHome: () => void; onBack: () => void; onReset?: () => void }) {
  const theme = useFiasTheme();
  const [mounted, setMounted] = useState(false);
  const [situationType] = usePersistentState<SituationType | null>('situation-type', null);
  const [name, setName] = usePersistentState('user-name', '');
  const [draft, setDraft] = useState(name);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    setDraft(name);
  }, [name]);

  if (!theme) return null;

  const firstWord = draft.trim().split(/\s+/)[0] || '';
  const response = situationType ? SITUATION_RESPONSES[situationType] : '';

  const handleSubmit = () => {
    if (!firstWord) return;
    setName(firstWord);
    onNext();
  };

  return (
    <OnboardingShell onHome={onHome} onBack={onBack} onReset={onReset}>
      <div
        style={{
          minHeight: '100vh',
          width: '100%',
          padding: theme.spacing.xl,
          backgroundColor: '#F8FAFC',
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
            padding: '46px',
            borderRadius: 24,
            background: '#ffffff',
            boxShadow: '0 30px 80px rgba(15,23,42,0.08)',
            color: '#0F172A',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 320ms ease, transform 320ms ease',
          }}
        >
          <div style={{ display: 'grid', gap: '28px' }}>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontFamily: theme.fonts.heading,
                  fontSize: 'clamp(2.75rem, 5vw, 4rem)',
                  lineHeight: 1.02,
                  color: '#0F172A',
                  fontWeight: 800,
                }}
              >
                What should we call you?
              </h1>
              <p style={{ margin: '16px 0 0', color: '#475569', fontSize: 18, lineHeight: 1.75 }}>
                Share your first name so Elevate can personalize your journey.
              </p>
            </div>

            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Enter your first name"
              style={{
                width: '100%',
                padding: '16px 20px',
                borderRadius: 12,
                border: '2px solid #E5E7EB',
                backgroundColor: '#ffffff',
                color: '#0F172A',
                fontSize: 18,
                fontFamily: theme.fonts.body,
                outline: 'none',
                transition: 'border-color 300ms ease, box-shadow 300ms ease',
              }}
              onFocus={(event) => {
                event.currentTarget.style.border = '2px solid #0AAFAA';
                event.currentTarget.style.boxShadow = '0 0 0 3px rgba(10,175,170,0.2)';
              }}
              onBlur={(event) => {
                event.currentTarget.style.border = '2px solid #E5E7EB';
                event.currentTarget.style.boxShadow = 'none';
              }}
            />

            {firstWord ? (
              <p style={{ margin: 0, color: '#475569', lineHeight: 1.75, fontSize: 16 }}>
                {`Nice to meet you, ${firstWord}. ${response}`}
              </p>
            ) : null}

            {draft.trim() ? (
              <button
                type="button"
                onClick={handleSubmit}
                style={{
                  width: '100%',
                  padding: '16px 0',
                  borderRadius: 50,
                  border: 'none',
                  background: 'linear-gradient(135deg, #0AAFAA, #0891B2)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: 18,
                  cursor: 'pointer',
                  boxShadow: '0 12px 30px rgba(10,175,170,0.28)',
                  transition: 'transform 200ms ease',
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
            ) : null}
          </div>
        </div>
      </div>
    </OnboardingShell>
  );
}
