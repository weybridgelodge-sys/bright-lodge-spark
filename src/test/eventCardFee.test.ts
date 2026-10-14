import { describe, expect, it } from "vitest";
import { calcCardFeePence, eventFeePence } from "@/lib/cardFee";

describe("event card fee", () => {
  it("£40 adult card booking with Yes adds a £1.00 fee", () => {
    expect(eventFeePence(4000, "card", true)).toBe(100);
  });
  it("zero fee when No is chosen", () => {
    expect(eventFeePence(4000, "card", false)).toBe(0);
  });
  it("no fee for bank transfer", () => {
    expect(eventFeePence(4000, "bank_transfer", true)).toBe(0);
  });
  it("no fee for Pay by Bank", () => {
    expect(eventFeePence(4000, "pay_by_bank", true)).toBe(0);
  });
  it("zero fee on a zero subtotal", () => {
    expect(calcCardFeePence(0)).toBe(0);
  });
  it("rounds the 2% up before adding 20p", () => {
    expect(calcCardFeePence(4250)).toBe(85 + 20);
  });
});
