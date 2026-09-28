import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Posting periods. A period is available for posting whenever it is NOT locked —
 * there is no single "open" period. Screens default to the unlocked period whose
 * date range contains the entry date, and let the Treasurer override it.
 */
export type PostingPeriod = { id: string; label: string; period_start: string | null; period_end: string | null };

/**
 * Deterministic period order: newest period_start first; undated last;
 * ties broken by period_end desc, then label, then id.
 */
export function sortPeriodsNewestFirst<T extends { id: string; label?: string | null; period_start: string | null; period_end?: string | null }>(ps: T[]): T[] {
  const desc = (a: string | null | undefined, b: string | null | undefined) =>
    a === b ? 0 : !a ? 1 : !b ? -1 : a < b ? 1 : -1;
  return [...ps].sort((a, b) =>
    desc(a.period_start, b.period_start) ||
    desc(a.period_end, b.period_end) ||
    (a.label ?? "").localeCompare(b.label ?? "") ||
    a.id.localeCompare(b.id));
}

export async function fetchUnlockedPeriods(): Promise<PostingPeriod[]> {
  const { data, error } = await supabase
    .from("treasurer_periods" as any)
    .select("id,label,period_start,period_end,status,period_type")
    .neq("status", "locked");
  if (error) throw new Error(error.message);
  // Year-end closing periods are never offered for ordinary postings.
  return sortPeriodsNewestFirst(((data as any[]) ?? []).filter((p) => p.period_type !== "closing").map((p) => ({
    id: p.id, label: p.label, period_start: p.period_start, period_end: p.period_end,
  })));
}

/** The unlocked period whose range contains the date, or null. */
export function periodIdForDate(periods: PostingPeriod[], date: string | null | undefined): string | null {
  if (!date) return null;
  const d = date.slice(0, 10);
  const hit = periods.find((p) => p.period_start && p.period_end && p.period_start <= d && d <= p.period_end);
  return hit?.id ?? null;
}

/** Non-hook lookup for automated posting (charity, annual return). */
export async function fetchPeriodIdForDate(date: string): Promise<string | null> {
  return periodIdForDate(await fetchUnlockedPeriods(), date);
}

/**
 * Period-picker state for a posting screen. Defaults to the period containing
 * `date`; any manual choice is discarded when the date changes so the default recomputes.
 */
export function usePostingPeriod(date: string) {
  const [periods, setPeriods] = useState<PostingPeriod[]>([]);
  const [override, setOverride] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    fetchUnlockedPeriods().then(setPeriods).catch(() => setPeriods([]));
  }, [reloadKey]);
  useEffect(() => { setOverride(null); }, [date]);

  const autoId = periodIdForDate(periods, date);
  const periodId = override && periods.some((p) => p.id === override) ? override : autoId;
  return {
    periods,
    periodId,
    autoId,
    setPeriodId: setOverride,
    reload: () => setReloadKey((k) => k + 1),
  };
}
