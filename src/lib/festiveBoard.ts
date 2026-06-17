// Shared Festive Board constants and helpers

export const FB_MEETING_TYPES = [
  { value: "regular", label: "Regular" },
  { value: "installation", label: "Installation" },
  { value: "emergency", label: "Emergency" },
] as const;

export const FB_ATTENDANCE_STATUSES = [
  { value: "booked", label: "Booked" },
  { value: "attended", label: "Attended" },
  { value: "no_show", label: "No Show" },
  { value: "cancelled_refunded", label: "Cancelled — Refunded" },
] as const;

export const FB_PAYMENT_METHODS = [
  { value: "stripe", label: "Stripe (online)" },
  { value: "paid_on_night_cash", label: "Paid on night — Cash" },
  { value: "paid_on_night_card", label: "Paid on night — Card" },
  { value: "complimentary", label: "Complimentary" },
  { value: "unknown", label: "Unknown" },
] as const;

export type FbMeetingType = (typeof FB_MEETING_TYPES)[number]["value"];
export type FbAttendanceStatus = (typeof FB_ATTENDANCE_STATUSES)[number]["value"];
export type FbPaymentMethod = (typeof FB_PAYMENT_METHODS)[number]["value"];

export const meetingTypeLabel = (v: string) =>
  FB_MEETING_TYPES.find((o) => o.value === v)?.label ?? v;
export const attendanceStatusLabel = (v: string) =>
  FB_ATTENDANCE_STATUSES.find((o) => o.value === v)?.label ?? v;
export const paymentMethodLabel = (v: string) =>
  FB_PAYMENT_METHODS.find((o) => o.value === v)?.label ?? v;

/** Computed headcount = attended members + attended visitors. Override wins when set. */
export function computeHeadcount(
  rows: { attendance_status: string; member_id: string | null }[],
  override: number | null
): { members: number; visitors: number; total: number; isOverride: boolean } {
  let members = 0;
  let visitors = 0;
  for (const r of rows) {
    if (r.attendance_status !== "attended") continue;
    if (r.member_id) members += 1;
    else visitors += 1;
  }
  const computed = members + visitors;
  return {
    members,
    visitors,
    total: override ?? computed,
    isOverride: override !== null && override !== undefined,
  };
}

export function shortMonthLabel(dateStr: string, type: string): string {
  const d = new Date(dateStr);
  const m = d.toLocaleDateString("en-GB", { month: "short" });
  const y = String(d.getFullYear()).slice(-2);
  const suffix = type === "installation" ? " (Inst.)" : type === "emergency" ? " (Emerg.)" : "";
  return `${m} ${y}${suffix}`;
}
