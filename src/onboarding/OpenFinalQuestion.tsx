import { useEffect, useState } from 'react';
import { usePersistentState, useFiasTheme } from '@fias/arche-sdk';
import { FINAL_QUICK_OPTIONS } from './onboardingData';
import { OnboardingScaffold, ContinueBar } from './OnboardingScaffold';

/** The neurodivergent quick-select chip — selecting it sets profile.neurodivergent. */
const NEURO_CHIP = 'Help me navigate job searching as a neurodivergent person';

export function OpenFinalQuestion({
  onNext,
  onHome,
  onBack,
}: {
  onNext: (payload: { selection: string; text: string; neurodivergent: boolean }) => void;
  onHome: () => void;
  onBack: () => void;
  onReset?: () => void;
}) {
  const theme = useFiasTheme();
  const [name] = usePersistentState('user-name', '');
  const [selectedOption, setSelectedOption] = usePersistentState<string | null>('final-selection', null);
  const [freeText, setFreeText] = usePersistentState('final-free-text', '');
  const [, setNeurodivergent] = usePersistentState('neurodivergent', false);
  const [draft, setDraft] = useState(freeText);

  const quickOptions = [...FINAL_QUICK_OPTIONS, NEURO_CHIP];

  useEffect(() => {
    setDraft(freeText);
  }, [freeText]);

  if (!theme) return null;

  const firstName = (name || '').trim().split(/\s+/)[0];
  const canContinue = Boolean(selectedOption || draft.trim());

  const handleContinue = () => {
    if (!canContinue) return;
    const text = draft.trim();
    const isNeuro = selectedOption === NEURO_CHIP;
    setFreeText(text);
    setNeurodivergent(isNeuro);
    onNext({ selection: selectedOption ?? '', text, neurodivergent: isNeuro });
  };

  return (
    <OnboardingScaffold onHome={onHome} onBack={onBack} progressPercent={100} progressLabel="Last question">
      <h2
        style={{
          margin: 0,
          padding: '16px 20px 14px',
          fontSize: 22,
          fontWeight: 800,
          color: '#0F2554',
          lineHeight: 1.3,
        }}
      >
        {firstName ? `Last one ${firstName} — ` : 'Last one — '}what's the one thing you most want help with?
      </h2>

      <div style={{ padding: '0 20px 150px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          {quickOptions.map((chip) => {
            const isActive = selectedOption === chip;
            return (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  setSelectedOption(isActive ? null : chip);
                  setNeurodivergent(!isActive && chip === NEURO_CHIP);
                }}
                style={{
                  border: isActive ? '1.5px solid #0AAFAA' : '1.5px solid #e2e8f0',
                  borderRadius: 50,
                  padding: '10px 18px',
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  background: isActive ? 'linear-gradient(135deg, #f0fffe, #e6faf9)' : '#ffffff',
                  color: isActive ? '#0AAFAA' : '#374151',
                  cursor: 'pointer',
                  fontFamily: theme.fonts.body,
                  transition: 'all 200ms ease',
                }}
              >
                {chip}
              </button>
            );
          })}
        </div>

        <textarea
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            if (event.target.value.trim()) setSelectedOption(null);
          }}
          placeholder="Something else — tell us in your own words"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            borderRadius: 14,
            border: '2px solid #e2e8f0',
            padding: 16,
            fontSize: 15,
            minHeight: 120,
            fontFamily: theme.fonts.body,
            color: '#374151',
            outline: 'none',
            resize: 'vertical',
            transition: 'border-color 200ms ease',
          }}
          onFocus={(event) => {
            event.currentTarget.style.border = '2px solid #0AAFAA';
          }}
          onBlur={(event) => {
            event.currentTarget.style.border = '2px solid #e2e8f0';
          }}
        />
      </div>

      <ContinueBar label="Continue" onClick={handleContinue} visible={canContinue} />
    </OnboardingScaffold>
  );
}
