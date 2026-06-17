import { useFiasTheme } from '@fias/arche-sdk';

export function PriorityActionCard({
  title,
  description,
  actionText,
  onAction,
}: {
  title: string;
  description: string;
  actionText: string;
  onAction: () => void;
}) {
  const theme = useFiasTheme();
  if (!theme) return null;

  return (
    <div
      style={{
        borderRadius: 28,
        background: '#ffffff',
        padding: '24px',
        boxShadow: '0 20px 50px rgba(15,23,42,0.08)',
        border: '1px solid #E5E7EB',
        display: 'grid',
        gap: 18,
      }}
    >
      <p style={{ margin: 0, color: '#0AAFAA', fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
        YOUR PRIORITY RIGHT NOW
      </p>
      <div style={{ display: 'grid', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 24, lineHeight: 1.15, fontWeight: 800, color: '#0F172A' }}>{title}</h2>
        <p style={{ margin: 0, color: '#475569', fontSize: 15, lineHeight: 1.7 }}>{description}</p>
      </div>
      <button
        type="button"
        onClick={onAction}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: 999,
          border: 'none',
          background: 'linear-gradient(135deg, #0AAFAA, #0891B2)',
          color: '#ffffff',
          fontSize: 15,
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 10px 28px rgba(10,175,170,0.24)',
        }}
      >
        {actionText}
      </button>
    </div>
  );
}
