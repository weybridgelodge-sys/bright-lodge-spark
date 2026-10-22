// Places stored WM / Secretary signatures and their signed dates on the filled UGLE Installation
// Return (AcroForm). Pure pdf-lib — shared by sign-installation-return and unit tests.
// Keep free of app imports: bare "pdf-lib" resolves via Vite/vitest in the browser and via deno.json on the server.
import { PDFDocument, PDFDict, PDFName, PDFTextField, TextAlignment, type PDFPage } from "pdf-lib";

export type StampImage = { png: Uint8Array; width: number; height: number };
export const UGLE_SIGNATURE_FIELDS = {
  worshipful_master: { box: "Worshipful MasterRow1", date: "Date Signed" },
  secretary: { box: "SecretaryRow1", date: "Date Signed_2" },
} as const;
const PAD = 2;

/** Largest size that fits inside the box (minus padding) keeping the image's shape. */
export function fitInside(img: { width: number; height: number }, box: { width: number; height: number }) {
  const w = Math.max(0, box.width - PAD * 2), h = Math.max(0, box.height - PAD * 2);
  const s = Math.min(w / img.width, h / img.height);
  return { width: img.width * s, height: img.height * s };
}

function pageOf(pdf: PDFDocument, widget: PDFDict): PDFPage | null {
  for (const p of pdf.getPages()) {
    const annots = p.node.Annots();
    if (!annots) continue;
    for (let i = 0; i < annots.size(); i++) if (annots.lookup(i) === widget) return p;
  }
  return null;
}

export type StampResult = { bytes: Uint8Array; placed: ("worshipful_master" | "secretary")[]; missingFields: string[] };

/**
 * Draws each provided signature inside its own box and writes dateText into that officer's
 * Date Signed field. A missing signature leaves that box and its date exactly as filled.
 */
export async function stampUgleSignatures(
  pdfBytes: Uint8Array, sigs: { wm: StampImage | null; sec: StampImage | null }, dateText: string,
): Promise<StampResult> {
  const pdf = await PDFDocument.load(pdfBytes);
  const form = pdf.getForm();
  const placed: StampResult["placed"] = [];
  const missingFields: string[] = [];
  for (const office of ["worshipful_master", "secretary"] as const) {
    const img = office === "worshipful_master" ? sigs.wm : sigs.sec;
    if (!img) continue;
    const names = UGLE_SIGNATURE_FIELDS[office];
    let field;
    try { field = form.getField(names.box); } catch { missingFields.push(names.box); continue; }
    const widgets = field.acroField.getWidgets();
    const w = widgets[0];
    const page = w ? pageOf(pdf, w.dict) : null;
    if (!w || !page) { missingFields.push(names.box); continue; }
    const r = w.getRectangle();
    const size = fitInside(img, r);
    const embedded = await pdf.embedPng(img.png);
    page.drawImage(embedded, { x: r.x + PAD, y: r.y + (r.height - size.height) / 2, width: size.width, height: size.height });
    // The box is for ink only; drop the empty field so its appearance can't hide the image.
    form.removeField(field);
    try {
      const d = form.getField(names.date);
      if (d instanceof PDFTextField) { d.setText(dateText); d.setAlignment(TextAlignment.Center); }
      else missingFields.push(names.date);
    } catch { missingFields.push(names.date); }
    placed.push(office);
  }
  void PDFName; // keep import list stable for Deno type-check
  return { bytes: await pdf.save(), placed, missingFields };
}

/** Same date rule as the Provincial return: actual Installation date if recorded, else the rule date. "DD/MM/YYYY" as the form prints. */
export function ugleSignedDate(installationIso: string | null, prescribedIso: string): { iso: string; text: string } {
  const iso = installationIso || prescribedIso;
  const [y, m, d] = (iso || "").split("-");
  return { iso, text: iso ? `${d}/${m}/${y}` : "" };
}
