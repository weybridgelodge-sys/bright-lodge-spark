// Short-lived marker that a Google sign-in was just started from this tab.
// The broker rewrites the auth service's "signup_disabled" refusal into a
// generic error, so on return we can only tell "Google stranger" from
// "expired magic link" by knowing that Google was the flow in progress.
export const GOOGLE_FLAG_KEY = "oauth-google-started";
export const GOOGLE_FLAG_TTL_MS = 10 * 60 * 1000;

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function store(s?: Store): Store | null {
  try { return s ?? sessionStorage; } catch { return null; }
}

export function markGoogleStarted(now = Date.now(), s?: Store): void {
  try { store(s)?.setItem(GOOGLE_FLAG_KEY, String(now)); } catch { /* ignore */ }
}

export function clearGoogleStarted(s?: Store): void {
  try { store(s)?.removeItem(GOOGLE_FLAG_KEY); } catch { /* ignore */ }
}

/** True when a Google sign-in started within the TTL. Always clears the flag (single use). */
export function takeGoogleStarted(now = Date.now(), s?: Store): boolean {
  try {
    const st = store(s);
    const raw = st?.getItem(GOOGLE_FLAG_KEY);
    st?.removeItem(GOOGLE_FLAG_KEY);
    const at = Number(raw);
    if (!raw || !Number.isFinite(at)) return false;
    return now - at >= 0 && now - at <= GOOGLE_FLAG_TTL_MS;
  } catch {
    return false;
  }
}

/** Login page decision for a captured auth error. */
export function classifyReturnedAuthError(
  error: string | null, googleStarted: boolean, isNoMembership: (m: string) => boolean,
): "none" | "no-membership" | "link-error" {
  if (!error) return "none";
  if (googleStarted || isNoMembership(error)) return "no-membership";
  return "link-error";
}
