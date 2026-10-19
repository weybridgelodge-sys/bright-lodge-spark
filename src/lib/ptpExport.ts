// PerfectTablePlan seating export helpers (Festive Board Register).
// Export carries diners only: meeting-only attendees are left out so PTP never seats them.
import { firstNameFromContact } from "../../supabase/functions/_shared/greeting";

export interface PtpAttendanceRow {
  id: string;
  member_id: string | null;
  visitor_name: string | null;
  visitor_lodge_name: string | null;
  visitor_lodge_number: string | null;
  attendance_status: string;
  is_meeting_only: boolean | null;
  source: string | null;
  source_booking_id: string | null;
  dietary: string | null;
}

export interface PtpProfileLike {
  title?: string | null;
  first_name?: string | null;
  preferred_name?: string | null;
  last_name?: string | null;
}

/** Drop meeting-only rows; they have no meal and must not be seated in PTP. */
export function filterPtpDiningRows(rows: PtpAttendanceRow[]): PtpAttendanceRow[] {
  return rows.filter((r) => !r.is_meeting_only);
}

/** Row-building logic identical to the previous inline export, operating on the filtered rows. */
export function buildPtpRows(
  rowsRaw: PtpAttendanceRow[],
  profilesMap: Map<string, PtpProfileLike>,
  bookingsMap: Map<string, any>,
): Array<Record<string, string>> {
  const cleanDiet = (s: string) => (/^none$/i.test(s.trim()) ? "" : s.trim());

  const rows: Array<Record<string, string>> = [];
  for (const r of rowsRaw) {
    const parentBookingId = r.source_booking_id ? r.source_booking_id.split("::")[0] : null;
    const guestIdx = r.source_booking_id && r.source_booking_id.includes("::g")
      ? parseInt(r.source_booking_id.split("::g")[1] ?? "", 10)
      : null;
    const booking = parentBookingId ? bookingsMap.get(parentBookingId) : null;
    const bDetails: any = booking?.details ?? {};
    const guest: any = guestIdx != null && Array.isArray(bDetails.guests) ? bDetails.guests[guestIdx] ?? {} : null;

    let title = "";
    let first = "";
    let last = "";
    let group = "";

    if (r.member_id) {
      const p = profilesMap.get(r.member_id);
      title = (p?.title ?? "").trim();
      first = (p?.preferred_name ?? p?.first_name ?? "").trim();
      last = (p?.last_name ?? "").trim();
      group = "Weybridge 6787";
    } else if (guest) {
      const name = String(guest?.name ?? r.visitor_name ?? "").trim();
      const parts = name.split(/\s+/);
      title = String(guest?.title ?? "").trim();
      first = String(guest?.firstName ?? "").trim() || firstNameFromContact(name);
      last = String(guest?.lastName ?? parts.slice(1).join(" ") ?? "").trim();
      group = String(guest?.lodge ?? r.visitor_lodge_name ?? bDetails.lodge ?? "").trim();
    } else if (booking) {
      // Primary respondent from a booking
      title = String(bDetails.title ?? "").trim();
      first = String(bDetails.firstName ?? "").trim();
      last = String(bDetails.lastName ?? "").trim();
      group = String(bDetails.lodge ?? r.visitor_lodge_name ?? "").trim();
    } else {
      // Manual visitor entry — no linked booking
      const name = String(r.visitor_name ?? "").trim();
      const parts = name.split(/\s+/);
      first = firstNameFromContact(name);
      last = parts.slice(parts.indexOf(first) + 1).join(" ");
      group = String(r.visitor_lodge_name ?? "").trim();
    }

    // Meal: from linked booking's diningOption (or guest.diningOption/meal); blank when meeting-only or manual
    let meal = "";
    if (!r.is_meeting_only) {
      if (guest) meal = String(guest?.diningOption ?? guest?.meal ?? bDetails.diningOption ?? "").trim();
      else if (booking) meal = String(bDetails.diningOption ?? "").trim();
    }

    // Dietary: manual field on attendance row wins; else fallback to booking's dietary
    const manualDiet = (r.dietary ?? "").trim();
    let dietary = manualDiet;
    if (!dietary) {
      if (guest) dietary = String(guest?.dietary ?? "").trim();
      else if (booking) dietary = String(bDetails.dietary ?? "").trim();
    }
    // The booking's own text only (pre-filled from the member record at booking time); never the profile.

    rows.push({
      Title: title,
      "First Name": first,
      "Last Name": last,
      Group: group,
      Meal: meal,
      "Special req.": cleanDiet(dietary),
      "RSVP status": "Attending",
    });
  }
  return rows;
}

/** "32 diners exported" or "32 diners exported (3 meeting-only left out)". */
export function ptpExportMessage(count: number, meetingOnlyLeftOut: number): string {
  const base = `${count} ${count === 1 ? "diner" : "diners"} exported`;
  return meetingOnlyLeftOut > 0 ? `${base} (${meetingOnlyLeftOut} meeting-only left out)` : base;
}
