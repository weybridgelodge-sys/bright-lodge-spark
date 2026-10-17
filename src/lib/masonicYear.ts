// KPI dashboard / Members — loads the unit's installation config for the
// shared Masonic-year helper.
import { supabase } from "@/integrations/supabase/client";
import type { InstallationConfig, InstallationRule } from "../../supabase/functions/_shared/masonicYear";

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
