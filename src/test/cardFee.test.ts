import { describe, expect, it } from "vitest";
import { calcCardFeePence } from "@/pages/Bookings";

describe("calcCardFeePence", () => {
  it("charges 2% plus a flat 20p", () => {
    expect(calcCardFeePence(3500)).toBe(90); // £35 -> £0.90
    expect(calcCardFeePence(5000)).toBe(120); // £50 -> £1.20
  });

  it("returns 0 for an empty basket", () => {
    expect(calcCardFeePence(0)).toBe(0);
  });
});
