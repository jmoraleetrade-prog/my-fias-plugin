import { useEffect, useState } from 'react';
import { useFiasTheme, usePersistentState, useFiasStorage } from '@fias/arche-sdk';
import { WelcomeScreen } from './onboarding/WelcomeScreen';
import { OnboardingShell } from './onboarding/OnboardingShell';
import { SituationSelection } from './onboarding/SituationSelection';
import { NameCapture } from './onboarding/NameCapture';
import { PathQuestions } from './onboarding/PathQuestions';
import { OpenFinalQuestion } from './onboarding/OpenFinalQuestion';
import { AISummaryLoading } from './onboarding/AISummaryLoading';
import { AISummaryDisplay } from './onboarding/AISummaryDisplay';
import { VelocityScoreReveal } from './onboarding/VelocityScoreReveal';
import { DailyCheckInSetup } from './onboarding/DailyCheckInSetup';
import { Dashboard } from './dashboard/Dashboard';
import { BRAND } from './onboarding/onboardingData';

export function App() {
  const theme = useFiasTheme();
  const storage = useFiasStorage();
  const [persistedStep, setPersistedStep] = usePersistentState<number>('onboarding-step', 0);
  const [persistedComplete, setPersistedComplete] = usePersistentState('onboarding-complete', false);
  const [aiSummary, setAiSummary] = usePersistentState('ai-summary', '');
  const [name, setName] = usePersistentState('user-name', '');
  const [situationType, setSituationType] = usePersistentState('situation-type', null as null | string);
  const [, setFinalFreeText] = usePersistentState('final-free-text', '');
  const [, setPathAnswers] = usePersistentState<Record<string, unknown>>('path-answers', {});
  const [step, setStep] = useState(0);
  const [hasResume, setHasResume] = useState(false);

  useEffect(() => {
    setHasResume(!persistedComplete && persistedStep > 0);
  }, [persistedComplete, persistedStep]);

  if (!theme) return null;

  const goTo = (nextStep: number) => {
    setStep(nextStep);
    setPersistedStep(nextStep);
  };

  const goHome = () => setStep(0);

  const resetOnboarding = async () => {
    const keys = [
      'onboarding-step',
      'onboarding-complete',
      'ai-summary',
      'user-name',
      'situation-type',
      'final-free-text',
      'final-selection',
      'path-answers',
      'daily-checkin-time',
    ];

    await Promise.all(
      keys.map((key) => storage.deleteFile(`__state/${key}`).catch(() => undefined))
    );

    setStep(0);
    setPersistedStep(0);
    setPersistedComplete(false);
    setAiSummary('');
    setName('');
    setSituationType(null);
    setFinalFreeText('');
    setPathAnswers({});
    setHasResume(false);
  };

  const finishOnboarding = () => {
    setPersistedComplete(true);
    setStep(9);
    setPersistedStep(9);
  };

  if (persistedComplete || step === 9) {
    return <Dashboard userName={name} onReset={resetOnboarding} />;
  }

  switch (step) {
    case 0:
      return (
        <WelcomeScreen
          onNext={() => goTo(1)}
          onHome={goHome}
          onContinue={() => goTo(persistedStep)}
          onRestart={() => {
            resetOnboarding();
            goTo(1);
          }}
          hasResume={hasResume}
          onReset={resetOnboarding}
        />
      );
    case 1:
      return <SituationSelection onNext={() => goTo(2)} onHome={goHome} onBack={() => goTo(0)} onReset={resetOnboarding} />;
    case 2:
      return <NameCapture onNext={() => goTo(3)} onHome={goHome} onBack={() => goTo(1)} onReset={resetOnboarding} />;
    case 3:
      if (!situationType) {
        goTo(1);
        return null;
      }
      return (
        <PathQuestions
          situationType={situationType as any}
          onBack={() => goTo(2)}
          onNext={() => goTo(4)}
          onHome={goHome}
          onReset={resetOnboarding}
        />
      );
    case 4:
      return <OpenFinalQuestion onNext={() => goTo(5)} onHome={goHome} onBack={() => goTo(3)} onReset={resetOnboarding} />;
    case 5:
      return (
        <AISummaryLoading
          name={name}
          onComplete={(summary) => {
            setAiSummary(summary);
            goTo(6);
          }}
          onHome={goHome}
          onBack={() => goTo(4)}
          onReset={resetOnboarding}
        />
      );
    case 6:
      return <AISummaryDisplay summary={aiSummary} onNext={() => goTo(7)} onHome={goHome} onBack={() => goTo(4)} onReset={resetOnboarding} />;
    case 7:
      return <VelocityScoreReveal onNext={() => goTo(8)} onHome={goHome} onBack={() => goTo(6)} onReset={resetOnboarding} />;
    case 8:
      return <DailyCheckInSetup onNext={finishOnboarding} onHome={goHome} onBack={() => goTo(7)} onReset={resetOnboarding} />;
    default:
      return (
        <WelcomeScreen
          onNext={() => goTo(1)}
          onHome={goHome}
          onContinue={() => goTo(persistedStep)}
          onRestart={() => {
            resetOnboarding();
            goTo(1);
          }}
          hasResume={hasResume}
          onReset={resetOnboarding}
        />
      );
  }
}
