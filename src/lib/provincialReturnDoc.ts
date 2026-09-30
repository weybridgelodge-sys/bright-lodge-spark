// Builds the Provincial return as Word (.docx) and a reference PDF.
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType,
  BorderStyle, WidthType, ShadingType, HeadingLevel,
} from "docx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { PROVINCE_TITLE, lodgeLine, ukLongDate, type ProvincialData } from "@/lib/provincialReturn";

const CONTENT = 9026; // A4, 1" margins
const b = { style: BorderStyle.SINGLE, size: 4, color: "808080" };
const borders = { top: b, bottom: b, left: b, right: b };

function cell(text: string, width: number, opts: { bold?: boolean; shade?: boolean } = {}) {
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    shading: opts.shade ? { fill: "E7E9EE", type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: opts.bold, size: 20 })] })],
  });
}
function table(widths: number[], header: string[], body: string[][]) {
  return new Table({
    width: { size: CONTENT, type: WidthType.DXA }, columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, widths[i], { bold: true, shade: true })) }),
      ...body.map((r) => new TableRow({ children: r.map((t, i) => cell(t, widths[i])) })),
    ],
  });
}
const h = (text: string) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 }, children: [new TextRun({ text, bold: true, size: 24 })] });
const p = (text: string, bold = false) => new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text, bold, size: 20 })] });

export function sections(d: ProvincialData) {
  return {
    officers: d.rows.map((r) => [r.label, r.name, r.decorations]),
    reps: d.reps.map((r) => [r.label, r.vacant ? "" : r.name]),
    pms: d.pastMasters.map((m) => [m.years.join(", "), m.name]),
    sec: [
      ["Name", d.secretary.name],
      ["Home address", d.secretary.address],
      ["Personal mobile", d.secretary.mobile],
      ["Personal email", d.secretary.personalEmail],
      ["Lodge email", d.secretary.lodgeEmail],
    ],
  };
}

export async function buildDocx(d: ProvincialData): Promise<Blob> {
  const s = sections(d);
  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 20 } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1440, right: 1440 } } },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: PROVINCE_TITLE, bold: true, size: 28 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: `Installation Return ${d.year}–${d.year + 1}`, bold: true, size: 26 })] }),
        p(`Lodge: ${lodgeLine()}`, true),
        p(`Date of Installation: ${ukLongDate(d.installationDate)}`),
        p(`Venue: ${d.venue}`),
        p(`Meeting days: ${d.meetingPattern}`),
        h("Officers"),
        table([2400, 4426, 2200], ["Office", "Name", "Civil / Military decorations"], s.officers),
        h("Lodge Representatives"),
        table([2400, 6626], ["Role", "Name"], s.reps),
        h(`Past Masters of ${lodgeLine()}`),
        table([2400, 6626], ["Year(s)", "Name"], s.pms),
        h("Secretary's current contact details"),
        table([2400, 6626], ["", ""], s.sec),
      ],
    }],
  });
  return Packer.toBlob(doc);
}

export async function buildPdf(d: ProvincialData): Promise<Uint8Array> {
  const s = sections(d);
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 595, H = 842, M = 50, size = 9, lh = 14;
  let page = pdf.addPage([W, H]);
  let y = H - M;
  const clean = (t: string) => t.replace(/[–—]/g, "-").replace(/[^\x20-\x7E£]/g, "");
  const need = (n: number) => { if (y - n < M) { page = pdf.addPage([W, H]); y = H - M; } };
  const text = (t: string, x: number, f = font, sz = size, maxW = W - M - x) => {
    let str = clean(t);
    while (str && f.widthOfTextAtSize(str, sz) > maxW) str = str.slice(0, -1);
    page.drawText(str, { x, y, size: sz, font: f, color: rgb(0, 0, 0) });
  };
  const centre = (t: string, f = bold, sz = 13) => { const w = f.widthOfTextAtSize(clean(t), sz); text(t, (W - w) / 2, f, sz); y -= sz + 6; };
  const heading = (t: string) => { need(40); y -= 8; text(t, M, bold, 11); y -= lh + 2; };
  const grid = (cols: number[], header: string[], rows: string[][]) => {
    const xs = cols.reduce<number[]>((a, c, i) => [...a, i ? a[i - 1] + cols[i - 1] : M], []);
    const draw = (r: string[], f: typeof font) => {
      need(lh + 4);
      page.drawRectangle({ x: M, y: y - 4, width: W - 2 * M, height: lh, borderColor: rgb(0.5, 0.5, 0.5), borderWidth: 0.5 });
      r.forEach((t, i) => text(t, xs[i] + 4, f, size, cols[i] - 8));
      y -= lh;
    };
    if (header.some(Boolean)) draw(header, bold);
    rows.forEach((r) => draw(r, font));
  };
  centre(PROVINCE_TITLE);
  centre(`Installation Return ${d.year}-${d.year + 1}`, bold, 12);
  y -= 6;
  for (const [l, v] of [["Lodge", lodgeLine()], ["Date of Installation", ukLongDate(d.installationDate)], ["Venue", d.venue], ["Meeting days", d.meetingPattern]]) {
    need(lh); text(`${l}: ${v}`, M); y -= lh;
  }
  const full = W - 2 * M;
  heading("Officers"); grid([130, full - 250, 120], ["Office", "Name", "Decorations"], s.officers);
  heading("Lodge Representatives"); grid([130, full - 130], ["Role", "Name"], s.reps);
  heading(`Past Masters of ${lodgeLine()}`); grid([130, full - 130], ["Year(s)", "Name"], s.pms);
  heading("Secretary's current contact details"); grid([130, full - 130], ["", ""], s.sec);
  return pdf.save();
}
