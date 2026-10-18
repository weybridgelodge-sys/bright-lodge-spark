import { describe, it, expect } from "vitest";
import { joinUsCostAmounts, JOIN_US_COST_FALLBACK } from "@/lib/joinUsCosts";

describe("Join Us costs", () => {
  it("uses lodge dues and dining price, keeping 'about' wording", () => {
    expect(joinUsCostAmounts({ annual_dues_pence: 25000, dining_price_pence: 3500 })).toEqual({
      ugle: "£132", dues: "£250 / year", dining: "~£35 per meeting",
    });
  });
  it("shows pence when not whole pounds", () => {
    expect(joinUsCostAmounts({ dining_price_pence: 3250 }).dining).toBe("~£32.50 per meeting");
  });
  it("falls back to the typed text when the lookup fails or is empty", () => {
    expect(joinUsCostAmounts(null)).toEqual(JOIN_US_COST_FALLBACK);
    expect(joinUsCostAmounts({ annual_dues_pence: 0, dining_price_pence: null })).toEqual(JOIN_US_COST_FALLBACK);
  });
});
