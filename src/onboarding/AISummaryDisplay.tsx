import { useEffect, useState } from 'react';
import { useFiasTheme } from '@fias/arche-sdk';

export function AISummaryDisplay({
  summary,
  onNext,
  onHome,
  onBack,
}: {
  summary: string;
  onNext: () => void;
  onHome: () => void;
  onBack: () => void;
  onReset?: () => void;
}) {
  const theme = useFiasTheme();

  const lines = summary
    .split('\n')
    .map((line) => line.replace(/^\s*[-•\d.]+\s*/, '').trim())
    .filter(Boolean);

  const insight = lines[0] || "You've already made the hardest move — getting clear on what you want.";
  const action = lines[1] || 'Pick the one thing that matters most right now, and take a single step toward it today.';
  const rest = lines.slice(2).join('\n').trim();
  const body =
    rest ||
    `Here's what stands out from everything you shared — and the first move that will make the biggest difference.`;

  // Type the body out one character at a time (15ms each).
  const [typedCount, setTypedCount] = useState(0);

  useEffect(() => {
    setTypedCount(0);
    const interval = setInterval(() => {
      setTypedCount((count) => {
        if (count >= body.length) {
          clearInterval(interval);
          return count;
        }
        return count + 1;
      });
    }, 15);
    return () => clearInterval(interval);
  }, [body]);

  if (!theme) return null;

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: '#ffffff', fontFamily: theme.fonts.body, position: 'relative' }}>
      {/* Navy header */}
      <header
        style={{
          height: 56,
          background: '#0F2554',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          paddingLeft: 104,
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
          style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#ffffff', fontSize: 20, cursor: 'pointer', padding: 0 }}
        >
          🏠
        </button>
      </header>
      <button
        type="button"
        onClick={onBack}
        style={{
          position: 'absolute',
          top: 16,
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

      <div style={{ padding: '20px', maxWidth: 720, margin: '0 auto', paddingBottom: 120 }}>
        <h2 style={{ margin: '4px 0 16px', fontSize: 22, fontWeight: 800, color: '#0F2554', lineHeight: 1.3 }}>
          Here's what we see for you
        </h2>

        <p style={{ margin: 0, fontSize: 16, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap', minHeight: 48 }}>
          {body.slice(0, typedCount)}
        </p>

        {/* Key insight */}
        <div style={{ marginTop: 24, background: 'linear-gradient(135deg, #0F2554, #1a3a7a)', borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 10, color: '#0AAFAA', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
            KEY INSIGHT
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 16, color: '#ffffff', fontWeight: 700, lineHeight: 1.6 }}>{insight}</p>
        </div>

        {/* First step */}
        <div style={{ marginTop: 16, background: '#f0fffe', border: '1.5px solid #0AAFAA', borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 10, color: '#0AAFAA', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
            YOUR FIRST STEP
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: '#0F2554', lineHeight: 1.6 }}>{action}</p>
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '12px 16px 20px',
          background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.95) 45%)',
          zIndex: 25,
        }}
      >
        <button
          type="button"
          onClick={onNext}
          style={{
            width: '100%',
            maxWidth: 460,
            display: 'block',
            margin: '0 auto',
            height: 54,
            background: 'linear-gradient(135deg, #0AAFAA, #0891B2)',
            color: '#ffffff',
            fontSize: 16,
            fontWeight: 700,
            borderRadius: 50,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(10,175,170,0.35)',
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
