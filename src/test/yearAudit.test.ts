import { describe, it, expect } from "vitest";
import { auditorView, canClose, canSubmit, confirmWording, nextStatus, type Approval, type Signoff } from "@/lib/treasurer/yearAudit";

const a = (o: Partial<Approval> = {}): Approval => ({ id: "a", masonic_year: 2025, status: "submitted", round_number: 1, figures_snapshot: null, submitted_at: null, submitted_by: null, ...o });
const s = (role: "auditor_1" | "auditor_2", decision: "confirmed" | "query", round = 1): Signoff =>
  ({ id: role + round, approval_id: "a", round_number: round, officer_role: role, signed_by: role, signed_at: "", decision, note: decision === "query" ? "why?" : null });

describe("year audit state machine", () => {
  it("both confirm -> approved; one confirm stays submitted", () => {
    expect(nextStatus(a(), [s("auditor_1", "confirmed")])).toBe("submitted");
    expect(nextStatus(a(), [s("auditor_1", "confirmed"), s("auditor_2", "confirmed")])).toBe("approved");
  });
  it("one query -> query immediately", () => {
    expect(nextStatus(a(), [s("auditor_2", "query")])).toBe("query");
  });
  it("resubmit starts a fresh round: old sign-offs don't count", () => {
    const r2 = a({ round_number: 2 });
    const sigs = [s("auditor_1", "query"), s("auditor_2", "confirmed")];
    expect(nextStatus(r2, sigs)).toBe("submitted");
    expect(auditorView(r2, sigs, ["auditor_1"])).toEqual({ kind: "act", role: "auditor_1" });
    expect(auditorView(r2, sigs, ["auditor_2"])).toEqual({ kind: "act", role: "auditor_2" });
  });
  it("signed auditor sees read-only decision; non-auditor sees nothing", () => {
    const sigs = [s("auditor_1", "confirmed")];
    expect(auditorView(a(), sigs, ["auditor_1"]).kind).toBe("signed");
    expect(auditorView(a(), sigs, []).kind).toBe("none");
  });
  it("gates submit and close", () => {
    expect(canSubmit("draft") && canSubmit("query")).toBe(true);
    expect(canSubmit("submitted") || canSubmit("approved")).toBe(false);
    expect(canClose("approved")).toBe(true);
    expect(canClose("submitted") || canClose("query") || canClose("draft")).toBe(false);
  });
  it("uses the exact confirmation wording", () => {
    expect(confirmWording(2025)).toBe("By confirming, you are certifying that you have examined the accounts for the year ended 30 September 2026 and believe them accurate. This is recorded against your name and cannot be undone.");
  });
});
