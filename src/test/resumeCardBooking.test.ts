import { describe, expect, it } from "vitest";
import { itemFooter, memberStatus, heldUntilLabel } from "@/lib/memberBookings";

const now = new Date("2026-10-22T21:30:00Z");
const base = { register: [], booking_deadline: null, event_date: "2026-11-30" };
const card = (hold: string) => ({ id: "a4fa9968", status: "pending", method: "card", card: true, total_pence: 3590, hold_until: hold });

describe("pending card booking resume", () => {
  it("live hold offers Continue to payment for the same booking with the agreed total", () => {
    const r = itemFooter({ ...base, bookings: [card("2026-10-22T22:03:58Z")] }, now);
    expect(r.status).toBe("pending");
    expect(r.footer).toEqual({ kind: "resume", bookingId: "a4fa9968", totalPence: 3590, holdUntil: "2026-10-22T22:03:58Z" });
  });
  it("expired hold returns to Book my place", () => {
    const r = itemFooter({ ...base, bookings: [card("2026-10-22T21:00:00Z")] }, now);
    expect(r.status).toBe("not_booked");
    expect(r.footer).toEqual({ kind: "book" });
  });
  it("pending bank transfer keeps the existing wording and no button", () => {
    const r = itemFooter({ ...base, bookings: [{ id: "b", status: "pending", method: "bank-transfer", card: false, hold_until: "2026-10-22T20:00:00Z" }] }, now);
    expect(r.footer.kind).toBe("message");
  });
  it("paid shows booked", () => {
    expect(memberStatus([{ status: "paid", card: true }], [], now)).toBe("booked");
  });
  it("shows the hold time in UK time", () => {
    expect(heldUntilLabel("2026-10-22T22:03:58Z")).toBe("Held until 23:03");
  });
});
