import { useEffect, useRef, useState } from 'react';
import { usePersistentState, useFiasTheme } from '@fias/arche-sdk';
import { PATH_QUESTION_SETS, SituationType } from './onboardingData';
import { OnboardingScaffold, answerColumns, ContinueBar, Affirmation } from './OnboardingScaffold';

type PathAnswerRecord = Record<number, string>;

type PathAnswersStorage = Record<SituationType, PathAnswerRecord>;

export function PathQuestions({
  situationType,
  onBack,
  onNext,
  onHome,
}: {
  situationType: SituationType;
  onBack: () => void;
  onNext: () => void;
  onHome: () => void;
  onReset?: () => void;
}) {
  const theme = useFiasTheme();
  const [storedAnswers, setStoredAnswers] = usePersistentState<PathAnswersStorage>('path-answers', {} as PathAnswersStorage);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [affirmation, setAffirmation] = useState('');
  const [showAffirmation, setShowAffirmation] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const questions = PATH_QUESTION_SETS[situationType];
  const currentAnswers = storedAnswers[situationType] || {};
  const selectedValue = currentAnswers[currentQuestionIndex] || '';

  useEffect(() => {
    setCurrentQuestionIndex(0);
  }, [situationType]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  useEffect(() => clearTimers, []);

  if (!theme) return null;

  const currentQuestion = questions[currentQuestionIndex];
  const isLast = currentQuestionIndex >= questions.length - 1;
  const columns = answerColumns(currentQuestion.options.length);

  const handleSelect = (value: string, affirmationText: string) => {
    setStoredAnswers({
      ...storedAnswers,
      [situationType]: {
        ...currentAnswers,
        [currentQuestionIndex]: value,
      },
    });

    clearTimers();
    setShowAffirmation(false);
    setAffirmation(affirmationText);
    // Affirmation slides in 500ms after selection, then disappears after 2.5s.
    timersRef.current.push(setTimeout(() => setShowAffirmation(true), 500));
    timersRef.current.push(setTimeout(() => setShowAffirmation(false), 3000));
  };

  const handleContinue = () => {
    clearTimers();
    setShowAffirmation(false);
    if (!isLast) {
      setCurrentQuestionIndex((index) => index + 1);
    } else {
      onNext();
    }
  };

  const handleBack = () => {
    clearTimers();
    setShowAffirmation(false);
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((index) => index - 1);
      return;
    }
    onBack();
  };

  return (
    <OnboardingScaffold
      onHome={onHome}
      onBack={handleBack}
      progressPercent={((currentQuestionIndex + 1) / questions.length) * 100}
      progressLabel={`Question ${currentQuestionIndex + 1} of ${questions.length}`}
    >
      <h2
        style={{
          margin: 0,
          padding: '16px 20px 12px',
          fontSize: 22,
          fontWeight: 800,
          color: '#0F2554',
          lineHeight: 1.3,
        }}
      >
        {currentQuestion.question}
      </h2>

      <div
        style={{
          padding: '0 20px 140px',
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: 10,
        }}
      >
        {currentQuestion.options.map((option) => {
          const isActive = selectedValue === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value, option.affirmation)}
              style={{
                width: '100%',
                display: 'block',
                textAlign: 'left',
                padding: '16px 20px',
                borderRadius: 14,
                border: isActive ? '2px solid #0AAFAA' : '1.5px solid #e2e8f0',
                background: isActive ? 'linear-gradient(135deg, #f0fffe, #e6faf9)' : '#ffffff',
                color: isActive ? '#0F2554' : '#374151',
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                fontFamily: theme.fonts.body,
                cursor: 'pointer',
                boxShadow: isActive ? '0 0 0 3px rgba(10,175,170,0.15)' : 'none',
                transition: 'all 200ms ease',
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {showAffirmation ? <Affirmation text={affirmation} /> : null}

      <ContinueBar
        label={isLast ? 'Continue' : 'Next question'}
        onClick={handleContinue}
        visible={Boolean(selectedValue)}
      />
    </OnboardingScaffold>
  );
}
