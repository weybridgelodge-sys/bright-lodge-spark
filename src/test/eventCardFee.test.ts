import { describe, expect, it } from "vitest";
import { calcCardFeePence, eventFeePence, type EventPayMethod } from "@/lib/cardFee";

const methods: EventPayMethod[] = ["card", "bank_transfer", "pay_by_bank"];

describe("event processing fee", () => {
  it("card £40 with Yes = 100p", () => expect(eventFeePence(4000, "card", true)).toBe(100));
  it("bank transfer £40 with Yes = 40p", () => expect(eventFeePence(4000, "bank_transfer", true)).toBe(40));
  it("Pay by Bank £40 with Yes = 60p", () => expect(eventFeePence(4000, "pay_by_bank", true)).toBe(60));
  for (const m of methods) {
    it(`${m}: No = 0`, () => expect(eventFeePence(4000, m, false)).toBe(0));
    it(`${m}: zero subtotal = 0`, () => expect(eventFeePence(0, m, true)).toBe(0));
    it(`${m}: amount charged equals subtotal + fee`, () => expect(4000 + eventFeePence(4000, m, true)).toBe(
      { card: 4100, bank_transfer: 4040, pay_by_bank: 4060 }[m]));
  }
  it("card rule unchanged: rounds 2% up then adds 20p", () => expect(calcCardFeePence(4250)).toBe(105));
});
