import { masonicYearStartSync } from "@/lib/masonicYear";
import { partLabelFrom } from "@/lib/loiParts";
// Shared LOI constants and helpers. Part options: lib/loiParts (from officer_positions).

export const LOI_FOCUS_OPTIONS = [
  { value: "first_degree", label: "First Degree" },
  { value: "second_degree", label: "Second Degree" },
  { value: "third_degree", label: "Third Degree" },
  { value: "installation", label: "Installation Ceremony" },
  { value: "general", label: "General Learning" },
  { value: "other", label: "Other" },
] as const;

export const LOI_KPI_CATEGORIES = [
  { value: "oct_inst_prep", label: "Oct Installation Prep" },
  { value: "dec_degree_prep", label: "Dec Degree Prep" },
  { value: "feb_degree_prep", label: "Feb Degree Prep" },
  { value: "may_degree_prep", label: "May Degree Prep" },
  { value: "general", label: "General" },
] as const;

/** Stored part value: candidate/observing/other, an office key, or a legacy alias (e.g. "ipm"). */
export type LoiPart = string;
export type LoiFocus = (typeof LOI_FOCUS_OPTIONS)[number]["value"];

export function focusLabel(value: string, other?: string | null) {
  if (value === "other") return other?.trim() || "Other";
  return LOI_FOCUS_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function partLabel(value: string, other?: string | null) {
  return partLabelFrom([], value, other);
}

/** Auto-categorise a session date into a KPI block based on month. */
export function autoKpiCategory(dateStr: string): string {
  const m = new Date(dateStr).getMonth(); // 0=Jan
  // Oct(9)-Nov(10) -> oct_inst_prep, Dec(11)-Jan(0) -> dec, Feb(1)-Mar(2)/Apr(3) -> feb, May(4)-Sep(8) -> may
  if (m === 9 || m === 10) return "oct_inst_prep";
  if (m === 11 || m === 0) return "dec_degree_prep";
  if (m >= 1 && m <= 3) return "feb_degree_prep";
  return "may_degree_prep";
}

export function kpiCategoryLabel(value: string) {
  return LOI_KPI_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}


/** Start year of the Masonic year (Installation to Installation, unit rule) containing `d`. */
export function masonicYearStart(d: Date = new Date()): number {
  return masonicYearStartSync(d);
}
