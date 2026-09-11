import { describe, it, expect } from "vitest";
import { parseQif } from "@/lib/treasurer/qif";

const SAMPLE = `!Type:Bank
D15/01/2025
T-125.00
PGUILDFORD MASONIC CENTRE
MDining invoice January
NDD
^
D22/01/2025
T250.00
PJ TIDMARSH SUBS
MAnnual subscription 2025
^
D28/01/2025
T-1,250.50
PUGLE ANNUAL RETURN
^
D31/01/2025
T39.99
PSTRIPE PAYOUT
MFestive board bookings
^`;

describe("parseQif", () => {
  it("parses a standard UK QIF bank export", () => {
    const r = parseQif(SAMPLE);
    expect(r.ok).toBe(true);
    expect(r.transactions).toHaveLength(4);
    expect(r.dateOrder).toBe("dmy");
    expect(r.dateOrderAmbiguous).toBe(false);
    expect(r.transactions[0]).toMatchObject({
      date: "2025-01-15",
      amountPence: -12500,
      memo: "Dining invoice January",
    });
    expect(r.transactions[0].description).toBe("GUILDFORD MASONIC CENTRE (ref DD)");
    expect(r.transactions[1].amountPence).toBe(25000);
    expect(r.transactions[2].amountPence).toBe(-125050);
    expect(r.transactions[2].memo).toBeNull();
    expect(r.transactions[3].date).toBe("2025-01-31");
    expect(r.totalInPence).toBe(25000 + 3999);
    expect(r.totalOutPence).toBe(12500 + 125050);
  });

  it("works with no type header and no trailing caret", () => {
    const r = parseQif("D03/02/2025\nT10.00\nPTEST");
    expect(r.ok).toBe(true);
    expect(r.transactions[0].amountPence).toBe(1000);
  });

  it("detects MM/DD when the second field exceeds 12", () => {
    const r = parseQif("D01/31/2025\nT5.00\nPUS STYLE\n^");
    expect(r.dateOrder).toBe("mdy");
    expect(r.transactions[0].date).toBe("2025-01-31");
  });

  it("flags ambiguous date order", () => {
    const r = parseQif("D01/02/2025\nT5.00\nPAMBIG\n^");
    expect(r.dateOrderAmbiguous).toBe(true);
    expect(r.warnings.join(" ")).toMatch(/could not be proven/);
  });

  it("fails cleanly on a non-QIF file", () => {
    const r = parseQif("Date,Description,Amount\n01/01/2025,Foo,10.00");
    expect(r.ok).toBe(false);
    expect(r.transactions).toHaveLength(0);
  });
});
