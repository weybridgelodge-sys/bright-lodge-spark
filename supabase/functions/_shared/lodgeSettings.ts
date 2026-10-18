// Lodge addresses, website base URL and sender names, read from
// lodge_contact_settings (service role). Fallbacks equal the values that were
// typed in each function before this helper, so a missing row, missing column
// or failed read changes nothing. Sender DOMAINS are not here: they are tied to
// verified email-sending infrastructure and stay in code.
import { createClient } from "npm:@supabase/supabase-js@2";

import { resolveLodgeSettings, type LodgeSettings } from "./lodgeSettingsResolve.ts";
export { LODGE_FALLBACK, resolveLodgeSettings, type LodgeSettings } from "./lodgeSettingsResolve.ts";

let cache: { at: number; value: LodgeSettings } | null = null;
const TTL_MS = 5 * 60 * 1000;

/** Never throws; returns fallbacks on any error. Cached per warm instance. */
export async function loadLodgeSettings(unitId = "weybridge"): Promise<LodgeSettings> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  try {
    const url = Deno.env.get("SUPABASE_URL"); const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return resolveLodgeSettings(null);
    const { data, error } = await createClient(url, key)
      .from("lodge_contact_settings").select("*").eq("unit_id", unitId).maybeSingle();
    if (error) { console.error("lodge settings lookup failed, using fallback", error); return resolveLodgeSettings(null); }
    const value = resolveLodgeSettings(data as Record<string, string | null>);
    cache = { at: Date.now(), value };
    return value;
  } catch (e) {
    console.error("lodge settings lookup threw, using fallback", e);
    return resolveLodgeSettings(null);
  }
}
