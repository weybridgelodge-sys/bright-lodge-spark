import { describe, it, expect } from "vitest";
import { PDFDocument, PDFTextField } from "pdf-lib";
import { stampUgleSignatures, fitInside, ugleSignedDate, UGLE_SIGNATURE_FIELDS } from "@/lib/ugleReturnSignatures";

// 1×1 transparent PNG (synthetic — not a real signature).
const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
const img = { png: PNG, width: 600, height: 200 };

/** Synthetic form with the UGLE field names; "Date Signed" fields hold the browser's value (blank here, as on the real return). */
async function form() {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const f = pdf.getForm();
  const add = (n: string, x: number, y: number, w: number, h: number, v = "") => { const t = f.createTextField(n); t.addToPage(page, { x, y, width: w, height: h }); if (v) t.setText(v); };
  add("Worshipful MasterRow1", 50, 100, 200, 30);
  add("SecretaryRow1", 300, 100, 200, 30);
  add("Date Signed", 50, 60, 100, 20);
  add("Date Signed_2", 300, 60, 100, 20);
  add("Lodge Name", 50, 700, 200, 20, "SYNTHETIC LODGE");
  return pdf.save();
}
async function read(bytes: Uint8Array) {
  const f = (await PDFDocument.load(bytes)).getForm();
  const names = f.getFields().map((x) => x.getName());
  const text = (n: string) => (f.getField(n) as PDFTextField).getText() ?? "";
  return { names, text, images: (await PDFDocument.load(bytes)).getPage(0).node.Resources()?.toString().match(/\/Image-?\d*|\/XObject/g)?.length ?? 0 };
}

describe("UGLE return stored signatures", () => {
  const date = ugleSignedDate(null, "2026-10-21");

  it("uses the Provincial date rule: actual date if recorded, else the rule date, printed DD/MM/YYYY", () => {
    expect(date).toEqual({ iso: "2026-10-21", text: "21/10/2026" });
    expect(ugleSignedDate("2026-10-28", "2026-10-21").text).toBe("28/10/2026");
  });

  it("scales to fit inside the box without overflowing", () => {
    const s = fitInside({ width: 600, height: 200 }, { width: 200, height: 30 });
    expect(s.width).toBeLessThanOrEqual(196);
    expect(s.height).toBeLessThanOrEqual(26);
    expect(s.width / s.height).toBeCloseTo(3);
  });

  it("both signatures: each box signed, both dates filled, other fields untouched", async () => {
    const before = await read(await form());
    expect(before.text("Date Signed")).toBe("");
    const r = await stampUgleSignatures(await form(), { wm: img, sec: img }, date.text);
    expect(r.placed).toEqual(["worshipful_master", "secretary"]);
    const after = await read(r.bytes);
    expect(after.names).not.toContain(UGLE_SIGNATURE_FIELDS.worshipful_master.box);
    expect(after.names).not.toContain(UGLE_SIGNATURE_FIELDS.secretary.box);
    expect(after.text("Date Signed")).toBe("21/10/2026");
    expect(after.text("Date Signed_2")).toBe("21/10/2026");
    expect(after.text("Lodge Name")).toBe("SYNTHETIC LODGE");
  });

  it("Secretary missing: only the WM box and date change; Secretary's stays blank (never copied)", async () => {
    const r = await stampUgleSignatures(await form(), { wm: img, sec: null }, date.text);
    expect(r.placed).toEqual(["worshipful_master"]);
    const after = await read(r.bytes);
    expect(after.names).toContain("SecretaryRow1");
    expect(after.text("SecretaryRow1")).toBe("");
    expect(after.text("Date Signed_2")).toBe("");
    expect(after.text("Date Signed")).toBe("21/10/2026");
  });

  it("WM missing: only the Secretary box is signed", async () => {
    const r = await stampUgleSignatures(await form(), { wm: null, sec: img }, date.text);
    expect(r.placed).toEqual(["secretary"]);
    const after = await read(r.bytes);
    expect(after.names).toContain("Worshipful MasterRow1");
    expect(after.text("Date Signed")).toBe("");
  });

  it("none: return left exactly as filled", async () => {
    const r = await stampUgleSignatures(await form(), { wm: null, sec: null }, date.text);
    expect(r.placed).toEqual([]);
    const after = await read(r.bytes);
    expect(after.names).toEqual(expect.arrayContaining(["Worshipful MasterRow1", "SecretaryRow1"]));
    expect(after.text("Date Signed")).toBe("");
    expect(after.text("Date Signed_2")).toBe("");
  });
});
