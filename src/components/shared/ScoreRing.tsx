import { useEffect, useState } from 'react';

/** Pick a colour for the ring based on the score band. */
function bandColor(score: number): string {
  if (score >= 80) return '#0AAFAA'; // teal — peak
  if (score >= 60) return '#06B6D4'; // cyan — strong
  if (score >= 40) return '#F59E0B'; // amber — building
  return '#EF4444'; // red — just starting
}

/**
 * Animated circular score gauge. The arc and the centre number ease up from
 * zero to `score` on mount when `animate` is true. Colour shifts by band.
 */
export function ScoreRing({
  score,
  size = 200,
  strokeWidth = 16,
  animate = true,
  trackColor = '#E5E7EB',
  label = '/100',
  darkMode = false,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  animate?: boolean;
  trackColor?: string;
  label?: string;
  darkMode?: boolean;
}) {
  const target = Math.max(0, Math.min(100, Math.round(score)));
  const [display, setDisplay] = useState(animate ? 0 : target);

  useEffect(() => {
    if (!animate) {
      setDisplay(target);
      return;
    }

    let frame = 0;
    const duration = 900;
    let start: number | null = null;

    const tick = (timestamp: number) => {
      if (start === null) start = timestamp;
      const progress = Math.min(1, (timestamp - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, animate]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (display / 100) * circumference;
  const color = bandColor(display);
  const numberColor = darkMode ? '#F8FAFF' : '#0F172A';
  const labelColor = darkMode ? 'rgba(255,255,255,0.7)' : '#475569';

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: 'block' }}
      role="img"
      aria-label={`Score ${display} out of 100`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: animate ? 'stroke-dashoffset 80ms linear, stroke 300ms ease' : undefined }}
      />
      <text
        x="50%"
        y="48%"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontSize: size * 0.26, fontWeight: 800, fill: numberColor }}
      >
        {display}
      </text>
      <text
        x="50%"
        y="66%"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontSize: size * 0.1, fill: labelColor }}
      >
        {label}
      </text>
    </svg>
  );
}
