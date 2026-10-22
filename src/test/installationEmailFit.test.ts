import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { PDFDocument, PDFTextField } from "pdf-lib";
import { fillTemplate, fitFontSize, MIN_EMAIL_FONT, type FieldSpec } from "@/lib/installationReturn";
import { stampUgleSignatures } from "@/lib/ugleReturnSignatures";

const LONG = "membershipsecretary@weybridgelodge.org.uk";
const SHORT = "a@b.org";
const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));

async function template() {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const f = pdf.getForm();
  const add = (n: string, y: number, w = 160) => { const t = f.createTextField(n); t.addToPage(page, { x: 40, y, width: w, height: 16 }); t.setFontSize(10); };
  add("Membership Oﬃcer Lodge Email Address", 700);
  add("Secretary Personal Email Address", 680);
  add("Treasurer Personal Email Address", 660, 20);
  add("Lodge Name", 640);
  add("Worshipful MasterRow1", 100); add("SecretaryRow1", 60); add("Date Signed", 40); add("Date Signed_2", 20);
  return pdf.save();
}
const size = (pdf: PDFDocument, n: string) => Number((pdf.getForm().getField(n) as PDFTextField).acroField.getDefaultAppearance()!.match(/([\d.]+)\s+Tf/)![1]);
const specs: FieldSpec[] = [
  { id: "Membership Oﬃcer Lodge Email Address", label: "", value: LONG },
  { id: "Secretary Personal Email Address", label: "", value: SHORT },
  { id: "Treasurer Personal Email Address", label: "", value: LONG },
  { id: "Lodge Name", label: "", value: "SYNTHETIC LODGE WITH A VERY LONG NAME INDEED HERE" },
];

describe("UGLE email fields shrink to fit", () => {
  it("fitFontSize keeps the default when it fits and returns null below the minimum", () => {
    expect(fitFontSize((s) => s * 5, 100, 10)).toBe(10);
    expect(fitFontSize((s) => s * 20, 100, 10)).toBe(5 >= MIN_EMAIL_FONT ? 5 : null);
    expect(fitFontSize((s) => s * 100, 100, 10)).toBeNull();
  });

  it("long address shrinks with full value kept; short one and non-email fields unchanged; too-long reported", async () => {
    const { bytes, report } = await fillTemplate(await template(), specs);
    const pdf = await PDFDocument.load(bytes);
    const tf = (n: string) => pdf.getForm().getField(n) as PDFTextField;
    expect(tf("Membership Oﬃcer Lodge Email Address").getText()).toBe(LONG);
    const s = size(pdf, "Membership Oﬃcer Lodge Email Address");
    expect(s).toBeLessThan(10);
    expect(s).toBeGreaterThanOrEqual(MIN_EMAIL_FONT);
    expect(size(pdf, "Secretary Personal Email Address")).toBe(10);
    expect(size(pdf, "Lodge Name")).toBe(10);
    expect(tf("Treasurer Personal Email Address").getText()).toBe(LONG);
    expect(report.long).toEqual(["long value in field Treasurer Personal Email Address"]);
  });

  it("signed copy keeps the shrunk size", async () => {
    const { bytes } = await fillTemplate(await template(), specs);
    const before = size(await PDFDocument.load(bytes), "Membership Oﬃcer Lodge Email Address");
    const r = await stampUgleSignatures(bytes, { wm: { png: PNG, width: 600, height: 200 }, sec: null }, "21/10/2026");
    const after = await PDFDocument.load(r.bytes);
    expect(size(after, "Membership Oﬃcer Lodge Email Address")).toBe(before);
    expect((after.getForm().getField("Membership Oﬃcer Lodge Email Address") as PDFTextField).getText()).toBe(LONG);
  });
});
