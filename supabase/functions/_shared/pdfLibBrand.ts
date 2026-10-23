// Deno/pdf-lib twin of src/lib/pdfBrand (header/footer for PDFs built in edge functions).
// Navy crest on white from Unit Setup (12s timeout, downscaled to 400px, flattened on white,
// smaller of PNG/JPEG); any crest failure = image omitted, the PDF is still produced.
// Identity text via brandHeaderLines (same rules as the emails). No host literals.
import { brandHeaderLines, type BrandIdentity } from "./transactional-email-templates/_brand.ts";

export const CREST_FETCH_TIMEOUT_MS = 12_000;
export const CREST_PT = 100;
export const CREST_PX = 400;
export const HEADER_RULE_FROM_TOP = 132;
export const HEADER_START_FROM_TOP = 148;
export const FOOTER_RULE_Y = 40; // from the page bottom
export const CONTENT_BOTTOM_Y = 72; // body must stay above this

const c = (r: number, g: number, b: number) => ({ r: r / 255, g: g / 255, b: b / 255 });
export const NAVY = c(27, 42, 74);
export const GOLD = c(201, 164, 50); // rules/fills only
export const GOLD_DARK = c(110, 79, 12); // gold-toned text on white
export const INK = c(30, 30, 35);
export const MUTED = c(90, 90, 100);

export type ProcessedCrest = { bytes: Uint8Array; format: "png" | "jpg" };
type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/** Default processing: decode, downscale to CREST_PX, flatten on white, keep the smaller encoding. */
async function processCrestBytes(raw: Uint8Array): Promise<ProcessedCrest | null> {
  const { Image } = await import("npm:imagescript@1.3.0");
  const img: any = await Image.decode(raw);
  const s = Math.min(1, CREST_PX / Math.max(img.width || 1, img.height || 1));
  if (s < 1) img.resize(Math.max(1, Math.round(img.width * s)), Math.max(1, Math.round(img.height * s)));
  const bg: any = new Image(img.width, img.height);
  bg.fill(0xffffffff);
  bg.composite(img, 0, 0);
  const png: Uint8Array = await bg.encode();
  const jpg: Uint8Array = await bg.encodeJPEG(88);
  return jpg.length < png.length ? { bytes: jpg, format: "jpg" } : { bytes: png, format: "png" };
}

/** Never throws; null on blank/non-https URL, timeout, HTTP error, non-image or bad image. */
export async function loadCrest(
  url: string | null | undefined,
  opts: { fetchImpl?: FetchLike; timeoutMs?: number; process?: (b: Uint8Array) => Promise<ProcessedCrest | null> } = {},
): Promise<ProcessedCrest | null> {
  const u = brandHeaderLines({ crestUrl: url }).crestUrl;
  if (!u) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? CREST_FETCH_TIMEOUT_MS);
  try {
    const work = (async () => {
      const res = await (opts.fetchImpl ?? fetch)(u, { signal: ctrl.signal });
      if (!res.ok) { await res.body?.cancel().catch(() => {}); return null; }
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (ct && !ct.startsWith("image/")) { await res.body?.cancel().catch(() => {}); return null; }
      const raw = new Uint8Array(await res.arrayBuffer());
      return await (opts.process ?? processCrestBytes)(raw);
    })();
    const timeout = new Promise<null>((r) => ctrl.signal.addEventListener("abort", () => r(null)));
    return await Promise.race([work, timeout]);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

type Fonts = { serifBold: any; serifItalic: any; sans: any; serif: any };
const toRgb = (rgb: any, k: { r: number; g: number; b: number }) => rgb(k.r, k.g, k.b);

/** Draws the shared header on one page; returns the y (from the bottom) where content starts. */
export function drawPdfLibBrandHeader(page: any, o: {
  rgb: any; fonts: Fonts; identity: BrandIdentity; crestImage?: any | null; title: string; subLine?: string; margin?: number;
}): number {
  const { width: W, height: H } = page.getSize();
  const m = o.margin ?? 40;
  const l = brandHeaderLines(o.identity);
  page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: toRgb(o.rgb, NAVY) });
  let x = m;
  const top = 20;
  if (o.crestImage) {
    try {
      const s = CREST_PT / Math.max(o.crestImage.width || 1, o.crestImage.height || 1);
      const w = o.crestImage.width * s, h = o.crestImage.height * s;
      page.drawImage(o.crestImage, { x: m + (CREST_PT - w) / 2, y: H - top - CREST_PT + (CREST_PT - h) / 2, width: w, height: h });
      x = m + CREST_PT + 14;
    } catch { /* omit */ }
  }
  if (l.name) page.drawText(pdfSafe(l.name), { x, y: H - 50, size: 20, font: o.fonts.serifBold, color: toRgb(o.rgb, NAVY) });
  if (l.sub) page.drawText(pdfSafe(l.sub), { x, y: H - 63, size: 8, font: o.fonts.sans, color: toRgb(o.rgb, MUTED) });
  if (o.title) page.drawText(pdfSafe(o.title), { x, y: H - 88, size: 13, font: o.fonts.serifItalic, color: toRgb(o.rgb, GOLD_DARK) });
  if (o.subLine) page.drawText(pdfSafe(o.subLine), { x, y: H - 104, size: 9, font: o.fonts.sans, color: toRgb(o.rgb, MUTED) });
  page.drawLine({ start: { x: m, y: H - HEADER_RULE_FROM_TOP }, end: { x: W - m, y: H - HEADER_RULE_FROM_TOP }, thickness: 1.5, color: toRgb(o.rgb, GOLD) });
  return H - HEADER_START_FROM_TOP;
}

/** Footer on every page: navy rule, lodge name left, "Page x of y" right. */
export function drawPdfLibBrandFooter(pages: any[], o: { rgb: any; fonts: Fonts; identity: BrandIdentity; margin?: number }) {
  const m = o.margin ?? 40;
  const line = brandHeaderLines(o.identity).footer;
  pages.forEach((p, i) => {
    const { width: W } = p.getSize();
    p.drawLine({ start: { x: m, y: FOOTER_RULE_Y }, end: { x: W - m, y: FOOTER_RULE_Y }, thickness: 0.6, color: toRgb(o.rgb, NAVY) });
    if (line) p.drawText(pdfSafe(line), { x: m, y: FOOTER_RULE_Y - 12, size: 8, font: o.fonts.serif, color: toRgb(o.rgb, NAVY) });
    const t = `Page ${i + 1} of ${pages.length}`;
    p.drawText(t, { x: W - m - o.fonts.sans.widthOfTextAtSize(t, 8), y: FOOTER_RULE_Y - 12, size: 8, font: o.fonts.sans, color: toRgb(o.rgb, NAVY) });
  });
}

/** WinAnsi-safe text for the standard fonts. */
export function pdfSafe(s: string): string {
  return s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[^\x00-\xFF\u2014\u2013\u00B7]/g, "?");
}
