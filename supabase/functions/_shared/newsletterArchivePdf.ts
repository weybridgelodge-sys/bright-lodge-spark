// Newsletter archive PDF (filed to Documents after a successful broadcast). pdf-lib, A4 portrait.
// Shared brand header/footer from ./pdfLibBrand.ts: Unit Setup crest (failure = omitted),
// lodge name/number/province, newsletter masthead on the gold-dark title line.
// Body content, section order and wording are unchanged from the earlier navy-band version.
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import { CONTENT_BOTTOM_Y, GOLD, INK, MUTED, NAVY, drawPdfLibBrandFooter, drawPdfLibBrandHeader, loadCrest, type ProcessedCrest } from "./pdfLibBrand.ts";
import type { NewsletterBrand } from "./newsletterBrand.ts";

export const IMAGE_FETCH_TIMEOUT_MS = 10_000;

type Block =
  | { id?: string; type: "text"; text: string }
  | { id?: string; type: "image"; url: string; alt?: string; caption?: string };
export type ArchiveContent = { sections: { heading: string; blocks: Block[] }[] };

export async function buildNewsletterArchivePdf(opts: {
  subject: string;
  audienceLabel: string;
  recipientCount: number;
  content: ArchiveContent;
  brand: NewsletterBrand;
  /** Test seams. */
  loadCrestImpl?: (url: string | null | undefined) => Promise<ProcessedCrest | null>;
  fetchImpl?: typeof fetch;
  /** Per-image fetch limit; a timeout becomes the "[Image unavailable: ...]" line. */
  imageTimeoutMs?: number;
  now?: Date;
}): Promise<Uint8Array> {
  const now = opts.now ?? new Date();
  const doFetch = opts.fetchImpl ?? fetch;
  const pdf = await PDFDocument.create();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvOblique = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const fonts = {
    serifBold: await pdf.embedFont(StandardFonts.TimesRomanBold),
    serifItalic: await pdf.embedFont(StandardFonts.TimesRomanItalic),
    serif: await pdf.embedFont(StandardFonts.TimesRoman),
    sans: helv,
  };
  const col = (k: { r: number; g: number; b: number }) => rgb(k.r, k.g, k.b);
  const navy = col(NAVY), gold = col(GOLD), ink = col(INK), muted = col(MUTED);

  let crestImage: any = null;
  try {
    const crest = await (opts.loadCrestImpl ?? ((u) => loadCrest(u)))(opts.brand.crestUrl);
    if (crest) crestImage = crest.format === "png" ? await pdf.embedPng(crest.bytes) : await pdf.embedJpg(crest.bytes);
  } catch (e) {
    console.warn("Archive PDF crest omitted:", e instanceof Error ? e.message : String(e));
    crestImage = null;
  }

  const A4 = { w: 595.28, h: 841.89 };
  const marginX = 50;
  const contentWidth = A4.w - marginX * 2;
  const pages: any[] = [];
  let page: any;
  let y = A4.h;
  const masthead = (opts.brand.masthead || "").trim();
  const drawHeader = () => {
    page = pdf.addPage([A4.w, A4.h]);
    pages.push(page);
    y = drawPdfLibBrandHeader(page, { rgb, fonts, identity: opts.brand, crestImage, title: masthead, subLine: "MONTHLY CHRONICLE & LABOURS", margin: marginX });
  };
  drawHeader();
  const newPageIfNeeded = (need: number) => { if (y - need < CONTENT_BOTTOM_Y) drawHeader(); };
  const wrapText = (text: string, font: any, size: number, maxWidth: number): string[] => {
    const lines: string[] = [];
    for (const rawPara of text.split(/\n/)) {
      const words = rawPara.split(/\s+/).filter(Boolean);
      if (words.length === 0) { lines.push(""); continue; }
      let line = "";
      for (const w of words) {
        const candidate = line ? `${line} ${w}` : w;
        if (font.widthOfTextAtSize(candidate, size) > maxWidth) {
          if (line) lines.push(line);
          line = w;
        } else line = candidate;
      }
      if (line) lines.push(line);
    }
    return lines;
  };
  const drawWrapped = (text: string, o: { font: any; size: number; color: any; lineHeight?: number }) => {
    const lh = o.lineHeight ?? o.size * 1.45;
    const lines = wrapText(text, o.font, o.size, contentWidth);
    for (const line of lines) {
      newPageIfNeeded(lh);
      const safe = line
        .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
        .replace(/\u2014/g, "—").replace(/[^\x00-\xFF]/g, "?");
      page.drawText(safe, { x: marginX, y: y - o.size, size: o.size, font: o.font, color: o.color });
      y -= lh;
    }
  };
  drawWrapped(opts.subject, { font: fonts.serifBold, size: 16, color: navy, lineHeight: 20 });
  y -= 6;
  drawWrapped(
    `Issued ${now.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })} · ${opts.audienceLabel} · ${opts.recipientCount} recipient${opts.recipientCount === 1 ? "" : "s"}`,
    { font: helvOblique, size: 9, color: muted, lineHeight: 12 },
  );
  y -= 10;
  for (const section of opts.content.sections) {
    // Heading travels with its rule and at least one body line.
    newPageIfNeeded(40);
    drawWrapped(section.heading || "Untitled section", { font: fonts.serifBold, size: 13, color: navy, lineHeight: 18 });
    newPageIfNeeded(8);
    page.drawLine({ start: { x: marginX, y: y - 2 }, end: { x: marginX + contentWidth, y: y - 2 }, thickness: 0.5, color: gold });
    y -= 10;
    for (const block of section.blocks || []) {
      if (block.type === "text") {
        const txt = (block.text || "").trim();
        if (!txt) continue;
        for (const para of txt.split(/\n{2,}/)) {
          drawWrapped(para, { font: helv, size: 10.5, color: ink, lineHeight: 14 });
          y -= 6;
        }
      } else if (block.type === "image" && block.url) {
        try {
          const ctrl = new AbortController();
          const limit = opts.imageTimeoutMs ?? IMAGE_FETCH_TIMEOUT_MS;
          let timer: number | undefined;
          const timedOut = new Promise<never>((_, rej) => {
            timer = setTimeout(() => { rej(new Error(`image fetch timed out after ${limit}ms`)); ctrl.abort(); }, limit) as unknown as number;
          });
          let ct = ""; let bytes: Uint8Array;
          try {
            [ct, bytes] = await Promise.race([
              (async () => {
                const res = await doFetch(block.url, { signal: ctrl.signal });
                if (!res.ok) throw new Error(`fetch ${res.status}`);
                return [(res.headers.get("content-type") || "").toLowerCase(), new Uint8Array(await res.arrayBuffer())] as [string, Uint8Array];
              })(),
              timedOut,
            ]);
          } finally { clearTimeout(timer); }
          const img = ct.includes("png") ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
          const maxW = contentWidth; const maxH = 260;
          const scale = Math.min(maxW / img.width, maxH / img.height, 1);
          const w = img.width * scale; const h = img.height * scale;
          newPageIfNeeded(h + (block.caption ? 18 : 6));
          page.drawImage(img, { x: marginX, y: y - h, width: w, height: h });
          y -= h + 4;
          if (block.caption) drawWrapped(block.caption, { font: helvOblique, size: 9, color: muted, lineHeight: 12 });
          y -= 6;
        } catch (e) {
          console.warn("PDF image embed failed:", block.url, e);
          drawWrapped(`[Image unavailable: ${block.url}]`, { font: helvOblique, size: 9, color: muted, lineHeight: 12 });
        }
      }
    }
    y -= 10;
  }
  // Closing line (wording unchanged) sits above the shared footer on the last page.
  newPageIfNeeded(30);
  const closing = `© ${now.getFullYear()} ${masthead} · ${(opts.brand.footerNote || "").trim()}`
    .replace(/[^\x00-\xFF]/g, "?");
  page.drawText(closing, { x: marginX, y: CONTENT_BOTTOM_Y - 22, size: 8, font: helv, color: muted });
  drawPdfLibBrandFooter(pages, { rgb, fonts, identity: opts.brand, margin: marginX });
  return await pdf.save();
}
