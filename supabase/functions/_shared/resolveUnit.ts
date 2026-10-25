// Picks the unit (lodge) for a PUBLIC form from the web address it was sent
// from (Origin, then Referer), looked up in public.unit_domains (service role).
// Selects a unit only; it must never be used to grant access to anything,
// because Origin/Referer can be set freely by non-browser callers.
// No match / no headers = error; there is deliberately no default unit.

/** Lowercase host with port and a single trailing dot removed; "" if unusable. */
export function normaliseHost(value: string | null | undefined): string {
  if (!value) return "";
  try {
    const host = new URL(value.trim()).hostname.toLowerCase().replace(/\.$/, "");
    return /^[a-z0-9.-]+$/.test(host) ? host : "";
  } catch {
    return "";
  }
}

/** Host from Origin, else Referer ("null" origins are ignored). */
export function hostFromHeaders(headers: Headers): string {
  const origin = headers.get("origin");
  return normaliseHost(origin && origin !== "null" ? origin : null) || normaliseHost(headers.get("referer"));
}

export type UnitLookup = (host: string) => Promise<string | null>;
export type ResolveUnitResult = { ok: true; unitId: string; host: string } | { ok: false; error: string };

export const UNKNOWN_SITE_MESSAGE = "Sorry, we could not tell which lodge this form belongs to. Please use the form on the lodge's own website.";

/** Pure core: lookup is injected so tests need no database. Never throws. */
export async function resolveUnitWith(headers: Headers, lookup: UnitLookup): Promise<ResolveUnitResult> {
  const host = hostFromHeaders(headers);
  if (!host) return { ok: false, error: UNKNOWN_SITE_MESSAGE };
  try {
    const unitId = await lookup(host);
    return unitId ? { ok: true, unitId, host } : { ok: false, error: UNKNOWN_SITE_MESSAGE };
  } catch (e) {
    console.error("resolveUnit lookup failed", e);
    return { ok: false, error: UNKNOWN_SITE_MESSAGE };
  }
}

// deno-lint-ignore no-explicit-any
export function resolveUnit(req: Request, db: any): Promise<ResolveUnitResult> {
  return resolveUnitWith(req.headers, async (host) => {
    const { data, error } = await db.from("unit_domains").select("unit_id").eq("host", host).maybeSingle();
    if (error) throw error;
    return data?.unit_id ? String(data.unit_id) : null;
  });
}
