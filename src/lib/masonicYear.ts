// KPI dashboard / Members — loads the unit's installation config for the
// shared Masonic-year helper, and keeps a portal-wide cache so synchronous
// callers (labels, defaults) use the unit's rule instead of a literal date.
import { supabase } from "@/integrations/supabase/client";
import {
  getMasonicYear, getMasonicYearRange, localIsoDate,
  type InstallationConfig, type InstallationRule,
} from "../../supabase/functions/_shared/masonicYear";

export * from "../../supabase/functions/_shared/masonicYear";

export async function fetchInstallationConfig(): Promise<InstallationConfig> {
  const [r, s] = await Promise.all([
    (supabase.from as any)("installation_rule_settings")
      .select("mode,installation_month,installation_ordinal,installation_weekday,fixed_day,applies_from_year")
      .maybeSingle(),
    supabase.from("officer_installation_dates").select("lodge_year,installation_date"),
  ]);
  const stored: Record<number, string> = {};
  for (const row of (s.data as { lodge_year: number; installation_date: string }[]) ?? []) {
    stored[row.lodge_year] = row.installation_date;
  }
  return { rule: (r.data as InstallationRule | null) ?? null, stored };
}

let cache: InstallationConfig | null = null;

/** Load (or reload) the cached config; never throws. */
export async function loadInstallationConfig(): Promise<InstallationConfig> {
  try {
    cache = await fetchInstallationConfig();
  } catch {
    cache = cache ?? { rule: null, stored: {} };
  }
  return cache;
}

/** For tests and after saves on the diary screen. */
export function setInstallationConfig(cfg: InstallationConfig | null) {
  cache = cfg;
}

export function cachedInstallationConfig(): InstallationConfig {
  return cache ?? { rule: null, stored: {} };
}

const toIso = (d: Date | string) => (typeof d === "string" ? d.slice(0, 10) : localIsoDate(d));

/**
 * Start year of the Masonic year containing `d` (Installation day belongs to
 * the new year). Last resort, when no rule or stored date is known yet, is the
 * financial-year boundary so a label is never blank.
 */
export function masonicYearStartSync(d: Date | string = new Date()): number {
  const iso = toIso(d);
  const y = getMasonicYear(iso, cachedInstallationConfig());
  if (y) return y.startYear;
  const year = Number(iso.slice(0, 4));
  return Number(iso.slice(5, 7)) >= 10 ? year : year - 1;
}

/** Start/end/label for a Masonic year from the cached config. */
export function masonicYearBoundsSync(startYear: number): { start: string; end: string; label: string } {
  const r = getMasonicYearRange(startYear, cachedInstallationConfig());
  const next = getMasonicYearRange(startYear + 1, cachedInstallationConfig());
  const start = r?.start ?? `${startYear}-10-01`;
  const end = r?.end ?? (next ? r?.end : null) ?? `${startYear + 1}-09-30`;
  return { start, end, label: `${startYear}/${startYear + 1}` };
}
