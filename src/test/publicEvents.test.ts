import { describe, expect, it } from "vitest";
import { calcEventTotalPence, eventBookingState, isChildAge, isValidStatementDescriptor } from "@/lib/publicEvents";

const base = { adult_price_pence: 4000, child_price_pence: 1500, booking_deadline: "2026-12-10T23:59:00Z", capacity: 100, seats_taken: 0, event_date: "2026-12-19" };
const now = new Date("2026-11-01T12:00:00Z");

describe("public event bookings", () => {
  it("totals adults and children at their own prices", () => {
    expect(calcEventTotalPence(2, 3, 4000, 1500)).toBe(12500);
  });
  it("treats age 12 and under as a child", () => {
    expect(isChildAge(12)).toBe(true);
    expect(isChildAge(13)).toBe(false);
  });
  it("counts children toward capacity", () => {
    expect(eventBookingState({ ...base, capacity: 10, seats_taken: 8 }, now, 3)).toBe("sold_out");
    expect(eventBookingState({ ...base, capacity: 10, seats_taken: 8 }, now, 2)).toBe("open");
  });
  it("disables booking while either price is empty", () => {
    expect(eventBookingState({ ...base, adult_price_pence: null }, now)).toBe("prices_pending");
    expect(eventBookingState({ ...base, child_price_pence: null }, now)).toBe("prices_pending");
  });
  it("closes after the deadline", () => {
    expect(eventBookingState(base, new Date("2026-12-11T00:00:00Z"))).toBe("closed");
  });
  it("limits statement descriptor to 22 characters", () => {
    expect(isValidStatementDescriptor("XMAS PARTY 2026")).toBe(true);
    expect(isValidStatementDescriptor("X".repeat(23))).toBe(false);
  });
});
