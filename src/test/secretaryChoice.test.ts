import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import {
  secretaryChoiceError, secretaryChangedValue, secretaryChoiceSummary, SECRETARY_CHOICE_ERROR,
  buildFieldSpecs, SECRETARY_CHANGED_FIELD, type ReturnData,
} from "@/lib/installationReturn";

describe("UGLE return: Secretary Y/N is mandatory", () => {
  it("export/submit refused when unset", () => {
    expect(secretaryChoiceError("")).toBe(SECRETARY_CHOICE_ERROR);
    expect(secretaryChoiceError(undefined)).toBe(SECRETARY_CHOICE_ERROR);
    expect(() => secretaryChangedValue("")).toThrow(SECRETARY_CHOICE_ERROR);
  });
  it("allowed when Y and when N", () => {
    expect(secretaryChoiceError("Y")).toBeNull();
    expect(secretaryChoiceError("N")).toBeNull();
  });
  it("summary wording", () => {
    expect(secretaryChoiceSummary("N")).toBe("No");
    expect(secretaryChoiceSummary("Y")).toBe("Yes");
  });
  it("the UI path writes exactly Y or N into the form field, never blank", () => {
    const d = {
      year: 2026, installationDate: "2026-10-21", prescribedDate: "2026-10-21", installationEventTitle: null,
      wm: { key: "worshipful_master", label: "WM", memberId: null, provenance: "vacant" },
      sw: { key: "senior_warden", label: "SW", memberId: null, provenance: "vacant" },
      jw: { key: "junior_warden", label: "JW", memberId: null, provenance: "vacant" },
      ipm: { key: "immediate_past_master", label: "IPM", memberId: null, provenance: "vacant" },
      officers: [], qualification: { branch: 0, reason: "" },
      identity: { lodgeName: "", lodgeNumber: "", emailDomain: "", secretaryEmail: "" },
      ruleWording: "", profiles: {}, membershipLodgeEmail: "", membershipEmailSource: "fallback", membershipOverride: "", issues: [],
    } as unknown as ReturnData;
    for (const v of ["Y", "N"] as const) {
      const spec = buildFieldSpecs(d, { secretaryChanged: secretaryChangedValue(v) }).find((s) => s.id === SECRETARY_CHANGED_FIELD)!;
      expect(spec.value).toBe(v);
    }
  });
});
