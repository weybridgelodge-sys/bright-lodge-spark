import { describe, expect, it } from "vitest";
import {
  buildPtpRows,
  filterPtpDiningRows,
  ptpExportMessage,
  type PtpAttendanceRow,
} from "@/lib/ptpExport";

const row = (over: Partial<PtpAttendanceRow>): PtpAttendanceRow => ({
  id: over.id ?? Math.random().toString(),
  member_id: null,
  visitor_name: null,
  visitor_lodge_name: null,
  visitor_lodge_number: null,
  attendance_status: "booked",
  is_meeting_only: false,
  source: "manual",
  source_booking_id: null,
  dietary: null,
  ...over,
});

describe("PerfectTablePlan export — diners only", () => {
  const memberRow = row({ member_id: "p1" });
  const guestRow = row({ source_booking_id: "b1::g0" });
  const manualRow = row({ visitor_name: "David Poole" });
  const meetingOnlyA = row({ visitor_name: "John Coleman", is_meeting_only: true });
  const meetingOnlyB = row({ visitor_name: "Tony Mallard", is_meeting_only: true });
  const allRows = [memberRow, guestRow, manualRow, meetingOnlyA, meetingOnlyB];

  it("leaves out every meeting-only row", () => {
    const dining = filterPtpDiningRows(allRows);
    expect(dining).toHaveLength(3);
    expect(dining.map((r) => r.id)).toEqual([memberRow.id, guestRow.id, manualRow.id]);
  });

  it("export rows contain only the three dining rows", () => {
    const bookings = new Map<string, any>([
      [
        "b1",
        {
          id: "b1",
          details: {
            title: "Mr",
            firstName: "Simon",
            lastName: "Blake",
            lodge: "Ashley 9012",
            diningOption: "Standard",
            dietary: "None",
            guests: [{ title: "W Bro.", name: "Peter Song", lodge: "Ashley 9012", diningOption: "Standard" }],
          },
        },
      ],
    ]);
    const profiles = new Map<string, any>([
      ["p1", { title: "W Bro.", first_name: "Tony", last_name: "Mallard" }],
    ]);

    const dining = filterPtpDiningRows(allRows);
    const rows = buildPtpRows(dining, profiles, bookings);

    expect(rows).toHaveLength(3);
    const lastNames = rows.map((r) => r["Last Name"]);
    expect(lastNames).toContain("Mallard");
    expect(lastNames).toContain("Song");
    expect(lastNames).toContain("Poole");
    expect(rows.every((r) => r["RSVP status"] === "Attending")).toBe(true);
    // No meeting-only name reaches the export
    const joined = rows.map((r) => `${r["First Name"]} ${r["Last Name"]}`).join("|");
    expect(joined).not.toContain("Coleman");
  });

  it("reports exported and left-out counts in the message", () => {
    expect(ptpExportMessage(3, 2)).toBe("3 diners exported (2 meeting-only left out)");
    expect(ptpExportMessage(32, 3)).toBe("32 diners exported (3 meeting-only left out)");
  });

  it("omits the left-out note when nothing was left out", () => {
    expect(ptpExportMessage(32, 0)).toBe("32 diners exported");
    expect(ptpExportMessage(1, 0)).toBe("1 diner exported");
  });
});
