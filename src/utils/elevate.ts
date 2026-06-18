import { fias } from '@fias/arche-sdk';
import type { UserProfile, JobApplication, ApplicationStatus } from './aiHelpers';
import { COLLECTIONS, logError } from './aiHelpers';

/**
 * Elevate's extended data layer. `aiHelpers.ts` is the frozen foundation
 * (UserProfile, JobApplication, MASTER_PERSONA, buildUserContext, parseAiJson,
 * safeScore, saveToVault, initCollections). This module layers on the
 * region/currency model, the extra collections every feature relies on, and
 * the small reusable copy constants the brief mandates — without touching the
 * foundation file.
 */

export type { UserProfile, JobApplication, ApplicationStatus };

// ---------------------------------------------------------------------------
// Extended profile
// ---------------------------------------------------------------------------

export interface ExtendedProfile extends UserProfile {
  region?: string;
  currencySymbol?: string;
  sector?: string;
  neurodivergent?: boolean;
  cvScore?: number;
  targetRole?: string;
  currentRole?: string;
  experience?: string;
  location?: string;
  /** ISO timestamp the active CV text was last set, if any. */
  activeCvId?: string;
  isPro?: boolean;
}

/** Standard props every full-screen feature receives from App/Dashboard. */
export interface FeatureProps {
  profile: ExtendedProfile;
  isPro: boolean;
  /** Return to the dashboard. */
  onHome: () => void;
  /** Go back (usually the dashboard too). */
  onBack: () => void;
  /** Navigate to another named screen (e.g. 'settings', 'cv', 'salary'). */
  onNavigate: (screen: string) => void;
}

// ---------------------------------------------------------------------------
// Mandatory copy + style constants
// ---------------------------------------------------------------------------

/** The AI-transparency label that must sit under every generated output. */
export const AI_LABEL = '✨ AI generated — review before using';

/** Inline style for the AI label — 11px, #9CA3AF, per the brief. */
export const AI_LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  color: '#9CA3AF',
  marginTop: 8,
  lineHeight: 1.4,
};

/** The salary-verification note that must accompany every salary figure. */
export const SALARY_NOTE =
  'Always verify on Glassdoor and LinkedIn Salary before any decisions';

/** Hardcoded admin user id — only this user sees the admin panel. */
export const ADMIN_USER_ID = 'usr_elevate_admin';

/** Contact email used across legal / help / settings. */
export const CONTACT_EMAIL = 'jmoraleetrade@gmail.com';

// ---------------------------------------------------------------------------
// Brand palette (mirrors the working design language)
// ---------------------------------------------------------------------------

export const ELEVATE = {
  navy: '#0F2554',
  teal: '#0AAFAA',
  tealDark: '#0891B2',
  cardBorder: '#e2e8f0',
  cardShadow: '0 2px 12px rgba(0,0,0,0.06)',
  cardRadius: 20,
  cta: 'linear-gradient(135deg, #0AAFAA, #0891B2)',
  bg: 'linear-gradient(-45deg, #f0f4ff, #f8fafc, #f0f4ff, #f8fafc)',
  text: '#374151',
  muted: '#9CA3AF',
  ink: '#0F172A',
} as const;

// ---------------------------------------------------------------------------
// Regions, currency, job boards, location hints
// ---------------------------------------------------------------------------

export type RegionName =
  | 'United Kingdom'
  | 'United States'
  | 'Canada'
  | 'Australia'
  | 'Europe'
  | 'Somewhere else';

export interface RegionConfig {
  name: RegionName;
  emoji: string;
  currencySymbol: string;
  locationHint: string;
  jobBoards: { name: string; url: string }[];
}

export const REGIONS: RegionConfig[] = [
  {
    name: 'United Kingdom',
    emoji: '🇬🇧',
    currencySymbol: '£',
    locationHint: 'e.g. SR1 1TX or Sunderland',
    jobBoards: [
      { name: 'Reed', url: 'https://www.reed.co.uk' },
      { name: 'Indeed UK', url: 'https://www.indeed.co.uk' },
      { name: 'LinkedIn', url: 'https://www.linkedin.com/jobs' },
      { name: 'Totaljobs', url: 'https://www.totaljobs.com' },
    ],
  },
  {
    name: 'United States',
    emoji: '🇺🇸',
    currencySymbol: '$',
    locationHint: 'e.g. New York NY or 90210',
    jobBoards: [
      { name: 'Indeed', url: 'https://www.indeed.com' },
      { name: 'LinkedIn', url: 'https://www.linkedin.com/jobs' },
      { name: 'Glassdoor', url: 'https://www.glassdoor.com' },
      { name: 'ZipRecruiter', url: 'https://www.ziprecruiter.com' },
    ],
  },
  {
    name: 'Canada',
    emoji: '🇨🇦',
    currencySymbol: 'CA$',
    locationHint: 'e.g. Toronto ON or M5V 3A8',
    jobBoards: [
      { name: 'Indeed', url: 'https://ca.indeed.com' },
      { name: 'LinkedIn', url: 'https://www.linkedin.com/jobs' },
      { name: 'Job Bank', url: 'https://www.jobbank.gc.ca' },
    ],
  },
  {
    name: 'Australia',
    emoji: '🇦🇺',
    currencySymbol: 'A$',
    locationHint: 'e.g. Sydney NSW or 2000',
    jobBoards: [
      { name: 'Seek', url: 'https://www.seek.com.au' },
      { name: 'LinkedIn', url: 'https://www.linkedin.com/jobs' },
      { name: 'Indeed', url: 'https://au.indeed.com' },
    ],
  },
  {
    name: 'Europe',
    emoji: '🇪🇺',
    currencySymbol: '€',
    locationHint: 'e.g. Berlin Germany',
    jobBoards: [
      { name: 'LinkedIn', url: 'https://www.linkedin.com/jobs' },
      { name: 'Indeed', url: 'https://www.indeed.com' },
      { name: 'StepStone', url: 'https://www.stepstone.com' },
    ],
  },
  {
    name: 'Somewhere else',
    emoji: '🌍',
    currencySymbol: '$',
    locationHint: 'e.g. Dubai UAE',
    jobBoards: [
      { name: 'LinkedIn', url: 'https://www.linkedin.com/jobs' },
      { name: 'Indeed', url: 'https://www.indeed.com' },
    ],
  },
];

export function regionConfig(region?: string): RegionConfig {
  return REGIONS.find((r) => r.name === region) ?? REGIONS[0];
}

export function currencySymbolFor(profile: ExtendedProfile | null | undefined): string {
  return profile?.currencySymbol || regionConfig(profile?.region).currencySymbol;
}

/** Skills Bootcamp funding is UK-only. */
export function showsSkillsBootcamp(profile: ExtendedProfile | null | undefined): boolean {
  return (profile?.region ?? '') === 'United Kingdom';
}

// ---------------------------------------------------------------------------
// Sectors
// ---------------------------------------------------------------------------

export const SECTORS: string[] = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Retail',
  'Manufacturing',
  'Construction',
  'Hospitality',
  'Transport & Logistics',
  'Public Sector',
  'Creative & Media',
  'Other',
];

// ---------------------------------------------------------------------------
// Extra collections
// ---------------------------------------------------------------------------

/** Every collection the product uses (foundation + feature collections). */
export const COL = {
  profile: COLLECTIONS.profile,
  applications: COLLECTIONS.applications,
  vault: COLLECTIONS.vault,
  cvVersions: 'cv-versions',
  wins: 'wins',
  actions: 'actions',
  milestones: 'milestones',
  checkins: 'checkins',
  achievements: 'achievements',
  salaryHistory: 'salary-history',
  questionBank: 'question-bank',
  intelligence: 'intelligence',
  errorLogs: 'error-logs',
  platformStats: 'platform-stats',
} as const;

/**
 * Ensure all of Elevate's collections exist. Mirrors initCollections from the
 * foundation but covers the feature collections too. Never throws.
 */
export async function initElevateCollections(): Promise<void> {
  let existing: string[] = [];
  try {
    const collections = await fias.dataStore.listCollections();
    existing = collections.map((c) => c.name);
  } catch (error) {
    logError('initElevateCollections.list', error);
  }

  for (const name of Object.values(COL)) {
    if (existing.includes(name)) continue;
    try {
      await fias.dataStore.createCollection(name, { userScope: 'user' });
    } catch (error) {
      logError(`initElevateCollections.create(${name})`, error);
    }
  }
}

// ---------------------------------------------------------------------------
// Profile load / patch
// ---------------------------------------------------------------------------

export async function loadProfile(): Promise<ExtendedProfile | null> {
  try {
    const stored = await fias.dataStore.get<ExtendedProfile & Record<string, unknown>>(COL.profile, 'main');
    return stored ?? null;
  } catch (error) {
    logError('loadProfile', error);
    return null;
  }
}

/** Merge a partial patch into the stored profile. Never throws. */
export async function patchProfile(patch: Partial<ExtendedProfile>): Promise<ExtendedProfile | null> {
  try {
    const current = (await loadProfile()) ?? ({ name: '', situationType: '' } as ExtendedProfile);
    const next = { ...current, ...patch };
    await fias.dataStore.put(COL.profile, 'main', next as Record<string, unknown>);
    return next;
  } catch (error) {
    logError('patchProfile', error);
    return null;
  }
}

/** Silently log an error to the error-logs collection. Never throws / never shown to users. */
export async function logToStore(context: string, error: unknown): Promise<void> {
  logError(context, error);
  try {
    const message = error instanceof Error ? error.message : String(error);
    const key = `err-${context}-${Math.random().toString(36).slice(2)}`;
    await fias.dataStore.put(COL.errorLogs, key, { context, message, at: new Date().toISOString() });
  } catch {
    // Swallow — logging must never surface to the user.
  }
}

// ---------------------------------------------------------------------------
// Application helpers
// ---------------------------------------------------------------------------

export const STATUS_META: Record<ApplicationStatus, { label: string; color: string; bg: string }> = {
  saved: { label: 'Saved', color: '#6B7280', bg: '#F3F4F6' },
  applied: { label: 'Applied', color: '#0891B2', bg: '#E0F7FA' },
  interviewing: { label: 'Interviewing', color: '#8B5CF6', bg: '#F3E8FF' },
  offer: { label: 'Offer', color: '#0AAFAA', bg: '#E6FAF9' },
  rejected: { label: 'Rejected', color: '#EF4444', bg: '#FEE2E2' },
  accepted: { label: 'Accepted', color: '#10B981', bg: '#D1FAE5' },
};

export interface ExtendedApplication extends JobApplication {
  location?: string;
  salary?: string;
  deadline?: string;
  remote?: string;
  matchScore?: number;
  jobDescription?: string;
  coverLetter?: string;
  hasCoverLetter?: boolean;
  hasInterviewPrep?: boolean;
  source?: string;
  interviewDate?: string;
  rejectionType?: RejectionType;
}

/** Application Quality Score 0-100: cvScore 40 + matchScore 30 + coverLetter 20 + interviewPrep 10. */
export function applicationQualityScore(
  app: ExtendedApplication,
  cvScore: number | undefined,
): number {
  const cvPart = Math.max(0, Math.min(100, cvScore ?? 0)) * 0.4;
  const matchPart = Math.max(0, Math.min(100, app.matchScore ?? 0)) * 0.3;
  const coverPart = app.hasCoverLetter || app.coverLetter ? 20 : 0;
  const prepPart = app.hasInterviewPrep ? 10 : 0;
  return Math.round(cvPart + matchPart + coverPart + prepPart);
}

/** Load all applications (paginated, up to ~500). Never throws. */
export async function loadApplications(): Promise<ExtendedApplication[]> {
  const out: ExtendedApplication[] = [];
  let cursor: string | null | undefined;
  try {
    do {
      const res = await fias.dataStore.query<ExtendedApplication & Record<string, unknown>>(COL.applications, {
        limit: 100,
        cursor: cursor ?? undefined,
      });
      out.push(...res.documents.map((d) => d.data));
      cursor = res.nextCursor;
    } while (cursor && out.length < 500);
  } catch (error) {
    logError('loadApplications', error);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Rejection recovery (7 types)
// ---------------------------------------------------------------------------

export type RejectionType =
  | 'first'
  | 'multiple'
  | 'final-round'
  | 'ghosted'
  | 'overqualified'
  | 'underqualified'
  | 'long-search';

export interface RejectionRecoveryContent {
  type: RejectionType;
  emoji: string;
  heading: string;
  message: string;
  nextAction: string;
}

export const REJECTION_RECOVERY: Record<RejectionType, RejectionRecoveryContent> = {
  first: {
    type: 'first',
    emoji: '🌱',
    heading: 'Your first no',
    message: "Every no gets you closer to yes. That sounds hollow right now — but it's true.",
    nextAction: 'Review what you can improve',
  },
  multiple: {
    type: 'multiple',
    emoji: '🔁',
    heading: 'A run of rejections',
    message:
      "Multiple rejections in a row is the hardest part of any job search. It doesn't mean you're not good enough — it usually means something specific isn't landing. Let's find it.",
    nextAction: 'Run an application review',
  },
  'final-round': {
    type: 'final-round',
    emoji: '🥈',
    heading: 'Final round',
    message:
      "Final round rejection is the hardest kind. You got further than almost everyone else. That matters — even when it doesn't feel like it.",
    nextAction: 'Prepare for the next final round',
  },
  ghosted: {
    type: 'ghosted',
    emoji: '👻',
    heading: 'Ghosted',
    message: 'Being ghosted is rude and unprofessional. It also says nothing about you.',
    nextAction: 'Draft a polite follow-up',
  },
  overqualified: {
    type: 'overqualified',
    emoji: '🎯',
    heading: 'Told you were overqualified',
    message:
      "Being told you're overqualified is frustrating. Let's talk about how to address it in your next application.",
    nextAction: 'Reframe your next application',
  },
  underqualified: {
    type: 'underqualified',
    emoji: '📚',
    heading: 'The qualifications gap',
    message:
      "If you were completely unqualified you wouldn't have got this far. Let's look at what you can do about the gap.",
    nextAction: 'Build a skills plan',
  },
  'long-search': {
    type: 'long-search',
    emoji: '🕯️',
    heading: 'A long search',
    message:
      "A long search followed by a rejection is genuinely tough. You're allowed to feel that. Now let's look at what the data says about what to adjust.",
    nextAction: 'See your application data',
  },
};

// ---------------------------------------------------------------------------
// Mental-health signposting
// ---------------------------------------------------------------------------

export const SUPPORT_SIGNPOST =
  'Job searching can be genuinely tough. If things are feeling overwhelming beyond just the job search — it is okay to reach out for support. Mind UK: mind.org.uk / Samaritans: 116 123';
