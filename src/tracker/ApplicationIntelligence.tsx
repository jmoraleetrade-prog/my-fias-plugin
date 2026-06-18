import { useState, useEffect } from 'react';
import { useEntityInvocation, useFiasDataStore } from '@fias/arche-sdk';
import { ScreenShell, Card, CTAButton, AILabel } from '../components/shared/ScreenShell';
import type { FeatureProps } from '../components/shared/ScreenShell';
import { LoadingState } from '../components/shared/LoadingState';
import { EmptyState } from '../components/shared/EmptyState';
import {
  ExtendedApplication,
  loadApplications,
  STATUS_META,
} from '../utils/elevate';
import { MASTER_PERSONA, buildUserContext, logError } from '../utils/aiHelpers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

interface Stats {
  total: number;
  applied: number;
  interviewing: number;
  offers: number;
  rejections: number;
  responseRate: number;
  avgDaysToResponse: number;
  sourceBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
}

function computeStats(apps: ExtendedApplication[]): Stats {
  const total = apps.length;
  const applied = apps.filter((a) => a.status !== 'saved').length;
  const interviewing = apps.filter((a) => a.status === 'interviewing').length;
  const offers = apps.filter((a) => a.status === 'offer' || a.status === 'accepted').length;
  const rejections = apps.filter((a) => a.status === 'rejected').length;

  const responded = interviewing + offers + rejections;
  const responseRate = applied > 0 ? Math.round((responded / applied) * 100) : 0;

  const withDates = apps.filter((a) => a.appliedAt && a.updatedAt && a.status !== 'saved' && a.status !== 'applied');
  const avgDaysToResponse =
    withDates.length > 0
      ? Math.round(
          withDates.reduce((sum, a) => sum + daysSince(a.appliedAt), 0) / withDates.length,
        )
      : 0;

  const sourceBreakdown: Record<string, number> = {};
  const statusBreakdown: Record<string, number> = {};
  for (const a of apps) {
    const src = a.source || 'Unknown';
    sourceBreakdown[src] = (sourceBreakdown[src] ?? 0) + 1;
    statusBreakdown[a.status] = (statusBreakdown[a.status] ?? 0) + 1;
  }

  return { total, applied, interviewing, offers, rejections, responseRate, avgDaysToResponse, sourceBreakdown, statusBreakdown };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ApplicationIntelligence({ profile, onHome, onBack, onNavigate }: FeatureProps) {
  const ds = useFiasDataStore();
  const { invoke, isLoading: aiLoading } = useEntityInvocation();

  const [apps, setApps] = useState<ExtendedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysisText, setAnalysisText] = useState('');
  const [analysisError, setAnalysisError] = useState(false);
  const [hasAnalysed, setHasAnalysed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadApplications()
      .then((loaded) => { if (!cancelled) { setApps(loaded); setLoading(false); } })
      .catch((err) => { logError('AppIntelligence.load', err); if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ds]);

  const stats = computeStats(apps);

  async function runAnalysis() {
    setAnalysisError(false);
    const summary = `Applications: ${stats.total}. Applied: ${stats.applied}. Interviewing: ${stats.interviewing}. Offers: ${stats.offers}. Rejections: ${stats.rejections}. Response rate: ${stats.responseRate}%. Average days to first response: ${stats.avgDaysToResponse}. Sources: ${JSON.stringify(stats.sourceBreakdown)}. Status breakdown: ${JSON.stringify(stats.statusBreakdown)}.`;
    const userCtx = buildUserContext(profile);
    const input = `${userCtx}\n\nApplication data:\n${summary}`;
    const systemPrompt = `${MASTER_PERSONA}\n\nAnalyse this person's job application data and provide honest, specific coaching insights. Cover: (1) what the data says about their strategy, (2) which channels are working, (3) what they should do differently in the next 2 weeks. Write in warm, direct prose — no bullet points, 3-4 paragraphs max. Never use: "leverage", "passionate", "results-driven", "journey", "impactful", "synergy", "dynamic".`;
    try {
      const res = await invoke({ entityId: { capability: 'text-standard' }, input, systemPrompt });
      const out = res?.output ?? '';
      if (!out) { setAnalysisError(true); return; }
      setAnalysisText(out);
      setHasAnalysed(true);
    } catch (err) {
      logError('AppIntelligence.analyse', err);
      setAnalysisError(true);
    }
  }

  if (loading) {
    return (
      <ScreenShell title="Application Intelligence" onBack={onBack} onHome={onHome} onNavigate={onNavigate}>
        <LoadingState messages={['Crunching your application data…', 'Finding patterns…']} />
      </ScreenShell>
    );
  }

  if (apps.length === 0) {
    return (
      <ScreenShell title="Application Intelligence" onBack={onBack} onHome={onHome} onNavigate={onNavigate}>
        <EmptyState
          emoji="📊"
          heading="No applications yet"
          message="Add some applications in the tracker and come back here to see your intelligence report."
          ctaLabel="Go to Tracker"
          onCta={onBack}
        />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Application Intelligence" onBack={onBack} onHome={onHome} onNavigate={onNavigate}>
      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Applications', value: stats.total, color: '#0F2554' },
          { label: 'Response Rate', value: `${stats.responseRate}%`, color: '#0AAFAA' },
          { label: 'Interviews', value: stats.interviewing, color: '#8B5CF6' },
          { label: 'Avg Days to Response', value: stats.avgDaysToResponse > 0 ? `${stats.avgDaysToResponse}d` : '—', color: '#0891B2' },
        ].map((s) => (
          <Card key={s.label} style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{String(s.value)}</div>
          </Card>
        ))}
      </div>

      {/* Status Breakdown */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0F2554', marginBottom: 14 }}>Status Breakdown</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Object.entries(stats.statusBreakdown).map(([status, count]) => {
            const meta = STATUS_META[status as keyof typeof STATUS_META] ?? { label: status, color: '#6B7280', bg: '#F3F4F6' };
            const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
            return (
              <div key={status}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: meta.color, fontWeight: 600 }}>{meta.label}</span>
                  <span style={{ fontSize: 13, color: '#6B7280' }}>{count} ({pct}%)</span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: '#F3F4F6', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: meta.color, borderRadius: 999, transition: 'width 400ms ease' }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Source Breakdown */}
      {Object.keys(stats.sourceBreakdown).length > 1 && (
        <Card style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0F2554', marginBottom: 14 }}>Where Applications Come From</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(stats.sourceBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([src, count]) => (
                <div key={src} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: '#374151' }}>{src}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0AAFAA' }}>{count}</span>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* AI Analysis */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0F2554', marginBottom: 6 }}>AI Pattern Analysis</div>
        <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 14, lineHeight: 1.5 }}>
          Elevate will analyse your full application history and tell you what's working and what to change.
        </div>

        {!hasAnalysed && !aiLoading && (
          <CTAButton label="Analyse my applications" onClick={runAnalysis} disabled={aiLoading} />
        )}

        {aiLoading && (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#0AAFAA', fontWeight: 600 }}>
            ⚡ Analysing patterns…
          </div>
        )}

        {analysisError && !aiLoading && (
          <div style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>
            Analysis failed — please try again.
            <button type="button" onClick={runAnalysis} style={{ marginLeft: 8, color: '#0AAFAA', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Retry</button>
          </div>
        )}

        {hasAnalysed && analysisText && (
          <div>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: '#374151', whiteSpace: 'pre-wrap' }}>{analysisText}</div>
            <AILabel style={{ marginTop: 12 }} />
            <button
              type="button"
              onClick={() => { setHasAnalysed(false); setAnalysisText(''); }}
              style={{ marginTop: 10, color: '#0AAFAA', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
            >
              Re-run analysis
            </button>
          </div>
        )}
      </Card>
    </ScreenShell>
  );
}
