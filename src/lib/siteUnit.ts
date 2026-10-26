// Lodge for this page's own web address (resolve-site-unit → unit_domains).
// No default lodge: an unknown address resolves to null and callers show their empty state.
// Shares the startup lookup (siteUnitFetch, started from main.tsx) so the site resolves once.
import { fetchSiteUnitId, __resetSiteUnitFetch } from "@/lib/siteUnitFetch";

let cached: Promise<string | null> | null = null;

export function resolveSiteUnit(): Promise<string | null> {
  if (!cached) {
    const p = fetchSiteUnitId();
    cached = p;
    p.then((id) => { if (!id && cached === p) cached = null; }); // allow a retry later
  }
  return cached;
}

/** Test hook. */
export const resetSiteUnit = () => { cached = null; __resetSiteUnitFetch(); };
