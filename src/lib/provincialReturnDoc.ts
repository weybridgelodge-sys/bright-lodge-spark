// Builds the Provincial return as Word (.docx) and PDF, following Surrey's paper form.
import {
  AlignmentType, BorderStyle, Document, HeightRule, PageBreak, Packer, Paragraph,
  ShadingType, Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType,
} from "docx";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import {
  PM_NOTE, PROVINCE_SUBTITLE, PROVINCE_TITLE, ukLongDate,
  type ProvincialData, type ProvRow,
} from "@/lib/provincialReturn";

const PAGE_W = 11906;
const PAGE_H = 16838;
const MARGIN = 650;
const CONTENT = PAGE_W - MARGIN * 2;
const OFF_W = [1800, 3750, 2550, CONTENT - 8100];
const LOWER_START = new Set(["ORG (G)", "PET'NS REP", "HALLS REP", "SPORTS REP", "RA REP", "LMO"]);
const border = { style: BorderStyle.SINGLE, size: 4, color: "666666" };
const borders = { top: border, bottom: border, left: border, right: border };

export function content(d: ProvincialData) {
  const officer = (r: ProvRow) => [r.label.replace(/\*+$/, ""), r.firstNames.toUpperCase(), r.surname.toUpperCase(), r.decorations];
  const lower = d.lowerRows.filter((r) => LOWER_START.has(r.label)).map(officer);
  const tyler = d.lowerRows.find((r) => r.label.startsWith("TYLER"));
  const main = [...d.rows.map(officer)];
  if (tyler) main.splice(Math.max(0, main.length - 1), 0, officer(tyler));
  return {
    main,
    lower,
    secretary: [
      ["Address :", d.secretary.address],
      ["Phone / Mobile :", d.secretary.mobile],
      ["Personal Email Address :", d.secretary.personalEmail],
      ["Lodge Specific Email Address", d.secretary.lodgeEmail],
    ],
    pastMasters: d.pastMasters.map((m) => [m.years.join(", "), m.name]),
  };
}

type CellOpts = { bold?: boolean; center?: boolean; size?: number; span?: number; height?: number };
function cell(text: string, width: number, opts: CellOpts = {}) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    columnSpan: opts.span,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 25, bottom: 25, left: 70, right: 70 },
    children: text.split("\n").map((line) => new Paragraph({
      alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { before: 0, after: 0, line: 190 },
      children: [new TextRun({ text: line, bold: opts.bold, size: opts.size ?? 16, font: "Arial" })],
    })),
  });
}

function row(values: string[], widths: number[], opts: CellOpts = {}) {
  return new TableRow({
    cantSplit: true,
    height: opts.height ? { value: opts.height, rule: HeightRule.EXACT } : undefined,
    children: values.map((value, i) => cell(value, widths[i] ?? widths[widths.length - 1], { ...opts, bold: opts.bold || i === 0, center: opts.center })),
  });
}

function formHeader() {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 35 },
      children: [new TextRun({ text: PROVINCE_TITLE, bold: true, underline: {}, font: "Times New Roman", size: 27 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 90, line: 210 },
      children: [new TextRun({ text: PROVINCE_SUBTITLE, font: "Times New Roman", size: 17 })],
    }),
  ];
}

function officerHeader() {
  const labels = [
    "OFFICE",
    "FIRST NAMES\nin full in block letters\n(precede by an asterisk if Founder Member)",
    "SURNAME\nin block letters",
    "NON-MASONIC\nCivil & Military\nDecorations, etc.",
  ];
  return new TableRow({
    tableHeader: true,
    cantSplit: true,
    height: { value: 850, rule: HeightRule.EXACT },
    children: labels.map((label, i) => new TableCell({
      borders,
      width: { size: OFF_W[i], type: WidthType.DXA },
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 25, bottom: 25, left: 50, right: 50 },
      children: label.split("\n").map((line) => new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0, line: 175 },
        children: [new TextRun({ text: line, bold: true, font: "Times New Roman", size: 14 })],
      })),
    })),
  });
}

function officersTable(rows: string[][], includeHeader: boolean) {
  return new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: OFF_W,
    rows: [
      ...(includeHeader ? [officerHeader()] : []),
      ...rows.map((values) => row(values, OFF_W, { height: 285 })),
    ],
  });
}

function topTable(d: ProvincialData) {
  const widths = [2300, 3100, 2800, CONTENT - 8200];
  return new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      row(["CONSECRATED", "LODGE", "NUMBER"], [widths[0], widths[1] + widths[2], widths[3]], { bold: true, center: true, height: 300 }),
      row([ukLongDate(d.consecrated), "WEYBRIDGE", "L6787"], [widths[0], widths[1] + widths[2], widths[3]], { center: true, height: 300 }),
      row(["VENUE", "DAYS OF MEETINGS"], [widths[0], widths[1] + widths[2] + widths[3]], { bold: true, center: true, height: 300 }),
      row([d.venue, d.meetingPattern], [widths[0], widths[1] + widths[2] + widths[3]], { center: true, height: 330 }),
      row(["Scheduled\nInstallation date", ukLongDate(d.scheduledDate), "Actual Installation\ndate (if different from scheduled)", ukLongDate(d.actualDate)], widths, { center: true, height: 650 }),
    ],
  });
}

function notesTable() {
  return new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: [1900, CONTENT - 1900],
    rows: [new TableRow({
      cantSplit: true,
      height: { value: 720, rule: HeightRule.EXACT },
      children: [
        new TableCell({ borders: {}, width: { size: 1900, type: WidthType.DXA }, verticalAlign: VerticalAlign.TOP, children: [new Paragraph({ children: [new TextRun({ text: "NOTES", font: "Times New Roman", size: 15 })] })] }),
        new TableCell({ borders: {}, width: { size: CONTENT - 1900, type: WidthType.DXA }, children: [
          new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "* The invested Organist must be a subscribing Member of the Lodge.", font: "Times New Roman", size: 15 })] }),
          new Paragraph({ children: [new TextRun({ text: "** Please show full name and rank(s) of the Tyler if he is not a Member of the Lodge.", font: "Times New Roman", size: 15 })] }),
        ] }),
      ],
    })],
  });
}

function secretaryTable(rows: string[][]) {
  const widths = [CONTENT / 2, CONTENT / 2];
  return new Table({
    width: { size: CONTENT, type: WidthType.DXA }, columnWidths: widths,
    rows: [
      row(["Secretary's current contact details", "Record changes to Secretary's contact details"], widths, { bold: true, height: 380 }),
      ...rows.map(([label, value], i) => new TableRow({
        cantSplit: true,
        height: { value: i === 0 ? 1200 : i === 1 ? 700 : 620, rule: HeightRule.EXACT },
        children: [
          new TableCell({ borders, width: { size: widths[0], type: WidthType.DXA }, margins: { top: 55, bottom: 30, left: 80, right: 80 }, children: [
            new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: label, font: "Times New Roman", size: 17 })] }),
            new Paragraph({ children: [new TextRun({ text: value, font: "Times New Roman", size: 17 })] }),
          ] }),
          cell("", widths[1]),
        ],
      })),
    ],
  });
}

function pastMastersTable(rows: string[][]) {
  const half = CONTENT / 2;
  const inner = [1300, half - 1300];
  const subtable = (title: string, data: string[][]) => new TableCell({
    borders,
    width: { size: half, type: WidthType.DXA },
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    children: [new Table({
      width: { size: half, type: WidthType.DXA }, columnWidths: inner,
      rows: [
        new TableRow({ children: [new TableCell({ columnSpan: 2, borders, width: { size: half, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: title, bold: true, font: "Times New Roman", size: 17 })] })] })] }),
        new TableRow({ children: [new TableCell({ columnSpan: 2, borders, width: { size: half, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Insert new Masters as appropriate", bold: true, italics: true, font: "Times New Roman", size: 15 })] })] })] }),
        ...data.map((values) => row(values, inner, { height: 360 })),
      ],
    })],
  });
  const rightRows = Array.from({ length: Math.max(10, rows.length) }, () => ["", ""]);
  return new Table({ width: { size: CONTENT, type: WidthType.DXA }, columnWidths: [half, half], rows: [new TableRow({ children: [subtable("Subscribing Past Masters of the Lodge", rows), subtable("Subscribing Past Masters in the Lodge", rightRows)] })] });
}

const gap = (after: number) => new Paragraph({ spacing: { after }, children: [] });
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });
const continued = () => new Paragraph({
  alignment: AlignmentType.RIGHT,
  spacing: { before: 260 },
  children: [new TextRun({ text: "PLEASE CHECK THE PRINTED DETAILS ON THIS FORM AND CORRECT ANY ERRORS", font: "Times New Roman", size: 15 })],
});

export async function buildDocx(d: ProvincialData): Promise<Blob> {
  const c = content(d);
  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 16 } } } },
    sections: [{
      properties: { page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
      children: [
        ...formHeader(), topTable(d), gap(350), officersTable(c.main, true), notesTable(), pageBreak(),
        ...formHeader(), officersTable(c.lower, false), gap(360), secretaryTable(c.secretary), gap(500),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Signed.............................    Sec      Date..................        Signed.............................    WM      Date..................", font: "Times New Roman", size: 17 })] }),
        continued(),
        new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "CONTINUED OVERLEAF", font: "Times New Roman", size: 15 })] }),
        pageBreak(),
        ...formHeader(),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "PLEASE CHECK AND AMEND THE LISTS OF SUBSCRIBING PAST MASTERS OF THE LODGE", bold: true, italics: true, underline: {}, font: "Times New Roman", size: 17 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: "AND OTHER PAST MASTERS IN THE LODGE.", bold: true, italics: true, underline: {}, font: "Times New Roman", size: 17 })] }),
        new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "Lodge No. L6787", bold: true, font: "Times New Roman", size: 17 })] }),
        pastMastersTable(c.pastMasters),
        new Paragraph({ spacing: { before: 150 }, children: [new TextRun({ text: `NOTES     ${PM_NOTE}`, font: "Times New Roman", size: 17 })] }),
      ],
    }],
  });
  return Packer.toBlob(doc);
}

type PdfGridOpts = { header?: boolean; rowHeight?: number; headerHeight?: number; fontSize?: number };

export async function buildPdf(d: ProvincialData): Promise<Uint8Array> {
  const c = content(d);
  const pdf = await PDFDocument.create();
  const times = await pdf.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const timesItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const helvetica = await pdf.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28, H = 841.89, M = 40, full = W - 2 * M;
  const line = rgb(0.35, 0.35, 0.35);
  let page: PDFPage;
  let y: number;
  const clean = (value: string) => value.replace(/[–—]/g, "-").replace(/[‘’]/g, "'").replace(/[^\x20-\x7E£]/g, "");
  const addPage = () => { page = pdf.addPage([W, H]); y = H - 38; };
  const drawText = (value: string, x: number, yy: number, font: PDFFont, size: number, maxW?: number) => {
    let text = clean(value);
    if (maxW) while (text && font.widthOfTextAtSize(text, size) > maxW) text = text.slice(0, -1);
    page.drawText(text, { x, y: yy, size, font, color: rgb(0, 0, 0) });
  };
  const centerText = (value: string, yy: number, font: PDFFont, size: number) => drawText(value, (W - font.widthOfTextAtSize(clean(value), size)) / 2, yy, font, size);
  const header = () => {
    centerText(PROVINCE_TITLE, y, timesBold, 13);
    const tw = timesBold.widthOfTextAtSize(PROVINCE_TITLE, 13);
    page.drawLine({ start: { x: (W - tw) / 2, y: y - 2 }, end: { x: (W + tw) / 2, y: y - 2 }, thickness: 0.5, color: line });
    y -= 17;
    centerText("RETURN TO BE COMPLETED AND SENT TO PROVINCIAL GRAND SECRETARY", y, times, 8.5);
    y -= 11;
    centerText("IMMEDIATELY AFTER INSTALLATION MEETING", y, times, 8.5);
    y -= 30;
  };
  const wrap = (value: string, font: PDFFont, size: number, maxW: number) => {
    const words = clean(value).split(/\s+/).filter(Boolean); const lines: string[] = []; let current = "";
    for (const word of words) { const next = current ? `${current} ${word}` : word; if (current && font.widthOfTextAtSize(next, size) > maxW) { lines.push(current); current = word; } else current = next; }
    if (current) lines.push(current); return lines.length ? lines : [""];
  };
  const pdfGrid = (rows: string[][], fractions: number[], opts: PdfGridOpts = {}) => {
    const widths = fractions.map((v) => v * full / fractions.reduce((a, b) => a + b, 0));
    const xs: number[] = []; let nextX = M; for (const width of widths) { xs.push(nextX); nextX += width; }
    rows.forEach((values, ri) => {
      const isHead = opts.header && ri === 0; const fs = opts.fontSize ?? 7.5;
      const fonts = values.map((_v, i) => isHead || i === 0 ? helveticaBold : helvetica);
      const wrapped = values.map((value, i) => value.split("\n").flatMap((part) => wrap(part, fonts[i], fs, widths[i] - 8)));
      const h = isHead ? (opts.headerHeight ?? 48) : Math.max(opts.rowHeight ?? 18, Math.max(...wrapped.map((ls) => ls.length)) * (fs + 2) + 6);
      values.forEach((_value, i) => {
        page.drawRectangle({ x: xs[i], y: y - h, width: widths[i], height: h, borderColor: line, borderWidth: 0.55 });
        const lines = wrapped[i]; const block = lines.length * (fs + 2); let ty = y - (h - block) / 2 - fs;
        lines.forEach((txt) => { const center = isHead; const x = center ? xs[i] + (widths[i] - fonts[i].widthOfTextAtSize(txt, fs)) / 2 : xs[i] + 4; drawText(txt, x, ty, fonts[i], fs, widths[i] - 8); ty -= fs + 2; });
      });
      y -= h;
    });
  };
  const continuedPdf = () => {
    drawText("PLEASE CHECK THE PRINTED DETAILS ON THIS FORM AND CORRECT ANY ERRORS", W - M - times.widthOfTextAtSize("PLEASE CHECK THE PRINTED DETAILS ON THIS FORM AND CORRECT ANY ERRORS", 8), 45, times, 8);
    drawText("CONTINUED OVERLEAF", W - M - times.widthOfTextAtSize("CONTINUED OVERLEAF", 8), 34, times, 8);
  };

  // Page 1 — full officer list, ending immediately after the Organist/Tyler notes.
  addPage(); header();
  const topRows = [
    ["CONSECRATED", "LODGE", "NUMBER"],
    [ukLongDate(d.consecrated), "WEYBRIDGE", "L6787"],
    ["VENUE", "DAYS OF MEETINGS", ""],
    [d.venue, d.meetingPattern, ""],
    ["Scheduled Installation date", ukLongDate(d.scheduledDate), `Actual Installation date (if different): ${ukLongDate(d.actualDate)}`],
  ];
  pdfGrid(topRows, [1.2, 2.7, 1.1], { rowHeight: 20, fontSize: 7.5 });
  y -= 26;
  pdfGrid([["OFFICE", "FIRST NAMES\nin full in block letters\n(precede by an asterisk if Founder Member)", "SURNAME\nin block letters", "NON-MASONIC\nCivil & Military\nDecorations, etc."], ...c.main], [1.05, 2.1, 1.45, 1], { header: true, headerHeight: 48, rowHeight: 16.5, fontSize: 7.2 });
  y -= 15;
  drawText("NOTES", M + 5, y, times, 8);
  drawText("* The invested Organist must be a subscribing Member of the Lodge.", M + 100, y, times, 8);
  y -= 17;
  drawText("** Please show full name and rank(s) of the Tyler if he is not a Member of the Lodge.", M + 118, y, times, 8);

  // Page 2 — representatives, Secretary details, and signatures.
  addPage(); header();
  pdfGrid(c.lower, [1.05, 2.1, 1.45, 1], { rowHeight: 19, fontSize: 7.5 });
  y -= 35;
  const secWidths = [full / 2, full / 2];
  pdfGrid([["Secretary's current contact details", "Record changes to Secretary's contact details"]], [1, 1], { header: true, headerHeight: 22, fontSize: 8 });
  c.secretary.forEach(([label, value], i) => {
    const h = i === 0 ? 75 : 44;
    page.drawRectangle({ x: M, y: y - h, width: secWidths[0], height: h, borderColor: line, borderWidth: 0.55 });
    page.drawRectangle({ x: M + secWidths[0], y: y - h, width: secWidths[1], height: h, borderColor: line, borderWidth: 0.55 });
    drawText(label, M + 5, y - 12, times, 9, secWidths[0] - 10);
    const addressLines = i === 0 ? clean(value).split(",").map((part) => part.trim()).filter(Boolean) : [clean(value)];
    addressLines.forEach((txt, li) => drawText(txt, M + 5, y - 30 - li * 12, times, 9, secWidths[0] - 10));
    y -= h;
  });
  y -= 65;
  drawText("Signed.............................    Sec      Date..................", M + 5, y, times, 9);
  drawText("Signed.............................    WM      Date..................", M + full / 2 + 5, y, times, 9);
  continuedPdf();

  // Page 3 — Past Masters, matching the attached form's separate final section.
  addPage(); header();
  centerText("PLEASE CHECK AND AMEND THE LISTS OF SUBSCRIBING PAST MASTERS OF THE LODGE", y, timesItalic, 8.5); y -= 12;
  centerText("AND OTHER PAST MASTERS IN THE LODGE.", y, timesItalic, 8.5); y -= 22;
  drawText("Lodge No. L6787", M, y, timesBold, 9); y -= 15;
  const half = full / 2;
  page.drawRectangle({ x: M, y: y - 22, width: half, height: 22, borderColor: line, borderWidth: 0.55 });
  page.drawRectangle({ x: M + half, y: y - 22, width: half, height: 22, borderColor: line, borderWidth: 0.55 });
  const leftTitle = "Subscribing Past Masters of the Lodge", rightTitle = "Subscribing Past Masters in the Lodge";
  drawText(leftTitle, M + (half - timesBold.widthOfTextAtSize(leftTitle, 8.5)) / 2, y - 14, timesBold, 8.5);
  drawText(rightTitle, M + half + (half - timesBold.widthOfTextAtSize(rightTitle, 8.5)) / 2, y - 14, timesBold, 8.5); y -= 22;
  page.drawRectangle({ x: M, y: y - 20, width: half, height: 20, borderColor: line, borderWidth: 0.55 });
  page.drawRectangle({ x: M + half, y: y - 20, width: half, height: 20, borderColor: line, borderWidth: 0.55 });
  drawText("Insert new Masters as appropriate", M + 58, y - 13, timesItalic, 8);
  drawText("Insert new Masters as appropriate", M + half + 58, y - 13, timesItalic, 8); y -= 20;
  const pmRows = Math.max(10, c.pastMasters.length);
  for (let i = 0; i < pmRows; i += 1) {
    const h = 22; const pm = c.pastMasters[i];
    page.drawRectangle({ x: M, y: y - h, width: 65, height: h, borderColor: line, borderWidth: 0.55 });
    page.drawRectangle({ x: M + 65, y: y - h, width: half - 65, height: h, borderColor: line, borderWidth: 0.55 });
    page.drawRectangle({ x: M + half, y: y - h, width: 65, height: h, borderColor: line, borderWidth: 0.55 });
    page.drawRectangle({ x: M + half + 65, y: y - h, width: half - 65, height: h, borderColor: line, borderWidth: 0.55 });
    if (pm) { drawText(pm[0], M + 4, y - 14, helvetica, 8); drawText(pm[1], M + 69, y - 14, helvetica, 8); }
    y -= h;
  }
  y -= 18;
  drawText("NOTES", M + 5, y, times, 9);
  const pmLines = wrap(PM_NOTE, times, 9, full - 80);
  pmLines.forEach((txt, i) => drawText(txt, M + 55, y - i * 13, i === pmLines.length - 1 ? timesBold : times, 9));
  return pdf.save();
}