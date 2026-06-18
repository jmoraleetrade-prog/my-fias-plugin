import { useEffect, useRef, useState } from 'react';
import { useFiasTheme, useFiasDataStore, useEntityInvocation } from '@fias/arche-sdk';
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
import { EmptyState } from '../components/shared/EmptyState';
import { CopyButton } from '../components/shared/CopyButton';
import { ExtendedProfile, COL, logToStore, ELEVATE } from '../utils/elevate';
import {
  MASTER_PERSONA,
  buildUserContext,
  parseAiJson,
  safeScore,
  safeArray,
} from '../utils/aiHelpers';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INTERVIEW_TYPES = [
  'First interview',
  'Second interview',
  'Final round',
  'Assessment centre',
  'Presentation',
  'Informal chat',
] as const;
type InterviewType = (typeof INTERVIEW_TYPES)[number];

const SENIORITIES = [
  'Entry level',
  'Mid level',
  'Senior',
  'Director',
  'Executive',
] as const;
type Seniority = (typeof SENIORITIES)[number];

const CATEGORIES = ['Competency', 'Situational', 'Technical', 'Culture', 'Curveball'] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_STYLE: Record<Category, { bg: string; color: string }> = {
  Competency: { bg: 'rgba(10,175,170,0.12)', color: '#0AAFAA' },
  Situational: { bg: 'rgba(6,182,212,0.12)', color: '#0891B2' },
  Technical: { bg: 'rgba(99,102,241,0.12)', color: '#6366F1' },
  Culture: { bg: 'rgba(139,92,246,0.12)', color: '#8B5CF6' },
  Curveball: { bg: 'rgba(245,158,11,0.14)', color: '#D97706' },
};

const STAR_EXPLAINER =
  'STAR keeps competency answers tight: Situation (set the scene briefly), Task (what you were responsible for), Action (what YOU specifically did), Result (the measurable outcome). Spend most of your words on Action and Result.';

const CHECKLIST_ITEMS: { id: string; label: string }[] = [
  { id: 'research', label: 'Researched the company, its products and recent news' },
  { id: 'jd', label: 'Re-read the job description and matched my examples to it' },
  { id: 'stories', label: 'Prepared 3–4 STAR stories I can adapt to any question' },
  { id: 'questions', label: 'Wrote 2–3 thoughtful questions to ask them' },
  { id: 'logistics', label: 'Confirmed time, location / video link and who I am meeting' },
  { id: 'route', label: 'Planned my route or tested the video software' },
  { id: 'docs', label: 'Printed / saved copies of my CV and any portfolio' },
  { id: 'outfit', label: 'Chose and prepared my outfit' },
];

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PrepQuestion {
  id: string;
  category: Category;
  question: string;
  starHint: string;
}

interface AttemptFeedback {
  score: number;
  strengths: string[];
  improvements: string[];
  at: string;
}

type ToolKind = 'briefing' | 'thankyou' | 'reference';
type Mode = 'setup' | 'loading' | 'questions';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** When the user is neurodivergent, append the inclusive-coaching addendum. */
function neuroAddendum(profile: ExtendedProfile | null | undefined): string {
  if (!profile?.neurodivergent) return '';
  return ' This person is neurodivergent. Acknowledge that standard interview formats (rapid back-and-forth, vague questions, heavy eye contact) can be genuinely challenging, proactively suggest reasonable adjustments they are entitled to request, and frame every piece of guidance around their genuine strengths rather than deficits. Keep the tone warm and never patronising.';
}

function normaliseCategory(value: unknown): Category {
  const found = CATEGORIES.find((c) => c.toLowerCase() === String(value ?? '').toLowerCase());
  return found ?? 'Competency';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InterviewPrep({ profile, isPro: _isPro, onHome, onBack, onNavigate }: FeatureProps) {
  const theme = useFiasTheme();
  const ds = useFiasDataStore();

  // isPro is always true per spec.
  void _isPro;

  // AI invocations (declared unconditionally).
  const { invoke: invokeGenerate, isLoading: generating } = useEntityInvocation();
  const { invoke: invokeFeedback } = useEntityInvocation();
  const { invoke: invokeTool } = useEntityInvocation();

  // Setup state.
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [interviewType, setInterviewType] = useState<InterviewType>('First interview');
  const [seniority, setSeniority] = useState<Seniority>('Mid level');
  const [interviewDate, setInterviewDate] = useState('');

  // Generated questions + answers.
  const [mode, setMode] = useState<Mode>('setup');
  const [questions, setQuestions] = useState<PrepQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, AttemptFeedback[]>>({});
  const [feedbackLoadingId, setFeedbackLoadingId] = useState<string | null>(null);

  // Checklist.
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  // Toolkit (briefing / emails).
  const [toolLoading, setToolLoading] = useState<ToolKind | null>(null);
  const [toolResult, setToolResult] = useState<{ title: string; body: string } | null>(null);

  const [setupError, setSetupError] = useState<string | null>(null);

  // Live clock for the countdown — only ticks while a date is set.
  const [now, setNow] = useState(() => new Date());

  // Guard against setting state after the screen unmounts mid AI call.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!interviewDate) return;
    const timer = setInterval(() => {
      if (mountedRef.current) setNow(new Date());
    }, 60_000);
    return () => clearInterval(timer);
  }, [interviewDate]);

  if (!theme) return null;

  const sessionId = `${company}|${role}|${interviewType}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // -------------------------------------------------------------------------
  // Generate questions
  // -------------------------------------------------------------------------

  async function generateQuestions() {
    if (!company.trim() || !role.trim() || generating) return;
    setSetupError(null);
    setMode('loading');

    const sessionKey = `prep-${Date.now()}`;

    // Save the input to the data store BEFORE the AI call.
    try {
      await ds.put<Record<string, unknown>>(COL.questionBank, sessionKey, {
        company,
        role,
        interviewType,
        seniority,
        interviewDate: interviewDate || null,
        questions: [],
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      await logToStore('InterviewPrep.saveInputBefore', err);
    }

    try {
      const systemPrompt = `${MASTER_PERSONA}\n${buildUserContext(profile)}\n\nYou are preparing this person for a job interview. Generate 8 likely interview questions tailored to the company, role, interview type and seniority. Spread them across these categories: Competency, Situational, Technical, Culture, Curveball — use at least one Curveball and weight Technical higher for senior/technical roles. For each question include a one-sentence "starHint" telling them exactly which experience or angle to draw on when answering with the STAR method.${neuroAddendum(profile)} Return ONLY valid JSON: {"questions": [{"category": "Competency|Situational|Technical|Culture|Curveball", "question": string, "starHint": string}]}`;

      const input = `Company: ${company}\nRole: ${role}\nInterview type: ${interviewType}\nSeniority: ${seniority}\nSector: ${profile?.sector ?? 'not specified'}\nRegion: ${profile?.region ?? 'not specified'}`;

      const res = await invokeGenerate({
        entityId: { capability: 'text-standard' },
        input,
        systemPrompt,
      });

      const parsed = parseAiJson<{ questions?: unknown }>(res?.output ?? '');
      const rawQuestions = safeArray<Record<string, unknown>>(parsed?.questions);

      const built: PrepQuestion[] = rawQuestions
        .filter((q) => typeof q.question === 'string' && (q.question as string).trim())
        .map((q, i) => ({
          id: `${sessionKey}-q${i}`,
          category: normaliseCategory(q.category),
          question: String(q.question).trim(),
          starHint: typeof q.starHint === 'string' ? q.starHint.trim() : '',
        }));

      if (built.length === 0) {
        throw new Error('No questions returned');
      }

      // Save the full question bank.
      try {
        await ds.put<Record<string, unknown>>(COL.questionBank, sessionKey, {
          company,
          role,
          interviewType,
          seniority,
          interviewDate: interviewDate || null,
          questions: built,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        await logToStore('InterviewPrep.saveQuestions', err);
      }

      if (!mountedRef.current) return;
      setQuestions(built);
      setAnswers({});
      setFeedbacks({});
      setMode('questions');
    } catch (err) {
      await logToStore('InterviewPrep.generateQuestions', err);
      if (!mountedRef.current) return;
      setSetupError("We couldn't generate questions right now. Please try again in a moment.");
      setMode('setup');
    }
  }

  // -------------------------------------------------------------------------
  // Per-question AI feedback (tracks improvement across attempts)
  // -------------------------------------------------------------------------

  async function getFeedback(q: PrepQuestion) {
    const answer = (answers[q.id] ?? '').trim();
    if (!answer || feedbackLoadingId) return;

    setFeedbackLoadingId(q.id);
    const attemptNo = (feedbacks[q.id]?.length ?? 0) + 1;

    // Save the answer attempt BEFORE the AI call.
    try {
      await ds.put<Record<string, unknown>>(
        COL.questionBank,
        `answer-${q.id}-${attemptNo}`,
        {
          questionId: q.id,
          question: q.question,
          category: q.category,
          answer,
          attempt: attemptNo,
          at: new Date().toISOString(),
        },
      );
    } catch (err) {
      await logToStore('InterviewPrep.saveAnswerBefore', err);
    }

    try {
      const previous = feedbacks[q.id] ?? [];
      const history = previous.length
        ? `\n\nThis is attempt ${attemptNo}. Their previous attempt scored ${previous[previous.length - 1].score}/100. Acknowledge any improvement explicitly and be specific about what still needs work.`
        : '';

      const systemPrompt = `${MASTER_PERSONA}\n${buildUserContext(profile)}\n\nYou are an interview coach reviewing one answer to a "${q.category}" question for a ${seniority} ${role} role at ${company}. Judge it against the STAR method (Situation, Task, Action, Result) where relevant. Be honest but encouraging, concrete, and never generic.${history}${neuroAddendum(profile)} Return ONLY valid JSON: {"score": number (0-100), "strengths": [string], "improvements": [string]}`;

      const input = `Question (${q.category}): ${q.question}\n\nTheir answer:\n${answer}`;

      const res = await invokeFeedback({
        entityId: { capability: 'text-standard' },
        input,
        systemPrompt,
      });

      const parsed = parseAiJson<{ score?: unknown; strengths?: unknown; improvements?: unknown }>(
        res?.output ?? '',
      );
      if (!parsed) throw new Error('Could not parse feedback');

      const feedback: AttemptFeedback = {
        score: safeScore(parsed.score),
        strengths: safeArray<string>(parsed.strengths).slice(0, 4),
        improvements: safeArray<string>(parsed.improvements).slice(0, 4),
        at: new Date().toISOString(),
      };

      if (!mountedRef.current) return;
      setFeedbacks((prev) => ({ ...prev, [q.id]: [...(prev[q.id] ?? []), feedback] }));
    } catch (err) {
      await logToStore('InterviewPrep.getFeedback', err);
    } finally {
      if (mountedRef.current) setFeedbackLoadingId(null);
    }
  }

  // -------------------------------------------------------------------------
  // Toolkit: company briefing + emails
  // -------------------------------------------------------------------------

  async function runTool(kind: ToolKind) {
    if (toolLoading) return;
    setToolLoading(kind);
    setToolResult(null);

    // Save a marker BEFORE the AI call.
    try {
      await ds.put<Record<string, unknown>>(COL.questionBank, `tool-${kind}-${Date.now()}`, {
        kind,
        company,
        role,
        at: new Date().toISOString(),
      });
    } catch (err) {
      await logToStore('InterviewPrep.saveToolBefore', err);
    }

    const config: Record<ToolKind, { title: string; capability: 'text-fast' | 'text-standard'; system: string; input: string }> = {
      briefing: {
        title: 'Company research briefing',
        capability: 'text-standard',
        system: `${MASTER_PERSONA}\n${buildUserContext(profile)}\n\nWrite a concise pre-interview research briefing for ${company} for someone interviewing for a ${seniority} ${role} role. Cover: what the company likely does and who it serves, why this role matters to them, what they probably value in candidates, and 3 smart questions the candidate could ask. Be clear you are giving informed guidance, not verified facts — tell them what to confirm on the company's own site and LinkedIn.${neuroAddendum(profile)}`,
        input: `Company: ${company}\nRole: ${role}\nInterview type: ${interviewType}\nSeniority: ${seniority}`,
      },
      thankyou: {
        title: 'Thank-you email',
        capability: 'text-fast',
        system: `${MASTER_PERSONA}\n\nWrite a short, warm, professional thank-you email to send after a ${interviewType.toLowerCase()} for a ${role} role at ${company}. Keep it under 150 words, specific, and not gushing. Leave a [bracketed] placeholder for one thing they discussed. Return only the email text with a subject line.`,
        input: `Candidate: ${profile?.name ?? 'the candidate'}\nCompany: ${company}\nRole: ${role}`,
      },
      reference: {
        title: 'Reference request email',
        capability: 'text-fast',
        system: `${MASTER_PERSONA}\n\nWrite a polite, easy-to-say-yes-to email asking a former manager or colleague to act as a reference for a ${role} role at ${company}. Make it easy for them to decline, offer to share the job description, and keep it under 160 words. Return only the email text with a subject line.`,
        input: `Candidate: ${profile?.name ?? 'the candidate'}\nCompany: ${company}\nRole: ${role}`,
      },
    };

    const cfg = config[kind];
    try {
      const res = await invokeTool({
        entityId: { capability: cfg.capability },
        input: cfg.input,
        systemPrompt: cfg.system,
      });
      const body = (res?.output ?? '').trim();
      if (!body) throw new Error('Empty tool response');
      if (!mountedRef.current) return;
      setToolResult({ title: cfg.title, body });
    } catch (err) {
      await logToStore(`InterviewPrep.tool.${kind}`, err);
    } finally {
      if (mountedRef.current) setToolLoading(null);
    }
  }

  // -------------------------------------------------------------------------
  // Derived: countdown
  // -------------------------------------------------------------------------

  const interviewMs = interviewDate ? new Date(interviewDate).getTime() : NaN;
  const msRemaining = Number.isFinite(interviewMs) ? interviewMs + DAY_MS - now.getTime() : NaN; // end-of-day
  const hasCountdown = Number.isFinite(msRemaining) && msRemaining > 0;
  const within24h = hasCountdown && msRemaining <= DAY_MS;
  const daysRemaining = hasCountdown ? Math.floor(msRemaining / DAY_MS) : 0;
  const hoursRemaining = hasCountdown ? Math.floor((msRemaining % DAY_MS) / (60 * 60 * 1000)) : 0;

  // -------------------------------------------------------------------------
  // LOADING
  // -------------------------------------------------------------------------

  if (mode === 'loading') {
    return (
      <ScreenShell title="Interview Prep" onBack={onBack} onHome={onHome} onNavigate={onNavigate}>
        <LoadingState
          messages={[
            `Studying ${company || 'the company'}...`,
            'Predicting their likely questions...',
            'Tailoring to your seniority...',
            'Almost ready...',
          ]}
        />
      </ScreenShell>
    );
  }

  // -------------------------------------------------------------------------
  // QUESTIONS
  // -------------------------------------------------------------------------

  if (mode === 'questions') {
    const allChecked = CHECKLIST_ITEMS.every((item) => checked[item.id]);
    const checkedCount = CHECKLIST_ITEMS.filter((item) => checked[item.id]).length;

    return (
      <ScreenShell
        title={`${role} · ${company}`}
        onBack={() => setMode('setup')}
        onHome={onHome}
        onNavigate={onNavigate}
      >
        {/* Countdown + outfit reminder */}
        {hasCountdown && (
          <Card
            style={{
              marginBottom: 16,
              background: within24h
                ? 'linear-gradient(135deg, #0F2554, #1a3a7a)'
                : '#ffffff',
              borderColor: within24h ? 'transparent' : ELEVATE.cardBorder,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: within24h ? '#0AAFAA' : ELEVATE.muted,
                marginBottom: 6,
              }}
            >
              Interview countdown
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: within24h ? '#ffffff' : ELEVATE.navy,
              }}
            >
              {daysRemaining > 0
                ? `${daysRemaining} day${daysRemaining === 1 ? '' : 's'}, ${hoursRemaining} hr${hoursRemaining === 1 ? '' : 's'} to go`
                : `${hoursRemaining} hour${hoursRemaining === 1 ? '' : 's'} to go`}
            </div>
            {within24h && (
              <p style={{ margin: '10px 0 0', fontSize: 14, color: '#e0f7fa', lineHeight: 1.6 }}>
                👔 It's within 24 hours — lay out your outfit tonight, charge your phone, and get
                your CV copies ready so the morning is calm.
              </p>
            )}
          </Card>
        )}

        {/* Questions list */}
        <div style={{ marginBottom: 8 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: ELEVATE.navy }}>
            Your practice questions
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: ELEVATE.muted }}>
            Draft an answer, then get AI feedback. Each attempt is scored so you can see yourself
            improve.
          </p>
        </div>

        {questions.map((q, i) => {
          const history = feedbacks[q.id] ?? [];
          const latest = history[history.length - 1];
          const prev = history.length > 1 ? history[history.length - 2] : undefined;
          const delta = latest && prev ? latest.score - prev.score : null;
          const cat = CATEGORY_STYLE[q.category];
          const isLoadingThis = feedbackLoadingId === q.id;

          return (
            <Card key={q.id} style={{ marginBottom: 14, animation: `elvFadeIn ${250 + i * 60}ms ease` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: 99,
                    fontSize: 11,
                    fontWeight: 700,
                    background: cat.bg,
                    color: cat.color,
                  }}
                >
                  {q.category}
                </span>
                <span style={{ fontSize: 12, color: ELEVATE.muted }}>Question {i + 1}</span>
              </div>

              <p style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, color: ELEVATE.navy, lineHeight: 1.5 }}>
                {q.question}
              </p>

              {/* STAR explanation */}
              <div
                style={{
                  background: '#f0fffe',
                  border: '1px solid rgba(10,175,170,0.3)',
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 12,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0AAFAA', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                  ⭐ STAR method
                </div>
                <p style={{ margin: 0, fontSize: 13, color: ELEVATE.text, lineHeight: 1.55 }}>
                  {STAR_EXPLAINER}
                </p>
                {q.starHint && (
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: ELEVATE.navy, lineHeight: 1.55, fontWeight: 600 }}>
                    For this question: {q.starHint}
                  </p>
                )}
              </div>

              <TextArea
                value={answers[q.id] ?? ''}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                placeholder="Draft your answer using Situation → Task → Action → Result..."
                rows={5}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => void getFeedback(q)}
                  disabled={isLoadingThis || feedbackLoadingId !== null || !(answers[q.id] ?? '').trim()}
                  style={{
                    minHeight: 44,
                    padding: '0 18px',
                    borderRadius: 99,
                    border: 'none',
                    background:
                      isLoadingThis || feedbackLoadingId !== null || !(answers[q.id] ?? '').trim()
                        ? '#cbd5e1'
                        : 'linear-gradient(135deg, #0AAFAA, #0891B2)',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor:
                      isLoadingThis || feedbackLoadingId !== null || !(answers[q.id] ?? '').trim()
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  {isLoadingThis ? 'Reviewing...' : history.length ? '↻ Get feedback again' : '✨ Get AI feedback'}
                </button>
                {history.length > 0 && (
                  <span style={{ fontSize: 12, color: ELEVATE.muted }}>
                    Attempt {history.length}
                  </span>
                )}
              </div>

              {/* Feedback */}
              {latest && !isLoadingThis && (
                <div style={{ marginTop: 14, animation: 'elvFadeIn 250ms ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: ELEVATE.navy }}>
                      {latest.score}
                      <span style={{ fontSize: 13, color: ELEVATE.muted, fontWeight: 600 }}>/100</span>
                    </span>
                    {delta !== null && (
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: delta > 0 ? '#0AAFAA' : delta < 0 ? '#EF4444' : ELEVATE.muted,
                        }}
                      >
                        {delta > 0 ? `▲ +${delta}` : delta < 0 ? `▼ ${delta}` : '— no change'} vs last attempt
                      </span>
                    )}
                  </div>

                  {latest.strengths.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: ELEVATE.navy, marginBottom: 4 }}>
                        What's working
                      </div>
                      {latest.strengths.map((s, j) => (
                        <div key={j} style={{ display: 'flex', gap: 8, fontSize: 13, color: ELEVATE.text, lineHeight: 1.5, marginBottom: 4 }}>
                          <span style={{ color: '#0AAFAA', fontWeight: 800, flexShrink: 0 }}>✓</span>
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {latest.improvements.length > 0 && (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: ELEVATE.navy, marginBottom: 4 }}>
                        To improve
                      </div>
                      {latest.improvements.map((s, j) => (
                        <div key={j} style={{ display: 'flex', gap: 8, fontSize: 13, color: ELEVATE.text, lineHeight: 1.5, marginBottom: 4 }}>
                          <span style={{ color: '#F59E0B', fontWeight: 800, flexShrink: 0 }}>→</span>
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <AILabel />
                </div>
              )}
            </Card>
          );
        })}

        {/* Pre-interview checklist */}
        <Card style={{ marginTop: 8, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: ELEVATE.navy }}>
              Pre-interview checklist
            </h3>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: allChecked ? '#0AAFAA' : ELEVATE.muted,
              }}
            >
              {checkedCount}/{CHECKLIST_ITEMS.length}
            </span>
          </div>
          {CHECKLIST_ITEMS.map((item) => {
            const on = !!checked[item.id];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setChecked((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 4px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid #f1f5f9',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    flexShrink: 0,
                    display: 'grid',
                    placeItems: 'center',
                    background: on ? 'linear-gradient(135deg, #0AAFAA, #0891B2)' : 'transparent',
                    border: on ? 'none' : '2px solid #cbd5e1',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  {on ? '✓' : ''}
                </span>
                <span
                  style={{
                    fontSize: 14,
                    color: on ? ELEVATE.muted : ELEVATE.text,
                    textDecoration: on ? 'line-through' : 'none',
                    lineHeight: 1.5,
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </Card>

        {/* Toolkit */}
        <Card style={{ marginBottom: 14 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: ELEVATE.navy }}>
            Interview toolkit
          </h3>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: ELEVATE.muted, lineHeight: 1.5 }}>
            Generate a research briefing or a ready-to-send email.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {([
              { kind: 'briefing' as const, label: '🔎 Company research briefing' },
              { kind: 'thankyou' as const, label: '💌 Thank-you email' },
              { kind: 'reference' as const, label: '🤝 Reference request email' },
            ]).map(({ kind, label }) => (
              <button
                key={kind}
                type="button"
                onClick={() => void runTool(kind)}
                disabled={toolLoading !== null}
                style={{
                  flex: '1 1 auto',
                  minHeight: 44,
                  padding: '0 14px',
                  borderRadius: 99,
                  border: '1.5px solid #e2e8f0',
                  background: toolLoading === kind ? '#f1f5f9' : 'transparent',
                  color: ELEVATE.navy,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: toolLoading !== null ? 'not-allowed' : 'pointer',
                  opacity: toolLoading !== null && toolLoading !== kind ? 0.5 : 1,
                }}
              >
                {toolLoading === kind ? 'Generating...' : label}
              </button>
            ))}
          </div>

          {toolResult && (
            <div style={{ marginTop: 14, animation: 'elvFadeIn 250ms ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                <strong style={{ fontSize: 14, color: ELEVATE.navy }}>{toolResult.title}</strong>
                <CopyButton text={toolResult.body} label="Copy" />
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
                  background: '#f8fafc',
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                {toolResult.body}
              </pre>
              <AILabel />
            </div>
          )}
        </Card>

        <div style={{ height: 24 }} />
      </ScreenShell>
    );
  }

  // -------------------------------------------------------------------------
  // SETUP (default)
  // -------------------------------------------------------------------------

  const canGenerate = company.trim() !== '' && role.trim() !== '' && !generating;

  return (
    <ScreenShell
      title="Interview Prep"
      onBack={onBack}
      onHome={onHome}
      onNavigate={onNavigate}
      footer={
        <CTAButton
          label={generating ? 'Generating...' : 'Generate questions ✨'}
          onClick={() => void generateQuestions()}
          disabled={!canGenerate}
        />
      }
    >
      <div style={{ marginBottom: 20, animation: 'elvFadeIn 300ms ease' }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 900, color: ELEVATE.navy, lineHeight: 1.2 }}>
          Interview Prep
        </h1>
        <p style={{ margin: 0, fontSize: 15, color: ELEVATE.muted, lineHeight: 1.6 }}>
          Tell us about the interview and we'll predict the questions, coach your answers, and get
          you ready.
        </p>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontWeight: 700, fontSize: 14, color: ELEVATE.navy, marginBottom: 6 }}>
          Company name
        </label>
        <TextField
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="e.g. Monzo"
          style={{ marginBottom: 16 }}
        />

        <label style={{ display: 'block', fontWeight: 700, fontSize: 14, color: ELEVATE.navy, marginBottom: 6 }}>
          Role title
        </label>
        <TextField
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g. Product Manager"
          style={{ marginBottom: 16 }}
        />

        <label style={{ display: 'block', fontWeight: 700, fontSize: 14, color: ELEVATE.navy, marginBottom: 8 }}>
          Interview type
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {INTERVIEW_TYPES.map((t) => (
            <SelectPill key={t} label={t} active={interviewType === t} onClick={() => setInterviewType(t)} />
          ))}
        </div>

        <label style={{ display: 'block', fontWeight: 700, fontSize: 14, color: ELEVATE.navy, marginBottom: 8 }}>
          Seniority
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {SENIORITIES.map((s) => (
            <SelectPill key={s} label={s} active={seniority === s} onClick={() => setSeniority(s)} />
          ))}
        </div>

        <label style={{ display: 'block', fontWeight: 700, fontSize: 14, color: ELEVATE.navy, marginBottom: 6 }}>
          Interview date <span style={{ color: ELEVATE.muted, fontWeight: 500 }}>(optional)</span>
        </label>
        <TextField
          type="date"
          value={interviewDate}
          onChange={(e) => setInterviewDate(e.target.value)}
        />
        <p style={{ margin: '6px 0 0', fontSize: 12, color: ELEVATE.muted }}>
          Add a date to unlock a countdown and a reminder when it's within 24 hours.
        </p>
      </Card>

      {profile?.neurodivergent && (
        <Card style={{ marginBottom: 16, borderColor: 'rgba(139,92,246,0.3)', background: 'rgba(245,243,255,0.6)' }}>
          <p style={{ margin: 0, fontSize: 13, color: '#5B21B6', lineHeight: 1.6 }}>
            💡 Your coaching is tailored to you — we'll flag reasonable adjustments you can request
            and frame everything around your strengths.
          </p>
        </Card>
      )}

      {setupError && (
        <div style={{ marginTop: 4 }}>
          <EmptyState emoji="😕" heading="That didn't work" message={setupError} ctaLabel="Try again" onCta={() => setSetupError(null)} />
        </div>
      )}

      <div style={{ height: 80 }} />
    </ScreenShell>
  );
}

// ---------------------------------------------------------------------------
// Small selectable pill
// ---------------------------------------------------------------------------

function SelectPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: 40,
        padding: '8px 16px',
        borderRadius: 99,
        border: active ? '2px solid #0AAFAA' : '2px solid #e2e8f0',
        background: active ? 'rgba(10,175,170,0.10)' : '#ffffff',
        color: active ? '#0AAFAA' : ELEVATE.text,
        fontSize: 14,
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'border-color 150ms ease, background 150ms ease, color 150ms ease',
      }}
    >
      {label}
    </button>
  );
}
