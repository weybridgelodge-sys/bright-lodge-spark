import { describe, expect, it } from "vitest";
import { effectiveDeadline, isBookingClosed, memberStatus, visibleItems } from "@/lib/memberBookings";

describe("Book my place deadline", () => {
  it("uses the typed per-event date, never overriding it", () => {
    const d = effectiveDeadline("2026-10-16", "2026-10-21");
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([2026, 10, 16]);
  });
  it("falls back to 7 days before the meeting only when blank", () => {
    const d = effectiveDeadline(null, "2026-12-09");
    expect([d.getMonth() + 1, d.getDate()]).toEqual([12, 2]);
  });
  it("closes after the deadline", () => {
    const item = { booking_deadline: "2026-10-16", event_date: "2026-10-21" };
    expect(isBookingClosed(item, new Date("2026-10-16T12:00:00"))).toBe(false);
    expect(isBookingClosed(item, new Date("2026-10-18T12:00:00"))).toBe(true);
  });
});

describe("Book my place visibility", () => {
  it("keeps closed events until the event date, hides past events", () => {
    const items = [{ event_date: "2026-10-21" }, { event_date: "2026-10-19" }];
    expect(visibleItems(items, new Date("2026-10-21T10:00:00Z"))).toEqual([{ event_date: "2026-10-21" }]);
    expect(visibleItems(items, new Date("2026-10-22T10:00:00Z"))).toEqual([]);
  });
});

describe("Book my place member status", () => {
  it("no bookings is Not booked", () => expect(memberStatus([])).toBe("not_booked"));
  it("pending card hold is Pending payment", () => expect(memberStatus([{ status: "pending" }])).toBe("pending"));
  it("paid or confirmed is Booked, even beside an old pending row", () => {
    expect(memberStatus([{ status: "pending" }, { status: "paid" }])).toBe("booked");
    expect(memberStatus([{ status: "confirmed" }])).toBe("booked");
  });
  it("waitlisted and apologies", () => {
    expect(memberStatus([{ status: "waitlisted" }])).toBe("waitlisted");
    expect(memberStatus([{ status: "apologies" }])).toBe("apologies");
  });
  it("refunded/failed bookings count as Not booked", () => expect(memberStatus([{ status: "refunded" }, { status: "failed" }])).toBe("not_booked"));
});

describe("Book my place register-only status", () => {
  it("register-only attending is Booked (booked, attended)", () => {
    expect(memberStatus([], ["booked"])).toBe("booked");
    expect(memberStatus([], ["attended"])).toBe("booked");
  });
  it("register-only apologies is Apologies", () => expect(memberStatus([], ["apologies"])).toBe("apologies"));
  it("booking beats register", () => expect(memberStatus([{ status: "apologies" }], ["booked"])).toBe("apologies"));
  it("no booking and no register is Not booked", () => expect(memberStatus([], [])).toBe("not_booked"));
  it("no_show and cancelled_refunded rows do not count", () => expect(memberStatus([], ["no_show", "cancelled_refunded"])).toBe("not_booked"));
});
