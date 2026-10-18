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

import { faqCostAnswer } from "@/lib/joinUsCosts";
import { discountedPence, feeDefault, validateFeeInputs } from "@/lib/treasurer/lodgeFees";

describe("Lodge default fees", () => {
  it("50% under-25 discount gives UGLE £66.00 and PGL £7.56", () => {
    expect(discountedPence(13200, 50)).toBe(6600);
    expect(discountedPence(1512, 50)).toBe(756);
    expect(feeDefault(13200, true, 50)).toBe("66.00");
    expect(feeDefault(1512, false, 50)).toBe("15.12");
  });
  it("uses the stored percent", () => {
    expect(discountedPence(13200, 25)).toBe(9900);
    expect(discountedPence(13200, 0)).toBe(13200);
  });
  it("validates positive fees and 0–100 percent", () => {
    expect(validateFeeInputs("0", "15.12", "50")).toHaveProperty("error");
    expect(validateFeeInputs("132", "15.12", "101")).toHaveProperty("error");
    expect(validateFeeInputs("132.00", "15.12", "50")).toEqual({ ugle: 13200, pgl: 1512, pct: 50 });
  });
});

describe("Public cost function figures", () => {
  it("Join Us UGLE card reads the saved fee, falls back to £132", () => {
    expect(joinUsCostAmounts({ ugle_fee_pence: 14000 }).ugle).toBe("£140");
    expect(joinUsCostAmounts({ ugle_fee_pence: null }).ugle).toBe("£132");
  });
  it("FAQ uses the same dining figure as Join Us", () => {
    const a = faqCostAnswer({ ugle_fee_pence: 13200, annual_dues_pence: 25000, dining_price_pence: 3500 });
    expect(a).toContain("fee of £132");
    expect(a).toContain("subscription of £250");
    expect(a).toContain("approximately £35");
    expect(faqCostAnswer(null)).toContain("approximately £32");
  });
});
