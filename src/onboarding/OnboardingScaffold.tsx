import { ReactNode } from 'react';
import { useFiasTheme } from '@fias/arche-sdk';

/**
 * Shared chrome for the light "question" onboarding screens (PathQuestions,
 * OpenFinalQuestion): animated #f0f4ff↔#f8fafc gradient background, a navy
 * 56px header (⚡ Elevate + 🏠), an absolute back button, and an optional
 * thin progress bar with a label.
 */
export function OnboardingScaffold({
  children,
  onHome,
  onBack,
  showBack = true,
  progressPercent,
  progressLabel,
}: {
  children: ReactNode;
  onHome: () => void;
  onBack?: () => void;
  showBack?: boolean;
  progressPercent?: number;
  progressLabel?: string;
}) {
  const theme = useFiasTheme();
  if (!theme) return null;

  const showProgress = typeof progressPercent === 'number';

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        position: 'relative',
        fontFamily: theme.fonts.body,
        background: 'linear-gradient(-45deg, #f0f4ff, #f8fafc, #f0f4ff, #f8fafc)',
        backgroundSize: '400% 400%',
        animation: 'onbGradientShift 8s ease infinite',
      }}
    >
      <style>
        {`@keyframes onbGradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
          @keyframes onbAffirmIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes onbFadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}
      </style>

      {/* Navy header */}
      <header
        style={{
          height: 56,
          background: '#0F2554',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          paddingLeft: showBack && onBack ? 104 : 20,
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
          style={{
            marginLeft: 'auto',
            background: 'transparent',
            border: 'none',
            color: '#ffffff',
            fontSize: 20,
            lineHeight: 1,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          🏠
        </button>
      </header>

      {/* Absolute back button */}
      {showBack && onBack ? (
        <button
          type="button"
          onClick={onBack}
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 50,
            padding: '6px 14px',
            fontSize: 13,
            color: '#6B7280',
            cursor: 'pointer',
            zIndex: 20,
          }}
        >
          ← Back
        </button>
      ) : null}

      {/* Progress section */}
      {showProgress ? (
        <div style={{ padding: '12px 20px 8px' }}>
          <div style={{ width: '100%', height: 3, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.max(0, Math.min(100, progressPercent ?? 0))}%`,
                height: '100%',
                borderRadius: 2,
                background: 'linear-gradient(90deg, #0AAFAA, #0891B2)',
                transition: 'width 350ms ease',
              }}
            />
          </div>
          {progressLabel ? (
            <div style={{ marginTop: 6, fontSize: 12, color: '#6B7280' }}>{progressLabel}</div>
          ) : null}
        </div>
      ) : null}

      <main style={{ width: '100%' }}>{children}</main>
    </div>
  );
}

/**
 * Number of grid columns for a set of answer cards. Only an even fit gets two
 * columns — 4 → 2×2, 6 → 2×3 — so the grid is never left with an empty cell.
 * Odd counts (3, 5) and everything else stack in a single column.
 */
export function answerColumns(count: number): number {
  return count === 4 || count === 6 ? 2 : 1;
}

/** Shared continue button fixed to the bottom of the viewport. */
export function ContinueBar({
  label,
  onClick,
  visible,
}: {
  label: string;
  onClick: () => void;
  visible: boolean;
}) {
  if (!visible) return null;
  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        padding: '12px 16px 20px',
        background: 'linear-gradient(180deg, rgba(248,250,252,0) 0%, rgba(248,250,252,0.95) 45%)',
        zIndex: 25,
        animation: 'onbFadeUp 300ms ease',
      }}
    >
      <button
        type="button"
        onClick={onClick}
        style={{
          width: '100%',
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
        {label}
      </button>
    </div>
  );
}

/** Micro-affirmation toast pinned above the continue bar. */
export function Affirmation({ text }: { text: string }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 80,
        left: 16,
        right: 16,
        background: 'linear-gradient(135deg, #0AAFAA, #0891B2)',
        borderRadius: 16,
        padding: '14px 18px',
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        zIndex: 26,
        boxShadow: '0 12px 30px rgba(10,175,170,0.3)',
        animation: 'onbAffirmIn 300ms ease',
      }}
    >
      <span aria-hidden>✨</span>
      <span>{text}</span>
    </div>
  );
}
