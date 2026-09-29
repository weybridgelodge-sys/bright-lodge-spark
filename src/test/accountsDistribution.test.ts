import { describe, expect, it } from "vitest";
import { accountsDistributionStatus, accountsOptionLabel, accountsTargetLabel } from "@/lib/treasurer/yearAudit";

describe("accounts distribution compliance", () => {
  it("targets the February after year-end", () => {
    expect(accountsTargetLabel(2025)).toBe("February 2027 meeting");
  });
  it("is on track through February, then flags Feb and May", () => {
    expect(accountsDistributionStatus(2025, null, "2026-10-15")).toBe("on_track");
    expect(accountsDistributionStatus(2025, null, "2027-02-28")).toBe("on_track");
    expect(accountsDistributionStatus(2025, null, "2027-03-01")).toBe("past_feb");
    expect(accountsDistributionStatus(2025, null, "2027-05-31")).toBe("past_feb");
    expect(accountsDistributionStatus(2025, null, "2027-06-01")).toBe("past_may");
  });
  it("sent always wins", () => {
    expect(accountsDistributionStatus(2025, "2027-09-01T10:00:00Z", "2027-09-02")).toBe("sent");
  });
  it("labels the option with year and certification date", () => {
    expect(accountsOptionLabel({ approval_id: "x", masonic_year: 2024, certified_at: "2026-10-15T12:00:00Z" }))
      .toBe("Attach FY2024/25 accounts, certified 15 Oct 2026");
  });
});
