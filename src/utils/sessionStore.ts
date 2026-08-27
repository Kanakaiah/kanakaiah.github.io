import type { SessionPlan } from './session';

/**
 * A session in progress, so an interruption doesn't cost the day's work.
 *
 * The plan, the cursor and the outcomes all lived in component state, which on a product
 * designed to be used one-handed, on a phone, in the odd minutes of a morning is a
 * guarantee of loss: a phone call, a notification, a backgrounded tab, and the session
 * restarts from nothing. Grades already given survived — they go to the reducer
 * immediately — but the plan and the sense of being partway through did not, and the
 * closing summary that gives the day an end could never be reached.
 *
 * Kept out of AppState on purpose. This is ephemeral scaffolding for one sitting, not
 * part of the reader's record, and it should never be merged, migrated or reasoned about
 * alongside their actual progress. It also expires on its own: a plan is a claim about
 * what is due *today*, and resuming yesterday's would be reviewing against a schedule
 * that has since moved.
 */

const KEY = 'remora_session';

export interface StoredSession {
  /** Calendar day the plan was built for. */
  day: string;
  plan: SessionPlan;
  index: number;
  outcomes: unknown[];
}

const today = () => new Date().toDateString();

export function saveSession(plan: SessionPlan, index: number, outcomes: unknown[]): void {
  try {
    // Nothing worth restoring at either end: an untouched session is just "start", and a
    // finished one should not offer to be resumed into its own summary.
    if (index <= 0 || index >= plan.items.length) return clearSession();
    localStorage.setItem(KEY, JSON.stringify({ day: today(), plan, index, outcomes }));
  } catch {
    // A full or unavailable quota must never take the session down with it — losing the
    // ability to resume is a far smaller failure than losing the session itself.
  }
}

export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (parsed?.day !== today()) { clearSession(); return null; }
    if (!parsed.plan?.items?.length) { clearSession(); return null; }
    if (!(parsed.index > 0 && parsed.index < parsed.plan.items.length)) { clearSession(); return null; }
    return parsed;
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession(): void {
  try { localStorage.removeItem(KEY); } catch { /* nothing to do */ }
}
