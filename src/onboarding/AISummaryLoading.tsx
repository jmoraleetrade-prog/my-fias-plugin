import { useEffect, useRef, useState } from 'react';
import { useEntityInvocation, useFiasTheme } from '@fias/arche-sdk';
import { buildSummarySystemPrompt } from '../utils/aiHelpers';
import { OnboardingProfile } from './onboardingData';

export function AISummaryLoading({
  profile,
  onComplete,
  onBack,
}: {
  profile: OnboardingProfile;
  onComplete: (summary: string) => void;
  onHome: () => void;
  onBack: () => void;
  onReset?: () => void;
}) {
  const theme = useFiasTheme();
  const { invoke } = useEntityInvocation();

  const firstName = (profile.name || '').trim().split(/\s+/)[0] || 'there';
  const messages = [
    `Thanks ${firstName}.`,
    'Give me a moment...',
    "Reading everything you've told me...",
    'This is just for you — not a template.',
    "Here's what I see...",
  ];

  const [messageIndex, setMessageIndex] = useState(0);
  const [aiDone, setAiDone] = useState(false);
  const summaryRef = useRef('');
  const completedRef = useRef(false);
  const invokedRef = useRef(false);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Kick off the AI summary exactly once, using the full onboarding profile
  // (name, situation, path answers, goal and biggest challenge) in the prompt.
  useEffect(() => {
    if (invokedRef.current) return;
    invokedRef.current = true;

    invoke({
      entityId: { capability: 'text-standard' },
      input: `Write my coaching summary based on what I told you during sign-up.`,
      systemPrompt: buildSummarySystemPrompt(profile),
    })
      .then((result) => {
        summaryRef.current = result?.output ?? '';
      })
      .catch(() => {
        summaryRef.current = '';
      })
      .finally(() => setAiDone(true));
  }, [invoke, profile]);

  // Reveal one message every 2.5s, stopping at the last.
  useEffect(() => {
    if (messageIndex >= messages.length - 1) return;
    const timer = setTimeout(() => setMessageIndex((index) => index + 1), 2500);
    return () => clearTimeout(timer);
  }, [messageIndex, messages.length]);

  // Hand off only once the sequence has played AND the AI has resolved.
  useEffect(() => {
    if (completedRef.current) return;
    if (aiDone && messageIndex >= messages.length - 1) {
      completedRef.current = true;
      const timer = setTimeout(() => onCompleteRef.current(summaryRef.current), 800);
      return () => clearTimeout(timer);
    }
  }, [aiDone, messageIndex, messages.length]);

  if (!theme) return null;

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
        gap: 28,
        padding: 24,
        fontFamily: theme.fonts.body,
        color: '#ffffff',
        position: 'relative',
      }}
    >
      <style>
        {`@keyframes aisPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
          @keyframes aisFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 0.8; transform: translateY(0); } }`}
      </style>

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

      <div style={{ fontSize: 48, lineHeight: 1, color: '#0AAFAA', animation: 'aisPulse 1.5s ease-in-out infinite' }} aria-hidden>
        ⚡
      </div>

      <p
        key={messageIndex}
        style={{
          margin: 0,
          fontSize: 18,
          color: '#ffffff',
          opacity: 0.8,
          textAlign: 'center',
          maxWidth: 280,
          lineHeight: 1.6,
          animation: 'aisFade 0.5s ease forwards',
        }}
        aria-live="polite"
      >
        {messages[messageIndex]}
      </p>
    </div>
  );
}
