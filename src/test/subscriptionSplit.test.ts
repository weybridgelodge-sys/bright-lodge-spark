import { describe, it, expect } from "vitest";
import { splitSubscription } from "@/lib/treasurer/subscriptionSplit";

const pots = [
  { fund_code: "ALMONERS", label: "Almoners", annual_pence: 1000 },
  { fund_code: "INITIATES_REGALIA", label: "Initiates & Regalia", annual_pence: 900 },
  { fund_code: "MASTERS_FUND", label: "Master's Fund", annual_pence: 1000 },
  { fund_code: "TYLER_PROVISION", label: "Tyler Provision", annual_pence: 1000 },
];
const by = (l: ReturnType<typeof splitSubscription>, code: string) =>
  l.filter((x) => x.code === code).reduce((s, x) => s + x.pence, 0);

describe("subscription split", () => {
  it("full rate £250 → £211 / £29 / £10, Master's Fund ignored", () => {
    const l = splitSubscription(25000, false, pots, 1000);
    expect(by(l, "4000")).toBe(21100);
    expect(by(l, "3100")).toBe(2900);
    expect(by(l, "2200")).toBe(1000);
    expect(l.some((x) => x.fund_code === "MASTERS_FUND")).toBe(false);
    expect(l.filter((x) => x.code === "3100").every((x) => x.fund_code)).toBe(true);
  });
  it("under-25 £125 → £105.50 / £14.50 / £5", () => {
    const l = splitSubscription(12500, true, pots, 1000);
    expect(by(l, "4000")).toBe(10550);
    expect(by(l, "3100")).toBe(1450);
    expect(by(l, "2200")).toBe(500);
    expect(l.reduce((s, x) => s + x.pence, 0)).toBe(12500);
  });
  it("rejects an amount below the shares", () => {
    expect(() => splitSubscription(1000, false, pots, 1000)).toThrow();
  });
  it("new member prorated: reserves and Relief Chest stay full, 4000 takes the rest", () => {
    // May initiation (25%): over-25 £62.50, under-25 £31.25
    const o = splitSubscription(6250, false, pots, 1000);
    expect(by(o, "3100")).toBe(2900);
    expect(by(o, "2200")).toBe(1000);
    expect(by(o, "4000")).toBe(2350);
    const u = splitSubscription(3125, true, pots, 1000);
    expect(by(u, "3100")).toBe(1450);
    expect(by(u, "2200")).toBe(500);
    expect(by(u, "4000")).toBe(1175);
  });
});
