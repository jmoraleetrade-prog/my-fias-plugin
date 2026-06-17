import { fias } from '@fias/arche-sdk';

/**
 * Shared helpers for Elevate's AI-powered career features.
 *
 * The plugin runs sandboxed (no fetch/XHR), so everything here is pure,
 * client-side, or routed through the SDK bridge (`fias.dataStore`).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserProfile {
  name: string;
  email?: string;
  /** The high-level situation the user picked during onboarding. */
  situationType: string;
  /** Free-text answer to the final open question. */
  finalText?: string;
  /** Quick-pick answers keyed by question id. */
  pathAnswers?: Record<string, string>;
  /** What the user said matters most to them right now. */
  goals?: string[];
  /** ISO timestamp of the onboarding completion. */
  createdAt?: string;
}

export type ApplicationStatus =
  | 'saved'
  | 'applied'
  | 'interviewing'
  | 'offer'
  | 'rejected'
  | 'accepted';

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  /** ISO timestamp the application was created. */
  appliedAt: string;
  /** ISO timestamp the application last changed. */
  updatedAt: string;
  notes?: string;
  /** Where in the funnel the outcome lands once resolved. */
  outcome?: 'pending' | 'won' | 'lost';
}

// ---------------------------------------------------------------------------
// AI persona + prompting
// ---------------------------------------------------------------------------

export const MASTER_PERSONA = `You are Elevate's career intelligence engine. You read the user's goals and situation with respect, focus on clarity, and provide concise, personalized career guidance. Use supportive, confident language and avoid generic templates. Always highlight the user's main priority, the single strongest next action, and one immediate confidence-building idea. Never invent facts about the user that they did not provide.`;

/**
 * Turn a user profile into a compact, readable context block for an AI
 * `input` payload. Keeps prompts deterministic and easy to debug.
 */
export function buildUserContext(profile: UserProfile): string {
  const lines: string[] = [];
  lines.push(`Name: ${profile.name || 'Unknown'}`);
  lines.push(`Situation: ${profile.situationType || 'unspecified'}`);

  const goals = safeArray<string>(profile.goals);
  if (goals.length > 0) {
    lines.push(`Goals: ${goals.join('; ')}`);
  }

  const answers = profile.pathAnswers ?? {};
  const answerKeys = Object.keys(answers);
  if (answerKeys.length > 0) {
    lines.push('Path answers:');
    for (const key of answerKeys) {
      lines.push(`  - ${key}: ${answers[key]}`);
    }
  }

  if (profile.finalText && profile.finalText.trim()) {
    lines.push(`In their own words: ${profile.finalText.trim()}`);
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Safe parsing helpers
// ---------------------------------------------------------------------------

/**
 * Parse JSON that an AI model returned, tolerating ```json fences, leading
 * prose, and trailing commentary. Returns `null` instead of throwing.
 */
export function parseAiJson<T = unknown>(raw: string | null | undefined): T | null {
  if (!raw) return null;

  let text = raw.trim();

  // Strip a fenced code block if present (```json ... ``` or ``` ... ```).
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  // Direct attempt first.
  try {
    return JSON.parse(text) as T;
  } catch {
    // Fall through to bracket extraction.
  }

  // Extract the first balanced-looking object or array.
  const firstObj = text.indexOf('{');
  const firstArr = text.indexOf('[');
  const start =
    firstObj === -1
      ? firstArr
      : firstArr === -1
        ? firstObj
        : Math.min(firstObj, firstArr);
  if (start === -1) return null;

  const lastObj = text.lastIndexOf('}');
  const lastArr = text.lastIndexOf(']');
  const end = Math.max(lastObj, lastArr);
  if (end <= start) return null;

  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

/** Coerce an unknown value to a 0–100 score, clamped, with a fallback. */
export function safeScore(value: unknown, fallback = 0): number {
  const num =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : NaN;
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(100, Math.round(num)));
}

/** Coerce an unknown value to an array. Non-arrays become `[]`. */
export function safeArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

// ---------------------------------------------------------------------------
// Document export
// ---------------------------------------------------------------------------

/** RTF control-char escaping. */
function escapeRtf(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\n/g, '\\par\n');
}

/**
 * Build a minimal but valid RTF document from a title + body. RTF opens in
 * Word, Pages, and Google Docs, so it's a safe sandboxed export format.
 */
export function generateRTF(title: string, body: string): string {
  const header =
    '{\\rtf1\\ansi\\ansicpg1252\\deff0{\\fonttbl{\\f0\\fswiss Helvetica;}}\\f0\\fs24';
  const titleBlock = `\\b\\fs36 ${escapeRtf(title)}\\b0\\fs24\\par\\par`;
  const bodyBlock = escapeRtf(body);
  return `${header}\n${titleBlock}\n${bodyBlock}\n}`;
}

/**
 * Trigger a client-side download of text content. Works inside the plugin
 * iframe because the sandbox includes `allow-downloads`.
 */
export function downloadFile(
  filename: string,
  content: string,
  mimeType = 'application/octet-stream',
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Release the object URL on the next tick so the download can start.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// ---------------------------------------------------------------------------
// Engagement / nudge logic
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Show the Monday brief when it's Monday and we haven't already shown it
 * today. `lastShown` is the ISO timestamp of the previous brief.
 */
export function shouldShowMondayBrief(
  lastShown?: string | null,
  now: Date = new Date(),
): boolean {
  if (now.getDay() !== 1) return false; // 1 === Monday
  const last = toDate(lastShown);
  if (last && isSameDay(last, now)) return false;
  return true;
}

/**
 * Show the outcome check-in when there's at least one application that has
 * been sitting in an active state long enough to deserve a status update.
 */
export function shouldShowOutcomeCheckIn(
  applications: JobApplication[],
  now: Date = new Date(),
): boolean {
  return getStaleApplications(applications, 7, now).some(
    (app) => app.status === 'applied' || app.status === 'interviewing',
  );
}

/**
 * Applications still in an active state that haven't been touched in
 * `staleDays` days.
 */
export function getStaleApplications(
  applications: JobApplication[],
  staleDays = 7,
  now: Date = new Date(),
): JobApplication[] {
  const cutoff = now.getTime() - staleDays * DAY_MS;
  const activeStatuses: ApplicationStatus[] = ['applied', 'interviewing', 'saved'];
  return safeArray<JobApplication>(applications).filter((app) => {
    if (!activeStatuses.includes(app.status)) return false;
    const updated = toDate(app.updatedAt) ?? toDate(app.appliedAt);
    if (!updated) return false;
    return updated.getTime() < cutoff;
  });
}

// ---------------------------------------------------------------------------
// Velocity score
// ---------------------------------------------------------------------------

export interface VelocityResult {
  score: number;
  band: string;
}

/**
 * Derive a 0–100 "career velocity" score from profile completeness and
 * application activity. Deterministic and side-effect free.
 */
export function calculateVelocityScore(
  profile: UserProfile,
  applications: JobApplication[] = [],
  now: Date = new Date(),
): VelocityResult {
  let score = 25; // baseline for having started

  if (profile.name?.trim()) score += 5;
  if (profile.situationType) score += 10;
  if (safeArray(profile.goals).length > 0) score += 10;
  if (profile.finalText?.trim()) score += 5;

  const apps = safeArray<JobApplication>(applications);
  score += Math.min(20, apps.length * 4);

  const interviewing = apps.filter(
    (a) => a.status === 'interviewing' || a.status === 'offer' || a.status === 'accepted',
  ).length;
  score += Math.min(15, interviewing * 5);

  // Recent activity bonus: anything updated in the last 3 days.
  const recentCutoff = now.getTime() - 3 * DAY_MS;
  const recent = apps.some((a) => {
    const updated = toDate(a.updatedAt);
    return updated ? updated.getTime() >= recentCutoff : false;
  });
  if (recent) score += 10;

  // Stale penalty.
  score -= Math.min(15, getStaleApplications(apps, 7, now).length * 5);

  const final = safeScore(score);
  return { score: final, band: velocityBand(final) };
}

function velocityBand(score: number): string {
  if (score >= 80) return 'Peak Momentum';
  if (score >= 60) return 'Strong Momentum';
  if (score >= 40) return 'Building Momentum';
  if (score >= 20) return 'Getting Started';
  return 'Just Beginning';
}

// ---------------------------------------------------------------------------
// Persistence (via the data store bridge)
// ---------------------------------------------------------------------------

/** Collections the plugin relies on. */
export const COLLECTIONS = {
  profile: 'profiles',
  applications: 'applications',
  vault: 'vault',
} as const;

/**
 * Log an error with a consistent prefix. Centralized so we can later route
 * to telemetry without touching call sites.
 */
export function logError(context: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  // eslint-disable-next-line no-console
  console.error(`[Elevate] ${context}: ${message}`);
}

/**
 * Persist an arbitrary document to the user's "vault" collection. Returns
 * `true` on success, `false` (and logs) on failure — never throws.
 */
export async function saveToVault<T extends Record<string, unknown>>(
  key: string,
  data: T,
): Promise<boolean> {
  try {
    await fias.dataStore.put(COLLECTIONS.vault, key, data);
    return true;
  } catch (error) {
    logError(`saveToVault(${key})`, error);
    return false;
  }
}

/**
 * Ensure the plugin's collections exist. Safe to call on every startup —
 * "already exists" errors are swallowed. Never throws.
 */
export async function initCollections(): Promise<void> {
  let existing: string[] = [];
  try {
    const collections = await fias.dataStore.listCollections();
    existing = collections.map((collection) => collection.name);
  } catch (error) {
    logError('initCollections.list', error);
  }

  for (const name of Object.values(COLLECTIONS)) {
    if (existing.includes(name)) continue;
    try {
      await fias.dataStore.createCollection(name, { userScope: 'user' });
    } catch (error) {
      // A concurrent create or "already exists" is fine; just log others.
      logError(`initCollections.create(${name})`, error);
    }
  }
}
