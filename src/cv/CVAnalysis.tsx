import { useState, useRef } from 'react';
import { useFiasTheme, useFiasDataStore, useEntityInvocation } from '@fias/arche-sdk';
import {
  ScreenShell,
  Card,
  CTAButton,
  AILabel,
  TextArea,
  TextField,
} from '../components/shared/ScreenShell';
import type { FeatureProps } from '../components/shared/ScreenShell';
import { LoadingState } from '../components/shared/LoadingState';
import { ErrorState } from '../components/shared/ErrorState';
import { EmptyState } from '../components/shared/EmptyState';
import { ScoreRing } from '../components/shared/ScoreRing';
import { CopyButton } from '../components/shared/CopyButton';
import { PrivacyStatement } from '../components/shared/PrivacyStatement';
import {
  ExtendedProfile,
  COL,
  logToStore,
  ELEVATE,
} from '../utils/elevate';
import {
  MASTER_PERSONA,
  buildUserContext,
  parseAiJson,
  safeScore,
  safeArray,
  saveToVault,
  generateRTF,
  downloadFile,
} from '../utils/aiHelpers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CvAnalysisResult {
  overallScore: number;
  categories: {
    formatAts: number;
    achievementLanguage: number;
    relevance: number;
    profileQuality: number;
    completeness: number;
  };
  weaknesses: Array<{
    problem: string;
    whyItMatters: string;
    fix: string;
  }>;
  strengths: string[];
  improvedCv: string;
  keyInsight: string;
  atsFriendly: boolean;
  missingItems: string[];
  hasGaps?: boolean;
  gapAdvice?: string;
  isOverqualified?: boolean;
  overqualifiedAdvice?: string;
}

interface CvVersion {
  key: string;
  cvText: string;
  score: number;
  analysedAt: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

type Mode = 'input' | 'loading' | 'results' | 'chat' | 'builder' | 'history';

// ---------------------------------------------------------------------------
// Helper: category bar
// ---------------------------------------------------------------------------

function CategoryBar({ label, score, max = 20 }: { label: string; score: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (score / max) * 100));
  const color = pct >= 80 ? '#0AAFAA' : pct >= 60 ? '#06B6D4' : pct >= 40 ? '#F59E0B' : '#EF4444';
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: ELEVATE.text, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 13, color: ELEVATE.muted }}>
          {score}/{max}
        </span>
      </div>
      <div
        style={{
          height: 8,
          background: '#e2e8f0',
          borderRadius: 99,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: color,
            borderRadius: 99,
            transition: 'width 700ms ease',
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Builder step keys
// ---------------------------------------------------------------------------

const BUILDER_STEPS = [
  { key: 'fullName', label: 'Full name', type: 'text', hint: 'e.g. Jane Smith' },
  { key: 'contact', label: 'Contact details', type: 'text', hint: 'Email, phone, LinkedIn URL' },
  { key: 'currentRole', label: 'Current or most recent role', type: 'text', hint: 'e.g. Marketing Manager at Acme Ltd' },
  { key: 'responsibilities', label: 'Key responsibilities (3 bullet points)', type: 'textarea', hint: 'List your 3 main responsibilities, one per line' },
  { key: 'achievement', label: 'Biggest achievement in this role', type: 'textarea', hint: 'Be specific — numbers and outcomes work best' },
  { key: 'skills', label: 'Key skills', type: 'text', hint: 'e.g. Project management, Excel, stakeholder engagement' },
  { key: 'education', label: 'Education & qualifications', type: 'text', hint: 'e.g. BA Business, University of Leeds, 2018' },
] as const;

type BuilderKey = (typeof BUILDER_STEPS)[number]['key'];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CVAnalysis({ profile, isPro: _isPro, onHome, onBack, onNavigate }: FeatureProps) {
  const theme = useFiasTheme();
  const ds = useFiasDataStore();

  // Hooks — must be declared unconditionally
  const { invoke: invokeAnalysis, isLoading: analysisLoading } = useEntityInvocation();
  const { invoke: invokeChat, isLoading: chatLoading } = useEntityInvocation();
  const { invoke: invokeBuilder, isLoading: builderLoading } = useEntityInvocation();

  // Mode
  const [mode, setMode] = useState<Mode>('input');
  const [inputTab, setInputTab] = useState<'paste' | 'build'>('paste');

  // Input state
  const [cvText, setCvText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Analysis result
  const [result, setResult] = useState<CvAnalysisResult | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Builder state
  const [builderStep, setBuilderStep] = useState(0);
  const [builderAnswers, setBuilderAnswers] = useState<Partial<Record<BuilderKey, string>>>({});
  const [builderCurrentAnswer, setBuilderCurrentAnswer] = useState('');
  const [builtCv, setBuiltCv] = useState<string | null>(null);

  // History state
  const [history, setHistory] = useState<CvVersion[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeCvId, setActiveCvId] = useState<string | undefined>(profile?.activeCvId);

  if (!theme) return null;

  // isPro is always true per spec
  void _isPro;

  // Capture inputTab before any early returns so TypeScript doesn't narrow the
  // type away when we reference it again at the bottom of the function.
  const currentTab: string = inputTab;

  // ---------------------------------------------------------------------------
  // Analysis
  // ---------------------------------------------------------------------------

  async function runAnalysis() {
    if (!cvText.trim()) return;
    setError(null);
    setMode('loading');

    const cvKey = `cv-${Date.now()}`;

    // Save CV text BEFORE AI call
    try {
      await ds.put<Record<string, unknown>>(COL.cvVersions, cvKey, {
        cvText,
        score: 0,
        analysedAt: new Date().toISOString(),
      });
    } catch (err) {
      await logToStore('CVAnalysis.saveCvBefore', err);
    }

    try {
      const systemPrompt = `${MASTER_PERSONA}\n${buildUserContext(profile)}\n\nAnalyse this CV. Score each category 0-20. Identify top 3 weaknesses with exact problem, why it matters, specific fix. Write complete improved CV with achievement-led language throughout. If there are employment gaps in the CV, set hasGaps to true and provide gapAdvice (how to address if asked — frame sensitively, never clinically). If the candidate appears overqualified for their target role, set isOverqualified to true and overqualifiedAdvice with specific advice. Return ONLY valid JSON: {"overallScore": number, "categories": {"formatAts": number, "achievementLanguage": number, "relevance": number, "profileQuality": number, "completeness": number}, "weaknesses": [{"problem": string, "whyItMatters": string, "fix": string}], "strengths": [string], "improvedCv": string, "keyInsight": string, "atsFriendly": boolean, "missingItems": [string], "hasGaps": boolean, "gapAdvice": string, "isOverqualified": boolean, "overqualifiedAdvice": string}`;

      const input = `CV: ${cvText}\nTarget role: ${profile?.targetRole ?? 'not specified'}\nSector: ${profile?.sector ?? 'not specified'}\nRegion: ${profile?.region ?? 'not specified'}`;

      const res = await invokeAnalysis({
        entityId: { capability: 'text-advanced' },
        input,
        systemPrompt,
      });
      const out = res?.output ?? '';
      const parsed = parseAiJson<CvAnalysisResult>(out);

      if (!parsed) {
        throw new Error('Could not parse analysis response');
      }

      const overallScore = safeScore(parsed.overallScore);
      const analysisResult: CvAnalysisResult = {
        overallScore,
        categories: {
          formatAts: safeScore(parsed.categories?.formatAts, 0),
          achievementLanguage: safeScore(parsed.categories?.achievementLanguage, 0),
          relevance: safeScore(parsed.categories?.relevance, 0),
          profileQuality: safeScore(parsed.categories?.profileQuality, 0),
          completeness: safeScore(parsed.categories?.completeness, 0),
        },
        weaknesses: safeArray<CvAnalysisResult['weaknesses'][0]>(parsed.weaknesses).slice(0, 3),
        strengths: safeArray<string>(parsed.strengths),
        improvedCv: typeof parsed.improvedCv === 'string' ? parsed.improvedCv : '',
        keyInsight: typeof parsed.keyInsight === 'string' ? parsed.keyInsight : '',
        atsFriendly: Boolean(parsed.atsFriendly),
        missingItems: safeArray<string>(parsed.missingItems),
        hasGaps: Boolean(parsed.hasGaps),
        gapAdvice: typeof parsed.gapAdvice === 'string' ? parsed.gapAdvice : '',
        isOverqualified: Boolean(parsed.isOverqualified),
        overqualifiedAdvice: typeof parsed.overqualifiedAdvice === 'string' ? parsed.overqualifiedAdvice : '',
      };

      // Update the cv-version with the actual score
      try {
        await ds.put<Record<string, unknown>>(COL.cvVersions, cvKey, {
          cvText,
          score: overallScore,
          analysedAt: new Date().toISOString(),
        });
      } catch (err) {
        await logToStore('CVAnalysis.updateCvScore', err);
      }

      // Save to vault
      await saveToVault(`cv-analysis-${cvKey}`, {
        cvKey,
        overallScore,
        analysedAt: new Date().toISOString(),
        improvedCv: analysisResult.improvedCv,
      });

      // Patch profile with cvScore
      try {
        const existing = await ds.get<ExtendedProfile & Record<string, unknown>>(COL.profile, 'main');
        const cvScore = Math.round((overallScore / 10) * 10) / 10;
        await ds.put<Record<string, unknown>>(COL.profile, 'main', {
          ...(existing ?? {}),
          cvScore,
        });
      } catch (err) {
        await logToStore('CVAnalysis.patchProfile', err);
      }

      setResult(analysisResult);
      setMode('results');
    } catch (err) {
      await logToStore('CVAnalysis.runAnalysis', err);
      setError("We couldn't analyse your CV right now. Please try again in a moment.");
      setMode('input');
    }
  }

  // ---------------------------------------------------------------------------
  // History
  // ---------------------------------------------------------------------------

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const res = await ds.query<Record<string, unknown>>(COL.cvVersions, {
        orderBy: { field: 'analysedAt', direction: 'desc' },
        limit: 20,
      });
      const versions: CvVersion[] = res.documents.map((d) => ({
        key: d.key,
        cvText: typeof d.data.cvText === 'string' ? d.data.cvText : '',
        score: safeScore(d.data.score),
        analysedAt: typeof d.data.analysedAt === 'string' ? d.data.analysedAt : '',
      }));
      setHistory(versions);
    } catch (err) {
      await logToStore('CVAnalysis.loadHistory', err);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function setActiveVersion(cvVersion: CvVersion) {
    try {
      const existing = await ds.get<ExtendedProfile & Record<string, unknown>>(COL.profile, 'main');
      await ds.put<Record<string, unknown>>(COL.profile, 'main', {
        ...(existing ?? {}),
        activeCvId: cvVersion.key,
      });
      setActiveCvId(cvVersion.key);
      setCvText(cvVersion.cvText);
    } catch (err) {
      await logToStore('CVAnalysis.setActiveVersion', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Chat
  // ---------------------------------------------------------------------------

  async function sendChatMessage() {
    if (!chatInput.trim() || chatMessages.length >= 20 || !result) return;

    const userMsg: ChatMessage = { role: 'user', content: chatInput.trim() };
    const nextMessages = [...chatMessages, userMsg];
    setChatMessages(nextMessages);
    setChatInput('');

    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    try {
      const systemPrompt = `${MASTER_PERSONA}\n\nYou are helping someone understand their CV analysis. Here is their CV:\n\n${cvText}\n\nHere is the analysis:\n${JSON.stringify(result, null, 2)}\n\nAnswer their questions about their CV concisely and practically. Never use: journey, leverage, passionate, results-driven, dynamic, impactful, synergy. Always say "CV" not "resume".`;

      const conversationInput = nextMessages
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n');

      const res = await invokeChat({
        entityId: { capability: 'text-standard' },
        input: conversationInput,
        systemPrompt,
      });

      const reply = res?.output ?? "I couldn't form a response. Please try again.";
      setChatMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      await logToStore('CVAnalysis.chat', err);
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Something went wrong on my end. Please try your question again.',
        },
      ]);
    }

    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  // ---------------------------------------------------------------------------
  // Builder
  // ---------------------------------------------------------------------------

  async function advanceBuilder() {
    const step = BUILDER_STEPS[builderStep];
    const updated = { ...builderAnswers, [step.key]: builderCurrentAnswer };
    setBuilderAnswers(updated);
    setBuilderCurrentAnswer('');

    if (builderStep < BUILDER_STEPS.length - 1) {
      setBuilderStep((s) => s + 1);
      return;
    }

    // Final step — generate CV
    setMode('loading');
    try {
      const systemPrompt = `${MASTER_PERSONA}\nCreate a professional CV for this person. Use achievement-led language. Include a professional profile summary, work experience, skills, and education sections. Never use: journey, leverage, passionate, results-driven, dynamic, impactful, synergy. Write "CV" not "resume". Return the full CV as plain text with clear section headings.`;

      const input = `Name: ${updated.fullName ?? ''}\nContact: ${updated.contact ?? ''}\nCurrent role: ${updated.currentRole ?? ''}\nResponsibilities: ${updated.responsibilities ?? ''}\nBiggest achievement: ${updated.achievement ?? ''}\nSkills: ${updated.skills ?? ''}\nEducation: ${updated.education ?? ''}`;

      const cvKey = `cv-builder-${Date.now()}`;

      // Save builder data BEFORE AI call
      try {
        await ds.put<Record<string, unknown>>(COL.cvVersions, cvKey, {
          cvText: input,
          score: 0,
          analysedAt: new Date().toISOString(),
          isBuilderDraft: true,
        });
      } catch (err) {
        await logToStore('CVAnalysis.builderSaveBefore', err);
      }

      const res = await invokeBuilder({
        entityId: { capability: 'text-standard' },
        input,
        systemPrompt,
      });

      const generatedCv = res?.output ?? '';

      await saveToVault(`cv-built-${cvKey}`, {
        cvKey,
        generatedCv,
        builtAt: new Date().toISOString(),
      });

      setBuiltCv(generatedCv);
      setMode('builder');
    } catch (err) {
      await logToStore('CVAnalysis.buildCv', err);
      setError("We couldn't build your CV right now. Please try again in a moment.");
      setMode('input');
      setInputTab('build');
    }
  }

  // ---------------------------------------------------------------------------
  // Download helpers
  // ---------------------------------------------------------------------------

  function downloadImprovedCv(cv: string) {
    const rtf = generateRTF('Improved CV', cv);
    downloadFile('improved-cv.rtf', rtf, 'application/rtf');
  }

  function downloadBuiltCv(cv: string) {
    const rtf = generateRTF('My CV', cv);
    downloadFile('my-cv.rtf', rtf, 'application/rtf');
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    minHeight: 44,
    padding: '10px 16px',
    borderRadius: 10,
    border: 'none',
    background: active ? ELEVATE.navy : 'transparent',
    color: active ? '#ffffff' : ELEVATE.text,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 200ms ease, color 200ms ease',
  });

  // ---------------------------------------------------------------------------
  // LOADING screen
  // ---------------------------------------------------------------------------

  if (mode === 'loading') {
    return (
      <ScreenShell title="CV Analysis" onBack={onBack} onHome={onHome} onNavigate={onNavigate}>
        <LoadingState
          messages={[
            'Reading your CV...',
            'Checking every section...',
            'Comparing against your target role...',
            'Almost there...',
          ]}
        />
      </ScreenShell>
    );
  }

  // ---------------------------------------------------------------------------
  // RESULTS screen
  // ---------------------------------------------------------------------------

  if (mode === 'results' && result) {
    return (
      <ScreenShell
        title="CV Analysis"
        onBack={() => setMode('input')}
        onHome={onHome}
        onNavigate={onNavigate}
        footer={
          <div style={{ display: 'flex', gap: 10 }}>
            <CTAButton
              label="💬 Ask about my CV"
              onClick={() => setMode('chat')}
              style={{ flex: 1, minHeight: 50, fontSize: 14 }}
            />
            <CTAButton
              label="📋 History"
              onClick={() => {
                void loadHistory();
                setMode('history');
              }}
              style={{ flex: 1, minHeight: 50, fontSize: 14 }}
            />
          </div>
        }
      >
        {/* Overall score */}
        <Card style={{ textAlign: 'center', marginBottom: 16, animation: 'elvFadeIn 300ms ease' }}>
          <div style={{ fontSize: 13, color: ELEVATE.muted, fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
            Overall CV Score
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <ScoreRing score={result.overallScore} size={160} />
          </div>
          {result.keyInsight && (
            <p style={{ margin: '8px 0 0', fontSize: 14, color: ELEVATE.text, lineHeight: 1.6 }}>
              {result.keyInsight}
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 10 }}>
            <span
              style={{
                padding: '4px 12px',
                borderRadius: 99,
                fontSize: 12,
                fontWeight: 700,
                background: result.atsFriendly ? 'rgba(10,175,170,0.12)' : 'rgba(239,68,68,0.10)',
                color: result.atsFriendly ? '#0AAFAA' : '#EF4444',
              }}
            >
              {result.atsFriendly ? '✓ ATS-friendly' : '⚠ ATS concerns'}
            </span>
          </div>
          <AILabel />
        </Card>

        {/* Category scores */}
        <Card style={{ marginBottom: 16, animation: 'elvFadeIn 400ms ease' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: ELEVATE.navy, marginBottom: 16 }}>
            Category Breakdown
          </div>
          <CategoryBar label="Format & ATS" score={result.categories.formatAts} />
          <CategoryBar label="Achievement Language" score={result.categories.achievementLanguage} />
          <CategoryBar label="Relevance to Target Role" score={result.categories.relevance} />
          <CategoryBar label="Profile Quality" score={result.categories.profileQuality} />
          <CategoryBar label="Completeness" score={result.categories.completeness} />
        </Card>

        {/* Top 3 weaknesses */}
        {result.weaknesses.length > 0 && (
          <Card style={{ marginBottom: 16, animation: 'elvFadeIn 500ms ease' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: ELEVATE.navy, marginBottom: 16 }}>
              Top Areas to Improve
            </div>
            {result.weaknesses.map((w, i) => (
              <div
                key={i}
                style={{
                  marginBottom: i < result.weaknesses.length - 1 ? 20 : 0,
                  paddingBottom: i < result.weaknesses.length - 1 ? 20 : 0,
                  borderBottom: i < result.weaknesses.length - 1 ? '1px solid #f1f5f9' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: ELEVATE.navy,
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  <strong style={{ fontSize: 14, color: ELEVATE.navy }}>{w.problem}</strong>
                </div>
                <p style={{ margin: '0 0 6px 30px', fontSize: 13, color: '#6B7280', lineHeight: 1.55 }}>
                  <strong style={{ color: ELEVATE.text }}>Why it matters:</strong> {w.whyItMatters}
                </p>
                <p style={{ margin: '0 0 0 30px', fontSize: 13, color: '#0AAFAA', lineHeight: 1.55, fontWeight: 600 }}>
                  Fix: {w.fix}
                </p>
              </div>
            ))}
          </Card>
        )}

        {/* Strengths */}
        {result.strengths.length > 0 && (
          <Card style={{ marginBottom: 16, animation: 'elvFadeIn 550ms ease' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: ELEVATE.navy, marginBottom: 12 }}>
              What's Working Well
            </div>
            {result.strengths.map((s, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  marginBottom: 8,
                  fontSize: 14,
                  color: ELEVATE.text,
                  lineHeight: 1.5,
                }}
              >
                <span style={{ color: '#0AAFAA', fontWeight: 800, flexShrink: 0 }}>✓</span>
                <span>{s}</span>
              </div>
            ))}
          </Card>
        )}

        {/* Gap detector */}
        {result.hasGaps && result.gapAdvice && (
          <Card style={{ marginBottom: 16, animation: 'elvFadeIn 580ms ease', borderColor: 'rgba(245,158,11,0.4)', background: 'rgba(255,251,235,0.7)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#92400E', marginBottom: 8 }}>
              ℹ️ Employment Gaps
            </div>
            <p style={{ margin: 0, fontSize: 14, color: '#78350F', lineHeight: 1.6 }}>
              {result.gapAdvice}
            </p>
          </Card>
        )}

        {/* Overqualification advice */}
        {result.isOverqualified && result.overqualifiedAdvice && (
          <Card style={{ marginBottom: 16, animation: 'elvFadeIn 590ms ease', borderColor: 'rgba(139,92,246,0.3)', background: 'rgba(245,243,255,0.7)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#5B21B6', marginBottom: 8 }}>
              🎯 Positioning Advice
            </div>
            <p style={{ margin: 0, fontSize: 14, color: '#4C1D95', lineHeight: 1.6 }}>
              {result.overqualifiedAdvice}
            </p>
          </Card>
        )}

        {/* Missing items */}
        {result.missingItems.length > 0 && (
          <Card style={{ marginBottom: 16, animation: 'elvFadeIn 600ms ease' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: ELEVATE.navy, marginBottom: 12 }}>
              Missing Elements
            </div>
            {result.missingItems.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  marginBottom: 6,
                  fontSize: 14,
                  color: ELEVATE.text,
                }}
              >
                <span style={{ color: '#F59E0B', fontWeight: 800, flexShrink: 0 }}>!</span>
                <span>{item}</span>
              </div>
            ))}
          </Card>
        )}

        {/* Improved CV */}
        {result.improvedCv && (
          <Card style={{ marginBottom: 16, animation: 'elvFadeIn 650ms ease' }}>
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
              <div style={{ fontSize: 15, fontWeight: 700, color: ELEVATE.navy }}>
                ✨ Improved CV
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <CopyButton text={result.improvedCv} label="Copy CV" />
                <button
                  type="button"
                  onClick={() => downloadImprovedCv(result.improvedCv)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '10px 16px',
                    borderRadius: 999,
                    border: '1px solid #e2e8f0',
                    background: 'transparent',
                    color: ELEVATE.navy,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ⬇ Download RTF
                </button>
              </div>
            </div>
            <pre
              style={{
                margin: 0,
                fontFamily: 'inherit',
                fontSize: 13,
                lineHeight: 1.7,
                color: ELEVATE.text,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: 480,
                overflow: 'auto',
                background: '#f8fafc',
                borderRadius: 12,
                padding: 16,
              }}
            >
              {result.improvedCv}
            </pre>
            <AILabel />
          </Card>
        )}

        {/* Spacer for footer */}
        <div style={{ height: 80 }} />
      </ScreenShell>
    );
  }

  // ---------------------------------------------------------------------------
  // CHAT screen
  // ---------------------------------------------------------------------------

  if (mode === 'chat') {
    const exchangeCount = Math.floor(chatMessages.length / 2);
    const atLimit = exchangeCount >= 10;

    return (
      <ScreenShell
        title="CV Coach Chat"
        onBack={() => setMode('results')}
        onHome={onHome}
        onNavigate={onNavigate}
        footer={
          <div>
            {atLimit && (
              <p style={{ textAlign: 'center', fontSize: 13, color: ELEVATE.muted, margin: '0 0 8px' }}>
                You've reached the 10-exchange limit for this session.
              </p>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !atLimit && !chatLoading) {
                    e.preventDefault();
                    void sendChatMessage();
                  }
                }}
                placeholder={atLimit ? 'Chat limit reached' : 'Ask about your CV...'}
                disabled={atLimit || chatLoading}
                style={{
                  flex: 1,
                  minHeight: 48,
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '2px solid #e2e8f0',
                  fontSize: 16,
                  outline: 'none',
                  color: '#374151',
                  background: atLimit ? '#f1f5f9' : '#ffffff',
                  opacity: atLimit ? 0.6 : 1,
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => void sendChatMessage()}
                disabled={atLimit || chatLoading || !chatInput.trim()}
                style={{
                  minHeight: 48,
                  padding: '0 20px',
                  borderRadius: 12,
                  border: 'none',
                  background: atLimit || !chatInput.trim() ? '#cbd5e1' : 'linear-gradient(135deg, #0AAFAA, #0891B2)',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: atLimit || !chatInput.trim() ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {chatLoading ? '...' : 'Send'}
              </button>
            </div>
          </div>
        }
      >
        {chatMessages.length === 0 && (
          <EmptyState
            emoji="💬"
            heading="Ask me anything about your CV"
            message="I have your full CV and analysis in front of me. Ask about any section, weakness, or how to phrase something."
          />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 24 }}>
          {chatMessages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                animation: 'elvFadeIn 200ms ease',
              }}
            >
              <div
                style={{
                  maxWidth: '80%',
                  padding: '12px 16px',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: msg.role === 'user' ? 'linear-gradient(135deg, #0AAFAA, #0891B2)' : '#ffffff',
                  color: msg.role === 'user' ? '#ffffff' : ELEVATE.text,
                  fontSize: 14,
                  lineHeight: 1.6,
                  border: msg.role === 'assistant' ? '1.5px solid #e2e8f0' : 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {msg.content}
                {msg.role === 'assistant' && <AILabel style={{ marginTop: 6 }} />}
              </div>
            </div>
          ))}

          {chatLoading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '18px 18px 18px 4px',
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  fontSize: 14,
                  color: ELEVATE.muted,
                }}
              >
                Thinking...
              </div>
            </div>
          )}
        </div>

        <div ref={chatEndRef} />

        <div style={{ height: 120 }} />
      </ScreenShell>
    );
  }

  // ---------------------------------------------------------------------------
  // HISTORY screen
  // ---------------------------------------------------------------------------

  if (mode === 'history') {
    return (
      <ScreenShell
        title="CV History"
        onBack={() => setMode('results')}
        onHome={onHome}
        onNavigate={onNavigate}
      >
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: ELEVATE.navy }}>
            Version History
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: ELEVATE.muted }}>
            All analysed CV versions, newest first.
          </p>
        </div>

        {historyLoading && <LoadingState messages={['Loading your history...']} />}

        {!historyLoading && history.length === 0 && (
          <EmptyState
            emoji="📋"
            heading="No history yet"
            message="Analyse your CV to start building a version history."
            ctaLabel="Analyse my CV"
            onCta={() => setMode('input')}
          />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {history.map((v, i) => {
            const isActive = v.key === activeCvId;
            return (
              <Card
                key={v.key}
                style={{
                  animation: `elvFadeIn ${300 + i * 80}ms ease`,
                  boxShadow: isActive
                    ? '0 0 0 3px rgba(10,175,170,0.35), 0 2px 12px rgba(0,0,0,0.06)'
                    : undefined,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 10,
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, color: ELEVATE.muted, marginBottom: 2 }}>
                      {v.analysedAt
                        ? new Date(v.analysedAt).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Unknown date'}
                    </div>
                    {isActive && (
                      <span
                        style={{
                          padding: '2px 10px',
                          borderRadius: 99,
                          background: 'rgba(10,175,170,0.12)',
                          color: '#0AAFAA',
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        Active
                      </span>
                    )}
                  </div>
                  <ScoreRing score={v.score} size={60} label="/100" strokeWidth={7} />
                </div>

                <p
                  style={{
                    margin: '0 0 12px',
                    fontSize: 13,
                    color: ELEVATE.text,
                    lineHeight: 1.5,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                  } as React.CSSProperties}
                >
                  {v.cvText.slice(0, 200)}...
                </p>

                {!isActive && (
                  <button
                    type="button"
                    onClick={() => void setActiveVersion(v)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 99,
                      border: 'none',
                      background: 'linear-gradient(135deg, #0AAFAA, #0891B2)',
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Set as active CV
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      </ScreenShell>
    );
  }

  // ---------------------------------------------------------------------------
  // BUILDER screen — final generated CV
  // ---------------------------------------------------------------------------

  if (mode === 'builder' && builtCv) {
    return (
      <ScreenShell
        title="Your CV"
        onBack={() => {
          setBuilderStep(0);
          setBuilderAnswers({});
          setBuiltCv(null);
          setMode('input');
          setInputTab('build');
        }}
        onHome={onHome}
        onNavigate={onNavigate}
        footer={
          <CTAButton
            label="✅ Analyse this CV"
            onClick={() => {
              setCvText(builtCv);
              setBuiltCv(null);
              setBuilderStep(0);
              setBuilderAnswers({});
              setMode('input');
              setInputTab('paste');
            }}
          />
        }
      >
        <Card style={{ marginBottom: 16 }}>
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
            <div style={{ fontSize: 15, fontWeight: 700, color: ELEVATE.navy }}>
              Your Baseline CV
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <CopyButton text={builtCv} label="Copy" />
              <button
                type="button"
                onClick={() => downloadBuiltCv(builtCv)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 16px',
                  borderRadius: 999,
                  border: '1px solid #e2e8f0',
                  background: 'transparent',
                  color: ELEVATE.navy,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ⬇ Download RTF
              </button>
            </div>
          </div>
          <pre
            style={{
              margin: 0,
              fontFamily: 'inherit',
              fontSize: 13,
              lineHeight: 1.7,
              color: ELEVATE.text,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: 480,
              overflow: 'auto',
              background: '#f8fafc',
              borderRadius: 12,
              padding: 16,
            }}
          >
            {builtCv}
          </pre>
          <AILabel />
        </Card>
        <p style={{ fontSize: 13, color: ELEVATE.muted, textAlign: 'center', marginTop: 8 }}>
          Use "Analyse this CV" below to get a full score and suggestions.
        </p>
        <div style={{ height: 80 }} />
      </ScreenShell>
    );
  }

  // ---------------------------------------------------------------------------
  // BUILDER screen — guided questions (inputTab === 'build')
  // ---------------------------------------------------------------------------

  if (inputTab === 'build') {
    const currentStep = BUILDER_STEPS[builderStep];
    const progress = (builderStep / BUILDER_STEPS.length) * 100;

    return (
      <ScreenShell
        title="Build a CV"
        onBack={
          builderStep > 0
            ? () => {
                setBuilderStep((s) => s - 1);
                setBuilderCurrentAnswer(builderAnswers[BUILDER_STEPS[builderStep - 1].key] ?? '');
              }
            : () => setInputTab('paste')
        }
        onHome={onHome}
        onNavigate={onNavigate}
        footer={
          <CTAButton
            label={builderStep < BUILDER_STEPS.length - 1 ? 'Next →' : 'Build my CV ✨'}
            onClick={() => void advanceBuilder()}
            disabled={!builderCurrentAnswer.trim() || builderLoading}
          />
        }
      >
        {/* Progress bar */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: ELEVATE.muted, fontWeight: 600 }}>
              Step {builderStep + 1} of {BUILDER_STEPS.length}
            </span>
            <span style={{ fontSize: 13, color: ELEVATE.muted }}>{Math.round(progress)}%</span>
          </div>
          <div style={{ height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #0AAFAA, #0891B2)',
                borderRadius: 99,
                transition: 'width 400ms ease',
              }}
            />
          </div>
        </div>

        <Card style={{ animation: 'elvFadeIn 250ms ease' }}>
          <PrivacyStatement note="Your information is stored securely and only used to build your CV." />
          <div style={{ marginTop: 20, marginBottom: 20 }}>
            <label
              style={{
                display: 'block',
                fontWeight: 700,
                fontSize: 17,
                color: ELEVATE.navy,
                marginBottom: 6,
              }}
            >
              {currentStep.label}
            </label>
            <p style={{ margin: '0 0 14px', fontSize: 14, color: ELEVATE.muted }}>
              {currentStep.hint}
            </p>
            {currentStep.type === 'textarea' ? (
              <TextArea
                value={builderCurrentAnswer}
                onChange={(e) => setBuilderCurrentAnswer(e.target.value)}
                placeholder={currentStep.hint}
                rows={4}
                autoFocus
              />
            ) : (
              <TextField
                value={builderCurrentAnswer}
                onChange={(e) => setBuilderCurrentAnswer(e.target.value)}
                placeholder={currentStep.hint}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && builderCurrentAnswer.trim() && !builderLoading) {
                    e.preventDefault();
                    void advanceBuilder();
                  }
                }}
                autoFocus
              />
            )}
          </div>
        </Card>
        <div style={{ height: 100 }} />
      </ScreenShell>
    );
  }

  // ---------------------------------------------------------------------------
  // INPUT screen (paste tab — default)
  // ---------------------------------------------------------------------------

  return (
    <ScreenShell
      title="CV Analysis"
      onBack={onBack}
      onHome={onHome}
      onNavigate={onNavigate}
      footer={
        <CTAButton
          label={analysisLoading ? 'Analysing...' : 'Analyse my CV ✨'}
          onClick={() => void runAnalysis()}
          disabled={analysisLoading || !cvText.trim()}
        />
      }
    >
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
          CV Analysis
        </h1>
        <p style={{ margin: 0, fontSize: 15, color: ELEVATE.muted, lineHeight: 1.6 }}>
          Get a detailed score, spot weaknesses, and receive an improved version.
        </p>
      </div>

      <PrivacyStatement note="Your CV text is never shared. It stays private and is only used to generate your analysis." />

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          background: '#f1f5f9',
          borderRadius: 12,
          padding: 4,
          margin: '16px 0',
        }}
      >
        <button
          type="button"
          style={tabStyle(currentTab === 'paste')}
          onClick={() => setInputTab('paste')}
        >
          📋 Paste my CV
        </button>
        <button
          type="button"
          style={tabStyle(currentTab === 'build')}
          onClick={() => setInputTab('build')}
        >
          🔨 Build a CV
        </button>
      </div>

      {/* Paste tab content */}
      <Card style={{ animation: 'elvFadeIn 350ms ease' }}>
        <label
          style={{
            display: 'block',
            fontWeight: 700,
            fontSize: 15,
            color: ELEVATE.navy,
            marginBottom: 8,
          }}
        >
          Paste your CV text
        </label>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: ELEVATE.muted, lineHeight: 1.5 }}>
          Elevate works best with CVs written in English. Paste the full text of your CV below.
        </p>
        <TextArea
          value={cvText}
          onChange={(e) => setCvText(e.target.value)}
          placeholder="Paste your full CV text here..."
          rows={12}
          style={{ minHeight: 240 }}
        />
        {cvText.length > 0 && (
          <div style={{ marginTop: 6, fontSize: 12, color: ELEVATE.muted, textAlign: 'right' }}>
            {cvText.length.toLocaleString()} characters
          </div>
        )}
      </Card>

      {/* Error state */}
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
