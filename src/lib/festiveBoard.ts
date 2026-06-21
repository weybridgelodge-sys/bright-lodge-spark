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
  { value: "bank_transfer", label: "Bank transfer" },
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

/** Computed headcount = expected covers (booked or attended). Override wins for total. */
export function computeHeadcount(
  rows: { attendance_status: string; member_id: string | null; visitor_lodge_name?: string | null; is_meeting_only?: boolean | null }[],
  override: number | null
): {
  members: number;
  visitors: number;
  total: number;
  isOverride: boolean;
  diningMembers: number;
  diningVisitors: number;
  diningTotal: number;
  meetingOnlyCount: number;
} {
  let members = 0;
  let visitors = 0;
  let diningMembers = 0;
  let diningVisitors = 0;
  let meetingOnlyCount = 0;
  for (const r of rows) {
    if (r.attendance_status !== "attended" && r.attendance_status !== "booked") continue;
    const isMember = !!r.member_id || isWeybridgeLodge(r.visitor_lodge_name);
    if (isMember) members += 1;
    else visitors += 1;
    if (r.is_meeting_only) {
      meetingOnlyCount += 1;
    } else if (isMember) {
      diningMembers += 1;
    } else {
      diningVisitors += 1;
    }
  }
  const computed = members + visitors;
  return {
    members,
    visitors,
    total: override ?? computed,
    isOverride: override !== null && override !== undefined,
    diningMembers,
    diningVisitors,
    diningTotal: diningMembers + diningVisitors,
    meetingOnlyCount,
  };
}

export function shortMonthLabel(dateStr: string, type: string): string {
  const d = new Date(dateStr);
  const day = d.getDate();
  const m = d.toLocaleDateString("en-GB", { month: "short" });
  const suffix = type === "installation" ? " (Inst.)" : type === "emergency" ? " (Emerg.)" : "";
  return `${day} ${m}${suffix}`;
}

// Detect a Weybridge Lodge No. 6787 reference in a free-text Lodge field.
export function isWeybridgeLodge(lodgeText: string | null | undefined): boolean {
  if (!lodgeText) return false;
  const t = lodgeText.toLowerCase();
  if (/\bweybridge\b/.test(t)) return true;
  if (/\b6787\b/.test(t)) return true;
  return false;
}
