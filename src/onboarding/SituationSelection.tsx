import { useEffect, useState } from 'react';
import { usePersistentState, useFiasTheme } from '@fias/arche-sdk';
import { BRAND, SITUATION_OPTIONS, SituationType } from './onboardingData';
import { OnboardingShell } from './OnboardingShell';

const SITUATION_EMOJIS: Record<SituationType, string> = {
  job_hunting: '🧭',
  earn_more: '💰',
  career_change: '🔄',
  work_for_myself: '🧑‍💻',
  business_growth: '📈',
  starting_out: '🌱',
  return_to_work: '↩️',
  future_proof: '🛡️',
};

const SITUATION_COLORS: Record<SituationType, string> = {
  job_hunting: '#0AAFAA',
  earn_more: '#10b981',
  career_change: '#a855f7',
  work_for_myself: '#3b82f6',
  business_growth: '#f97316',
  starting_out: '#84cc16',
  return_to_work: '#ec4899',
  future_proof: '#6366f1',
};

export function SituationSelection({ onNext, onHome, onBack, onReset }: { onNext: (value: SituationType) => void; onHome: () => void; onBack: () => void; onReset?: () => void }) {
  const theme = useFiasTheme();
  const [selected, setSelected] = usePersistentState<SituationType | null>('situation-type', null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!theme) return null;

  return (
    <OnboardingShell onHome={onHome} onBack={onBack} onReset={onReset}>
      {/* Navy Header - 52px */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backgroundColor: '#0F2554',
          padding: '12px 24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          height: '52px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div style={{ color: '#ffffff', fontSize: 18, fontWeight: 700, fontFamily: theme.fonts.body }}>
          ⚡ Elevate
        </div>
      </div>

      {/* Main Container - 100vh */}
      <div
        style={{
          width: '100%',
          height: '100vh',
          paddingTop: '52px',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: theme.fonts.body,
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(-45deg, #f0f4ff, #f8fafc, #f0f4ff, #f8fafc)',
          backgroundSize: '400% 400%',
          animation: 'gradientShift 8s ease infinite',
        }}
      >
        <style>
          {`
            @keyframes gradientShift {
              0% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
            }
            @keyframes pulseGlow {
              0%, 100% { box-shadow: 0 4px 20px rgba(10,175,170,0.3); }
              50% { box-shadow: 0 4px 30px rgba(10,175,170,0.5); }
            }
            @media (max-width: 600px) {
              .situation-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
            }
            @media (min-width: 601px) {
              .situation-grid { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
            }
            .situation-card {
              background: #ffffff;
              border: 1.5px solid #e2e8f0;
              border-radius: 12px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.05);
              transition: all 180ms ease;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            .situation-card:hover {
              border-color: #0AAFAA;
              box-shadow: 0 4px 12px rgba(10,175,170,0.12);
              transform: translateY(-1px);
            }
            .situation-card.selected {
              border: 2px solid #0AAFAA;
              background: linear-gradient(135deg, #f0fffe 0%, #e6faf9 100%);
              animation: pulseGlow 2s ease-in-out infinite;
            }
          `}
        </style>

        {/* Question Section - 70px */}
        <div
          style={{
            height: '70px',
            paddingLeft: '14px',
            paddingRight: '14px',
            paddingTop: '11px',
            paddingBottom: '0',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            gap: '0',
            flexShrink: 0,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: theme.fonts.heading,
              fontSize: 24,
              lineHeight: 1.15,
              color: '#0F172A',
              fontWeight: 800,
              paddingBottom: '2px',
            }}
          >
            Which of these situations sounds most like you?
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: '#64748b',
              lineHeight: 1.3,
            }}
          >
            Choose the one that feels closest to where you are right now
          </p>
        </div>

        {/* Cards Grid - Fills remaining space before button */}
        <div
          style={{
            flex: 1,
            paddingLeft: '14px',
            paddingRight: '14px',
            paddingTop: '8px',
            paddingBottom: '0',
            display: 'flex',
            justifyContent: 'center',
            alignContent: 'start',
            overflow: 'hidden',
          }}
        >
          <div
            className="situation-grid"
            style={{
              display: 'grid',
              gap: '6px',
              width: '100%',
              maxWidth: '92rem',
              maxHeight: 'fit-content',
              alignContent: 'start',
            }}
          >
            {SITUATION_OPTIONS.map((option) => {
              const isActive = selected === option.value;
              const accentColor = SITUATION_COLORS[option.value];

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelected(option.value)}
                  onMouseEnter={() => setHovered(option.value)}
                  onMouseLeave={() => setHovered(null)}
                  className={`situation-card ${isActive ? 'selected' : ''}`}
                  style={{
                    width: '100%',
                    height: '80px',
                    padding: '11px 6px',
                    cursor: 'pointer',
                    fontFamily: theme.fonts.body,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0',
                    border: `1.5px solid #e2e8f0`,
                    borderRadius: '12px',
                    borderTop: `3px solid ${accentColor}`,
                    backgroundColor: '#ffffff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    transition: 'all 180ms ease',
                  }}
                >
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      backgroundColor: `${accentColor}1F`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      marginBottom: '6px',
                    }}
                  >
                    {SITUATION_EMOJIS[option.value]}
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#1e293b',
                      textAlign: 'center',
                      lineHeight: 1.2,
                    }}
                  >
                    {option.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fixed Bottom Button - 60px */}
        {selected ? (
          <div
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              height: '60px',
              paddingLeft: '14px',
              paddingRight: '14px',
              paddingTop: '6px',
              paddingBottom: '8px',
              backgroundColor: 'rgba(248,250,252,0.95)',
              backdropFilter: 'blur(8px)',
              borderTop: '1px solid rgba(226,232,240,0.5)',
              zIndex: 30,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              onClick={() => {
                if (selected) onNext(selected);
              }}
              style={{
                width: '100%',
                height: '40px',
                borderRadius: 999,
                border: 'none',
                background: 'linear-gradient(135deg, #0AAFAA, #06B6D4)',
                color: '#ffffff',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(10,175,170,0.24)',
                transition: 'all 200ms ease',
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 10px 28px rgba(10,175,170,0.32)';
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 24px rgba(10,175,170,0.24)';
              }}
            >
              This is me →
            </button>
          </div>
        ) : null}
      </div>
    </OnboardingShell>
  );
}
