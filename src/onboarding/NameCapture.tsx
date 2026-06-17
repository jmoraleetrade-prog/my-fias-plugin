import { useEffect, useState } from 'react';
import { usePersistentState, useFiasTheme } from '@fias/arche-sdk';
import { SituationType, SITUATION_EMOJIS, SITUATION_NAME_RESPONSES } from './onboardingData';

export function NameCapture({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onHome: () => void;
  onBack: () => void;
  onReset?: () => void;
}) {
  const theme = useFiasTheme();
  const [situationType] = usePersistentState<SituationType | null>('situation-type', null);
  const [name, setName] = usePersistentState('user-name', '');
  const [draft, setDraft] = useState(name);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    setDraft(name);
  }, [name]);

  if (!theme) return null;

  const firstWord = draft.trim().split(/\s+/)[0] || '';
  const emoji = situationType ? SITUATION_EMOJIS[situationType] : '👋';
  const response =
    situationType && firstWord
      ? SITUATION_NAME_RESPONSES[situationType].replace('[name]', firstWord)
      : '';

  const handleSubmit = () => {
    if (!firstWord) return;
    setName(firstWord);
    onNext();
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: '#0F2554',
        fontFamily: theme.fonts.body,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '72px 24px 120px',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      <style>
        {`@keyframes nameRespIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}
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
          fontWeight: 600,
          color: '#ffffff',
          cursor: 'pointer',
        }}
      >
        ← Back
      </button>

      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <div style={{ fontSize: 48, lineHeight: 1 }} aria-hidden>
          {emoji}
        </div>
        <h1 style={{ margin: '20px 0 0', fontSize: 24, fontWeight: 800, color: '#ffffff' }}>
          What should we call you?
        </h1>
        <p style={{ margin: '8px 0 28px', fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
          Just your first name is fine
        </p>

        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleSubmit();
          }}
          placeholder="First name"
          autoComplete="given-name"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            height: 56,
            padding: '0 20px',
            borderRadius: 16,
            border: `2px solid ${focused ? '#0AAFAA' : 'rgba(255,255,255,0.2)'}`,
            background: 'rgba(255,255,255,0.1)',
            color: '#ffffff',
            fontSize: 18,
            fontFamily: theme.fonts.body,
            outline: 'none',
            boxShadow: focused ? '0 0 0 4px rgba(10,175,170,0.2)' : 'none',
            transition: 'border-color 200ms ease, box-shadow 200ms ease',
          }}
        />

        {response ? (
          <p
            style={{
              margin: '20px 0 0',
              fontSize: 15,
              color: '#0AAFAA',
              fontWeight: 500,
              lineHeight: 1.6,
              animation: 'nameRespIn 400ms ease',
            }}
          >
            {response}
          </p>
        ) : null}
      </div>

      {firstWord ? (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '12px 16px 20px', zIndex: 25 }}>
          <button
            type="button"
            onClick={handleSubmit}
            style={{
              width: '100%',
              maxWidth: 460,
              display: 'block',
              margin: '0 auto',
              height: 54,
              border: 'none',
              borderRadius: 50,
              background: 'linear-gradient(135deg, #0AAFAA, #0891B2)',
              color: '#ffffff',
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(10,175,170,0.35)',
            }}
          >
            Continue
          </button>
        </div>
      ) : null}
    </div>
  );
}
