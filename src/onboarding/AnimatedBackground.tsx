import { useEffect, useMemo, useState } from 'react';

const createParticles = () =>
  Array.from({ length: 12 }, (_, index) => ({
    id: index,
    size: Math.round(12 + Math.random() * 18),
    left: Math.round(Math.random() * 90),
    top: Math.round(Math.random() * 90),
    delay: Math.random() * 10,
    duration: 18 + Math.random() * 14,
    opacity: 0.08 + Math.random() * 0.12,
  }));

export function AnimatedBackground() {
  const [loaded, setLoaded] = useState(false);
  const particles = useMemo(() => createParticles(), []);

  useEffect(() => {
    const timeout = setTimeout(() => setLoaded(true), 50);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at top left, rgba(10,175,170,0.16), transparent 24%), radial-gradient(circle at bottom right, rgba(10,175,170,0.12), transparent 30%)',
          opacity: 1,
        }}
      />
      {particles.map((particle) => (
        <span
          key={particle.id}
          style={{
            position: 'absolute',
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            width: particle.size,
            height: particle.size,
            borderRadius: '50%',
            background: 'rgba(10,175,170,0.18)',
            filter: 'blur(1px)',
            opacity: particle.opacity,
            transform: loaded
              ? `translate3d(0, 0, 0)`
              : `translate3d(0, -12px, 0)`,
            animation: `drift-${particle.id} ${particle.duration}s ease-in-out ${particle.delay}s infinite alternate`,
          }}
        />
      ))}
      <style>{`
        ${particles
          .map(
            (particle) =>
              `@keyframes drift-${particle.id} { 0% { transform: translate3d(0, 0, 0); } 100% { transform: translate3d(0, ${8 + particle.id % 5}px, 0); } }`
          )
          .join(' ')}
      `}</style>
    </div>
  );
}
