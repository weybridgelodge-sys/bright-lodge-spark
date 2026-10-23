// Public Lodge Profile figures from get_public_lodge_figures() — counts and
// numbers only (no names). Same member rules as the KPI Snapshot. Anything
// missing stays blank and is shown as "—" or hidden, never a typed figure.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PublicMeetingPattern } from "@/lib/meetingPattern";
import type { UnitProfile } from "@/lib/unitProfile";

export type LodgeFigures = {
  subscribingCount: number | null;
  honoraryCount: number | null;
  averageAge: number | null;
  youngestAge: number | null;
  oldestAge: number | null;
  latestInitiationDate: string;
};

export const BLANK_FIGURES: LodgeFigures = {
  subscribingCount: null, honoraryCount: null, averageAge: null, youngestAge: null, oldestAge: null, latestInitiationDate: "",
};

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

export function parseLodgeFigures(row: unknown): LodgeFigures {
  const r = (row ?? {}) as Record<string, unknown>;
  const d = typeof r.latest_initiation_date === "string" && /^\d{4}-\d{2}-\d{2}/.test(r.latest_initiation_date)
    ? r.latest_initiation_date.slice(0, 10) : "";
  return {
    subscribingCount: num(r.subscribing_count),
    honoraryCount: num(r.honorary_count),
    averageAge: num(r.average_age),
    youngestAge: num(r.youngest_age),
    oldestAge: num(r.oldest_age),
    latestInitiationDate: d,
  };
}

export const DASH = "—";
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export function ordinalDay(n: number): string {
  const t = n % 100;
  if (t >= 11 && t <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
}

/** "13th May 2026" from YYYY-MM-DD; "" when blank or invalid. */
export function longDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!m || +m[2] < 1 || +m[2] > 12) return "";
  return `${ordinalDay(+m[3])} ${MONTHS[+m[2] - 1]} ${m[1]}`;
}

/** "21 (plus 1 honorary)"; "21" with none; "—" when unknown. */
export function membersLabel(f: Pick<LodgeFigures, "subscribingCount" | "honoraryCount">): string {
  if (f.subscribingCount == null) return DASH;
  return f.honoraryCount ? `${f.subscribingCount} (plus ${f.honoraryCount} honorary)` : String(f.subscribingCount);
}

/** Whole members on the roll for prose: subscribing + honorary; null when unknown. */
export const totalMembers = (f: Pick<LodgeFigures, "subscribingCount" | "honoraryCount">) =>
  f.subscribingCount == null ? null : f.subscribingCount + (f.honoraryCount ?? 0);

/** "from 32 to 82", or "" when either end is unknown. */
export const ageRangePhrase = (f: Pick<LodgeFigures, "youngestAge" | "oldestAge">) =>
  f.youngestAge != null && f.oldestAge != null ? `from ${f.youngestAge} to ${f.oldestAge}` : "";

const WORDS = ["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve"];
export const countWord = (n: number) => WORDS[n] ?? String(n);

/** "Province of Surrey" → "Surrey" for the short stat card. */
export const provinceShort = (name: string) => name.replace(/^\s*province of\s+/i, "").trim();

/** "Lodge at a Glance" cards — every value from the lodge record; "—" when not known. */
export function glanceStats(f: LodgeFigures, u: Pick<UnitProfile, "lodgeNumber" | "consecrationDate" | "provinceName">, pattern: PublicMeetingPattern | null) {
  return [
    { label: "Lodge Number", value: u.lodgeNumber || DASH },
    { label: "Consecrated", value: longDate(u.consecrationDate) || DASH },
    { label: "Subscribing Members", value: membersLabel(f) },
    { label: "Average Member Age", value: f.averageAge != null ? String(f.averageAge) : DASH },
    { label: "Meeting Day", value: pattern?.meetingDay || DASH },
    { label: "Meetings Per Year", value: pattern?.perYear ? String(pattern.perYear) : DASH },
    { label: "Most Recent Initiation", value: longDate(f.latestInitiationDate) || DASH },
    { label: "Province", value: provinceShort(u.provinceName) || DASH },
  ];
}

export async function loadLodgeFigures(): Promise<LodgeFigures> {
  const { data, error } = await (supabase.rpc as any)("get_public_lodge_figures");
  if (error) return BLANK_FIGURES;
  return parseLodgeFigures(data);
}

export function useLodgeFigures(): LodgeFigures {
  const [f, setF] = useState<LodgeFigures>(BLANK_FIGURES);
  useEffect(() => {
    let on = true;
    loadLodgeFigures().then((x) => { if (on) setF(x); }, () => {});
    return () => { on = false; };
  }, []);
  return f;
}
