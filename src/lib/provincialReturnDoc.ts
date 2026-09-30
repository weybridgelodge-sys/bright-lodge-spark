// Builds the Provincial return as Word (.docx) and a reference PDF, following Surrey's form layout.
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType,
  BorderStyle, WidthType, ShadingType, PageBreak,
} from "docx";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { PROVINCE_TITLE, PROVINCE_SUBTITLE, TABLE_NOTE, PM_NOTE, lodgeLine, ukLongDate, type ProvincialData, type ProvRow } from "@/lib/provincialReturn";

const CONTENT = 9026; // A4, 1" margins
const b = { style: BorderStyle.SINGLE, size: 4, color: "808080" };
const borders = { top: b, bottom: b, left: b, right: b };

export function content(d: ProvincialData) {
  const officer = (r: ProvRow) => [r.label, r.firstNames, r.surname, r.decorations];
  return {
    top: [
      ["Consecrated", ukLongDate(d.consecrated)],
      ["Lodge", lodgeLine()],
      ["Venue", d.venue],
      ["Days of meetings", d.meetingPattern],
      ["Scheduled Installation date", ukLongDate(d.scheduledDate)],
      ["Actual Installation date if different", ukLongDate(d.actualDate)],
    ],
    header: ["", "First names in full", "SURNAME", "Non-Masonic Civil & Military Decorations"],
    officers: d.rows.map(officer),
    lower: d.lowerRows.map(officer),
    secHeader: ["", "Secretary's current contact details", "Record changes to Secretary's contact details"],
    sec: [
      ["Address", d.secretary.address, ""],
      ["Phone/Mobile", d.secretary.mobile, ""],
      ["Personal Email Address", d.secretary.personalEmail, ""],
      ["Lodge Specific Email Address", d.secretary.lodgeEmail, ""],
    ],
    signature: "Signed ........................ Sec   Date ............     Signed ........................ WM   Date ............",
    pmTitle: "PLEASE CHECK AND AMEND THE LISTS OF SUBSCRIBING PAST MASTERS OF THE LODGE AND OTHER PAST MASTERS IN THE LODGE",
    pmOf: d.pastMasters.map((m) => [m.years.join(", "), m.name]),
  };
}

function cell(text: string, width: number, opts: { bold?: boolean; shade?: boolean } = {}) {
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    shading: opts.shade ? { fill: "E7E9EE", type: ShadingType.CLEAR } : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: opts.bold, size: 18 })] })],
  });
}
function table(widths: number[], header: string[] | null, body: string[][]) {
  return new Table({
    width: { size: CONTENT, type: WidthType.DXA }, columnWidths: widths,
    rows: [
      ...(header ? [new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, widths[i], { bold: true, shade: true })) })] : []),
      ...body.map((r) => new TableRow({ children: r.map((t, i) => cell(t, widths[i], { bold: i === 0 })) })),
    ],
  });
}
const para = (text: string, o: { bold?: boolean; size?: number; center?: boolean; after?: number; italics?: boolean } = {}) =>
  new Paragraph({ alignment: o.center ? AlignmentType.CENTER : undefined, spacing: { after: o.after ?? 80 }, children: [new TextRun({ text, bold: o.bold, italics: o.italics, size: o.size ?? 18 })] });

const OFF_W = [1500, 2800, 2200, 2526];
const SEC_W = [2200, 3413, 3413];

export async function buildDocx(d: ProvincialData): Promise<Blob> {
  const c = content(d);
  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 18 } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, bottom: 1000, left: 1440, right: 1440 } } },
      children: [
        para(PROVINCE_TITLE, { bold: true, size: 26, center: true, after: 40 }),
        para(PROVINCE_SUBTITLE, { bold: true, size: 18, center: true, after: 160 }),
        table([3200, 5826], null, c.top),
        para("", { after: 120 }),
        table(OFF_W, c.header, c.officers),
        para(TABLE_NOTE, { italics: true, size: 16, after: 80 }),
        table(OFF_W, c.header, c.lower),
        para("", { after: 120 }),
        table(SEC_W, c.secHeader, c.sec),
        para("", { after: 240 }),
        para(c.signature),
        new Paragraph({ children: [new PageBreak()] }),
        para(c.pmTitle, { bold: true, size: 20, center: true, after: 200 }),
        para(`Subscribing Past Masters of the Lodge — ${lodgeLine()}`, { bold: true, after: 80 }),
        table([2400, 6626], ["Year(s)", "Name"], c.pmOf),
        para("", { after: 160 }),
        para("Subscribing Past Masters in the Lodge", { bold: true, after: 80 }),
        table([2400, 6626], ["Year(s)", "Name (and Lodge where Master)"], [["", ""], ["", ""]]),
        para("", { after: 160 }),
        para(PM_NOTE, { italics: true }),
      ],
    }],
  });
  return Packer.toBlob(doc);
}

export async function buildPdf(d: ProvincialData): Promise<Uint8Array> {
  const c = content(d);
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 595, H = 842, M = 45, size = 8, lh = 13, full = W - 2 * M;
  let page: PDFPage = pdf.addPage([W, H]);
  let y = H - M;
  const clean = (t: string) => t.replace(/[–—]/g, "-").replace(/[‘’]/g, "'").replace(/[^\x20-\x7E£]/g, "");
  const newPage = () => { page = pdf.addPage([W, H]); y = H - M; };
  const need = (n: number) => { if (y - n < M) newPage(); };
  const text = (t: string, x: number, f: PDFFont = font, sz = size, maxW = W - M - x) => {
    let s = clean(t);
    while (s && f.widthOfTextAtSize(s, sz) > maxW) s = s.slice(0, -1);
    page.drawText(s, { x, y, size: sz, font: f, color: rgb(0, 0, 0) });
  };
  const wrap = (t: string, f: PDFFont, sz: number, center = false) => {
    const words = clean(t).split(" ");
    let line = "";
    const flush = () => { need(sz + 4); const w = f.widthOfTextAtSize(line, sz); text(line, center ? (W - w) / 2 : M, f, sz); y -= sz + 4; line = ""; };
    for (const w of words) { const next = line ? `${line} ${w}` : w; if (f.widthOfTextAtSize(next, sz) > full) flush(); line = line ? `${line} ${w}` : w; }
    if (line) flush();
  };
  const grid = (cols: number[], header: string[] | null, rows: string[][]) => {
    const scale = full / cols.reduce((a, x) => a + x, 0);
    const ws = cols.map((x) => x * scale);
    const xs = ws.reduce<number[]>((a, _c, i) => [...a, i ? a[i - 1] + ws[i - 1] : M], []);
    const draw = (r: string[], head: boolean) => {
      need(lh + 4);
      r.forEach((t, i) => {
        page.drawRectangle({ x: xs[i], y: y - 4, width: ws[i], height: lh, borderColor: rgb(0.5, 0.5, 0.5), borderWidth: 0.5, color: head ? rgb(0.9, 0.91, 0.93) : undefined });
        text(t, xs[i] + 3, head || i === 0 ? bold : font, size, ws[i] - 6);
      });
      y -= lh;
    };
    if (header) draw(header, true);
    rows.forEach((r) => draw(r, false));
    y -= 8;
  };
  wrap(PROVINCE_TITLE, bold, 13, true);
  wrap(PROVINCE_SUBTITLE, bold, 8, true);
  y -= 6;
  grid([3200, 5826], null, c.top);
  grid(OFF_W, c.header, c.officers);
  wrap(TABLE_NOTE, font, 7);
  y -= 4;
  grid(OFF_W, c.header, c.lower);
  grid(SEC_W, c.secHeader, c.sec);
  y -= 10; need(lh); text(c.signature, M); y -= lh;
  newPage();
  wrap(c.pmTitle, bold, 10, true);
  y -= 6;
  wrap(`Subscribing Past Masters of the Lodge - ${lodgeLine()}`, bold, 9);
  grid([2400, 6626], ["Year(s)", "Name"], c.pmOf);
  wrap("Subscribing Past Masters in the Lodge", bold, 9);
  grid([2400, 6626], ["Year(s)", "Name (and Lodge where Master)"], [["", ""], ["", ""]]);
  wrap(PM_NOTE, font, 8);
  return pdf.save();
}
