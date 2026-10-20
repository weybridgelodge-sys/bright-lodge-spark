/** Stale-bundle safety net: detect failed page-code downloads and reload once (max once per 60s). */
export const CHUNK_RELOAD_KEY = "chunk-reload-attempted-at";
export const CACHE_BUST_PARAM = "_r";
export const RELOAD_WINDOW_MS = 60_000;

const PATTERNS = [
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
  /unable to preload css/i,
  /loading (css )?chunk [\w-]+ failed/i,
  /chunkloaderror/i,
  /mime type.*\/assets\//i,
  /\/assets\/.*mime type/i,
  /expected a javascript.*module script.*mime type/i,
];

export function errorText(err: unknown): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const e = err as { name?: unknown; message?: unknown };
    return `${typeof e.name === "string" ? e.name : ""} ${typeof e.message === "string" ? e.message : ""}`.trim();
  }
  return "";
}

export function isChunkLoadError(err: unknown): boolean {
  const t = errorText(err);
  return !!t && PATTERNS.some((p) => p.test(t));
}

type StorageGetter = () => Pick<Storage, "getItem" | "setItem"> | null | undefined;

/** True (and records the attempt) if a reload is allowed now. Any storage failure → no reload, so it can never loop. */
export function claimReload(getStorage: StorageGetter, now: number): boolean {
  try {
    const s = getStorage();
    if (!s) return false;
    const raw = s.getItem(CHUNK_RELOAD_KEY);
    const last = Number(raw);
    if (raw && Number.isFinite(last) && now - last < RELOAD_WINDOW_MS && now >= last) return false;
    s.setItem(CHUNK_RELOAD_KEY, String(now));
    return s.getItem(CHUNK_RELOAD_KEY) === String(now);
  } catch {
    return false;
  }
}

/** Adds the cache-bust param; keeps path, other query params and the hash (magic-link tokens). */
export function cacheBustUrl(href: string, now: number): string {
  const url = new URL(href);
  url.searchParams.set(CACHE_BUST_PARAM, now.toString(36));
  return url.toString();
}

/** Removes only the cache-bust param; returns null when nothing to strip. */
export function stripCacheBust(href: string): string | null {
  const url = new URL(href);
  if (!url.searchParams.has(CACHE_BUST_PARAM)) return null;
  url.searchParams.delete(CACHE_BUST_PARAM);
  return url.pathname + url.search + url.hash;
}

const sessionStore: StorageGetter = () => window.sessionStorage;

/** Reloads with a cache-bust URL if the guard allows. Returns true when a reload was started. */
export function tryChunkReload(err: unknown): boolean {
  if (!isChunkLoadError(err)) return false;
  const now = Date.now();
  if (!claimReload(sessionStore, now)) return false;
  window.location.replace(cacheBustUrl(window.location.href, now));
  return true;
}

/** Short, safe description for the error screen: name + message only, no stack, capped. */
export function shortErrorLabel(err: unknown): string {
  return errorText(err).replace(/\s+/g, " ").slice(0, 200);
}
