// Rehearsal "Part" choices come from the officer list (offices only), never a typed copy.
import { positionsFor, POSITION_SELECT, type PositionRow } from "@/lib/officerPositions";

export type PartOption = { value: string; label: string };

export const NON_OFFICE_PARTS = {
  candidate: "Candidate (rehearsal stand-in)",
  observing: "Observing / No Part",
  other: "Other",
} as const;

/** Old stored values that differ from today's officer keys. Stored rows are never rewritten. */
export const LEGACY_PART_ALIASES: Record<string, string> = { ipm: "immediate_past_master" };

/** Labels for old values if officer positions have not loaded (or an office was retired). */
const LEGACY_LABELS: Record<string, string> = {
  inner_guard: "Inner Guard", junior_deacon: "Junior Deacon", senior_deacon: "Senior Deacon",
  junior_warden: "Junior Warden", senior_warden: "Senior Warden", worshipful_master: "Worshipful Master",
  director_of_ceremonies: "Director of Ceremonies", immediate_past_master: "Immediate Past Master", chaplain: "Chaplain",
};

export const normalisePart = (v: string) => LEGACY_PART_ALIASES[v] ?? v;

/** Candidate, offices in order_index order, then Observing and Other. */
export function buildPartOptions(rows: PositionRow[], unitId?: string | null): PartOption[] {
  const offices = positionsFor(rows, "development", unitId)
    .filter((p) => (p.category ?? "office") === "office")
    .map((p) => ({ value: p.key, label: p.label }));
  return [
    { value: "candidate", label: NON_OFFICE_PARTS.candidate },
    ...offices,
    { value: "observing", label: NON_OFFICE_PARTS.observing },
    { value: "other", label: NON_OFFICE_PARTS.other },
  ];
}

export function partLabelFrom(options: PartOption[], value: string, other?: string | null): string {
  if (value === "other") return other?.trim() || "Other";
  const v = normalisePart(value);
  const hit = options.find((o) => o.value === v)?.label
    ?? (NON_OFFICE_PARTS as Record<string, string>)[v] ?? LEGACY_LABELS[v];
  if (hit) return hit;
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** A part is a single-holder office when it is an office key (not candidate/observing/other). */
export const isOfficePart = (v: string) => !(v in NON_OFFICE_PARTS);

/** Keep the original stored value when the user did not change it (so "ipm" stays "ipm"). */
export const partToSave = (selected: string, original?: string | null) =>
  original && normalisePart(original) === selected ? original : selected;

let cache: Promise<PartOption[]> | null = null;
export function loadPartOptions(): Promise<PartOption[]> {
  cache ??= (async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.from("officer_positions").select(POSITION_SELECT);
    return buildPartOptions((data as unknown as PositionRow[]) ?? []);
  })().catch((e) => { cache = null; throw e; });
  return cache;
}
