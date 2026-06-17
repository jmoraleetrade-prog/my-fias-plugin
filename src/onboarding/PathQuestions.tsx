import { useEffect, useState } from 'react';
import { usePersistentState, useFiasTheme } from '@fias/arche-sdk';
import { BRAND, PATH_QUESTION_SETS, SituationType } from './onboardingData';
import { OnboardingShell } from './OnboardingShell';

type PathAnswerRecord = Record<number, string>;

type PathAnswersStorage = Record<SituationType, PathAnswerRecord>;

export function PathQuestions({
  situationType,
  onBack,
  onNext,
  onHome,
  onReset,
}: {
  situationType: SituationType;
  onBack: () => void;
  onNext: () => void;
  onHome: () => void;
  onReset?: () => void;
}) {
  const theme = useFiasTheme();
  const [mounted, setMounted] = useState(false);
  const [storedAnswers, setStoredAnswers] = usePersistentState<PathAnswersStorage>('path-answers', {} as PathAnswersStorage);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [affirmation, setAffirmation] = useState('');
  const [showAffirmation, setShowAffirmation] = useState(false);

  const questions = PATH_QUESTION_SETS[situationType];
  const currentAnswers = storedAnswers[situationType] || {};
  const selectedValue = currentAnswers[currentQuestionIndex] || '';

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    setCurrentQuestionIndex(0);
  }, [situationType]);

  if (!theme) return null;

  const currentQuestion = questions[currentQuestionIndex];

  const handleSelect = (value: string, affirmationText: string) => {
    setStoredAnswers({
      ...storedAnswers,
      [situationType]: {
        ...currentAnswers,
        [currentQuestionIndex]: value,
      },
    });
    setAffirmation(affirmationText);
    setShowAffirmation(true);

    setTimeout(() => {
      setShowAffirmation(false);
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((index) => index + 1);
      } else {
        onNext();
      }
    }, 1500);
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((index) => index - 1);
      return;
    }
    onBack();
  };

  return (
    <OnboardingShell onHome={onHome} onBack={onBack} onReset={onReset}>
      <div
        style={{
          minHeight: '100vh',
          width: '100%',
          padding: theme.spacing.xl,
          backgroundColor: '#F8FAFC',
          display: 'flex',
          justifyContent: 'center',
          fontFamily: theme.fonts.body,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at top left, rgba(10,175,170,0.12), transparent 28%), radial-gradient(circle at bottom right, rgba(102,126,234,0.08), transparent 30%)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            width: '100%',
            maxWidth: '48rem',
            position: 'relative',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 320ms ease, transform 320ms ease',
          }}
        >
          <div style={{ marginBottom: theme.spacing.md, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.sm }}>
            <button
              type="button"
              onClick={handleBack}
              style={{
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                color: '#6B7280',
                fontSize: 13,
                cursor: 'pointer',
                padding: '10px 14px',
                borderRadius: 999,
                fontWeight: 600,
              }}
            >
              ← Back
            </button>
            <div style={{ width: '100%', marginLeft: theme.spacing.sm, marginRight: theme.spacing.sm, height: 4, background: '#E5E7EB', borderRadius: 999 }}>
              <div
                style={{
                  width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
                  height: '100%',
                  borderRadius: 999,
                  background: 'linear-gradient(135deg, #0AAFAA, #0891B2)',
                  transition: 'width 300ms ease',
                }}
              />
            </div>
            <div style={{ minWidth: 72, textAlign: 'right', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#0AAFAA', fontWeight: 700 }}>
              Question {currentQuestionIndex + 1} of {questions.length}
            </div>
          </div>

          <section
            style={{
              borderRadius: 24,
              background: '#ffffff',
              boxShadow: '0 20px 60px rgba(15,23,42,0.08)',
              padding: '32px',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontFamily: theme.fonts.heading,
                fontSize: 32,
                lineHeight: 1.05,
                color: '#0F172A',
                fontWeight: 800,
              }}
            >
              {currentQuestion.question}
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 20,
                marginTop: 28,
              }}
            >
              {currentQuestion.options.map((option) => {
                const isActive = selectedValue === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value, option.affirmation)}
                    disabled={showAffirmation}
                    style={{
                      width: '100%',
                      minHeight: '10.5rem',
                      padding: '24px',
                      borderRadius: 24,
                      border: '1px solid #E5E7EB',
                      background: isActive ? 'linear-gradient(135deg, #0AAFAA, #0891B2)' : '#ffffff',
                      boxShadow: isActive ? '0 20px 40px rgba(10,175,170,0.2)' : '0 10px 30px rgba(15,23,42,0.06)',
                      color: isActive ? '#ffffff' : '#0F172A',
                      cursor: showAffirmation ? 'not-allowed' : 'pointer',
                      opacity: showAffirmation ? 0.6 : 1,
                      fontFamily: theme.fonts.body,
                      fontSize: 16,
                      fontWeight: 700,
                      lineHeight: 1.6,
                      textAlign: 'center',
                      transition: 'transform 200ms ease, box-shadow 200ms ease, background-color 200ms ease, border-color 200ms ease, opacity 200ms ease',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                    onMouseEnter={(event) => {
                      if (!showAffirmation) (event.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(event) => {
                      (event.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            {showAffirmation ? (
              <div
                style={{
                  position: 'fixed',
                  left: '50%',
                  bottom: 24,
                  transform: 'translateX(-50%)',
                  zIndex: 10,
                  padding: '14px 22px',
                  borderRadius: 999,
                  background: '#0AAFAA',
                  color: '#ffffff',
                  boxShadow: '0 16px 40px rgba(10,175,170,0.22)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 15,
                  animation: 'slideUp 320ms ease forwards',
                }}
              >
                <span>✨</span>
                <span>{affirmation}</span>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </OnboardingShell>
  );
}
