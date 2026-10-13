/** Titles offered on the public booking form. Mr/Mrs are non-Masonic guests. */
export const BOOKING_TITLES = ["Bro", "W. Bro", "VW. Bro", "RW. Bro", "Mr", "Mrs"] as const;

const NON_MASON = new Set(["mr", "mrs"]);

export function isNonMasonTitle(title: string | null | undefined): boolean {
  return NON_MASON.has((title || "").trim().replace(/\.$/, "").toLowerCase());
}

/** Lodge Name & No. is required for Masonic titles only. */
export function lodgeRequired(title: string | null | undefined): boolean {
  return !isNonMasonTitle(title);
}

/** Meeting's display label for the dining event (defaults to "Festive Board"). */
export function diningEventLabel(label: string | null | undefined): string {
  return (label || "").trim() || "Festive Board";
}

export type AttendanceValue = "meeting-and-festive-board" | "meeting-only" | "apologies";

/** Attendance choices for a title. Internal values never change; only the wording does. */
export function attendanceOptions(title: string | null | undefined, label: string): { value: AttendanceValue; label: string }[] {
  if (isNonMasonTitle(title)) {
    return [
      { value: "meeting-and-festive-board", label: `Attending ${label}` },
      { value: "apologies", label: "Not Attending (Apologies for absence)" },
    ];
  }
  return [
    { value: "meeting-and-festive-board", label: `Attending Meeting + ${label}` },
    { value: "meeting-only", label: "Attending Meeting ONLY" },
    { value: "apologies", label: "Not Attending (Apologies for absence)" },
  ];
}
