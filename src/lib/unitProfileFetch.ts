// One shared get_public_unit_profile request for this site's own lodge, started
// from main.tsx before React mounts. The lodge is resolved first (siteUnitFetch);
// an unknown site returns null (empty state), never another lodge's data. Plain fetch so the startup path needs no backend client. Resolves to
// the raw row, or null on any failure (never rejects); a failure clears the
// shared promise so the next caller retries.
import { fetchSiteUnitId } from "./siteUnitFetch";

let inflight: Promise<unknown> | null = null;

export function fetchUnitProfileRow(): Promise<unknown> {
  if (inflight) return inflight;
  const p: Promise<unknown> = (async () => {
    try {
      const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
      if (!base || !key || typeof fetch !== "function") return null;
      const unit = await fetchSiteUnitId();
      if (!unit) return null;
      const res = await fetch(`${base}/rest/v1/rpc/get_public_unit_profile`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ _unit: unit }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data && typeof data === "object" ? data : null;
    } catch {
      return null;
    }
  })();
  inflight = p;
  p.then((d) => { if (!d && inflight === p) inflight = null; });
  return p;
}

/** Test hook only. */
export function __resetUnitProfileFetch() { inflight = null; }
