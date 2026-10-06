import { describe, it, expect } from "vitest";
import { defaultWidowReportFrom, formatGiftHistory } from "./widowGifts";

describe("formatGiftHistory", () => {
  it("orders oldest first and shows amounts", () => {
    expect(formatGiftHistory([
      { gift_type: "cheque", amount: 50, date_sent: "2025-12-10" },
      { gift_type: "hamper", amount: null, date_sent: "2024-12-12" },
    ])).toBe("Hamper 2024 · Cheque £50 2025");
  });
  it("uses description for other and pence when needed", () => {
    expect(formatGiftHistory([{ gift_type: "other", amount: "12.5", date_sent: "2026-01-02", description: "Flowers" }])).toBe("Flowers £12.50 2026");
  });
  it("is empty with no gifts", () => expect(formatGiftHistory([])).toBe(""));
});

describe("defaultWidowReportFrom", () => {
  it("day after last final report", () => expect(defaultWidowReportFrom("2026-09-16", "2026-09-16", "2026-10-06")).toBe("2026-09-17"));
  it("falls back to last meeting", () => expect(defaultWidowReportFrom(null, "2026-09-16", "2026-10-06")).toBe("2026-09-16"));
  it("falls back to 90 days", () => expect(defaultWidowReportFrom(null, null, "2026-10-06")).toBe("2026-07-08"));
  it("never after today", () => expect(defaultWidowReportFrom("2026-10-06", null, "2026-10-06")).toBe("2026-10-06"));
});
