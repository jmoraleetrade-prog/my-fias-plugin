import { useEffect, useState } from 'react';
import { useEntityInvocation, useFiasTheme } from '@fias/arche-sdk';
import { BRAND } from './onboardingData';
import { OnboardingShell } from './OnboardingShell';

const MASTER_PERSONA = `You are Elevate’s career intelligence engine. You read the user's goals and situation with respect, focus on clarity, and provide a concise, personalized career insight. Use supportive, confident language and avoid generic templates. Highlight the user's priority, the strongest next action, and one immediate confidence-building idea.`;

export function AISummaryLoading({ name, onComplete, onHome, onBack, onReset }: { name: string; onComplete: (summary: string) => void; onHome: () => void; onBack: () => void; onReset?: () => void }) {
  const theme = useFiasTheme();
  const { invoke, isLoading, streamingText, result } = useEntityInvocation();
  const [stage, setStage] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 900),
      setTimeout(() => setStage(2), 1800),
      setTimeout(() => setStage(3), 2700),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    invoke({
      entityId: { capability: 'text-standard' },
      input: `Summarize the onboarding data for ${name} in a way that feels specific, grounded, and ready to action.`,
      systemPrompt: MASTER_PERSONA,
    })
      .then((result) => onComplete(result?.output ?? ''))
      .catch(() => onComplete(''));
  }, [invoke, name, onComplete]);

  if (!theme) return null;

  return (
    <OnboardingShell onHome={onHome} onBack={onBack} onReset={onReset}>
      <div
        style={{
          minHeight: '100vh',
          width: '100%',
          padding: 0,
          background: '#0F2554',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: theme.fonts.body,
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <style>
          {`@keyframes pulse { from { transform: scale(1); opacity: 0.95; } to { transform: scale(1.05); opacity: 1; } }
            @keyframes floatUp { 0% { transform: translateY(10px); opacity: 0; } 25% { opacity: 0.12; } 100% { transform: translateY(-180px); opacity: 0; } }
            @keyframes fadeMessage { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          `}
        </style>

        {[...Array(8)].map((_, index) => {
          const size = 6 + (index % 3) * 3;
          const left = 10 + (index * 11) % 80;
          const delay = (index % 4) * 0.8;
          const duration = 6 + (index % 3) * 1.5;
          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                left: `${left}%`,
                bottom: '-10%',
                width: size,
                height: size,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.18)',
                filter: 'blur(1px)',
                animation: `floatUp ${duration}s ease-in ${delay}s infinite`,
              }}
            />
          );
        })}

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(15,37,84,0.55) 0%, rgba(15,37,84,0.95) 100%)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '38rem',
            padding: '40px 32px',
            borderRadius: 32,
            background: 'rgba(15,37,84,0.9)',
            boxShadow: '0 40px 120px rgba(0,0,0,0.35)',
            border: '1px solid rgba(255,255,255,0.12)',
            textAlign: 'center',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 320ms ease, transform 320ms ease',
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              margin: '0 auto',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 0 0 0 rgba(255,255,255,0.1)',
              animation: 'pulse 1.7s ease-in-out infinite alternate',
              marginBottom: 28,
              fontSize: 42,
            }}
          >
            🚀
          </div>

          <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.05, color: '#ffffff', fontWeight: 800 }}>
            Elevate is crafting your personalized plan.
          </h1>

          <div style={{ display: 'grid', gap: 16, marginTop: 28 }}>
            <p
              style={{
                margin: 0,
                opacity: stage >= 1 ? 1 : 0.2,
                animation: stage >= 1 ? 'fadeMessage 0.45s ease forwards' : undefined,
                transition: 'opacity 300ms ease',
              }}
            >
              Reading your goals and situation.
            </p>
            <p
              style={{
                margin: 0,
                opacity: stage >= 2 ? 1 : 0.2,
                animation: stage >= 2 ? 'fadeMessage 0.45s ease forwards' : undefined,
                transition: 'opacity 300ms ease',
              }}
            >
              Identifying the strongest next move.
            </p>
            <p
              style={{
                margin: 0,
                opacity: stage >= 3 ? 1 : 0.2,
                animation: stage >= 3 ? 'fadeMessage 0.45s ease forwards' : undefined,
                transition: 'opacity 300ms ease',
              }}
            >
              Preparing your premium career summary.
            </p>
          </div>

          <div
            style={{
              marginTop: 32,
              minHeight: '120px',
              borderRadius: 24,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.14)',
              padding: '18px 20px',
              textAlign: 'left',
              fontSize: 16,
              lineHeight: 1.7,
              color: '#F8FAFF',
            }}
          >
            {isLoading ? streamingText || 'Thinking…' : result?.output || 'Almost there...'}
          </div>
        </div>
      </div>
    </OnboardingShell>
  );
}
