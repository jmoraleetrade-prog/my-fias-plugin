import { useFiasTheme } from '@fias/arche-sdk';

export function VelocityScoreCard({ score, band }: { score: number; band: string }) {
  const theme = useFiasTheme();
  if (!theme) return null;

  const progress = Math.max(0, Math.min(100, score));
  const circumference = 180 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div
      style={{
        borderRadius: 28,
        background: '#ffffff',
        padding: '28px',
        boxShadow: '0 20px 50px rgba(15,23,42,0.08)',
        border: '1px solid #E5E7EB',
        display: 'grid',
        gap: 18,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: 0, color: '#0AAFAA', fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
            Career Velocity Score
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 18, fontWeight: 700, color: '#0F172A' }}>
            Your momentum at a glance
          </p>
        </div>
        <div style={{ display: 'grid', gap: 4, textAlign: 'right' }}>
          <span style={{ color: '#475569', fontSize: 13 }}>Trend</span>
          <span style={{ color: '#0AAFAA', fontSize: 18, fontWeight: 700 }}>+8%</span>
        </div>
      </div>

      <div style={{ display: 'grid', placeItems: 'center' }}>
        <svg width="240" height="240" viewBox="0 0 240 240" style={{ display: 'block' }}>
          <circle cx="120" cy="120" r="90" fill="#F8FAFC" />
          <circle cx="120" cy="120" r="90" fill="none" stroke="#E5E7EB" strokeWidth="18" />
          <circle
            cx="120"
            cy="120"
            r="90"
            fill="none"
            stroke="#0AAFAA"
            strokeWidth="18"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 120 120)"
          />
          <text x="120" y="108" textAnchor="middle" style={{ fontSize: 52, fontWeight: 800, fill: '#0F172A' }}>
            {progress}
          </text>
          <text x="120" y="142" textAnchor="middle" style={{ fontSize: 20, fill: '#475569' }}>
            /100
          </text>
        </svg>
      </div>

      <div style={{ display: 'grid', gap: 8, justifyItems: 'center' }}>
        <div
          style={{
            borderRadius: 999,
            background: '#ECFEF7',
            color: '#0AAFAA',
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {band}
        </div>
        <p style={{ margin: 0, color: '#475569', fontSize: 15, lineHeight: 1.7, textAlign: 'center', maxWidth: 320 }}>
          Keep the momentum high by tackling one focused priority each day.
        </p>
      </div>
    </div>
  );
}
