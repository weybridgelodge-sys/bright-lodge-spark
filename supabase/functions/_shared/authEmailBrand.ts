// Job AS-1: Unit Setup identity for sign-in email headers. One shared lookup, a 5-minute
// cache, and a HARD time limit at render time. Never throws, never rejects: on timeout,
// error or missing identity the caller keeps the text-only header.
export type AuthBrand = { crestUrl: string | null; lodgeName: string; lodgeNumber: string; provinceName: string };
type Settings = { lodgeName?: string; lodgeNumber?: string; provinceName?: string; crestImageUrl?: string } | null | undefined;

export function createAuthBrandLookup(opts: {
  load: () => Promise<Settings>;
  timeoutMs?: number;
  ttlMs?: number;
  /** Why a completed lookup had no identity (no personal data). */
  missingReason?: () => string;
  warn?: (msg: string) => void;
  now?: () => number;
}) {
  const timeoutMs = opts.timeoutMs ?? 1500;
  const ttlMs = opts.ttlMs ?? 5 * 60_000;
  const warn = opts.warn ?? ((m: string) => console.warn(m));
  const now = opts.now ?? Date.now;
  let cached: { at: number; value: AuthBrand } | null = null;
  let inflight: Promise<AuthBrand | null> | null = null;

  function start(): Promise<AuthBrand | null> {
    if (inflight) return inflight;
    let p: Promise<AuthBrand | null>;
    try {
      p = Promise.resolve(opts.load()).then((l) => {
        if (l?.lodgeName) {
          const value: AuthBrand = { crestUrl: l.crestImageUrl || null, lodgeName: l.lodgeName, lodgeNumber: l.lodgeNumber ?? "", provinceName: l.provinceName ?? "" };
          cached = { at: now(), value };
          return value;
        }
        let why = "no lodge identity";
        try { why = opts.missingReason?.() ?? why; } catch { /* keep default */ }
        warn(`auth-email-hook: lodge settings fallback (${why}); using text-only header`);
        return null;
      }, () => {
        warn("auth-email-hook: lodge settings lookup failed; using text-only header");
        return null;
      });
    } catch {
      warn("auth-email-hook: lodge settings lookup threw; using text-only header");
      p = Promise.resolve(null);
    }
    inflight = p;
    p.finally(() => { if (inflight === p) inflight = null; });
    return p;
  }

  /** Cached identity if fresh; else the shared lookup capped at timeoutMs. Resolves null on any failure. */
  async function get(): Promise<AuthBrand | null> {
    try {
      if (cached && now() - cached.at < ttlMs) return cached.value;
      let timer: number | undefined;
      const timeout = new Promise<"timeout">((r) => { timer = setTimeout(() => r("timeout"), timeoutMs) as unknown as number; });
      const r = await Promise.race([start(), timeout]);
      clearTimeout(timer);
      if (r === "timeout") { warn(`auth-email-hook: lodge settings lookup timed out after ${timeoutMs}ms; using text-only header`); return null; }
      return r;
    } catch {
      return null;
    }
  }

  return { start, get };
}

/** Hands a promise to EdgeRuntime.waitUntil when the runtime has it; no-op otherwise. */
export function keepAlive(p: Promise<unknown>): void {
  try {
    const rt = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
    if (rt && typeof rt.waitUntil === "function") rt.waitUntil(p.catch(() => {}));
  } catch { /* no-op */ }
}
