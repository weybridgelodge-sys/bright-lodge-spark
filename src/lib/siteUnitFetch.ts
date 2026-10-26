// Startup-safe lodge lookup for this page's own web address: a plain fetch to
// resolve-site-unit (Origin → unit_domains), so main.tsx needs no backend client.
// One request per tab: the answer is kept in sessionStorage (per web address).
// Never rejects; null when unknown or on failure (no default lodge, never guessed).
const KEY = "site-unit-v1";
let inflight: Promise<string | null> | null = null;

const readCached = (): string | null => {
  try { const v = sessionStorage.getItem(KEY); return v && v.trim() ? v.trim() : null; } catch { return null; }
};

export function fetchSiteUnitId(): Promise<string | null> {
  if (inflight) return inflight;
  const hit = readCached();
  if (hit) return (inflight = Promise.resolve(hit));
  const p = (async () => {
    try {
      const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
      if (!base || !key || typeof fetch !== "function") return null;
      const res = await fetch(`${base}/functions/v1/resolve-site-unit`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) return null;
      const data = await res.json();
      const id = typeof data?.unit_id === "string" ? data.unit_id.trim() : "";
      if (id) { try { sessionStorage.setItem(KEY, id); } catch { /* storage unavailable */ } }
      return id || null;
    } catch {
      return null;
    }
  })();
  inflight = p;
  p.then((id) => { if (!id && inflight === p) inflight = null; });
  return p;
}

/** Test hook only. */
export function __resetSiteUnitFetch() {
  inflight = null;
  try { sessionStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}
