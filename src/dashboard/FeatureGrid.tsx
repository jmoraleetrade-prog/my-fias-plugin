import { useFiasTheme } from '@fias/arche-sdk';

const FEATURES = [
  { emoji: '🧾', title: 'CV Analysis', description: 'Get a polished CV tailored to your next role.' },
  { emoji: '🔎', title: 'Job Match', description: 'See the jobs most aligned with your skills.' },
  { emoji: '🎙️', title: 'Interview Prep', description: 'Practice answers for your highest impact questions.' },
  { emoji: '🧭', title: 'Career Planning', description: 'Map your next 90 days of career moves.' },
  { emoji: '🔗', title: 'LinkedIn Optimiser', description: 'Make your profile stand out to recruiters.' },
  { emoji: '💬', title: 'Salary Negotiation', description: 'Prepare your compensation case with confidence.' },
];

export function FeatureGrid() {
  const theme = useFiasTheme();
  if (!theme) return null;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 16,
      }}
    >
      {FEATURES.map((feature) => (
        <button
          key={feature.title}
          type="button"
          style={{
            borderRadius: 24,
            border: '1px solid #E5E7EB',
            background: '#ffffff',
            padding: '22px',
            textAlign: 'left',
            cursor: 'pointer',
            boxShadow: '0 12px 30px rgba(15,23,42,0.06)',
            transition: 'border-color 200ms ease, box-shadow 200ms ease, transform 200ms ease',
          }}
          onMouseEnter={(event) => {
            (event.currentTarget as HTMLButtonElement).style.borderColor = '#0AAFAA';
            (event.currentTarget as HTMLButtonElement).style.boxShadow = '0 16px 36px rgba(10,175,170,0.18)';
            (event.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(event) => {
            (event.currentTarget as HTMLButtonElement).style.borderColor = '#E5E7EB';
            (event.currentTarget as HTMLButtonElement).style.boxShadow = '0 12px 30px rgba(15,23,42,0.06)';
            (event.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
          }}
        >
          <div style={{ fontSize: 28 }}>{feature.emoji}</div>
          <h3 style={{ margin: '14px 0 8px', fontSize: 18, fontWeight: 800, color: '#0F172A' }}>{feature.title}</h3>
          <p style={{ margin: 0, color: '#475569', fontSize: 14, lineHeight: 1.7 }}>{feature.description}</p>
        </button>
      ))}
    </div>
  );
}
