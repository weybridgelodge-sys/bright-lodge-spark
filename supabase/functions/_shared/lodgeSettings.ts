// Lodge addresses, website base URL and sender names, read from
// lodge_contact_settings (service role). Fallbacks equal the values that were
// typed in each function before this helper, so a missing row, missing column
// or failed read changes nothing. Sender DOMAINS are not here: they are tied to
// verified email-sending infrastructure and stay in code.
import { createClient } from "npm:@supabase/supabase-js@2";

import { resolveLodgeSettings, type LodgeSettings } from "./lodgeSettingsResolve.ts";
export { LODGE_FALLBACK, resolveLodgeSettings, returnFileName, lodgeNameOr, lodgeShortName, deadlineReminderTitle, accountsFileName, type LodgeSettings } from "./lodgeSettingsResolve.ts";

// Cached per unit ("" = the no-unit lookup) so one unit's settings never answer for another.
const cache = new Map<string, { at: number; value: LodgeSettings }>();
const TTL_MS = 5 * 60 * 1000;

/** Never throws; returns fallbacks on any error. Cached per warm instance. */
export async function loadLodgeSettings(unitIdIn?: string): Promise<LodgeSettings> {
  const cacheKey = unitIdIn ?? "";
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  try {
    const url = Deno.env.get("SUPABASE_URL"); const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return resolveLodgeSettings(null);
    const db = createClient(url, key);
    // No unit given: use the only unit (multi-lodge callers must pass one).
    let unitId = unitIdIn ?? "";
    if (!unitId) {
      const { data: units } = await db.from("units").select("id").limit(2);
      if (!units || units.length !== 1) return resolveLodgeSettings(null);
      unitId = String(units[0].id);
    }
    const [{ data, error }, us, asst] = await Promise.all([
      db.from("lodge_contact_settings").select("*").eq("unit_id", unitId).maybeSingle(),
      db.from("unit_settings").select("key,value").eq("unit_id", unitId),
      db.rpc("current_officer_holder", { _position_key: "assistant_secretary", _unit: unitId }),
    ]);
    // Lodge name/number, same sources as get_lodge_identity (no typed fallback).
    const [rule, tpl] = await Promise.all([
      db.from("installation_rule_settings").select("unit_number").eq("unit_id", unitId).maybeSingle(),
      db.from("lodge_template").select("lodge_name,lodge_number").order("updated_at", { ascending: false, nullsFirst: false }).limit(1).maybeSingle(),
    ]).catch(() => [{ data: null }, { data: null }] as const);
    const identity = {
      lodgeName: (tpl as any)?.data?.lodge_name ?? null,
      lodgeNumber: (rule as any)?.data?.unit_number || (tpl as any)?.data?.lodge_number || null,
    };
    if (error) { console.error("lodge settings lookup failed, using fallback", error); return resolveLodgeSettings(null); }
    const map: Record<string, Record<string, unknown>> = Object.fromEntries(((us.data ?? []) as { key: string; value: Record<string, unknown> }[]).map((r) => [r.key, r.value]));
    const venueId = map.meeting_place?.venue_id;
    if (typeof venueId === "string" && venueId) {
      const { data: v } = await db.from("venues").select("name,display_lines").eq("id", venueId).maybeSingle();
      const lines = Array.isArray(v?.display_lines) ? (v.display_lines as unknown[]).map(String).filter((l) => l.trim()) : [];
      if (v?.name) map.meeting_place = { ...map.meeting_place, venue_name: v.name, ...(lines.length && { town_line: lines[lines.length - 1] }) };
    }
    const value = resolveLodgeSettings(data as Record<string, string | null>, map, { assistantSecretaryHeld: !asst.error && !!asst.data }, identity);
    cache.set(cacheKey, { at: Date.now(), value });
    return value;
  } catch (e) {
    console.error("lodge settings lookup threw, using fallback", e);
    return resolveLodgeSettings(null);
  }
}
