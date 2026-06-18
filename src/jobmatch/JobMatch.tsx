import { useState } from 'react';
import { useFiasDataStore, useEntityInvocation } from '@fias/arche-sdk';
import {
  ScreenShell,
  Card,
  CTAButton,
  AILabel,
  SalaryNote,
  TextField,
  TextArea,
} from '../components/shared/ScreenShell';
import type { FeatureProps } from '../components/shared/ScreenShell';
import { LoadingState } from '../components/shared/LoadingState';
import { ErrorState } from '../components/shared/ErrorState';
import { ScoreRing } from '../components/shared/ScoreRing';
import { CopyButton } from '../components/shared/CopyButton';
import {
  COL,
  currencySymbolFor,
  regionConfig,
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
  logError,
} from '../utils/aiHelpers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ToneKey = 'direct' | 'warm' | 'achievement';

interface Gap {
  gap: string;
  shortTermFix: string;
  longTermFix: string;
}

interface MatchResult {
  matchScore: number;
  verdict: string;
  cultureFit: string;
  matchingKeywords: string[];
  missingKeywords: string[];
  gaps: Gap[];
  salaryAssessment: string;
  recommendation: string;
  overqualified: boolean;
}

interface CoverLetterResult {
  openings: [string, string, string];
  letter: string;
}

const TONES: { key: ToneKey; label: string }[] = [
  { key: 'direct', label: 'Direct and confident' },
  { key: 'warm', label: 'Warm and enthusiastic' },
  { key: 'achievement', label: 'Achievement-led' },
];

function verdictBand(score: number): string {
  if (score >= 90) return 'Strong match';
  if (score >= 75) return 'Good match';
  if (score >= 60) return 'Decent match';
  if (score >= 45) return 'Partial match';
  return 'Weak match';
}

function verdictColor(score: number): string {
  if (score >= 75) return '#0AAFAA';
  if (score >= 45) return '#F59E0B';
  return '#EF4444';
}

// ---------------------------------------------------------------------------
// Screen 1 — Input
// ---------------------------------------------------------------------------

interface Screen1Props {
  profile: FeatureProps['profile'];
  onHome: () => void;
  onBack: () => void;
  onNavigate: (s: string) => void;
}

function Screen1Input({
  profile,
  onHome,
  onBack,
  onNavigate,
  onSubmit,
}: Screen1Props & {
  onSubmit: (jd: string, company: string, role: string) => Promise<void>;
}) {
  const [jobDescription, setJobDescription] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasCv = Boolean(profile.cvScore);
  const cvScore = profile.cvScore ?? 0;

  async function handleAnalyse() {
    if (!jobDescription.trim() || !company.trim() || !role.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onSubmit(jobDescription.trim(), company.trim(), role.trim());
    } catch (e) {
      logError('JobMatch.Screen1', e);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <ScreenShell title="Job Match" onBack={onBack} onHome={onHome} onNavigate={onNavigate}>
        <LoadingState messages={['Analysing the job description…', 'Comparing with your CV…', 'Calculating match score…']} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Job Match" onBack={onBack} onHome={onHome} onNavigate={onNavigate}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Active CV card */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: ELEVATE.navy, marginBottom: 4 }}>
                Active CV
              </div>
              {hasCv ? (
                <div style={{ color: '#374151', fontSize: 14 }}>
                  CV score:{' '}
                  <span
                    style={{
                      fontWeight: 800,
                      color: cvScore >= 7 ? '#0AAFAA' : cvScore >= 5 ? '#F59E0B' : '#EF4444',
                      fontSize: 16,
                    }}
                  >
                    {cvScore}/10
                  </span>
                </div>
              ) : (
                <div style={{ color: '#6B7280', fontSize: 14 }}>
                  No CV score yet. Run CV Analysis first for a better match.
                </div>
              )}
            </div>
            {!hasCv && (
              <button
                onClick={() => onNavigate('cv')}
                style={{
                  padding: '10px 18px',
                  borderRadius: 999,
                  border: `1.5px solid ${ELEVATE.teal}`,
                  background: 'transparent',
                  color: ELEVATE.teal,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  minHeight: 44,
                }}
              >
                Go to CV Analysis →
              </button>
            )}
          </div>
        </Card>

        {/* Job description */}
        <Card>
          <div style={{ fontWeight: 700, fontSize: 15, color: ELEVATE.navy, marginBottom: 12 }}>
            Job Details
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Company name
              </label>
              <TextField
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Acme Corp"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Role title
              </label>
              <TextField
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Senior Product Manager"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Job description
              </label>
              <TextArea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here…"
                rows={10}
              />
            </div>
          </div>
        </Card>

        {error && (
          <ErrorState message={error} onRetry={handleAnalyse} />
        )}

        <CTAButton
          label="Analyse Match"
          onClick={handleAnalyse}
          disabled={!jobDescription.trim() || !company.trim() || !role.trim() || loading}
        />
      </div>
    </ScreenShell>
  );
}

// ---------------------------------------------------------------------------
// Screen 2 — Match Results
// ---------------------------------------------------------------------------

interface Screen2Props {
  profile: FeatureProps['profile'];
  result: MatchResult;
  company: string;
  role: string;
  onHome: () => void;
  onBack: () => void;
  onNavigate: (s: string) => void;
  onContinue: (tone: ToneKey) => Promise<void>;
}

function Screen2Results({
  profile,
  result,
  company,
  role,
  onHome,
  onBack,
  onNavigate,
  onContinue,
}: Screen2Props) {
  const [selectedTone, setSelectedTone] = useState<ToneKey>('direct');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rConf = regionConfig(profile.region ?? 'Other');
  const currSym = currencySymbolFor(profile);
  const score = result.matchScore;
  const band = verdictBand(score);
  const bandColor = verdictColor(score);

  async function handleGenerateCover() {
    setLoading(true);
    setError(null);
    try {
      await onContinue(selectedTone);
    } catch (e) {
      logError('JobMatch.Screen2', e);
      setError('Failed to generate cover letter. Please try again.');
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <ScreenShell title="Cover Letter" onBack={onBack} onHome={onHome} onNavigate={onNavigate}>
        <LoadingState messages={['Crafting your opening…', 'Building the letter…', 'Adding finishing touches…']} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title={`${company} — ${role}`}
      onBack={onBack}
      onHome={onHome}
      onNavigate={onNavigate}
      footer={
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Tone selector */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {TONES.map((t) => (
              <button
                key={t.key}
                onClick={() => setSelectedTone(t.key)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: `1.5px solid ${selectedTone === t.key ? ELEVATE.teal : '#E5E7EB'}`,
                  background: selectedTone === t.key ? 'rgba(10,175,170,0.10)' : '#fff',
                  color: selectedTone === t.key ? ELEVATE.teal : '#374151',
                  fontWeight: selectedTone === t.key ? 700 : 400,
                  fontSize: 13,
                  cursor: 'pointer',
                  minHeight: 44,
                  boxShadow: selectedTone === t.key ? `0 0 0 2px ${ELEVATE.teal}40` : 'none',
                  transition: 'all 150ms ease',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          {error && <div style={{ color: '#EF4444', fontSize: 13, textAlign: 'center' }}>{error}</div>}
          <CTAButton label="Generate Cover Letter" onClick={handleGenerateCover} disabled={loading} />
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Score ring + verdict */}
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, paddingTop: 8 }}>
            <ScoreRing score={score} size={120} label="Match" />
            <div style={{ fontSize: 20, fontWeight: 800, color: bandColor }}>{band}</div>
            <div style={{ fontSize: 14, color: '#374151', textAlign: 'center', maxWidth: 400 }}>{result.verdict}</div>
            <AILabel />
          </div>
        </Card>

        {/* Overqualification warning */}
        {result.overqualified && (
          <Card>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 22 }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#B45309', marginBottom: 6 }}>
                  Overqualification detected
                </div>
                <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                  Your experience may exceed what this role requires. Consider addressing this proactively in your
                  cover letter — explain your genuine interest in the scope of this role, or use the letter to frame
                  it as a deliberate career choice rather than a step down.
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Culture fit */}
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14, color: ELEVATE.navy, marginBottom: 8 }}>Culture Fit</div>
          <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>{result.cultureFit}</div>
          <AILabel />
        </Card>

        {/* Keywords */}
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14, color: ELEVATE.navy, marginBottom: 12 }}>Keywords</div>
          {result.matchingKeywords.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Matching
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {result.matchingKeywords.map((kw) => (
                  <span
                    key={kw}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      background: 'rgba(10,175,170,0.12)',
                      color: '#0AAFAA',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
          {result.missingKeywords.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Missing
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {result.missingKeywords.map((kw) => (
                  <span
                    key={kw}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      background: 'rgba(245,158,11,0.12)',
                      color: '#B45309',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Gaps */}
        {result.gaps.length > 0 && (
          <Card>
            <div style={{ fontWeight: 700, fontSize: 14, color: ELEVATE.navy, marginBottom: 12 }}>
              Gaps &amp; How to Close Them
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {result.gaps.map((g, i) => (
                <div
                  key={i}
                  style={{
                    borderLeft: `3px solid ${ELEVATE.teal}`,
                    paddingLeft: 12,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0F2554', marginBottom: 6 }}>{g.gap}</div>
                  <div style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: '#0AAFAA' }}>Short term: </span>
                    {g.shortTermFix}
                  </div>
                  <div style={{ fontSize: 13, color: '#374151' }}>
                    <span style={{ fontWeight: 600, color: '#6B7280' }}>Long term: </span>
                    {g.longTermFix}
                  </div>
                </div>
              ))}
            </div>
            <AILabel />
          </Card>
        )}

        {/* Salary */}
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14, color: ELEVATE.navy, marginBottom: 8 }}>
            Salary Assessment ({rConf.emoji} {rConf.name} · {currSym})
          </div>
          <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>{result.salaryAssessment}</div>
          <SalaryNote />
          <AILabel />
        </Card>

        {/* Job boards */}
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14, color: ELEVATE.navy, marginBottom: 10 }}>
            Job Boards — {rConf.emoji} {rConf.name}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {rConf.jobBoards.map((board) => (
              <a
                key={board.name}
                href={board.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '8px 16px',
                  borderRadius: 999,
                  border: `1.5px solid ${ELEVATE.teal}`,
                  color: ELEVATE.teal,
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: 'none',
                  minHeight: 44,
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                {board.name} ↗
              </a>
            ))}
          </div>
        </Card>

        <div style={{ height: 120 }} />
      </div>
    </ScreenShell>
  );
}

// ---------------------------------------------------------------------------
// Screen 3 — Cover Letter
// ---------------------------------------------------------------------------

interface Screen3Props {
  coverLetter: CoverLetterResult;
  company: string;
  role: string;
  tone: ToneKey;
  onHome: () => void;
  onBack: () => void;
  onNavigate: (s: string) => void;
}

function Screen3CoverLetter({ coverLetter, company, role, tone, onHome, onBack, onNavigate }: Screen3Props) {
  const [selectedOpening, setSelectedOpening] = useState(0);

  const openings = safeArray<string>(coverLetter.openings).slice(0, 3);
  const fullLetter = coverLetter.letter ?? '';

  const toneLabel = TONES.find((t) => t.key === tone)?.label ?? '';

  function handleDownload() {
    const rtf = generateRTF(`Cover Letter — ${role} at ${company}`, fullLetter);
    downloadFile('cover-letter.rtf', rtf, 'application/rtf');
  }

  return (
    <ScreenShell title="Cover Letter" onBack={onBack} onHome={onHome} onNavigate={onNavigate}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Tone badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              padding: '4px 12px',
              borderRadius: 999,
              background: 'rgba(10,175,170,0.12)',
              color: ELEVATE.teal,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {toneLabel}
          </span>
          <span style={{ fontSize: 13, color: '#6B7280' }}>
            {company} · {role}
          </span>
        </div>

        {/* Opening variations */}
        {openings.length > 0 && (
          <Card>
            <div style={{ fontWeight: 700, fontSize: 14, color: ELEVATE.navy, marginBottom: 12 }}>
              Opening Variations
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {openings.map((opening, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedOpening(i)}
                  style={{
                    textAlign: 'left',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: `1.5px solid ${selectedOpening === i ? ELEVATE.teal : '#E5E7EB'}`,
                    background: selectedOpening === i ? 'rgba(10,175,170,0.06)' : '#FAFAFA',
                    cursor: 'pointer',
                    fontSize: 13,
                    color: '#374151',
                    lineHeight: 1.6,
                    boxShadow: selectedOpening === i ? `0 0 0 3px ${ELEVATE.teal}25` : 'none',
                    transition: 'all 150ms ease',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 11, color: selectedOpening === i ? ELEVATE.teal : '#9CA3AF', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Option {i + 1}
                  </div>
                  {opening}
                </button>
              ))}
            </div>
            {openings.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <CopyButton text={openings[selectedOpening]} label="Copy opening" />
              </div>
            )}
            <AILabel />
          </Card>
        )}

        {/* Full letter */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: ELEVATE.navy }}>Full Letter</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <CopyButton text={fullLetter} label="Copy letter" />
              <button
                onClick={handleDownload}
                style={{
                  padding: '10px 18px',
                  borderRadius: 999,
                  border: `1.5px solid ${ELEVATE.teal}`,
                  background: 'transparent',
                  color: ELEVATE.teal,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  minHeight: 44,
                }}
              >
                Download RTF
              </button>
            </div>
          </div>
          <div
            style={{
              fontSize: 14,
              color: '#374151',
              lineHeight: 1.8,
              whiteSpace: 'pre-wrap',
              background: '#F9FAFB',
              borderRadius: 12,
              padding: '16px',
              border: '1px solid #E5E7EB',
            }}
          >
            {fullLetter}
          </div>
          <AILabel />
        </Card>
      </div>
    </ScreenShell>
  );
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

export function JobMatch({ profile, isPro: _isPro, onHome, onBack, onNavigate }: FeatureProps) {
  const isPro = true; // always true per spec
  void isPro;

  const ds = useFiasDataStore();
  const { invoke, isLoading } = useEntityInvocation();

  type Screen = 'input' | 'results' | 'cover';

  const [screen, setScreen] = useState<Screen>('input');
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [coverResult, setCoverResult] = useState<CoverLetterResult | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [selectedTone, setSelectedTone] = useState<ToneKey>('direct');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // The active CV text is stored in profile.finalText (onboarding) or we derive from cvScore context
  const activeCv: string = (profile as unknown as { activeCvText?: string }).activeCvText
    ?? profile.finalText
    ?? [
        profile.currentRole ? `Current role: ${profile.currentRole}` : '',
        profile.targetRole ? `Target role: ${profile.targetRole}` : '',
        profile.experience ? `Experience: ${profile.experience}` : '',
      ]
        .filter(Boolean)
        .join('\n');

  // --- Screen 1 submit ---
  async function handleAnalyse(jd: string, comp: string, r: string) {
    setJobDescription(jd);
    setCompany(comp);
    setRole(r);

    // Save input to dataStore BEFORE AI call
    const draftKey = `jobmatch_${Date.now()}`;
    try {
      await ds.put<{ company: string; role: string; jobDescription: string; status: string } & Record<string, unknown>>(
        COL.applications,
        draftKey,
        { company: comp, role: r, jobDescription: jd, status: 'saved' },
      );
    } catch (e) {
      await logToStore('JobMatch.save', e);
    }

    const systemPrompt = `${MASTER_PERSONA}\n${buildUserContext(profile)}\n\nReturn ONLY valid JSON: {"matchScore": number, "verdict": string, "cultureFit": string, "matchingKeywords": [string], "missingKeywords": [string], "gaps": [{"gap": string, "shortTermFix": string, "longTermFix": string}], "salaryAssessment": string, "recommendation": string, "overqualified": boolean}`;
    const input = `CV: ${activeCv}\nJob: ${jd}\nRegion: ${profile.region ?? 'not specified'}\nCurrency: ${currencySymbolFor(profile)}`;

    const res = await invoke({ entityId: { capability: 'text-standard' }, input, systemPrompt });
    const raw = res?.output ?? '';
    const parsed = parseAiJson<MatchResult>(raw);

    if (!parsed) {
      throw new Error('Could not parse AI response.');
    }

    const result: MatchResult = {
      matchScore: safeScore(parsed.matchScore),
      verdict: parsed.verdict ?? '',
      cultureFit: parsed.cultureFit ?? '',
      matchingKeywords: safeArray<string>(parsed.matchingKeywords),
      missingKeywords: safeArray<string>(parsed.missingKeywords),
      gaps: safeArray<Gap>(parsed.gaps),
      salaryAssessment: parsed.salaryAssessment ?? '',
      recommendation: parsed.recommendation ?? '',
      overqualified: Boolean(parsed.overqualified),
    };

    // Persist match score back to the application record
    try {
      await ds.put<{ company: string; role: string; jobDescription: string; status: string; matchScore: number } & Record<string, unknown>>(
        COL.applications,
        draftKey,
        { company: comp, role: r, jobDescription: jd, status: 'saved', matchScore: result.matchScore },
      );
    } catch (e) {
      await logToStore('JobMatch.saveScore', e);
    }

    setMatchResult(result);
    setScreen('results');
  }

  // --- Screen 2 → 3: generate cover letter ---
  async function handleGenerateCover(tone: ToneKey) {
    setSelectedTone(tone);

    const toneLabel = TONES.find((t) => t.key === tone)?.label ?? tone;

    const systemPrompt = `${MASTER_PERSONA}\n${buildUserContext(profile)}\n\nYou are writing a professional cover letter. Tone requested: "${toneLabel}". Return ONLY valid JSON: {"openings": [string, string, string], "letter": string}`;
    const input = `CV: ${activeCv}\nRole: ${role} at ${company}\nJob description: ${jobDescription}\nTone: ${toneLabel}`;

    const res = await invoke({ entityId: { capability: 'text-standard' }, input, systemPrompt });
    const raw = res?.output ?? '';
    const parsed = parseAiJson<CoverLetterResult>(raw);

    if (!parsed) {
      throw new Error('Could not parse cover letter response.');
    }

    const clResult: CoverLetterResult = {
      openings: (safeArray<string>(parsed.openings).slice(0, 3) as [string, string, string]),
      letter: parsed.letter ?? '',
    };

    // Save to vault
    try {
      await saveToVault(`cover-letter-${company}-${role}`, {
        company,
        role,
        tone: toneLabel,
        letter: clResult.letter,
        openings: clResult.openings,
        generatedAt: new Date().toISOString(),
      });
    } catch (e) {
      await logToStore('JobMatch.saveVault', e);
    }

    setCoverResult(clResult);
    setScreen('cover');
  }

  // While useEntityInvocation is loading but screen hasn't transitioned yet
  if (isLoading && screen === 'input') {
    return (
      <ScreenShell title="Job Match" onBack={onBack} onHome={onHome} onNavigate={onNavigate}>
        <LoadingState messages={['Analysing the job description…', 'Comparing with your CV…', 'Calculating match score…']} />
      </ScreenShell>
    );
  }

  if (errorMsg) {
    return (
      <ScreenShell title="Job Match" onBack={onBack} onHome={onHome} onNavigate={onNavigate}>
        <ErrorState message={errorMsg} onRetry={() => { setErrorMsg(null); setScreen('input'); }} />
      </ScreenShell>
    );
  }

  if (screen === 'results' && matchResult) {
    return (
      <Screen2Results
        profile={profile}
        result={matchResult}
        company={company}
        role={role}
        onHome={onHome}
        onBack={() => setScreen('input')}
        onNavigate={onNavigate}
        onContinue={handleGenerateCover}
      />
    );
  }

  if (screen === 'cover' && coverResult) {
    return (
      <Screen3CoverLetter
        coverLetter={coverResult}
        company={company}
        role={role}
        tone={selectedTone}
        onHome={onHome}
        onBack={() => setScreen('results')}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <Screen1Input
      profile={profile}
      onHome={onHome}
      onBack={onBack}
      onNavigate={onNavigate}
      onSubmit={handleAnalyse}
    />
  );
}
