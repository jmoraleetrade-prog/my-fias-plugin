import { useEffect, useState } from 'react';
import { useFiasTheme, usePersistentState, useFiasStorage, useFiasDataStore } from '@fias/arche-sdk';
import { GdprConsent } from './legal/GdprConsent';
import { WelcomeScreen } from './onboarding/WelcomeScreen';
import { SituationSelection } from './onboarding/SituationSelection';
import { NameCapture } from './onboarding/NameCapture';
import { PathQuestions } from './onboarding/PathQuestions';
import { OpenFinalQuestion } from './onboarding/OpenFinalQuestion';
import { AISummaryLoading } from './onboarding/AISummaryLoading';
import { AISummaryDisplay } from './onboarding/AISummaryDisplay';
import { VelocityScoreReveal } from './onboarding/VelocityScoreReveal';
import { DailyCheckInSetup } from './onboarding/DailyCheckInSetup';
import { EmailCapture } from './onboarding/EmailCapture';
import { Dashboard } from './dashboard/Dashboard';
import { COLLECTIONS, initCollections, logError } from './utils/aiHelpers';

// Step indices for the onboarding flow (after the GDPR gate):
// 0 Welcome · 1 Situation · 2 Name · 3 Path · 4 Final · 5 AI Loading
// 6 AI Summary · 7 Velocity · 8 Daily check-in · 9 Email capture
export function App() {
  const theme = useFiasTheme();
  const storage = useFiasStorage();
  const dataStore = useFiasDataStore();

  const [gdprConsent, setGdprConsent] = usePersistentState<boolean>('gdpr-consent', false);
  const [persistedStep, setPersistedStep] = usePersistentState<number>('onboarding-step', 0);
  const [persistedComplete, setPersistedComplete] = usePersistentState('onboarding-complete', false);
  const [isPro] = usePersistentState<boolean>('is-pro', true);

  const [aiSummary, setAiSummary] = usePersistentState('ai-summary', '');
  const [name, setName] = usePersistentState('user-name', '');
  const [situationType, setSituationType] = usePersistentState('situation-type', null as null | string);
  const [finalFreeText, setFinalFreeText] = usePersistentState('final-free-text', '');
  const [finalSelection, setFinalSelection] = usePersistentState('final-selection', '');
  const [pathAnswers, setPathAnswers] = usePersistentState<Record<string, unknown>>('path-answers', {});
  const [email, setEmail] = usePersistentState('user-email', '');

  const [step, setStep] = useState(0);
  const [hasResume, setHasResume] = useState(false);

  useEffect(() => {
    void initCollections();
  }, []);

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
      'user-email',
      'daily-checkin-time',
    ];

    await Promise.all(
      keys.map((key) => storage.deleteFile(`__state/${key}`).catch(() => undefined)),
    );

    setStep(0);
    setPersistedStep(0);
    setPersistedComplete(false);
    setAiSummary('');
    setName('');
    setSituationType(null);
    setFinalFreeText('');
    setFinalSelection('');
    setPathAnswers({});
    setEmail('');
    setHasResume(false);
  };

  const completeOnboarding = async (capturedEmail?: string) => {
    const nextEmail = capturedEmail ?? email;
    if (capturedEmail) setEmail(capturedEmail);

    try {
      await dataStore.put(COLLECTIONS.profile, 'main', {
        name,
        email: nextEmail,
        situationType: situationType ?? '',
        finalText: finalFreeText,
        finalSelection,
        pathAnswers,
        goals: finalSelection ? [finalSelection] : [],
        aiSummary,
        isPro,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      logError('completeOnboarding.saveProfile', error);
    }

    setPersistedComplete(true);
    setPersistedStep(9);
  };

  // Already onboarded → straight to the dashboard.
  if (persistedComplete) {
    return <Dashboard userName={name} onReset={resetOnboarding} />;
  }

  // Privacy gate before anything else.
  if (!gdprConsent) {
    return <GdprConsent onAccept={() => setGdprConsent(true)} />;
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
      return <DailyCheckInSetup onNext={() => goTo(9)} onHome={goHome} onBack={() => goTo(7)} onReset={resetOnboarding} />;
    case 9:
      return (
        <EmailCapture
          initialEmail={email}
          onSubmit={(captured) => completeOnboarding(captured)}
          onSkip={() => completeOnboarding()}
        />
      );
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
