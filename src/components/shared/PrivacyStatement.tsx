/**
 * Small teal-bordered reassurance card with a lock emoji and a short privacy
 * note. Used near inputs that collect personal details.
 */
export function PrivacyStatement({
  note = 'Your information stays private. We never share or sell your data, and you can delete it any time.',
  darkMode = false,
}: {
  note?: string;
  darkMode?: boolean;
}) {
  const fg = darkMode ? 'rgba(255,255,255,0.85)' : '#0F2554';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '12px 14px',
        borderRadius: 12,
        border: '1px solid rgba(10,175,170,0.45)',
        background: 'rgba(10,175,170,0.08)',
        color: fg,
        fontSize: 13,
        lineHeight: 1.55,
      }}
    >
      <span style={{ fontSize: 16, lineHeight: 1.4 }} aria-hidden>
        🔒
      </span>
      <span>{note}</span>
    </div>
  );
}
