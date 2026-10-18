// Pure double opt-in logic for the public newsletter (unit-tested in src/test).
// No Deno or network imports: the edge functions inject data access and sends.

export const CONFIRM_TTL_MS = 14 * 24 * 60 * 60 * 1000; // links expire after 14 days
export const RESEND_LIMIT_MS = 60 * 60 * 1000; // one confirm email per hour per address
export const PENDING_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // unconfirmed rows deleted after 30 days

export interface SubscriberRow {
  id: string;
  email: string;
  confirmed: boolean;
  unsubscribed_at: string | null;
  confirm_token_hash: string | null;
  confirm_sent_at: string | null;
}

export type SignupDecision = "insert_and_send" | "refresh_and_send" | "throttled" | "silent_already_subscribed";

/** What to do when an address signs up. Every outcome shows the same neutral message on screen. */
export function decideSignup(row: SubscriberRow | null, now: Date): SignupDecision {
  if (!row) return "insert_and_send";
  if (row.confirmed && !row.unsubscribed_at) return "silent_already_subscribed";
  const last = row.confirm_sent_at ? Date.parse(row.confirm_sent_at) : NaN;
  if (Number.isFinite(last) && now.getTime() - last < RESEND_LIMIT_MS) return "throttled";
  return "refresh_and_send";
}

export type TokenState = "valid" | "expired" | "invalid";

export function tokenState(row: SubscriberRow | null, now: Date): TokenState {
  if (!row || !row.confirm_token_hash || !row.confirm_sent_at) return "invalid";
  const sent = Date.parse(row.confirm_sent_at);
  if (!Number.isFinite(sent)) return "invalid";
  return now.getTime() - sent > CONFIRM_TTL_MS ? "expired" : "valid";
}

export function newToken(): string {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

export async function hashToken(token: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(d), (x) => x.toString(16).padStart(2, "0")).join("");
}

const TOKEN_RE = /^[0-9a-f]{64}$/;
export const isWellFormedToken = (t: unknown): t is string => typeof t === "string" && TOKEN_RE.test(t);

export interface SignupDeps {
  cleanupPending(olderThanIso: string): Promise<void>;
  findByEmail(email: string): Promise<SubscriberRow | null>;
  insertPending(email: string, tokenHash: string, sentAtIso: string): Promise<SubscriberRow>;
  refreshPending(id: string, tokenHash: string, sentAtIso: string): Promise<void>;
  clearSentAt(id: string): Promise<void>;
  sendConfirm(email: string, confirmUrl: string, idempotencyKey: string): Promise<void>;
  log(msg: string, err?: unknown): void;
}

/** Signup flow. Always resolves; the caller shows one neutral message whatever happened. */
export async function handleSignup(deps: SignupDeps, email: string, siteUrl: string, now = new Date()): Promise<SignupDecision> {
  try { await deps.cleanupPending(new Date(now.getTime() - PENDING_RETENTION_MS).toISOString()); }
  catch (e) { deps.log("pending cleanup failed", e); }

  const row = await deps.findByEmail(email);
  const decision = decideSignup(row, now);
  if (decision === "silent_already_subscribed" || decision === "throttled") return decision;

  const token = newToken();
  const tokenHash = await hashToken(token);
  const sentAt = now.toISOString();
  const target = row
    ? (await deps.refreshPending(row.id, tokenHash, sentAt), row)
    : await deps.insertPending(email, tokenHash, sentAt);

  const url = `${siteUrl.replace(/\/+$/, "")}/newsletter/confirm?token=${token}`;
  try {
    await deps.sendConfirm(email, url, `newsletter-confirm-${target.id}-${tokenHash.slice(0, 16)}`);
  } catch (e) {
    // Let the person try again straight away rather than waiting out the hourly limit.
    deps.log("confirm email send failed", e);
    try { await deps.clearSentAt(target.id); } catch (e2) { deps.log("clear sent_at failed", e2); }
  }
  return decision;
}

export interface ConfirmDeps {
  findByTokenHash(hash: string): Promise<SubscriberRow | null>;
  /** Atomically confirm and burn the token; returns the row id or null if it was already used. */
  confirm(id: string, hash: string, nowIso: string): Promise<{ id: string; email: string } | null>;
  sendWelcome(email: string, idempotencyKey: string): Promise<void>;
  log(msg: string, err?: unknown): void;
}

export type ConfirmResult = "confirmed" | "expired" | "invalid";

export async function handleConfirm(deps: ConfirmDeps, token: unknown, now = new Date()): Promise<ConfirmResult> {
  if (!isWellFormedToken(token)) return "invalid";
  const hash = await hashToken(token);
  const row = await deps.findByTokenHash(hash);
  const state = tokenState(row, now);
  if (state !== "valid" || !row) return state;
  const done = await deps.confirm(row.id, hash, now.toISOString());
  if (!done) return "invalid";
  try { await deps.sendWelcome(done.email, `newsletter-welcome-${done.id}-${hash.slice(0, 16)}`); }
  catch (e) { deps.log("welcome email send failed", e); }
  return "confirmed";
}

/** WM sign-off: name from the database, else the lodge's formal name. */
export function welcomeSignOff(wmName: string | null | undefined, formalSenderName: string): { name: string; role: string | null } {
  const n = (wmName ?? "").trim();
  return n ? { name: n, role: `Worshipful Master, ${formalSenderName}` } : { name: formalSenderName, role: null };
}
