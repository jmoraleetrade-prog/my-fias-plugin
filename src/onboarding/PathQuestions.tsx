import { useEffect, useRef, useState } from 'react';
import { usePersistentState, useFiasTheme } from '@fias/arche-sdk';
import { PATH_QUESTION_SETS, PathQuestion, SituationType } from './onboardingData';
import { OnboardingScaffold, answerColumns, ContinueBar, Affirmation } from './OnboardingScaffold';

type PathAnswerRecord = Record<number, string>;
type PathAnswersStorage = Record<string, PathAnswerRecord>;

/** Columns for a choice question: explicit override wins, else the default fit. */
function columnsFor(question: PathQuestion): number {
  if (question.kind !== 'choice') return 1;
  return question.columns ?? answerColumns(question.options.length);
}

export function PathQuestions({
  situationType,
  onBack,
  onNext,
  onHome,
}: {
  situationType: SituationType;
  onBack: () => void;
  onNext: (answers: Record<number, string>) => void;
  onHome: () => void;
  onReset?: () => void;
}) {
  const theme = useFiasTheme();
  const [storedAnswers, setStoredAnswers] = usePersistentState<PathAnswersStorage>('path-answers', {});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [affirmation, setAffirmation] = useState('');
  const [showAffirmation, setShowAffirmation] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const questions = PATH_QUESTION_SETS[situationType] ?? [];
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

  if (!theme || questions.length === 0) return null;

  const currentQuestion = questions[currentQuestionIndex];
  const isLast = currentQuestionIndex >= questions.length - 1;
  const hasAnswer = Boolean(selectedValue && selectedValue.trim());

  const storeAnswer = (value: string) => {
    setStoredAnswers({
      ...storedAnswers,
      [situationType]: {
        ...currentAnswers,
        [currentQuestionIndex]: value,
      },
    });
  };

  // Slide a micro-affirmation up 400ms after the answer, hold it for 2.5s.
  const flashAffirmation = (text: string) => {
    clearTimers();
    setShowAffirmation(false);
    setAffirmation(text);
    timersRef.current.push(setTimeout(() => setShowAffirmation(true), 400));
    timersRef.current.push(setTimeout(() => setShowAffirmation(false), 400 + 2500));
  };

  const handleSelect = (value: string, affirmationText: string) => {
    storeAnswer(value);
    flashAffirmation(affirmationText);
  };

  const handleTextCommit = (value: string, affirmationText: string) => {
    if (value.trim()) flashAffirmation(affirmationText);
  };

  const handleContinue = () => {
    clearTimers();
    setShowAffirmation(false);
    if (!isLast) {
      setCurrentQuestionIndex((index) => index + 1);
    } else {
      onNext(currentAnswers);
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
          padding: '16px 20px 14px',
          fontSize: 22,
          fontWeight: 800,
          color: '#0F2554',
          lineHeight: 1.3,
        }}
      >
        {currentQuestion.question}
      </h2>

      {currentQuestion.kind === 'choice' ? (
        <div
          style={{
            padding: '0 20px 150px',
            display: 'grid',
            gridTemplateColumns: `repeat(${columnsFor(currentQuestion)}, minmax(0, 1fr))`,
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
                  padding: '16px 18px',
                  borderRadius: 14,
                  border: isActive ? '2px solid #0AAFAA' : '1.5px solid #e2e8f0',
                  background: isActive ? 'linear-gradient(135deg, #f0fffe, #e6faf9)' : '#ffffff',
                  color: isActive ? '#0F2554' : '#374151',
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  lineHeight: 1.4,
                  fontFamily: theme.fonts.body,
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 0 0 3px rgba(10,175,170,0.15)' : '0 1px 3px rgba(15,37,84,0.05)',
                  transition: 'all 200ms ease',
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ padding: '0 20px 150px' }}>
          <textarea
            value={selectedValue}
            placeholder={currentQuestion.placeholder}
            rows={4}
            onChange={(event) => storeAnswer(event.target.value)}
            onBlur={(event) => handleTextCommit(event.target.value, currentQuestion.affirmation)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '16px 18px',
              borderRadius: 14,
              border: hasAnswer ? '2px solid #0AAFAA' : '1.5px solid #e2e8f0',
              background: '#ffffff',
              color: '#0F2554',
              fontSize: 15,
              lineHeight: 1.5,
              fontFamily: theme.fonts.body,
              resize: 'vertical',
              outline: 'none',
              boxShadow: hasAnswer ? '0 0 0 3px rgba(10,175,170,0.15)' : 'none',
              transition: 'all 200ms ease',
            }}
          />
        </div>
      )}

      {showAffirmation ? <Affirmation text={affirmation} /> : null}

      <ContinueBar label={isLast ? 'Continue' : 'Next question'} onClick={handleContinue} visible={hasAnswer} />
    </OnboardingScaffold>
  );
}
