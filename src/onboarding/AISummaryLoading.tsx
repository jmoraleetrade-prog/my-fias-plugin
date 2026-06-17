import { useEffect, useRef, useState } from 'react';
import { useEntityInvocation, usePersistentState, useFiasTheme } from '@fias/arche-sdk';
import { MASTER_PERSONA, buildUserContext } from '../utils/aiHelpers';
import { PATH_QUESTION_SETS, SITUATION_LABELS, SituationType } from './onboardingData';

export function AISummaryLoading({
  name,
  onComplete,
  onBack,
}: {
  name: string;
  onComplete: (summary: string) => void;
  onHome: () => void;
  onBack: () => void;
  onReset?: () => void;
}) {
  const theme = useFiasTheme();
  const { invoke } = useEntityInvocation();

  const [situationType] = usePersistentState<SituationType | null>('situation-type', null);
  const [storedAnswers] = usePersistentState<Record<string, Record<number, string>>>('path-answers', {});
  const [finalSelection] = usePersistentState<string | null>('final-selection', null);
  const [finalText] = usePersistentState('final-free-text', '');

  const firstName = (name || '').trim().split(/\s+/)[0] || 'there';
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

  // Kick off the AI summary exactly once, with the user's own answers as context.
  useEffect(() => {
    if (invokedRef.current) return;
    invokedRef.current = true;

    // Turn the saved choice/text answers into readable lines for the model.
    const answers: Record<string, string> = {};
    if (situationType) {
      const questions = PATH_QUESTION_SETS[situationType] ?? [];
      const saved = storedAnswers[situationType] || {};
      questions.forEach((question, index) => {
        const value = saved[index];
        if (!value) return;
        if (question.kind === 'choice') {
          const label = question.options.find((option) => option.value === value)?.label ?? value;
          answers[question.question] = label;
        } else {
          answers[question.question] = value;
        }
      });
    }

    const context = buildUserContext({
      name: firstName,
      situationType: situationType ? SITUATION_LABELS[situationType] : '',
      finalText: finalText || finalSelection || '',
      pathAnswers: answers,
      goals: finalSelection ? [finalSelection] : [],
    });

    invoke({
      entityId: { capability: 'text-standard' },
      input: `Here is everything ${firstName} told us during sign-up:\n\n${context}\n\nWrite a short, warm, plain-English read of where they are. Line 1: the single most important thing you notice. Line 2: the one clear first step they should take. Keep it specific to them, no jargon.`,
      systemPrompt: MASTER_PERSONA,
    })
      .then((result) => {
        summaryRef.current = result?.output ?? '';
      })
      .catch(() => {
        summaryRef.current = '';
      })
      .finally(() => setAiDone(true));
  }, [invoke, firstName, situationType, storedAnswers, finalSelection, finalText]);

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
