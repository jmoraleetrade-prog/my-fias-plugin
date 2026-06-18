import { useState, useEffect, useRef } from 'react';
import { useEntityInvocation, useFiasDataStore, fias } from '@fias/arche-sdk';
import { ScreenShell, Card, CTAButton, AILabel } from '../components/shared/ScreenShell';
import type { FeatureProps } from '../components/shared/ScreenShell';
import { LoadingState } from '../components/shared/LoadingState';
import { CopyButton } from '../components/shared/CopyButton';
import {
  ExtendedApplication,
  loadApplications,
  STATUS_META,
  COL,
} from '../utils/elevate';
import { MASTER_PERSONA, buildUserContext, calculateVelocityScore, logError, saveToVault } from '../utils/aiHelpers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoWeekLabel(date: Date): string {
  return `Week of ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
}

interface WeekBucket {
  label: string;
  weekStart: Date;
  applications: number;
  interviews: number;
  offers: number;
  rejections: number;
}

function buildWeeklyBuckets(apps: ExtendedApplication[], weeksBack = 6): WeekBucket[] {
  const now = new Date();
  const buckets: WeekBucket[] = [];
  for (let i = weeksBack - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const ws = startOfWeek(d);
    const we = new Date(ws);
    we.setDate(we.getDate() + 7);
    const weekApps = apps.filter((a) => {
      const t = new Date(a.updatedAt || a.appliedAt).getTime();
      return t >= ws.getTime() && t < we.getTime();
    });
    buckets.push({
      label: isoWeekLabel(ws),
      weekStart: ws,
      applications: weekApps.length,
      interviews: weekApps.filter((a) => a.status === 'interviewing').length,
      offers: weekApps.filter((a) => a.status === 'offer' || a.status === 'accepted').length,
      rejections: weekApps.filter((a) => a.status === 'rejected').length,
    });
  }
  return buckets;
}

function isStrongWeek(bucket: WeekBucket): boolean {
  return bucket.applications >= 5 || bucket.interviews >= 2 || bucket.offers >= 1;
}

// ---------------------------------------------------------------------------
// Share Card visual component
// ---------------------------------------------------------------------------

function ShareCard({ bucket, velocityScore, name }: { bucket: WeekBucket; velocityScore: number; name: string }) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0F2554, #0AAFAA)',
        borderRadius: 20,
        padding: '28px 24px',
        color: '#ffffff',
        fontFamily: 'inherit',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', opacity: 0.8, marginBottom: 6 }}>
        ⚡ ELEVATE — WEEKLY REPORT
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>{bucket.label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
        {[
          { label: 'Applications', value: bucket.applications },
          { label: 'Interviews', value: bucket.interviews },
          { label: 'Velocity', value: `${velocityScore}%` },
        ].map((s) => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{String(s.value)}</div>
            <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, opacity: 0.7 }}>
        {name ? `${name} is making moves.` : 'Keep moving forward.'}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function VelocityReport({ profile, onHome, onBack, onNavigate }: FeatureProps) {
  const ds = useFiasDataStore();
  const { invoke, isLoading: aiLoading } = useEntityInvocation();

  const [apps, setApps] = useState<ExtendedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [coaching, setCoaching] = useState('');
  const [coachingError, setCoachingError] = useState(false);
  const [hasCoached, setHasCoached] = useState(false);
  const [savedToWins, setSavedToWins] = useState(false);
  const savedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadApplications()
      .then((loaded) => { if (!cancelled) { setApps(loaded); setLoading(false); } })
      .catch((err) => { logError('VelocityReport.load', err); if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ds]);

  const buckets = buildWeeklyBuckets(apps, 6);
  const currentBucket = buckets[buckets.length - 1];
  const prevBucket = buckets[buckets.length - 2];

  const velocity = calculateVelocityScore(profile, apps);
  const thisWeekStrong = isStrongWeek(currentBucket);

  // Save to wins automatically if it's a strong week and not already done
  useEffect(() => {
    if (!thisWeekStrong || savedRef.current || apps.length === 0) return;
    savedRef.current = true;
    const key = `velocity-win-${currentBucket.weekStart.toISOString().slice(0, 10)}`;
    saveToVault(key, {
      type: 'velocity-win',
      week: currentBucket.label,
      applications: currentBucket.applications,
      interviews: currentBucket.interviews,
      offers: currentBucket.offers,
      velocityScore: velocity.score,
      savedAt: new Date().toISOString(),
    }).then((ok) => {
      if (ok) setSavedToWins(true);
    }).catch((err) => logError('VelocityReport.saveToVault', err));

    // Also put in wins collection
    const winKey = `win-velocity-${currentBucket.weekStart.toISOString().slice(0, 10)}`;
    fias.dataStore.put(COL.wins, winKey, {
      type: 'velocity-win',
      week: currentBucket.label,
      velocityScore: velocity.score,
      applications: currentBucket.applications,
      interviews: currentBucket.interviews,
      savedAt: new Date().toISOString(),
    }).catch((err) => logError('VelocityReport.saveWin', err));
  }, [thisWeekStrong, apps.length, currentBucket, velocity.score]);

  async function runCoaching() {
    setCoachingError(false);
    const weekSummary = buckets.map((b) => `${b.label}: ${b.applications} apps, ${b.interviews} interviews, ${b.offers} offers, ${b.rejections} rejections`).join('. ');
    const userCtx = buildUserContext(profile);
    const input = `${userCtx}\n\nWeekly stats (last 6 weeks): ${weekSummary}\n\nThis week velocity score: ${velocity.score} (${velocity.band}).`;
    const systemPrompt = `${MASTER_PERSONA}\n\nYou are writing a concise Monday career velocity coaching summary. The user sees this at the start of the week. Write 2-3 focused paragraphs: (1) what the data says about last week, (2) one specific thing they're doing well, (3) one actionable goal for this week. Be warm, direct, honest. If they had a strong week, celebrate it genuinely but briefly. Never use: "leverage", "passionate", "results-driven", "journey", "impactful", "synergy", "dynamic".`;
    try {
      const res = await invoke({ entityId: { capability: 'text-standard' }, input, systemPrompt });
      const out = res?.output ?? '';
      if (!out) { setCoachingError(true); return; }
      setCoaching(out);
      setHasCoached(true);
    } catch (err) {
      logError('VelocityReport.coaching', err);
      setCoachingError(true);
    }
  }

  if (loading) {
    return (
      <ScreenShell title="Velocity Report" onBack={onBack} onHome={onHome} onNavigate={onNavigate}>
        <LoadingState messages={['Loading your weekly data…', 'Calculating velocity…']} />
      </ScreenShell>
    );
  }

  const maxApps = Math.max(...buckets.map((b) => b.applications), 1);

  return (
    <ScreenShell title="Velocity Report" onBack={onBack} onHome={onHome} onNavigate={onNavigate}>
      {/* Monday Note */}
      <div style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginBottom: 16 }}>
        Your weekly velocity report — refreshes every Monday
      </div>

      {/* Velocity Score */}
      <Card style={{ marginBottom: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Career Velocity</div>
        <div style={{ fontSize: 52, fontWeight: 800, color: '#0F2554', lineHeight: 1 }}>{velocity.score}</div>
        <div style={{ fontSize: 14, color: '#0AAFAA', fontWeight: 700, marginTop: 6 }}>{velocity.band}</div>
        {thisWeekStrong && (
          <div style={{ marginTop: 12, padding: '8px 16px', background: '#E6FAF9', borderRadius: 999, display: 'inline-block', fontSize: 13, color: '#0AAFAA', fontWeight: 700 }}>
            🏆 Strong week
            {savedToWins && ' — saved to your wins'}
          </div>
        )}
      </Card>

      {/* This Week vs Last Week */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'This Week', bucket: currentBucket, highlight: true },
          { label: 'Last Week', bucket: prevBucket, highlight: false },
        ].map(({ label, bucket, highlight }) => (
          <Card key={label} style={{ border: highlight ? '2px solid #0AAFAA' : undefined, padding: 16 }}>
            <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 700, marginBottom: 10 }}>{label}</div>
            {[
              { k: 'Apps', v: bucket?.applications ?? 0 },
              { k: 'Interviews', v: bucket?.interviews ?? 0 },
              { k: 'Offers', v: bucket?.offers ?? 0 },
            ].map(({ k, v }) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: '#6B7280' }}>{k}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0F2554' }}>{v}</span>
              </div>
            ))}
          </Card>
        ))}
      </div>

      {/* 6-Week Bar Chart */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0F2554', marginBottom: 14 }}>6-Week Activity</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
          {buckets.map((b, i) => {
            const h = maxApps > 0 ? Math.round((b.applications / maxApps) * 72) : 4;
            const isLatest = i === buckets.length - 1;
            return (
              <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>{b.applications}</div>
                <div
                  style={{
                    width: '100%',
                    height: Math.max(h, 4),
                    borderRadius: 4,
                    background: isLatest ? '#0AAFAA' : '#E0F7FA',
                    transition: 'height 300ms ease',
                  }}
                />
                <div style={{ fontSize: 9, color: '#9CA3AF', textAlign: 'center', lineHeight: 1.2 }}>
                  {b.label.replace('Week of ', '')}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Status Distribution this week */}
      {(currentBucket.applications > 0 || currentBucket.interviews > 0) && (
        <Card style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0F2554', marginBottom: 12 }}>This Week Activity</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Applied / Saved', count: currentBucket.applications - currentBucket.interviews - currentBucket.offers - currentBucket.rejections, color: '#0891B2' },
              { label: 'Interviewing', count: currentBucket.interviews, color: '#8B5CF6' },
              { label: 'Offers', count: currentBucket.offers, color: '#0AAFAA' },
              { label: 'Rejections', count: currentBucket.rejections, color: '#EF4444' },
            ]
              .filter((r) => r.count > 0)
              .map((r) => (
                <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#374151', flex: 1 }}>{r.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: r.color }}>{r.count}</span>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Share Card */}
      <div style={{ marginBottom: 20 }}>
        <ShareCard bucket={currentBucket} velocityScore={velocity.score} name={profile.name || ''} />
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
          <CopyButton
            text={`Elevate Weekly Report — ${currentBucket.label}\nApplications: ${currentBucket.applications} | Interviews: ${currentBucket.interviews} | Velocity: ${velocity.score}% (${velocity.band})`}
            label="Copy summary"
          />
        </div>
      </div>

      {/* AI Coaching */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0F2554', marginBottom: 6 }}>Monday Coaching Summary</div>
        <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 14, lineHeight: 1.5 }}>
          Get a personalised AI coaching note for the week ahead.
        </div>

        {!hasCoached && !aiLoading && (
          <CTAButton label="Get my weekly coaching" onClick={runCoaching} disabled={aiLoading} />
        )}
        {aiLoading && (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#0AAFAA', fontWeight: 600 }}>
            ⚡ Writing your coaching note…
          </div>
        )}
        {coachingError && !aiLoading && (
          <div style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>
            Coaching failed — please try again.
            <button type="button" onClick={runCoaching} style={{ marginLeft: 8, color: '#0AAFAA', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Retry</button>
          </div>
        )}
        {hasCoached && coaching && (
          <div>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: '#374151', whiteSpace: 'pre-wrap' }}>{coaching}</div>
            <AILabel style={{ marginTop: 12 }} />
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <CopyButton text={coaching} label="Copy coaching" />
              <button
                type="button"
                onClick={() => { setHasCoached(false); setCoaching(''); }}
                style={{ color: '#0AAFAA', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
              >
                Refresh
              </button>
            </div>
          </div>
        )}
      </Card>
    </ScreenShell>
  );
}
