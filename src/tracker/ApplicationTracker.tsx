import { useState, useEffect, useCallback } from 'react';
import { useEntityInvocation, useFiasDataStore, fias } from '@fias/arche-sdk';
import { ScreenShell, Card, CTAButton, AILabel, TextField, TextArea } from '../components/shared/ScreenShell';
import type { FeatureProps } from '../components/shared/ScreenShell';
import { LoadingState } from '../components/shared/LoadingState';
import { EmptyState } from '../components/shared/EmptyState';
import { CopyButton } from '../components/shared/CopyButton';
import {
  ExtendedApplication,
  STATUS_META,
  COL,
  applicationQualityScore,
  loadApplications,
  REJECTION_RECOVERY,
  RejectionType,
  logToStore,
} from '../utils/elevate';
import { MASTER_PERSONA, getStaleApplications, parseAiJson, logError } from '../utils/aiHelpers';
import { ApplicationIntelligence } from './ApplicationIntelligence';
import { VelocityReport } from './VelocityReport';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TrackerMode =
  | 'list'
  | 'smart-paste'
  | 'quick-add'
  | 'batch-import'
  | 'detail'
  | 'quick-rejection'
  | 'email-parse'
  | 'intelligence'
  | 'velocity';

interface SmartPasteExtracted {
  title: string;
  company: string;
  location: string;
  salary: string;
  deadline: string;
  remote: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function genId() {
  return `app-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function statusOrder(s: string): number {
  return { interviewing: 0, offer: 1, applied: 2, saved: 3, rejected: 4, accepted: 5 }[s] ?? 99;
}

const REJECTION_TYPES: { value: RejectionType; label: string }[] = [
  { value: 'first', label: 'First rejection' },
  { value: 'multiple', label: 'One of several rejections' },
  { value: 'final-round', label: 'Final round rejection' },
  { value: 'ghosted', label: 'Ghosted / no response' },
  { value: 'overqualified', label: 'Told overqualified' },
  { value: 'underqualified', label: 'Told underqualified' },
  { value: 'long-search', label: 'Long search' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status as keyof typeof STATUS_META] ?? { label: status, color: '#6B7280', bg: '#F3F4F6' };
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, background: meta.bg, padding: '3px 10px', borderRadius: 999, display: 'inline-block' }}>
      {meta.label}
    </span>
  );
}

function ScorePill({ score }: { score: number }) {
  const color = score >= 70 ? '#0AAFAA' : score >= 50 ? '#F59E0B' : '#EF4444';
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color, background: color + '18', padding: '3px 10px', borderRadius: 999 }}>
      {score}/100
    </span>
  );
}

// ---------------------------------------------------------------------------
// Application Card (list item)
// ---------------------------------------------------------------------------

function AppCard({
  app,
  isStale,
  onClick,
}: {
  app: ExtendedApplication;
  isStale: boolean;
  onClick: () => void;
}) {
  const days = daysSince(app.updatedAt || app.appliedAt);
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        background: '#ffffff',
        border: `1.5px solid ${isStale ? '#F59E0B' : '#e2e8f0'}`,
        borderRadius: 16,
        padding: '14px 16px',
        cursor: 'pointer',
        boxShadow: isStale ? '0 0 0 3px rgba(245,158,11,0.1)' : '0 1px 4px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minHeight: 44,
        transition: 'box-shadow 200ms ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>{app.company}</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{app.role}</div>
        </div>
        <StatusBadge status={app.status} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 12, color: '#9CA3AF' }}>{days}d ago</span>
        {isStale && (
          <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 700 }}>⚠ Follow up?</span>
        )}
        {app.interviewDate && (
          <span style={{ fontSize: 11, color: '#8B5CF6', fontWeight: 600 }}>
            📅 {new Date(app.interviewDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Stats Bar
// ---------------------------------------------------------------------------

function StatsBar({ apps }: { apps: ExtendedApplication[] }) {
  const total = apps.length;
  const active = apps.filter((a) => a.status !== 'rejected' && a.status !== 'accepted').length;
  const interviews = apps.filter((a) => a.status === 'interviewing').length;
  const offers = apps.filter((a) => a.status === 'offer' || a.status === 'accepted').length;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
      {[
        { label: 'Total', value: total, color: '#0F2554' },
        { label: 'Active', value: active, color: '#0891B2' },
        { label: 'Interviews', value: interviews, color: '#8B5CF6' },
        { label: 'Offers', value: offers, color: '#0AAFAA' },
      ].map((s) => (
        <div
          key={s.label}
          style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: '12px 10px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
        >
          <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
          <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Smart Paste Screen
// ---------------------------------------------------------------------------

function SmartPasteScreen({
  onSave,
  onBack,
}: {
  onSave: (app: ExtendedApplication) => void;
  onBack: () => void;
}) {
  const { invoke, isLoading } = useEntityInvocation();
  const ds = useFiasDataStore();

  const [raw, setRaw] = useState('');
  const [extracted, setExtracted] = useState<SmartPasteExtracted | null>(null);
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [salary, setSalary] = useState('');
  const [deadline, setDeadline] = useState('');
  const [remote, setRemote] = useState('');
  const [parseError, setParseError] = useState(false);

  async function handleExtract() {
    if (!raw.trim()) return;
    setParseError(false);

    // Save raw text first
    const tempKey = `raw-paste-${Date.now()}`;
    try {
      await ds.put(COL.applications, tempKey, { rawPaste: raw, at: new Date().toISOString() } as Record<string, unknown>);
    } catch (err) {
      logError('SmartPaste.saveRaw', err);
    }

    const systemPrompt = `${MASTER_PERSONA}\n\nExtract structured job application data from the text below. Return ONLY valid JSON: {"title": string, "company": string, "location": string, "salary": string, "deadline": string, "remote": string}. Use empty strings for unknown fields. Never invent data not in the text.`;
    try {
      const res = await invoke({ entityId: { capability: 'text-fast' }, input: raw, systemPrompt });
      const out = res?.output ?? '';
      const parsed = parseAiJson<SmartPasteExtracted>(out);
      if (!parsed) { setParseError(true); return; }
      setExtracted(parsed);
      setRole(parsed.title || '');
      setCompany(parsed.company || '');
      setLocation(parsed.location || '');
      setSalary(parsed.salary || '');
      setDeadline(parsed.deadline || '');
      setRemote(parsed.remote || '');
      // Delete temp raw key
      try { await ds.delete(COL.applications, tempKey); } catch { /* swallow */ }
    } catch (err) {
      logError('SmartPaste.extract', err);
      setParseError(true);
    }
  }

  function handleConfirm() {
    const now = new Date().toISOString();
    const app: ExtendedApplication = {
      id: genId(),
      company: company || 'Unknown company',
      role: role || 'Unknown role',
      status: 'saved',
      appliedAt: now,
      updatedAt: now,
      location,
      salary,
      deadline,
      remote,
      jobDescription: raw,
      source: 'smart-paste',
    };
    onSave(app);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0F2554', marginBottom: 8 }}>Smart Paste</div>
        <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 12, lineHeight: 1.5 }}>
          Paste anything — a job description, recruiter email, or just type the company name and role. Elevate works out the rest.
        </div>
        <TextArea
          placeholder="Paste the job description, email, or type what you know…"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={6}
          disabled={isLoading}
        />
        {parseError && (
          <div style={{ fontSize: 13, color: '#EF4444', marginTop: 8 }}>
            Could not extract details — please fill in manually below.
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <CTAButton
            label={isLoading ? '⚡ Extracting…' : 'Extract details'}
            onClick={handleExtract}
            disabled={isLoading || !raw.trim()}
          />
        </div>
        {extracted && <AILabel style={{ marginTop: 8 }} />}
      </Card>

      {(extracted || parseError) && (
        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F2554', marginBottom: 14 }}>Confirm details</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Role</label>
              <TextField placeholder="Job title" value={role} onChange={(e) => setRole(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Company</label>
              <TextField placeholder="Company name" value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Location</label>
              <TextField placeholder="City, Remote, etc." value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Salary (optional)</label>
              <TextField placeholder="e.g. £45,000 or £40-50k" value={salary} onChange={(e) => setSalary(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Deadline (optional)</label>
              <TextField placeholder="e.g. 30 June" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <CTAButton label="Save application" onClick={handleConfirm} disabled={!role.trim() && !company.trim()} />
            <button type="button" onClick={onBack} style={{ flex: '0 0 auto', padding: '0 20px', height: 54, borderRadius: 50, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>Cancel</button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick Add Screen
// ---------------------------------------------------------------------------

function QuickAddScreen({ onSave, onBack }: { onSave: (app: ExtendedApplication) => void; onBack: () => void }) {
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [status, setStatus] = useState<ExtendedApplication['status']>('applied');

  function handleSave() {
    const now = new Date().toISOString();
    const app: ExtendedApplication = {
      id: genId(),
      company: company.trim() || 'Unknown company',
      role: role.trim() || 'Unknown role',
      status,
      appliedAt: now,
      updatedAt: now,
    };
    onSave(app);
  }

  return (
    <Card>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#0F2554', marginBottom: 14 }}>Quick Add</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Role</label>
          <TextField placeholder="Job title" value={role} onChange={(e) => setRole(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Company</label>
          <TextField placeholder="Company name" value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ExtendedApplication['status'])}
            style={{ width: '100%', minHeight: 48, padding: '12px 14px', borderRadius: 12, border: '2px solid #e2e8f0', fontSize: 16, color: '#374151', background: '#fff', outline: 'none' }}
          >
            {Object.entries(STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
        <CTAButton label="Save" onClick={handleSave} disabled={!role.trim() && !company.trim()} />
        <button type="button" onClick={onBack} style={{ flex: '0 0 auto', padding: '0 20px', height: 54, borderRadius: 50, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>Cancel</button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Batch Import Screen
// ---------------------------------------------------------------------------

function BatchImportScreen({ onSaveMany, onBack }: { onSaveMany: (apps: ExtendedApplication[]) => void; onBack: () => void }) {
  const { invoke, isLoading } = useEntityInvocation();
  const ds = useFiasDataStore();
  const [raw, setRaw] = useState('');
  const [preview, setPreview] = useState<ExtendedApplication[]>([]);
  const [error, setError] = useState('');
  const [parsed, setParsed] = useState(false);

  async function handleParse() {
    if (!raw.trim()) return;
    setError('');
    // Save raw before AI call
    try {
      await ds.put(COL.applications, `batch-raw-${Date.now()}`, { raw, at: new Date().toISOString() } as Record<string, unknown>);
    } catch (err) { logError('BatchImport.saveRaw', err); }

    const systemPrompt = `${MASTER_PERSONA}\n\nYou will receive a list of job applications in any format including natural language. Parse them into a JSON array of objects. Each object should have: title (string), company (string), status (one of: saved, applied, interviewing, offer, rejected, accepted — default to "applied" if unclear), location (string or empty), salary (string or empty). Return ONLY valid JSON: [{"title": "...", "company": "...", "status": "...", "location": "...", "salary": "..."}]. Include all applications you can identify.`;
    try {
      const res = await invoke({ entityId: { capability: 'text-fast' }, input: raw, systemPrompt });
      const out = res?.output ?? '';
      const arr = parseAiJson<Array<{ title: string; company: string; status: string; location: string; salary: string }>>(out);
      if (!arr || !Array.isArray(arr) || arr.length === 0) { setError('Could not parse any applications — please check the format.'); return; }
      const now = new Date().toISOString();
      const apps: ExtendedApplication[] = arr.map((a) => ({
        id: genId(),
        company: a.company || 'Unknown',
        role: a.title || 'Unknown role',
        status: (['saved','applied','interviewing','offer','rejected','accepted'].includes(a.status) ? a.status : 'applied') as ExtendedApplication['status'],
        appliedAt: now,
        updatedAt: now,
        location: a.location || '',
        salary: a.salary || '',
        source: 'batch-import',
      }));
      setPreview(apps);
      setParsed(true);
    } catch (err) {
      logError('BatchImport.parse', err);
      setError('AI parsing failed — please try again.');
    }
  }

  return (
    <Card>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#0F2554', marginBottom: 8 }}>Batch Import</div>
      <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 12, lineHeight: 1.5 }}>
        Paste multiple applications in any format — a spreadsheet copy, a list, natural language — and Elevate will parse them all.
      </div>
      {!parsed ? (
        <>
          <TextArea
            placeholder={"Company A — Software Engineer — Applied\nCompany B, Product Designer, Interviewing\n…"}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={8}
            disabled={isLoading}
          />
          {error && <div style={{ fontSize: 13, color: '#EF4444', marginTop: 8 }}>{error}</div>}
          <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
            <CTAButton label={isLoading ? '⚡ Parsing…' : 'Parse & preview'} onClick={handleParse} disabled={isLoading || !raw.trim()} />
            <button type="button" onClick={onBack} style={{ flex: '0 0 auto', padding: '0 20px', height: 54, borderRadius: 50, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>Cancel</button>
          </div>
          {parsed && <AILabel style={{ marginTop: 8 }} />}
        </>
      ) : (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0F2554', marginBottom: 10 }}>Preview — {preview.length} applications found</div>
          <AILabel style={{ marginBottom: 10 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
            {preview.map((a) => (
              <div key={a.id} style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{a.company}</div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>{a.role}</div>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            <CTAButton label={`Import all ${preview.length}`} onClick={() => onSaveMany(preview)} />
            <button type="button" onClick={() => { setParsed(false); setPreview([]); }} style={{ flex: '0 0 auto', padding: '0 20px', height: 54, borderRadius: 50, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>Re-paste</button>
          </div>
        </>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Quick Rejection Screen
// ---------------------------------------------------------------------------

function QuickRejectionScreen({
  apps,
  onReject,
  onBack,
}: {
  apps: ExtendedApplication[];
  onReject: (app: ExtendedApplication, type: RejectionType) => void;
  onBack: () => void;
}) {
  const activeApps = apps.filter((a) => a.status === 'applied' || a.status === 'interviewing' || a.status === 'saved');
  const [selectedApp, setSelectedApp] = useState<ExtendedApplication | null>(null);
  const [selectedType, setSelectedType] = useState<RejectionType>('first');

  if (activeApps.length === 0) {
    return (
      <Card>
        <EmptyState emoji="✅" heading="No active applications to reject" message="All your applications are already resolved." ctaLabel="Back" onCta={onBack} />
      </Card>
    );
  }

  if (!selectedApp) {
    return (
      <Card>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0F2554', marginBottom: 8 }}>Log a Rejection</div>
        <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 14 }}>Which application got a rejection?</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {activeApps.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelectedApp(a)}
              style={{ padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#fff', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{a.company}</div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>{a.role}</div>
              </div>
              <StatusBadge status={a.status} />
            </button>
          ))}
        </div>
        <button type="button" onClick={onBack} style={{ marginTop: 14, width: '100%', padding: '12px 0', borderRadius: 50, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>Cancel</button>
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#0F2554', marginBottom: 4 }}>What type of rejection?</div>
      <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 14 }}>{selectedApp.company} — {selectedApp.role}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {REJECTION_TYPES.map((rt) => (
          <button
            key={rt.value}
            type="button"
            onClick={() => setSelectedType(rt.value)}
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              border: `1.5px solid ${selectedType === rt.value ? '#0AAFAA' : '#e2e8f0'}`,
              background: selectedType === rt.value ? '#E6FAF9' : '#fff',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: selectedType === rt.value ? 700 : 400,
              color: selectedType === rt.value ? '#0AAFAA' : '#374151',
              minHeight: 44,
            }}
          >
            {rt.label}
          </button>
        ))}
      </div>
      <CTAButton label="Log rejection" onClick={() => onReject(selectedApp, selectedType)} />
      <button type="button" onClick={() => setSelectedApp(null)} style={{ marginTop: 10, width: '100%', padding: '12px 0', borderRadius: 50, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>← Back</button>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Rejection Recovery Panel
// ---------------------------------------------------------------------------

function RejectionRecoveryPanel({ type }: { type: RejectionType }) {
  const content = REJECTION_RECOVERY[type];
  return (
    <div style={{ background: '#FEF3C7', border: '1.5px solid #FCD34D', borderRadius: 16, padding: '16px 18px', marginTop: 12 }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{content.emoji}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#0F2554', marginBottom: 6 }}>{content.heading}</div>
      <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, marginBottom: 10 }}>{content.message}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#D97706' }}>Next step: {content.nextAction}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Application Detail Screen
// ---------------------------------------------------------------------------

function DetailScreen({
  app,
  profile,
  onSave,
  onBack,
  onNavigate,
}: {
  app: ExtendedApplication;
  profile: FeatureProps['profile'];
  onSave: (updated: ExtendedApplication) => void;
  onBack: () => void;
  onNavigate: (screen: string) => void;
}) {
  const { invoke, isLoading: aiLoading } = useEntityInvocation();

  const [local, setLocal] = useState<ExtendedApplication>(app);
  const [emailPaste, setEmailPaste] = useState('');
  const [showEmailParse, setShowEmailParse] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailParsing, setEmailParsing] = useState(false);
  const [followUpText, setFollowUpText] = useState('');
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [offerCelebration, setOfferCelebration] = useState(false);

  const cvScore = (profile.cvScore ?? 0) * 10;
  const qualityScore = applicationQualityScore(local, cvScore);
  const isStale = getStaleApplications([local], 7).length > 0;

  function patch(changes: Partial<ExtendedApplication>) {
    setLocal((prev) => ({ ...prev, ...changes, updatedAt: new Date().toISOString() }));
  }

  function handleStatusChange(newStatus: ExtendedApplication['status']) {
    patch({ status: newStatus });
    if (newStatus === 'offer' || newStatus === 'accepted') {
      setOfferCelebration(true);
    }
  }

  async function handleEmailParse() {
    if (!emailPaste.trim()) return;
    setEmailError('');
    setEmailParsing(true);

    const systemPrompt = `${MASTER_PERSONA}\n\nAnalyse this recruiter email and return ONLY valid JSON: {"type": "rejection"|"interview-invite"|"offer"|"screening"|"other", "interviewDate": string or "", "notes": string}. Extract any interview date mentioned as a readable string (e.g. "15 July 2pm"). Keep notes brief.`;
    try {
      const res = await invoke({ entityId: { capability: 'text-fast' }, input: emailPaste, systemPrompt });
      const out = res?.output ?? '';
      const parsed = parseAiJson<{ type: string; interviewDate: string; notes: string }>(out);
      if (!parsed) { setEmailError('Could not parse the email.'); setEmailParsing(false); return; }

      const updates: Partial<ExtendedApplication> = {};
      if (parsed.type === 'rejection') {
        updates.status = 'rejected';
        updates.rejectionType = 'first';
      } else if (parsed.type === 'interview-invite') {
        updates.status = 'interviewing';
        if (parsed.interviewDate) updates.interviewDate = parsed.interviewDate;
        // TODO: Deep-link to Calendar arche when Tom ships cross-arche integration API
      } else if (parsed.type === 'offer') {
        updates.status = 'offer';
      } else if (parsed.type === 'screening') {
        updates.status = 'applied';
      }
      if (parsed.notes) updates.notes = (local.notes ? local.notes + '\n' : '') + parsed.notes;
      patch(updates);

      if (parsed.type === 'interview-invite' && parsed.interviewDate) {
        // TODO: Deep-link to Contact Book arche when Tom ships cross-arche integration API
      }

      if (updates.status === 'offer') setOfferCelebration(true);
      setShowEmailParse(false);
      setEmailPaste('');
      fias.showToast(`Email parsed — status updated to ${updates.status ?? 'unchanged'}`, 'success');
    } catch (err) {
      logError('DetailScreen.emailParse', err);
      setEmailError('Parsing failed — try again.');
    }
    setEmailParsing(false);
  }

  async function generateFollowUp() {
    setFollowUpLoading(true);
    setShowFollowUp(false);
    const input = `Job: ${local.role} at ${local.company}. Status: ${local.status}. Applied: ${local.appliedAt ? daysSince(local.appliedAt) + ' days ago' : 'unknown'}. Notes: ${local.notes || 'none'}.`;
    const systemPrompt = `${MASTER_PERSONA}\n\nWrite a brief, professional follow-up email for this job application. Keep it to 3-4 sentences. Tone: warm and confident, not desperate. Do not use: "passionate", "leverage", "dynamic", "synergy", "impactful". Include a clear subject line at the top formatted as "Subject: ...".`;
    try {
      const res = await invoke({ entityId: { capability: 'text-fast' }, input, systemPrompt });
      const out = res?.output ?? '';
      if (!out) { logError('DetailScreen.followUp', new Error('empty')); setFollowUpLoading(false); return; }
      setFollowUpText(out);
      setShowFollowUp(true);
    } catch (err) {
      logError('DetailScreen.followUp', err);
    }
    setFollowUpLoading(false);
  }

  function handleSave() {
    onSave(local);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>{local.company}</div>
            <div style={{ fontSize: 14, color: '#6B7280', marginTop: 2 }}>{local.role}</div>
          </div>
          <ScorePill score={qualityScore} />
        </div>

        {/* Quality Score explanation */}
        <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 14, lineHeight: 1.5 }}>
          Application quality: CV ({Math.round(cvScore * 0.4)}) + match ({Math.round((local.matchScore ?? 0) * 0.3)}) + cover letter ({local.hasCoverLetter || local.coverLetter ? 20 : 0}) + interview prep ({local.hasInterviewPrep ? 10 : 0})
          {qualityScore < 60 && (
            <span style={{ color: '#F59E0B', display: 'block', marginTop: 4 }}>
              ⚠ Quality below 60 — consider strengthening before applying
            </span>
          )}
        </div>

        {/* Status */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Status</label>
          <select
            value={local.status}
            onChange={(e) => handleStatusChange(e.target.value as ExtendedApplication['status'])}
            style={{ width: '100%', minHeight: 48, padding: '12px 14px', borderRadius: 12, border: '2px solid #e2e8f0', fontSize: 16, color: '#374151', background: '#fff', outline: 'none' }}
          >
            {Object.entries(STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Offer celebration */}
        {offerCelebration && (local.status === 'offer' || local.status === 'accepted') && (
          <div style={{ marginTop: 12, background: '#E6FAF9', border: '1.5px solid #0AAFAA', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>🎉</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0F2554', marginBottom: 6 }}>You have an offer!</div>
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, marginBottom: 10 }}>
              Before you respond — check the salary against market rates. Never accept without verifying.
            </div>
            <button
              type="button"
              onClick={() => onNavigate('salary')}
              style={{ fontSize: 13, fontWeight: 700, color: '#0AAFAA', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Go to Salary Negotiation →
            </button>
          </div>
        )}
      </Card>

      {/* Rejection recovery */}
      {local.status === 'rejected' && local.rejectionType && (
        <RejectionRecoveryPanel type={local.rejectionType} />
      )}
      {local.status === 'rejected' && (
        <Card style={{ padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 8 }}>Rejection type (helps tailor recovery)</div>
          <select
            value={local.rejectionType ?? ''}
            onChange={(e) => patch({ rejectionType: e.target.value as RejectionType || undefined })}
            style={{ width: '100%', minHeight: 44, padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, color: '#374151', background: '#fff', outline: 'none' }}
          >
            <option value="">Select type…</option>
            {REJECTION_TYPES.map((rt) => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
          </select>
        </Card>
      )}

      {/* Editable fields */}
      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0F2554', marginBottom: 12 }}>Application Details</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Role', key: 'role' as const, placeholder: 'Job title' },
            { label: 'Company', key: 'company' as const, placeholder: 'Company name' },
            { label: 'Location', key: 'location' as const, placeholder: 'City or Remote' },
            { label: 'Salary', key: 'salary' as const, placeholder: 'e.g. £45k' },
            { label: 'Deadline', key: 'deadline' as const, placeholder: 'e.g. 30 June' },
            { label: 'Source', key: 'source' as const, placeholder: 'LinkedIn, Indeed, Referral…' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>{label}</label>
              <TextField
                placeholder={placeholder}
                value={(local[key] as string) ?? ''}
                onChange={(e) => patch({ [key]: e.target.value })}
              />
            </div>
          ))}

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Interview date</label>
            <TextField
              placeholder="e.g. 15 July 2pm"
              value={local.interviewDate ?? ''}
              onChange={(e) => patch({ interviewDate: e.target.value })}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Notes</label>
            <TextArea
              placeholder="Any notes about this application…"
              value={local.notes ?? ''}
              onChange={(e) => patch({ notes: e.target.value })}
              rows={3}
            />
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            {[
              { label: 'Cover letter included', key: 'hasCoverLetter' as const },
              { label: 'Interview prep done', key: 'hasInterviewPrep' as const },
            ].map(({ label, key }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!local[key]}
                  onChange={(e) => patch({ [key]: e.target.checked })}
                  style={{ width: 18, height: 18, accentColor: '#0AAFAA' }}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      </Card>

      {/* Email Parsing */}
      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0F2554', marginBottom: 8 }}>Parse Recruiter Email</div>
        {!showEmailParse ? (
          <button
            type="button"
            onClick={() => setShowEmailParse(true)}
            style={{ fontSize: 13, fontWeight: 600, color: '#0AAFAA', background: 'none', border: '1.5px solid #0AAFAA', borderRadius: 50, padding: '8px 18px', cursor: 'pointer', minHeight: 44 }}
          >
            Paste recruiter email →
          </button>
        ) : (
          <div>
            <TextArea
              placeholder="Paste the recruiter's email here…"
              value={emailPaste}
              onChange={(e) => setEmailPaste(e.target.value)}
              rows={5}
              disabled={emailParsing}
            />
            {emailError && <div style={{ fontSize: 13, color: '#EF4444', marginTop: 6 }}>{emailError}</div>}
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <CTAButton label={emailParsing ? '⚡ Parsing…' : 'Parse email'} onClick={handleEmailParse} disabled={emailParsing || !emailPaste.trim()} style={{ flex: 1 }} />
              <button type="button" onClick={() => { setShowEmailParse(false); setEmailPaste(''); }} style={{ padding: '0 16px', height: 54, borderRadius: 50, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>Cancel</button>
            </div>
          </div>
        )}
      </Card>

      {/* Momentum / Follow-up */}
      {isStale && (
        <Card style={{ border: '1.5px solid #F59E0B' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#D97706', marginBottom: 8 }}>⚠ No update in 7+ days</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>It might be time to send a follow-up.</div>
          {!showFollowUp && (
            <button
              type="button"
              onClick={generateFollowUp}
              disabled={followUpLoading || aiLoading}
              style={{ fontSize: 13, fontWeight: 600, color: '#D97706', background: 'none', border: '1.5px solid #F59E0B', borderRadius: 50, padding: '8px 18px', cursor: 'pointer', minHeight: 44 }}
            >
              {followUpLoading ? '⚡ Writing…' : 'Generate follow-up email'}
            </button>
          )}
          {showFollowUp && followUpText && (
            <div>
              <div style={{ fontSize: 13, lineHeight: 1.7, color: '#374151', whiteSpace: 'pre-wrap', background: '#FFFBEB', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
                {followUpText}
              </div>
              <AILabel />
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <CopyButton text={followUpText} label="Copy email" />
                <button type="button" onClick={generateFollowUp} disabled={followUpLoading} style={{ fontSize: 13, color: '#0AAFAA', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Regenerate</button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Save */}
      <CTAButton label="Save changes" onClick={handleSave} />
      <button type="button" onClick={onBack} style={{ width: '100%', padding: '14px 0', borderRadius: 50, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', color: '#374151', marginBottom: 8 }}>← Back to list</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main ApplicationTracker
// ---------------------------------------------------------------------------

export function ApplicationTracker({ profile, isPro: _isPro, onHome, onBack, onNavigate }: FeatureProps) {
  const ds = useFiasDataStore();

  const [mode, setMode] = useState<TrackerMode>('list');
  const [apps, setApps] = useState<ExtendedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<ExtendedApplication | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // isPro is always true per brief
  const isPro = true;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const loaded = await loadApplications();
      setApps(loaded);
    } catch (err) {
      await logToStore('ApplicationTracker.refresh', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function saveApp(app: ExtendedApplication) {
    try {
      await ds.put<ExtendedApplication & Record<string, unknown>>(COL.applications, app.id, app as ExtendedApplication & Record<string, unknown>);
      fias.showToast('Application saved', 'success');
      await refresh();
    } catch (err) {
      await logToStore('ApplicationTracker.saveApp', err);
    }
  }

  async function saveMany(newApps: ExtendedApplication[]) {
    try {
      await Promise.all(
        newApps.map((a) => ds.put<ExtendedApplication & Record<string, unknown>>(COL.applications, a.id, a as ExtendedApplication & Record<string, unknown>))
      );
      fias.showToast(`${newApps.length} applications imported`, 'success');
      await refresh();
      setMode('list');
    } catch (err) {
      await logToStore('ApplicationTracker.saveMany', err);
    }
  }

  async function handleSaveFromSubscreen(app: ExtendedApplication) {
    await saveApp(app);
    setMode('list');
  }

  async function handleRejection(app: ExtendedApplication, type: RejectionType) {
    const updated: ExtendedApplication = {
      ...app,
      status: 'rejected',
      rejectionType: type,
      updatedAt: new Date().toISOString(),
    };
    await saveApp(updated);
    setSelectedApp(updated);
    setMode('detail');
  }

  async function handleDetailSave(updated: ExtendedApplication) {
    await saveApp(updated);
    setMode('list');
    setSelectedApp(null);
  }

  // Intelligence / Velocity: render inline
  if (mode === 'intelligence') {
    return (
      <ApplicationIntelligence
        profile={profile}
        isPro={isPro}
        onHome={onHome}
        onBack={() => setMode('list')}
        onNavigate={onNavigate}
      />
    );
  }

  if (mode === 'velocity') {
    return (
      <VelocityReport
        profile={profile}
        isPro={isPro}
        onHome={onHome}
        onBack={() => setMode('list')}
        onNavigate={onNavigate}
      />
    );
  }

  const staleApps = getStaleApplications(apps, 7);
  const staleIds = new Set(staleApps.map((a) => a.id));

  const grouped = Object.keys(STATUS_META)
    .map((status) => ({
      status,
      items: apps
        .filter((a) => a.status === status && (filterStatus === 'all' || a.status === filterStatus))
        .sort((a, b) => statusOrder(a.status) - statusOrder(b.status) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    }))
    .filter((g) => g.items.length > 0);

  const filteredApps = filterStatus === 'all' ? apps : apps.filter((a) => a.status === filterStatus);

  // Detail screen
  if (mode === 'detail' && selectedApp) {
    return (
      <ScreenShell
        title={`${selectedApp.company}`}
        onBack={() => { setMode('list'); setSelectedApp(null); }}
        onHome={onHome}
        onNavigate={onNavigate}
      >
        <DetailScreen
          app={selectedApp}
          profile={profile}
          onSave={handleDetailSave}
          onBack={() => { setMode('list'); setSelectedApp(null); }}
          onNavigate={onNavigate}
        />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title="Applications"
      onBack={onBack}
      onHome={onHome}
      onNavigate={onNavigate}
    >
      {/* Header actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setMode('intelligence')}
          style={{ padding: '8px 14px', borderRadius: 50, border: '1.5px solid #0AAFAA', background: '#E6FAF9', color: '#0AAFAA', fontSize: 13, fontWeight: 700, cursor: 'pointer', minHeight: 36 }}
        >
          📊 Intelligence
        </button>
        <button
          type="button"
          onClick={() => setMode('velocity')}
          style={{ padding: '8px 14px', borderRadius: 50, border: '1.5px solid #8B5CF6', background: '#F3E8FF', color: '#8B5CF6', fontSize: 13, fontWeight: 700, cursor: 'pointer', minHeight: 36 }}
        >
          📈 Velocity
        </button>
        {staleIds.size > 0 && (
          <button
            type="button"
            onClick={() => setMode('quick-rejection')}
            style={{ padding: '8px 14px', borderRadius: 50, border: '1.5px solid #F59E0B', background: '#FFFBEB', color: '#D97706', fontSize: 13, fontWeight: 700, cursor: 'pointer', minHeight: 36 }}
          >
            Got a rejection? Log it →
          </button>
        )}
      </div>

      {/* Stats */}
      {apps.length > 0 && <StatsBar apps={apps} />}

      {/* Add buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <CTAButton label="+ Smart Paste" onClick={() => setMode('smart-paste')} style={{ minHeight: 44, fontSize: 14 }} />
        <button
          type="button"
          onClick={() => setMode('quick-add')}
          style={{ minHeight: 44, borderRadius: 50, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', color: '#0F2554' }}
        >
          + Quick Add
        </button>
      </div>
      <div style={{ marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => setMode('batch-import')}
          style={{ width: '100%', minHeight: 44, borderRadius: 50, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#6B7280' }}
        >
          Import multiple applications
        </button>
      </div>

      {/* Sub-screens rendered inline */}
      {mode === 'smart-paste' && (
        <SmartPasteScreen
          onSave={handleSaveFromSubscreen}
          onBack={() => setMode('list')}
        />
      )}

      {mode === 'quick-add' && (
        <QuickAddScreen
          onSave={handleSaveFromSubscreen}
          onBack={() => setMode('list')}
        />
      )}

      {mode === 'batch-import' && (
        <BatchImportScreen
          onSaveMany={saveMany}
          onBack={() => setMode('list')}
        />
      )}

      {mode === 'quick-rejection' && (
        <QuickRejectionScreen
          apps={apps}
          onReject={handleRejection}
          onBack={() => setMode('list')}
        />
      )}

      {/* Applications List */}
      {mode === 'list' && (
        <>
          {loading && apps.length === 0 && (
            <LoadingState messages={['Loading applications…']} />
          )}

          {!loading && apps.length === 0 && (
            <EmptyState
              emoji="💼"
              heading="No applications yet"
              message="Add your first application using Smart Paste — paste a job description, recruiter email, or just type what you know."
              ctaLabel="Smart Paste"
              onCta={() => setMode('smart-paste')}
              secondaryLabel="Quick Add"
              onSecondary={() => setMode('quick-add')}
            />
          )}

          {apps.length > 0 && (
            <>
              {/* Filter */}
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
                {['all', ...Object.keys(STATUS_META)].map((s) => {
                  const meta = s === 'all' ? { label: 'All', color: '#0F2554', bg: '#E0E7FF' } : STATUS_META[s as keyof typeof STATUS_META];
                  const active = filterStatus === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFilterStatus(s)}
                      style={{
                        flexShrink: 0,
                        padding: '6px 14px',
                        borderRadius: 999,
                        border: `1.5px solid ${active ? meta.color : '#e2e8f0'}`,
                        background: active ? meta.bg : '#fff',
                        color: active ? meta.color : '#6B7280',
                        fontSize: 12,
                        fontWeight: active ? 700 : 500,
                        cursor: 'pointer',
                        minHeight: 32,
                      }}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>

              {/* Grouped by status */}
              {filterStatus === 'all' ? (
                grouped.map((group) => {
                  const meta = STATUS_META[group.status as keyof typeof STATUS_META];
                  return (
                    <div key={group.status} style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                        {meta.label} ({group.items.length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {group.items.map((a) => (
                          <AppCard
                            key={a.id}
                            app={a}
                            isStale={staleIds.has(a.id)}
                            onClick={() => { setSelectedApp(a); setMode('detail'); }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filteredApps.map((a) => (
                    <AppCard
                      key={a.id}
                      app={a}
                      isStale={staleIds.has(a.id)}
                      onClick={() => { setSelectedApp(a); setMode('detail'); }}
                    />
                  ))}
                  {filteredApps.length === 0 && (
                    <EmptyState emoji="✅" heading={`No ${STATUS_META[filterStatus as keyof typeof STATUS_META]?.label ?? filterStatus} applications`} message="Try a different filter." />
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </ScreenShell>
  );
}
