// Job AS-1: Unit Setup identity for sign-in email headers. One shared lookup, a 5-minute
// cache, and a HARD time limit at render time. Never throws, never rejects: on timeout,
// error or missing identity the caller keeps the text-only header.
export type AuthBrand = { crestUrl: string | null; lodgeName: string; lodgeNumber: string; provinceName: string; /** Unit Setup formal sender name as saved ("" = derive). */ senderName?: string; /** Unit Setup site_url as saved ("" = not set). */ siteUrl?: string };
type Settings = { lodgeName?: string; lodgeNumber?: string; provinceName?: string; crestImageUrl?: string; configuredFormalSenderName?: string; configuredSiteUrl?: string } | null | undefined;

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
          const value: AuthBrand = { crestUrl: l.crestImageUrl || null, lodgeName: l.lodgeName, lodgeNumber: l.lodgeNumber ?? "", provinceName: l.provinceName ?? "", senderName: (l.configuredFormalSenderName ?? "").trim(), siteUrl: (l.configuredSiteUrl ?? "").trim() };
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

/** Neutral wording when the Unit Setup identity is unavailable (no lodge literal). */
export const NEUTRAL_SITE_NAME = "Members Portal";
/** Lodge name for sign-in email wording, from the same identity as the header. */
export function siteNameFor(b: { lodgeName?: string; lodgeNumber?: string } | null | undefined): string {
  const name = (b?.lodgeName ?? "").trim();
  if (!name) return NEUTRAL_SITE_NAME;
  const num = (b?.lodgeNumber ?? "").trim();
  return num ? `${name} No. ${num}` : name;
}

/** Sender display name: Unit Setup formal sender name, else siteNameFor(identity), else neutral. Header-safe. */
export function senderDisplayName(b: { senderName?: string; lodgeName?: string; lodgeNumber?: string } | null | undefined): string {
  const raw = (b?.senderName ?? "").trim() || siteNameFor(b);
  const safe = raw.replace(/[\r\n<>"\\]/g, " ").replace(/\s+/g, " ").trim();
  return safe || NEUTRAL_SITE_NAME;
}

/** Neutral placeholder for preview samples when Unit Setup has no site_url (RFC 2606, never a lodge host). */
export const NEUTRAL_SAMPLE_URL = "https://example.com";
/** Unit Setup site_url (https only), else the given fallback. */
export function siteUrlFor(b: { siteUrl?: string } | null | undefined, fallback: string): string {
  const u = (b?.siteUrl ?? "").trim().replace(/\/+$/, "");
  return /^https:\/\/\S+$/.test(u) ? u : fallback;
}

/**
 * JOB CJ: one bounded lookup PER UNIT (each with its own 5-minute cache and
 * shared in-flight load). Blank unit = null at once (neutral text-only brand).
 * Never throws; a failing unit only affects its own emails.
 */
export function createUnitBrandLookups(opts: {
  load: (unitId: string) => Promise<Settings>;
  timeoutMs?: number;
  ttlMs?: number;
  warn?: (msg: string) => void;
  now?: () => number;
}) {
  const byUnit = new Map<string, ReturnType<typeof createAuthBrandLookup>>();
  const lookupFor = (unitId: string) => {
    let l = byUnit.get(unitId);
    if (!l) {
      l = createAuthBrandLookup({ ...opts, load: () => opts.load(unitId), missingReason: () => `no lodge identity for unit ${unitId}` });
      byUnit.set(unitId, l);
    }
    return l;
  };
  return {
    async get(unitId: string): Promise<AuthBrand | null> {
      const u = (unitId ?? "").trim();
      if (!u) return null;
      try { return await lookupFor(u).get(); } catch { return null; }
    },
  };
}

/** Resolves within ms or gives the fallback; never rejects. */
export async function within<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: number | undefined;
  try {
    return await Promise.race([p.catch(() => fallback), new Promise<T>((r) => { timer = setTimeout(() => r(fallback), ms) as unknown as number; })]);
  } finally { clearTimeout(timer); }
}
