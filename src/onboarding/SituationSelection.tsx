import { useState } from 'react';
import { usePersistentState, useFiasTheme } from '@fias/arche-sdk';
import { SITUATION_OPTIONS, SituationType } from './onboardingData';

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11.5L12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z" />
  </svg>
);

export function SituationSelection({
  onNext,
  onHome,
  onBack,
}: {
  onNext: (value: SituationType) => void;
  onHome: () => void;
  onBack: () => void;
  onReset?: () => void;
}) {
  const theme = useFiasTheme();
  const [selected, setSelected] = usePersistentState<SituationType | null>('situation-type', null);
  const [hovered, setHovered] = useState<string | null>(null);

  if (!theme) return null;

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        fontFamily: theme.fonts.body,
        background: 'linear-gradient(-45deg, #f0f4ff, #f8fafc, #f0f4ff, #f8fafc)',
        backgroundSize: '400% 400%',
        animation: 'situationGradient 8s ease infinite',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>
        {`@keyframes situationGradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
          @keyframes situationCardIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}
      </style>

      {/* Navy header */}
      <header
        style={{
          height: 56,
          flexShrink: 0,
          background: '#0F2554',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 20, color: '#0AAFAA', lineHeight: 1 }} aria-hidden>
          ⚡
        </span>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#ffffff' }}>Elevate</span>
        <button
          type="button"
          onClick={onHome}
          aria-label="Home"
          style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#ffffff', display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0 }}
        >
          <HomeIcon />
        </button>
      </header>

      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        style={{
          position: 'absolute',
          top: 14,
          left: 16,
          background: '#F3F4F6',
          border: '1px solid #e2e8f0',
          borderRadius: 50,
          padding: '6px 14px',
          fontSize: 13,
          fontWeight: 600,
          color: '#6B7280',
          cursor: 'pointer',
          zIndex: 20,
        }}
      >
        ← Back
      </button>

      <div style={{ flex: 1, padding: '24px 16px 110px', maxWidth: 880, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0F2554', lineHeight: 1.25, textAlign: 'center' }}>
          Which of these sounds most like you?
        </h1>
        <p style={{ margin: '8px 0 24px', fontSize: 13, color: '#6B7280', textAlign: 'center' }}>
          Pick the one that feels closest to where you are right now
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 12,
          }}
        >
          {SITUATION_OPTIONS.map((option, index) => {
            const isActive = selected === option.value;
            const isHovered = hovered === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelected(option.value)}
                onMouseEnter={() => setHovered(option.value)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  height: 88,
                  padding: 12,
                  borderRadius: 16,
                  border: isActive ? `2px solid ${option.accent}` : '1.5px solid #e2e8f0',
                  background: isActive ? `${option.accent}14` : '#ffffff',
                  cursor: 'pointer',
                  fontFamily: theme.fonts.body,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  boxShadow: isActive
                    ? `0 0 0 4px ${option.accent}33`
                    : isHovered
                      ? '0 10px 24px rgba(15,37,84,0.12)'
                      : '0 1px 3px rgba(15,37,84,0.06)',
                  transform: isHovered && !isActive ? 'translateY(-2px)' : 'translateY(0)',
                  transition: 'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, background 180ms ease',
                  animation: `situationCardIn 400ms ease ${index * 50}ms both`,
                }}
              >
                <span style={{ fontSize: 26, lineHeight: 1 }} aria-hidden>
                  {option.emoji}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', textAlign: 'center', lineHeight: 1.25 }}>
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CTA appears after selection */}
      {selected ? (
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            padding: '12px 16px 20px',
            background: 'linear-gradient(180deg, rgba(248,250,252,0) 0%, rgba(248,250,252,0.96) 45%)',
            zIndex: 25,
          }}
        >
          <button
            type="button"
            onClick={() => selected && onNext(selected)}
            style={{
              width: '100%',
              maxWidth: 460,
              display: 'block',
              margin: '0 auto',
              height: 54,
              borderRadius: 50,
              border: 'none',
              background: 'linear-gradient(135deg, #0AAFAA, #0891B2)',
              color: '#ffffff',
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(10,175,170,0.35)',
            }}
          >
            That's me →
          </button>
        </div>
      ) : null}
    </div>
  );
}
