import { useEffect, useState } from 'react';

const DEFAULT_MESSAGES = [
  'Reading your goals…',
  'Mapping the strongest next move…',
  'Polishing your personalized plan…',
  'Almost ready…',
];

/**
 * Full-bleed loading screen with rotating status messages, an indeterminate
 * progress bar, and a pulsing ⚡ glyph. Adapts to light/dark via `darkMode`.
 */
export function LoadingState({
  messages = DEFAULT_MESSAGES,
  darkMode = false,
  intervalMs = 2200,
}: {
  messages?: string[];
  darkMode?: boolean;
  intervalMs?: number;
}) {
  const list = messages.length > 0 ? messages : DEFAULT_MESSAGES;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (list.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % list.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [list.length, intervalMs]);

  const fg = darkMode ? '#F8FAFF' : '#0F2554';
  const subtle = darkMode ? 'rgba(255,255,255,0.16)' : 'rgba(15,37,84,0.10)';
  const bg = darkMode ? '#0F2554' : '#F8F9FC';

  return (
    <div
      style={{
        minHeight: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        padding: '48px 24px',
        background: bg,
        color: fg,
        textAlign: 'center',
      }}
    >
      <style>
        {`@keyframes elevatePulse { 0%, 100% { transform: scale(1); opacity: 0.85; } 50% { transform: scale(1.18); opacity: 1; } }
          @keyframes elevateSlide { 0% { transform: translateX(-40%); } 100% { transform: translateX(220%); } }
          @keyframes elevateFade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}
      </style>

      <div
        style={{
          fontSize: 56,
          lineHeight: 1,
          animation: 'elevatePulse 1.4s ease-in-out infinite',
        }}
        aria-hidden
      >
        ⚡
      </div>

      <p
        key={index}
        style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 600,
          minHeight: 26,
          animation: 'elevateFade 0.4s ease',
        }}
        aria-live="polite"
      >
        {list[index]}
      </p>

      <div
        style={{
          width: 'min(320px, 80%)',
          height: 6,
          borderRadius: 999,
          background: subtle,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: '40%',
            borderRadius: 999,
            background: 'linear-gradient(90deg, #0AAFAA, #06B6D4)',
            animation: 'elevateSlide 1.3s ease-in-out infinite',
          }}
        />
      </div>
    </div>
  );
}
