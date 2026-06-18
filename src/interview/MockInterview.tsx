import { useEffect, useRef, useState } from 'react';
import { useFiasTheme, useFiasDataStore, useEntityInvocation } from '@fias/arche-sdk';
import {
  ScreenShell,
  Card,
  CTAButton,
  AILabel,
  TextField,
} from '../components/shared/ScreenShell';
import type { FeatureProps } from '../components/shared/ScreenShell';
import { LoadingState } from '../components/shared/LoadingState';
import { ScoreRing } from '../components/shared/ScoreRing';
import { COL, logToStore, ELEVATE } from '../utils/elevate';
import {
  MASTER_PERSONA,
  buildUserContext,
  parseAiJson,
  safeScore,
  safeArray,
} from '../utils/aiHelpers';

// ---------------------------------------------------------------------------
// Interview stages — fixed running order
// ---------------------------------------------------------------------------

const STAGES = [
  {
    key: 'rapport',
    label: 'Warm-up',
    instruction:
      'Open warmly with a little rapport — welcome them, then ask one easy opening question such as "tell me about yourself" or what drew them to this role. One question only.',
  },
  {
    key: 'competency',
    label: 'Competency',
    instruction:
      'Ask one competency-based question that expects a STAR-style answer about a real past experience (e.g. "tell me about a time you...").',
  },
  {
    key: 'situational',
    label: 'Situational',
    instruction:
      'Ask one situational or hypothetical question ("what would you do if...") relevant to the role.',
  },
  {
    key: 'closing',
    label: 'Close',
    instruction:
      'Begin to wrap up: thank them, invite any questions they have for you, and signal the interview is coming to a close. Keep it to one short prompt.',
  },
] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: 'interviewer' | 'candidate';
  content: string;
}

interface Debrief {
  overallScore: number;
  strongest: { summary: string; why: string };
  weakest: { summary: string; why: string };
  improvements: string[];
}

type Phase = 'intro' | 'interview' | 'debrief';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MockInterview({ profile, isPro: _isPro, onHome, onBack, onNavigate }: FeatureProps) {
  const theme = useFiasTheme();
  const ds = useFiasDataStore();

  void _isPro;

  // One invocation drives the interviewer turns (sequential — a single
  // instance is enough). A second drives the debrief.
  const { invoke: invokeInterviewer, isLoading: interviewerLoading, streamingText } =
    useEntityInvocation();
  const { invoke: invokeDebrief, isLoading: debriefLoading } = useEntityInvocation();

  const [phase, setPhase] = useState<Phase>('intro');
  const [role, setRole] = useState(profile?.targetRole || profile?.currentRole || '');
  const [company, setCompany] = useState('');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [stageIndex, setStageIndex] = useState(0);
  const [input, setInput] = useState('');
  const [complete, setComplete] = useState(false);
  const [debrief, setDebrief] = useState<Debrief | null>(null);

  const sessionKeyRef = useRef<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Mounted guard — the interviewer/debrief calls stream asynchronously, so we
  // must not touch React state (or leave a stale subscription writing into it)
  // after the screen unmounts. This is the streaming cleanup.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Keep the latest turn in view as it streams in.
  useEffect(() => {
    if (phase !== 'interview') return;
    const id = setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    return () => clearTimeout(id);
  }, [messages.length, streamingText, phase]);

  if (!theme) return null;

  function transcript(history: ChatMessage[]): string {
    return history
      .map((m) => `${m.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
      .join('\n');
  }

  // -------------------------------------------------------------------------
  // One interviewer turn for a given stage
  // -------------------------------------------------------------------------

  async function interviewerTurn(stage: number, history: ChatMessage[]) {
    const stageDef = STAGES[stage];
    try {
      const systemPrompt = `You are a realistic, professional human interviewer running a job interview${role ? ` for the role of ${role}` : ''}${company ? ` at ${company}` : ''}. Stay fully in character as the interviewer at all times. Ask exactly ONE question or prompt per turn, keep it to 1–3 natural sentences, never answer on the candidate's behalf, never break character, and don't number your questions. ${stageDef.instruction}`;

      const convo = transcript(history);
      const aiInput = `${convo ? `${convo}\n\n` : ''}Respond with only the next thing you say to the candidate.`;

      const res = await invokeInterviewer({
        entityId: { capability: 'text-standard' },
        input: aiInput,
        systemPrompt,
      });

      const text = (res?.output ?? '').trim() || 'Thanks — shall we begin? Tell me a little about yourself.';
      if (!mountedRef.current) return;
      setMessages((prev) => [...prev, { role: 'interviewer', content: text }]);
    } catch (err) {
      await logToStore('MockInterview.interviewerTurn', err);
      if (!mountedRef.current) return;
      setMessages((prev) => [
        ...prev,
        {
          role: 'interviewer',
          content:
            "Apologies — I lost my train of thought there. Let's keep going: could you tell me more about your experience?",
        },
      ]);
    }
  }

  // -------------------------------------------------------------------------
  // Start
  // -------------------------------------------------------------------------

  async function startInterview() {
    const key = `mock-${Date.now()}`;
    sessionKeyRef.current = key;
    setMessages([]);
    setStageIndex(0);
    setComplete(false);
    setDebrief(null);
    setPhase('interview');

    // Save the session input BEFORE any AI call.
    try {
      await ds.put<Record<string, unknown>>(COL.questionBank, key, {
        kind: 'mock-interview',
        role,
        company,
        startedAt: new Date().toISOString(),
        transcript: [],
      });
    } catch (err) {
      await logToStore('MockInterview.saveSessionStart', err);
    }

    await interviewerTurn(0, []);
  }

  // -------------------------------------------------------------------------
  // Candidate answer → next interviewer turn
  // -------------------------------------------------------------------------

  async function sendAnswer() {
    const text = input.trim();
    if (!text || interviewerLoading || complete) return;

    const candidateMsg: ChatMessage = { role: 'candidate', content: text };
    const history = [...messages, candidateMsg];
    setMessages(history);
    setInput('');

    // Persist the running transcript BEFORE the next AI call.
    try {
      await ds.put<Record<string, unknown>>(COL.questionBank, sessionKeyRef.current || `mock-${Date.now()}`, {
        kind: 'mock-interview',
        role,
        company,
        updatedAt: new Date().toISOString(),
        transcript: history,
      });
    } catch (err) {
      await logToStore('MockInterview.saveTranscript', err);
    }

    // Was that the answer to the closing question? Then we're done.
    if (stageIndex >= STAGES.length - 1) {
      if (mountedRef.current) setComplete(true);
      return;
    }

    const next = stageIndex + 1;
    if (mountedRef.current) setStageIndex(next);
    await interviewerTurn(next, history);
  }

  // -------------------------------------------------------------------------
  // Debrief
  // -------------------------------------------------------------------------

  async function generateDebrief() {
    if (debriefLoading) return;
    setPhase('debrief');

    try {
      const systemPrompt = `${MASTER_PERSONA}\n${buildUserContext(profile)}\n\nYou are reviewing a full mock interview transcript${role ? ` for a ${role} role` : ''}. Give an honest, specific, encouraging debrief based only on what the candidate actually said. Identify their single strongest answer and their single weakest, and give concrete improvements. Return ONLY valid JSON: {"overallScore": number (0-100), "strongest": {"summary": string, "why": string}, "weakest": {"summary": string, "why": string}, "improvements": [string]}`;

      const res = await invokeDebrief({
        entityId: { capability: 'text-advanced' },
        input: transcript(messages),
        systemPrompt,
      });

      const parsed = parseAiJson<Record<string, unknown>>(res?.output ?? '');
      if (!parsed) throw new Error('Could not parse debrief');

      const strongest = (parsed.strongest ?? {}) as Record<string, unknown>;
      const weakest = (parsed.weakest ?? {}) as Record<string, unknown>;

      const result: Debrief = {
        overallScore: safeScore(parsed.overallScore),
        strongest: {
          summary: typeof strongest.summary === 'string' ? strongest.summary : 'Your clearest answer',
          why: typeof strongest.why === 'string' ? strongest.why : '',
        },
        weakest: {
          summary: typeof weakest.summary === 'string' ? weakest.summary : 'Where you can grow most',
          why: typeof weakest.why === 'string' ? weakest.why : '',
        },
        improvements: safeArray<string>(parsed.improvements).slice(0, 5),
      };

      if (!mountedRef.current) return;
      setDebrief(result);
    } catch (err) {
      await logToStore('MockInterview.generateDebrief', err);
      // Leave debrief null — the debrief screen shows a graceful retry.
    }
  }

  // -------------------------------------------------------------------------
  // DEBRIEF screen
  // -------------------------------------------------------------------------

  if (phase === 'debrief') {
    if (debriefLoading || !debrief) {
      return (
        <ScreenShell title="Your debrief" onHome={onHome} onNavigate={onNavigate}>
          {debriefLoading ? (
            <LoadingState
              messages={[
                'Replaying your interview...',
                'Finding your strongest moment...',
                'Spotting what to sharpen...',
                'Writing your debrief...',
              ]}
            />
          ) : (
            <Card style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 16px', fontSize: 15, color: ELEVATE.text }}>
                We couldn't put together your debrief just now.
              </p>
              <CTAButton label="Try again" onClick={() => void generateDebrief()} />
            </Card>
          )}
        </ScreenShell>
      );
    }

    return (
      <ScreenShell
        title="Your debrief"
        onHome={onHome}
        onNavigate={onNavigate}
        footer={<CTAButton label="🔁 New mock interview" onClick={() => setPhase('intro')} />}
      >
        <Card style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: ELEVATE.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Overall performance
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <ScoreRing score={debrief.overallScore} size={160} />
          </div>
          <AILabel />
        </Card>

        <Card style={{ marginBottom: 16, borderColor: 'rgba(10,175,170,0.4)' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0AAFAA', marginBottom: 6 }}>
            💪 Strongest answer
          </div>
          <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: ELEVATE.navy, lineHeight: 1.5 }}>
            {debrief.strongest.summary}
          </p>
          {debrief.strongest.why && (
            <p style={{ margin: 0, fontSize: 14, color: ELEVATE.text, lineHeight: 1.6 }}>
              {debrief.strongest.why}
            </p>
          )}
        </Card>

        <Card style={{ marginBottom: 16, borderColor: 'rgba(245,158,11,0.4)' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#D97706', marginBottom: 6 }}>
            🎯 Weakest answer
          </div>
          <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: ELEVATE.navy, lineHeight: 1.5 }}>
            {debrief.weakest.summary}
          </p>
          {debrief.weakest.why && (
            <p style={{ margin: 0, fontSize: 14, color: ELEVATE.text, lineHeight: 1.6 }}>
              {debrief.weakest.why}
            </p>
          )}
        </Card>

        {debrief.improvements.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: ELEVATE.navy, marginBottom: 12 }}>
              Specific improvements
            </div>
            {debrief.improvements.map((imp, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 14, color: ELEVATE.text, lineHeight: 1.55 }}>
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: ELEVATE.navy,
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 800,
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <span>{imp}</span>
              </div>
            ))}
            <AILabel />
          </Card>
        )}

        <div style={{ height: 24 }} />
      </ScreenShell>
    );
  }

  // -------------------------------------------------------------------------
  // INTERVIEW screen (streaming chat)
  // -------------------------------------------------------------------------

  if (phase === 'interview') {
    const showStreaming = interviewerLoading;
    const stageLabel = STAGES[Math.min(stageIndex, STAGES.length - 1)].label;

    return (
      <ScreenShell
        title={`Mock interview · ${stageLabel}`}
        onBack={() => setPhase('intro')}
        onHome={onHome}
        onNavigate={onNavigate}
        footer={
          complete ? (
            <CTAButton label="✅ Finish & see my debrief" onClick={() => void generateDebrief()} />
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !interviewerLoading) {
                    e.preventDefault();
                    void sendAnswer();
                  }
                }}
                placeholder={interviewerLoading ? 'Interviewer is speaking...' : 'Type your answer...'}
                disabled={interviewerLoading}
                style={{
                  flex: 1,
                  minHeight: 48,
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '2px solid #e2e8f0',
                  fontSize: 16,
                  outline: 'none',
                  color: '#374151',
                  background: interviewerLoading ? '#f1f5f9' : '#ffffff',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => void sendAnswer()}
                disabled={interviewerLoading || !input.trim()}
                style={{
                  minHeight: 48,
                  padding: '0 20px',
                  borderRadius: 12,
                  border: 'none',
                  background: interviewerLoading || !input.trim() ? '#cbd5e1' : 'linear-gradient(135deg, #0AAFAA, #0891B2)',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: interviewerLoading || !input.trim() ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Send
              </button>
            </div>
          )
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.map((msg, i) => (
            <Bubble key={i} msg={msg} />
          ))}

          {/* Live streaming interviewer bubble */}
          {showStreaming && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div
                style={{
                  maxWidth: '85%',
                  padding: '12px 16px',
                  borderRadius: '18px 18px 18px 4px',
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  color: ELEVATE.text,
                  fontSize: 15,
                  lineHeight: 1.6,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {streamingText?.trim() ? streamingText : 'Thinking…'}
              </div>
            </div>
          )}

          {complete && (
            <div
              style={{
                marginTop: 8,
                padding: '14px 16px',
                borderRadius: 14,
                background: '#f0fffe',
                border: '1px solid rgba(10,175,170,0.3)',
                fontSize: 14,
                color: ELEVATE.navy,
                lineHeight: 1.6,
                textAlign: 'center',
              }}
            >
              That's the end of the interview. Tap below for your full debrief.
            </div>
          )}
        </div>

        <div ref={chatEndRef} />
        <div style={{ height: 120 }} />
      </ScreenShell>
    );
  }

  // -------------------------------------------------------------------------
  // INTRO screen
  // -------------------------------------------------------------------------

  return (
    <ScreenShell
      title="Mock Interview"
      onBack={onBack}
      onHome={onHome}
      onNavigate={onNavigate}
      footer={<CTAButton label="🎤 Start the interview" onClick={() => void startInterview()} />}
    >
      <div style={{ marginBottom: 20, animation: 'elvFadeIn 300ms ease' }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 900, color: ELEVATE.navy, lineHeight: 1.2 }}>
          Mock Interview
        </h1>
        <p style={{ margin: 0, fontSize: 15, color: ELEVATE.muted, lineHeight: 1.6 }}>
          A realistic AI interviewer asks the questions. You answer in your own words — then get a
          full debrief.
        </p>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontWeight: 700, fontSize: 14, color: ELEVATE.navy, marginBottom: 6 }}>
          Role you're interviewing for <span style={{ color: ELEVATE.muted, fontWeight: 500 }}>(optional)</span>
        </label>
        <TextField
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g. Product Manager"
          style={{ marginBottom: 16 }}
        />
        <label style={{ display: 'block', fontWeight: 700, fontSize: 14, color: ELEVATE.navy, marginBottom: 6 }}>
          Company <span style={{ color: ELEVATE.muted, fontWeight: 500 }}>(optional)</span>
        </label>
        <TextField
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="e.g. Monzo"
        />
      </Card>

      <Card style={{ marginBottom: 16, background: 'linear-gradient(135deg, #0F2554, #1a3a7a)', borderColor: 'transparent' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0AAFAA', marginBottom: 8 }}>
          What to expect
        </div>
        <p style={{ margin: '0 0 12px', fontSize: 15, color: '#ffffff', lineHeight: 1.6 }}>
          About <strong>8–12 minutes</strong> across <strong>4 short stages</strong>:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {STAGES.map((s, i) => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#e0f7fa' }}>
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: 'rgba(10,175,170,0.25)',
                  color: '#0AAFAA',
                  fontSize: 12,
                  fontWeight: 800,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {profile?.neurodivergent && (
        <Card style={{ marginBottom: 16, borderColor: 'rgba(139,92,246,0.3)', background: 'rgba(245,243,255,0.6)' }}>
          <p style={{ margin: 0, fontSize: 13, color: '#5B21B6', lineHeight: 1.6 }}>
            💡 Take all the time you need between questions — there's no timer here. Answer in
            writing at your own pace.
          </p>
        </Card>
      )}

      <div style={{ height: 80 }} />
    </ScreenShell>
  );
}

// ---------------------------------------------------------------------------
// Chat bubble
// ---------------------------------------------------------------------------

function Bubble({ msg }: { msg: ChatMessage }) {
  const isCandidate = msg.role === 'candidate';
  return (
    <div style={{ display: 'flex', justifyContent: isCandidate ? 'flex-end' : 'flex-start', animation: 'elvFadeIn 200ms ease' }}>
      <div
        style={{
          maxWidth: '85%',
          padding: '12px 16px',
          borderRadius: isCandidate ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isCandidate ? 'linear-gradient(135deg, #0AAFAA, #0891B2)' : '#ffffff',
          color: isCandidate ? '#ffffff' : ELEVATE.text,
          fontSize: 15,
          lineHeight: 1.6,
          border: isCandidate ? 'none' : '1.5px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {msg.content}
      </div>
    </div>
  );
}
