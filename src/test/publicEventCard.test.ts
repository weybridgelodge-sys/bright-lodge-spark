import { describe, expect, it } from "vitest";
import { featuredCardInfo, sortBySoonest } from "@/lib/publicEventCard";

const base = { event_type: null, theme: "christmas" as const, adult_price_pence: 4000, child_price_pence: 1500, booking_deadline: "2026-12-10T23:59:00Z", capacity: 100, seats_taken: 40, event_date: "2026-12-19" };
const now = new Date("2026-11-01T12:00:00Z");

describe("featured event card", () => {
  it("open event shows Book your places and seats left", () => {
    expect(featuredCardInfo(base, now)).toMatchObject({ cta: "Book your places", seats: "60 places remaining", badge: "Christmas Party" });
  });
  it("sold out, closed and prices pending show state labels", () => {
    expect(featuredCardInfo({ ...base, seats_taken: 100 }, now).cta).toBe("Sold out");
    expect(featuredCardInfo(base, new Date("2026-12-11T00:00:00Z")).cta).toBe("Booking closed");
    expect(featuredCardInfo({ ...base, adult_price_pence: null }, now).cta).toBe("Prices coming soon");
  });
  it("no seat count when capacity unknown; badge falls back to Book online", () => {
    const r = featuredCardInfo({ ...base, capacity: null, theme: "default" as const }, now);
    expect(r.seats).toBeNull();
    expect(r.badge).toBe("Book online");
  });
  it("sorts soonest first", () => {
    expect(sortBySoonest([{ event_date: "2026-12-19" }, { event_date: "2026-11-02" }]).map((e) => e.event_date)).toEqual(["2026-11-02", "2026-12-19"]);
  });
});
