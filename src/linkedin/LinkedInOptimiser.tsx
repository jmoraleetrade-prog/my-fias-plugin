import { useState } from 'react';
import { useFiasDataStore, useEntityInvocation } from '@fias/arche-sdk';
import {
  ScreenShell,
  Card,
  CTAButton,
  AILabel,
  TextField,
  TextArea,
} from '../components/shared/ScreenShell';
import type { FeatureProps } from '../components/shared/ScreenShell';
import { LoadingState } from '../components/shared/LoadingState';
import { ErrorState } from '../components/shared/ErrorState';
import { ScoreRing } from '../components/shared/ScoreRing';
import { CopyButton } from '../components/shared/CopyButton';
import { COL, logToStore, ELEVATE } from '../utils/elevate';
import {
  MASTER_PERSONA,
  buildUserContext,
  parseAiJson,
  safeScore,
  safeArray,
  saveToVault,
} from '../utils/aiHelpers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LinkedInResult {
  strengthBefore: number;
  strengthAfter: number;
  headlineAlternatives: string[];
  aboutRewrite: string;
  experienceRewrite: string;
  skillsToAdd: string[];
  skillsToRemove: string[];
  connectionMessage: string;
  implementationSteps: string[];
}

type Screen = 'input' | 'loading' | 'results';

// ---------------------------------------------------------------------------
// Character counter helper
// ---------------------------------------------------------------------------

function CharCounter({
  current,
  max,
}: {
  current: number;
  max: number;
}) {
  const remaining = max - current;
  const color = remaining < 0 ? '#EF4444' : remaining < max * 0.1 ? '#F59E0B' : ELEVATE.muted;
  return (
    <div style={{ fontSize: 12, color, textAlign: 'right', marginTop: 4 }}>
      {current}/{max}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section heading helper
// ---------------------------------------------------------------------------

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 15,
        fontWeight: 700,
        color: ELEVATE.navy,
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pill list (skills)
// ---------------------------------------------------------------------------

function PillList({
  items,
  color,
  bg,
}: {
  items: string[];
  color: string;
  bg: string;
}) {
  if (items.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
      {items.map((item, i) => (
        <span
          key={i}
          style={{
            padding: '6px 14px',
            borderRadius: 99,
            fontSize: 13,
            fontWeight: 600,
            color,
            background: bg,
          }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Strength tracker (before / after)
// ---------------------------------------------------------------------------

function StrengthTracker({
  before,
  after,
}: {
  before: number;
  after: number;
}) {
  return (
    <Card style={{ marginBottom: 16, animation: 'elvFadeIn 350ms ease' }}>
      <SectionHeading>Profile Strength Tracker</SectionHeading>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: ELEVATE.muted,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              marginBottom: 8,
            }}
          >
            Before
          </div>
          <ScoreRing score={before} size={110} label="/100" strokeWidth={10} />
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ fontSize: 28, color: ELEVATE.teal }}>→</span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#10B981',
              background: 'rgba(16,185,129,0.10)',
              padding: '4px 12px',
              borderRadius: 99,
            }}
          >
            +{Math.max(0, after - before)} pts
          </span>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: ELEVATE.muted,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              marginBottom: 8,
            }}
          >
            Projected
          </div>
          <ScoreRing score={after} size={110} label="/100" strokeWidth={10} />
        </div>
      </div>
      <AILabel />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function LinkedInOptimiser({
  profile,
  isPro: _isPro,
  onHome,
  onBack,
  onNavigate,
}: FeatureProps) {
  const ds = useFiasDataStore();
  const { invoke, isLoading } = useEntityInvocation();

  // Screen state
  const [screen, setScreen] = useState<Screen>('input');

  // Input state
  const [headline, setHeadline] = useState('');
  const [about, setAbout] = useState('');
  const [experience, setExperience] = useState('');
  const [skills, setSkills] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Result state
  const [result, setResult] = useState<LinkedInResult | null>(null);

  // isPro always true per spec
  void _isPro;

  // ---------------------------------------------------------------------------
  // Run optimisation
  // ---------------------------------------------------------------------------

  async function runOptimise() {
    if (!headline.trim() && !about.trim() && !experience.trim()) return;
    setError(null);
    setScreen('loading');

    const inputKey = `linkedin-input-${Date.now()}`;

    // Save inputs to dataStore BEFORE AI call
    try {
      await ds.put<Record<string, unknown>>(COL.vault, inputKey, {
        headline,
        about,
        experience,
        skills,
        savedAt: new Date().toISOString(),
      });
    } catch (err) {
      await logToStore('LinkedInOptimiser.saveInput', err);
    }

    try {
      const systemPrompt = `${MASTER_PERSONA}\n${buildUserContext(profile)}\n\nReturn ONLY valid JSON: {"strengthBefore":number,"strengthAfter":number,"headlineAlternatives":[string,string,string],"aboutRewrite":string,"experienceRewrite":string,"skillsToAdd":[string],"skillsToRemove":[string],"connectionMessage":string,"implementationSteps":[string]}`;

      const input = `Headline: ${headline}\nAbout: ${about}\nExperience: ${experience}\nSkills: ${skills}\nTarget role: ${profile.targetRole ?? 'not specified'}`;

      const res = await invoke({
        entityId: { capability: 'text-standard' },
        input,
        systemPrompt,
      });

      const out = res?.output ?? '';
      const parsed = parseAiJson<LinkedInResult>(out);

      if (!parsed) {
        throw new Error('Could not parse optimisation response');
      }

      const optimised: LinkedInResult = {
        strengthBefore: safeScore(parsed.strengthBefore, 30),
        strengthAfter: safeScore(parsed.strengthAfter, 60),
        headlineAlternatives: safeArray<string>(parsed.headlineAlternatives).slice(0, 3),
        aboutRewrite: typeof parsed.aboutRewrite === 'string' ? parsed.aboutRewrite : '',
        experienceRewrite: typeof parsed.experienceRewrite === 'string' ? parsed.experienceRewrite : '',
        skillsToAdd: safeArray<string>(parsed.skillsToAdd),
        skillsToRemove: safeArray<string>(parsed.skillsToRemove),
        connectionMessage: typeof parsed.connectionMessage === 'string' ? parsed.connectionMessage : '',
        implementationSteps: safeArray<string>(parsed.implementationSteps),
      };

      // Save result to vault
      await saveToVault(`linkedin-result-${inputKey}`, {
        inputKey,
        strengthBefore: optimised.strengthBefore,
        strengthAfter: optimised.strengthAfter,
        aboutRewrite: optimised.aboutRewrite,
        experienceRewrite: optimised.experienceRewrite,
        headlineAlternatives: optimised.headlineAlternatives,
        optimisedAt: new Date().toISOString(),
      });

      setResult(optimised);
      setScreen('results');
    } catch (err) {
      await logToStore('LinkedInOptimiser.runOptimise', err);
      setError("We couldn't optimise your profile right now. Please try again in a moment.");
      setScreen('input');
    }
  }

  // ---------------------------------------------------------------------------
  // LOADING screen
  // ---------------------------------------------------------------------------

  if (screen === 'loading') {
    return (
      <ScreenShell
        title="LinkedIn Optimiser"
        onBack={onBack}
        onHome={onHome}
        onNavigate={onNavigate}
      >
        <LoadingState
          messages={[
            'Reading your profile...',
            'Scoring your current strength...',
            'Rewriting with achievement-led language...',
            'Generating headline alternatives...',
            'Building your implementation guide...',
          ]}
        />
      </ScreenShell>
    );
  }

  // ---------------------------------------------------------------------------
  // RESULTS screen
  // ---------------------------------------------------------------------------

  if (screen === 'results' && result) {
    return (
      <ScreenShell
        title="LinkedIn Optimiser"
        onBack={() => setScreen('input')}
        onHome={onHome}
        onNavigate={onNavigate}
      >
        {/* Strength tracker (before / after) */}
        <StrengthTracker before={result.strengthBefore} after={result.strengthAfter} />

        {/* Headline alternatives */}
        <Card style={{ marginBottom: 16, animation: 'elvFadeIn 400ms ease' }}>
          <SectionHeading>✨ Optimised Headlines</SectionHeading>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: ELEVATE.muted, lineHeight: 1.5 }}>
            Three alternatives — pick the one that fits best.
          </p>
          {result.headlineAlternatives.map((alt, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 12,
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                marginBottom: i < result.headlineAlternatives.length - 1 ? 10 : 0,
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: ELEVATE.teal,
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    marginBottom: 4,
                  }}
                >
                  Option {i + 1}
                </div>
                <p style={{ margin: 0, fontSize: 14, color: ELEVATE.text, lineHeight: 1.5, fontWeight: 600 }}>
                  {alt}
                </p>
              </div>
              <CopyButton text={alt} label="Copy" />
            </div>
          ))}
          <AILabel />
        </Card>

        {/* About rewrite */}
        {result.aboutRewrite && (
          <Card style={{ marginBottom: 16, animation: 'elvFadeIn 480ms ease' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <SectionHeading>About Section Rewrite</SectionHeading>
              <CopyButton text={result.aboutRewrite} label="Copy About" />
            </div>
            <div
              style={{
                background: '#f8fafc',
                borderRadius: 12,
                padding: 16,
                fontSize: 14,
                color: ELEVATE.text,
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {result.aboutRewrite}
            </div>
            <AILabel />
          </Card>
        )}

        {/* Experience rewrite */}
        {result.experienceRewrite && (
          <Card style={{ marginBottom: 16, animation: 'elvFadeIn 540ms ease' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <SectionHeading>Experience — Achievement-Led Rewrite</SectionHeading>
              <CopyButton text={result.experienceRewrite} label="Copy Experience" />
            </div>
            <div
              style={{
                background: '#f8fafc',
                borderRadius: 12,
                padding: 16,
                fontSize: 14,
                color: ELEVATE.text,
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {result.experienceRewrite}
            </div>
            <AILabel />
          </Card>
        )}

        {/* Skills to add / remove */}
        {(result.skillsToAdd.length > 0 || result.skillsToRemove.length > 0) && (
          <Card style={{ marginBottom: 16, animation: 'elvFadeIn 580ms ease' }}>
            <SectionHeading>Skills Recommendations</SectionHeading>

            {result.skillsToAdd.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#10B981',
                    marginBottom: 6,
                  }}
                >
                  + Add these skills
                </div>
                <PillList
                  items={result.skillsToAdd}
                  color="#065F46"
                  bg="rgba(16,185,129,0.12)"
                />
              </div>
            )}

            {result.skillsToRemove.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#EF4444',
                    marginBottom: 6,
                  }}
                >
                  − Remove or deprioritise
                </div>
                <PillList
                  items={result.skillsToRemove}
                  color="#7F1D1D"
                  bg="rgba(239,68,68,0.10)"
                />
              </div>
            )}
            <AILabel />
          </Card>
        )}

        {/* Connection message */}
        {result.connectionMessage && (
          <Card style={{ marginBottom: 16, animation: 'elvFadeIn 620ms ease' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <SectionHeading>Connection Request Message</SectionHeading>
              <CopyButton text={result.connectionMessage} label="Copy Message" />
            </div>
            <div
              style={{
                background: '#f8fafc',
                borderRadius: 12,
                padding: 16,
                fontSize: 14,
                color: ELEVATE.text,
                lineHeight: 1.7,
                fontStyle: 'italic',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              "{result.connectionMessage}"
            </div>
            <AILabel />
          </Card>
        )}

        {/* Implementation guide */}
        {result.implementationSteps.length > 0 && (
          <Card style={{ marginBottom: 16, animation: 'elvFadeIn 660ms ease' }}>
            <SectionHeading>Implementation Guide</SectionHeading>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: ELEVATE.muted, lineHeight: 1.5 }}>
              Apply these changes in order for the biggest impact.
            </p>
            <ol style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
              {result.implementationSteps.map((step, i) => (
                <li
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    marginBottom: i < result.implementationSteps.length - 1 ? 14 : 0,
                    paddingBottom: i < result.implementationSteps.length - 1 ? 14 : 0,
                    borderBottom:
                      i < result.implementationSteps.length - 1 ? '1px solid #f1f5f9' : 'none',
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: ELEVATE.navy,
                      color: '#ffffff',
                      fontSize: 12,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {i + 1}
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      color: ELEVATE.text,
                      lineHeight: 1.55,
                      paddingTop: 4,
                    }}
                  >
                    {step}
                  </span>
                </li>
              ))}
            </ol>
            <AILabel />
          </Card>
        )}

        <div style={{ height: 32 }} />
      </ScreenShell>
    );
  }

  // ---------------------------------------------------------------------------
  // INPUT screen (default)
  // ---------------------------------------------------------------------------

  const canOptimise = (headline.trim() || about.trim() || experience.trim()) && !isLoading;

  return (
    <ScreenShell
      title="LinkedIn Optimiser"
      onBack={onBack}
      onHome={onHome}
      onNavigate={onNavigate}
      footer={
        <CTAButton
          label={isLoading ? 'Optimising...' : 'Optimise my profile ✨'}
          onClick={() => void runOptimise()}
          disabled={!canOptimise}
        />
      }
    >
      {/* Page heading */}
      <div style={{ marginBottom: 20, animation: 'elvFadeIn 300ms ease' }}>
        <h1
          style={{
            margin: '0 0 6px',
            fontSize: 26,
            fontWeight: 900,
            color: ELEVATE.navy,
            lineHeight: 1.2,
          }}
        >
          LinkedIn Optimiser
        </h1>
        <p style={{ margin: 0, fontSize: 15, color: ELEVATE.muted, lineHeight: 1.6 }}>
          Get a strength score, rewritten sections, and a step-by-step plan to stand out.
        </p>
      </div>

      {/* Instructions card */}
      <Card style={{ marginBottom: 16, animation: 'elvFadeIn 350ms ease' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 28, lineHeight: 1 }} aria-hidden>
            💡
          </span>
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: ELEVATE.navy,
                marginBottom: 6,
              }}
            >
              How it works
            </div>
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                fontSize: 13,
                color: ELEVATE.text,
                lineHeight: 1.7,
              }}
            >
              <li>Paste your current LinkedIn sections below</li>
              <li>Elevate scores your profile before and after</li>
              <li>You get rewritten sections, skill gaps, and a connection message</li>
              <li>Fill in as many fields as you can for the best results</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Headline input */}
      <Card style={{ marginBottom: 16, animation: 'elvFadeIn 400ms ease' }}>
        <label
          htmlFor="li-headline"
          style={{
            display: 'block',
            fontWeight: 700,
            fontSize: 15,
            color: ELEVATE.navy,
            marginBottom: 6,
          }}
        >
          Headline
        </label>
        <p style={{ margin: '0 0 10px', fontSize: 13, color: ELEVATE.muted, lineHeight: 1.5 }}>
          Your current LinkedIn headline — the line just below your name.
        </p>
        <TextField
          id="li-headline"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="e.g. Senior Product Manager | SaaS | Building teams that ship"
          maxLength={220}
        />
        <CharCounter current={headline.length} max={220} />
      </Card>

      {/* About input */}
      <Card style={{ marginBottom: 16, animation: 'elvFadeIn 450ms ease' }}>
        <label
          htmlFor="li-about"
          style={{
            display: 'block',
            fontWeight: 700,
            fontSize: 15,
            color: ELEVATE.navy,
            marginBottom: 6,
          }}
        >
          About section
        </label>
        <p style={{ margin: '0 0 10px', fontSize: 13, color: ELEVATE.muted, lineHeight: 1.5 }}>
          Paste your current "About" section, or leave blank if you don't have one yet.
        </p>
        <TextArea
          id="li-about"
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          placeholder="Paste your About section here..."
          rows={6}
          style={{ minHeight: 140 }}
          maxLength={2600}
        />
        <CharCounter current={about.length} max={2600} />
      </Card>

      {/* Experience input */}
      <Card style={{ marginBottom: 16, animation: 'elvFadeIn 500ms ease' }}>
        <label
          htmlFor="li-experience"
          style={{
            display: 'block',
            fontWeight: 700,
            fontSize: 15,
            color: ELEVATE.navy,
            marginBottom: 6,
          }}
        >
          Most recent role — Experience section
        </label>
        <p style={{ margin: '0 0 10px', fontSize: 13, color: ELEVATE.muted, lineHeight: 1.5 }}>
          Paste your most recent role description from the Experience section.
        </p>
        <TextArea
          id="li-experience"
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
          placeholder="e.g. Led a cross-functional team of 8 to deliver a new payments platform..."
          rows={5}
          style={{ minHeight: 120 }}
        />
      </Card>

      {/* Skills input */}
      <Card style={{ marginBottom: 16, animation: 'elvFadeIn 540ms ease' }}>
        <label
          htmlFor="li-skills"
          style={{
            display: 'block',
            fontWeight: 700,
            fontSize: 15,
            color: ELEVATE.navy,
            marginBottom: 6,
          }}
        >
          Skills (comma-separated)
        </label>
        <p style={{ margin: '0 0 10px', fontSize: 13, color: ELEVATE.muted, lineHeight: 1.5 }}>
          List your current LinkedIn skills, separated by commas.
        </p>
        <TextField
          id="li-skills"
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
          placeholder="e.g. Product Management, Agile, SQL, Stakeholder Management"
        />
      </Card>

      {/* Error */}
      {error && (
        <div style={{ marginTop: 16, animation: 'elvFadeIn 200ms ease' }}>
          <ErrorState
            message={error}
            onRetry={() => {
              setError(null);
            }}
          />
        </div>
      )}

      <div style={{ height: 100 }} />
    </ScreenShell>
  );
}
