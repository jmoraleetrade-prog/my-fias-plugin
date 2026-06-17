import { useEffect, useState } from 'react';
import { useFiasTheme } from '@fias/arche-sdk';

const TARGET_SCORE = 74;

function bandLabel(score: number): string {
  if (score >= 86) return 'Exceptional';
  if (score >= 71) return 'Strong position';
  if (score >= 51) return 'Good progress';
  if (score >= 31) return 'Building momentum';
  return 'Just getting started';
}

function bandDescription(score: number): string {
  if (score >= 86) return "You're in a rare spot. The work now is keeping that edge and turning it into bigger moves.";
  if (score >= 71) return "You're in a strong position. A few sharp moves will turn that into real results.";
  if (score >= 51) return "You've got good things going. Let's build on them and pick up the pace.";
  if (score >= 31) return "You're on your way. A clear plan will turn this into steady progress.";
  return "This is the start, and that's exactly the right place to be. We'll build it up from here.";
}

export function VelocityScoreReveal({
  onNext,
  onHome,
  onBack,
}: {
  onNext: () => void;
  onHome: () => void;
  onBack: () => void;
  onReset?: () => void;
}) {
  const theme = useFiasTheme();
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    // Count up to the target over ~1.5s.
    const stepMs = 1500 / TARGET_SCORE;
    const interval = setInterval(() => {
      setScore((current) => {
        if (current >= TARGET_SCORE) {
          clearInterval(interval);
          setFinished(true);
          return TARGET_SCORE;
        }
        return current + 1;
      });
    }, stepMs);
    return () => clearInterval(interval);
  }, []);

  if (!theme) return null;

  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: '#0F2554',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '72px 24px 120px',
        fontFamily: theme.fonts.body,
        color: '#ffffff',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      <button
        type="button"
        onClick={onBack}
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: 50,
          padding: '6px 14px',
          fontSize: 13,
          color: '#ffffff',
          cursor: 'pointer',
        }}
      >
        ← Back
      </button>
      <button
        type="button"
        onClick={onHome}
        aria-label="Home"
        style={{ position: 'absolute', top: 14, right: 16, background: 'transparent', border: 'none', color: '#ffffff', fontSize: 20, cursor: 'pointer' }}
      >
        🏠
      </button>

      <p style={{ margin: '0 0 32px', fontSize: 14, color: 'rgba(255,255,255,0.65)', textAlign: 'center', maxWidth: 300, lineHeight: 1.6 }}>
        This is your starting point — not a judgement.
      </p>

      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={strokeWidth} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#0AAFAA"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 60ms linear' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 52,
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1,
          }}
        >
          {score}
        </div>
      </div>

      <p style={{ margin: '16px 0 0', fontSize: 16, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{bandLabel(score)}</p>

      <p style={{ margin: '16px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.65)', textAlign: 'center', maxWidth: 280, lineHeight: 1.7 }}>
        {bandDescription(score)}
      </p>

      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '12px 16px 20px', zIndex: 25 }}>
        <button
          type="button"
          onClick={onNext}
          disabled={!finished}
          style={{
            width: '100%',
            maxWidth: 460,
            display: 'block',
            margin: '0 auto',
            height: 54,
            background: '#ffffff',
            color: '#0F2554',
            border: '2px solid #0AAFAA',
            fontSize: 16,
            fontWeight: 700,
            borderRadius: 50,
            cursor: finished ? 'pointer' : 'not-allowed',
            opacity: finished ? 1 : 0.6,
            transition: 'opacity 200ms ease',
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
