import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { PDFDocument, PDFTextField } from "pdf-lib";
import { buildFieldSpecs, fillTemplate, SECRETARY_CHANGED_FIELD, type ReturnData } from "@/lib/installationReturn";
import { stampUgleSignatures } from "@/lib/ugleReturnSignatures";

// Real AcroForm names read from the stored UGLE template (New_IR_Craft.pdf), all 126pt wide, /Helv 10 Tf.
const COL = (t: string) => `Date of Installation Investiture or reason for Absence${t}`;
const off = (key: string, id: string | null) => ({ key, label: key, memberId: id, provenance: "confirmed", fromYear: 2026 }) as any;
function data(actual: string | null): ReturnData {
  return {
    year: 2026, installationDate: actual, prescribedDate: "2026-10-21", installationEventTitle: null,
    wm: off("worshipful_master", "w"), sw: off("senior_warden", "s"), jw: off("junior_warden", "j"), ipm: off("immediate_past_master", "i"),
    officers: [off("secretary", "x")], qualification: { branch: 0, reason: "" }, profiles: {},
    identity: { lodgeName: "Synthetic", lodgeNumber: "1", emailDomain: "example.org" } as any,
    ruleWording: "", membershipLodgeEmail: "", membershipEmailSource: "fallback", membershipOverride: "", issues: [],
  };
}
const val = (d: ReturnData, id: string) => buildFieldSpecs(d, { secretaryChanged: "N" }).find((s) => s.id === id)!.value;

describe("UGLE Installation/Investiture column", () => {
  it("no actual date recorded: WM/SW/JW get the rule date, same as Date Signed; IPM blank", () => {
    const d = data(null);
    for (const t of ["WM", "SW", "JW"]) expect(val(d, COL(t))).toBe("21/10/2026");
    expect(val(d, COL("IPM"))).toBe("");
    expect(val(d, "Date Signed")).toBe("21/10/2026");
    expect(val(d, "Date Signed_2")).toBe("21/10/2026");
  });
  it("actual date differs: every box uses the actual date", () => {
    const d = data("2026-10-28");
    for (const t of ["WM", "SW", "JW"]) expect(val(d, COL(t))).toBe("28/10/2026");
    expect(val(d, "Date Signed")).toBe("28/10/2026");
  });
  it("vacant office stays blank; Secretary Y/N unchanged", () => {
    const d = data(null); d.jw = off("junior_warden", null);
    expect(val(d, COL("JW"))).toBe("");
    expect(val(d, SECRETARY_CHANGED_FIELD)).toBe("N");
  });
  it("values survive filling and the signing step, centred", async () => {
    const pdf = await PDFDocument.create(); const page = pdf.addPage([595, 842]); const f = pdf.getForm();
    ["WM", "SW", "JW", "IPM"].forEach((t, i) => { const x = f.createTextField(COL(t)); x.addToPage(page, { x: 40, y: 700 - i * 20, width: 126, height: 16 }); x.setFontSize(10); });
    const { bytes } = await fillTemplate(await pdf.save(), buildFieldSpecs(data(null)));
    const r = await stampUgleSignatures(bytes, { wm: null, sec: null }, "21/10/2026");
    const out = (await PDFDocument.load(r.bytes)).getForm();
    const tf = (t: string) => out.getField(COL(t)) as PDFTextField;
    expect(tf("WM").getText()).toBe("21/10/2026");
    expect(tf("JW").getText()).toBe("21/10/2026");
    expect(tf("IPM").getText() ?? "").toBe("");
    expect(tf("SW").getAlignment()).toBe(1);
  });
});
