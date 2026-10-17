import { describe, expect, it } from "vitest";
import { raffleOptionLines } from "@/lib/widowGifts";
const f = (d: string) => d;
describe("raffleOptionLines", () => {
  it("puts date and note first, money second, for same-date raffles", () => {
    const a = raffleOptionLines({ collection_date: "2026-09-12", event_title: null, net_amount: 9.76, allocated: 0, notes: "Stripe payment for raffle tickets" }, f);
    const b = raffleOptionLines({ collection_date: "2026-09-12", event_title: null, net_amount: 135, allocated: 0, notes: "£135 collected in cash" }, f);
    expect(a).toEqual({ first: "Raffle — 2026-09-12 · Stripe payment for raffle tickets", second: "net £9.76 · £0.00 allocated" });
    expect(a.first).not.toBe(b.first);
  });
  it("prefers the meeting title and invents nothing when both are missing", () => {
    expect(raffleOptionLines({ collection_date: "2025-12-17", event_title: "Christmas Meeting", net_amount: 412.5, allocated: 50, notes: "x" }, f).first).toBe("Raffle — 2025-12-17 · Christmas Meeting");
    expect(raffleOptionLines({ collection_date: "2025-12-10", event_title: null, net_amount: 300, allocated: 0, notes: null }, f).first).toBe("Raffle — 2025-12-10");
  });
});
