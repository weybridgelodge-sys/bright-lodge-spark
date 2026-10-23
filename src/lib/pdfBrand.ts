// Shared jsPDF brand header/footer (Batch C). Navy crest from Unit Setup on white,
// thin navy band edge, gold accent rule under the title block, navy footer rule.
// Crest fetched with a timeout, cached for the run, omitted on any failure.
import type jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { CREST_IMAGE_UNIT_KEY, crestUrlFrom } from "@/lib/crestImage";
import { docSubtitle, docTitle, loadDocIdentity, type DocIdentity } from "@/lib/docIdentity";

// Print shorthand values from the Brand Identity Reference (PDF only; screens use theme tokens).
export const PRINT_NAVY: [number, number, number] = [27, 42, 74]; // #1B2A4A
export const PRINT_GOLD: [number, number, number] = [201, 164, 50]; // #C9A432 rules only
export const PRINT_GOLD_DARK: [number, number, number] = [110, 79, 12]; // #6E4F0C gold-toned text
export const PRINT_INK: [number, number, number] = [30, 30, 35];
export const PRINT_MUTED: [number, number, number] = [90, 90, 100];
export const CREST_FETCH_TIMEOUT_MS = 12_000;

export const CREST_PT = 100; // printed crest box (pt, square, aspect kept)
export const CREST_PX = 400; // processed pixels on the long side (~2x print size)
export const HEADER_RULE_Y = 132; // gold rule
export const HEADER_START_Y = 148; // content start

export type CrestImage = { dataUrl: string; format: "PNG" | "JPEG" };

/** Long side scaled to max px, aspect kept, never upscaled. */
export function crestTargetSize(w: number, h: number, max = CREST_PX) {
  const s = Math.min(1, max / Math.max(w || 1, h || 1));
  return { width: Math.max(1, Math.round((w || 1) * s)), height: Math.max(1, Math.round((h || 1) * s)) };
}

type Canvasish = { width: number; height: number; getContext(t: "2d"): any; toDataURL(type: string, q?: number): string };
export type ProcessDeps = {
  decode: (b: Blob) => Promise<{ width: number; height: number; close?: () => void }>;
  createCanvas: (w: number, h: number) => Canvasish;
};
const browserDeps = (): ProcessDeps => ({
  decode: (b) => createImageBitmap(b),
  createCanvas: (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c as unknown as Canvasish; },
});

/** Downscale, flatten onto white (no alpha → no SMask), keep the smaller of PNG / JPEG 0.92. Any failure = null. */
export async function processCrest(blob: Blob, deps?: ProcessDeps): Promise<CrestImage | null> {
  try {
    const d = deps ?? browserDeps();
    const bmp = await d.decode(blob);
    const { width, height } = crestTargetSize(bmp.width, bmp.height);
    const c = d.createCanvas(width, height);
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bmp, 0, 0, width, height);
    bmp.close?.();
    const png = c.toDataURL("image/png");
    const jpg = c.toDataURL("image/jpeg", 0.92);
    const okPng = png.startsWith("data:image/png"), okJpg = jpg.startsWith("data:image/jpeg");
    if (!okPng && !okJpg) return null;
    if (okJpg && (!okPng || jpg.length < png.length)) return { dataUrl: jpg, format: "JPEG" };
    return { dataUrl: png, format: "PNG" };
  } catch { return null; }
}
type FetchLike = (url: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; headers: { get(n: string): string | null }; blob(): Promise<Blob> }>;

/** One export run: each crest URL is fetched at most once; any failure (timeout, HTTP, type) = null. */
export function createPdfRun(opts: { timeoutMs?: number; fetchImpl?: FetchLike; process?: (b: Blob) => Promise<CrestImage | null> } = {}) {
  const proc = opts.process ?? ((b: Blob) => processCrest(b));
  const cache = new Map<string, Promise<CrestImage | null>>();
  const timeoutMs = opts.timeoutMs ?? CREST_FETCH_TIMEOUT_MS;
  const doFetch: FetchLike = opts.fetchImpl ?? ((u, i) => fetch(u, i as RequestInit));
  const crest = (url: string | null | undefined): Promise<CrestImage | null> => {
    const u = crestUrlFrom({ url });
    if (!u) return Promise.resolve(null);
    let p = cache.get(u);
    if (!p) {
      p = (async () => {
        const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          const timeout = new Promise<null>((r) => { timer = setTimeout(() => { ctl?.abort(); r(null); }, timeoutMs); });
          const got = await Promise.race([
            (async () => {
              const res = await doFetch(u, ctl ? { signal: ctl.signal } : undefined);
              if (!res.ok) return null;
              const type = (res.headers.get("content-type") ?? "").toLowerCase();
              if (!(type.includes("png") || type.includes("jpeg") || type.includes("jpg"))) return null;
              return await proc(await res.blob());
            })(),
            timeout,
          ]);
          return got;
        } catch { return null; } finally { if (timer) clearTimeout(timer); }
      })();
      cache.set(u, p);
    }
    return p;
  };
  return { crest };
}

/** Crest URL from Unit Setup (unit_settings crest_image); null when blank, invalid or unreadable. Never throws. */
export async function fetchCrestUrl(): Promise<string | null> {
  try {
    const { data } = await (supabase.from("unit_settings" as never) as any).select("value").eq("key", CREST_IMAGE_UNIT_KEY).maybeSingle();
    return crestUrlFrom(data?.value ?? null);
  } catch { return null; }
}

export type BrandHeaderOpts = { identity: DocIdentity; crest: CrestImage | null; title: string; periodLine?: string; rightLine?: string; margin?: number };

/** Draws the header on the current page; returns the y where content may start. */
export function drawBrandHeader(doc: jsPDF, o: BrandHeaderOpts): number {
  const pageW = doc.internal.pageSize.getWidth();
  const m = o.margin ?? 40;
  doc.setFillColor(...PRINT_NAVY);
  doc.rect(0, 0, pageW, 6, "F"); // slim navy band edge
  let x = m;
  const top = 20; // crest box top; text block centred on it
  if (o.crest) {
    try {
      const p = doc.getImageProperties(o.crest.dataUrl);
      const s = CREST_PT / Math.max(p.width || 1, p.height || 1);
      const w = (p.width || 1) * s, h = (p.height || 1) * s;
      doc.addImage(o.crest.dataUrl, o.crest.format, m + (CREST_PT - w) / 2, top + (CREST_PT - h) / 2, w, h, undefined, "FAST");
      x = m + CREST_PT + 14;
    } catch { /* bad image: omit, keep the rest */ }
  }
  const name = docTitle({ lodgeName: o.identity.lodgeName, lodgeNumber: "" });
  const sub = docSubtitle(o.identity);
  if (name) { doc.setFont("times", "bold"); doc.setFontSize(20); doc.setTextColor(...PRINT_NAVY); doc.text(name, x, 50); }
  if (sub) { doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...PRINT_MUTED); doc.text(sub, x, 63); }
  doc.setFont("times", "italic"); doc.setFontSize(13); doc.setTextColor(...PRINT_GOLD_DARK);
  doc.text(o.title, x, 88);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...PRINT_INK);
  if (o.rightLine) doc.text(o.rightLine, pageW - m, 104, { align: "right" });
  if (o.periodLine) {
    const lay = layoutPeriodLine(doc, o.periodLine, pageW - m - x, o.rightLine ? doc.getTextWidth(o.rightLine) : 0);
    doc.setFontSize(lay.fontSize);
    lay.lines.forEach((l, i) => doc.text(l, x, 104 + i * lay.leading));
    doc.setFontSize(9);
  }
  doc.setDrawColor(...PRINT_GOLD); doc.setLineWidth(1.5);
  doc.line(m, HEADER_RULE_Y, pageW - m, HEADER_RULE_Y); // gold accent rule
  return HEADER_START_Y;
}

export const PERIOD_GAP = 12; // minimum space between the period line and the right-hand line
const PERIOD_MAX_LINES = 3; // 104, 115, 126 — all above the gold rule at HEADER_RULE_Y

/**
 * Period line layout: one line when it fits beside the right-hand line; otherwise wrapped to the
 * width left of it (never overprints), stepping down to 8pt only if 3 lines at 9pt are not enough.
 */
export function layoutPeriodLine(doc: jsPDF, text: string, avail: number, rightW: number): { lines: string[]; fontSize: number; leading: number } {
  const width = Math.max(40, avail - (rightW ? rightW + PERIOD_GAP : 0));
  const prev = doc.getFontSize();
  let out = { lines: [text], fontSize: 9, leading: 11 };
  for (const fs of [9, 8]) {
    doc.setFontSize(fs);
    const lines = doc.splitTextToSize(text, width) as string[];
    out = { lines: lines.slice(0, PERIOD_MAX_LINES), fontSize: fs, leading: fs === 9 ? 11 : 10 };
    if (lines.length <= PERIOD_MAX_LINES) break;
  }
  doc.setFontSize(prev);
  return out;
}

/** Navy section heading in serif (no filled band). Returns next y. */
export function drawBrandSection(doc: jsPDF, y: number, title: string, margin = 40): number {
  doc.setFont("times", "bold"); doc.setFontSize(12); doc.setTextColor(...PRINT_NAVY);
  doc.text(title, margin, y + 12);
  return y + 22;
}

/** Thin navy rule + lodge name/number left, page x of y right, on every page. */
export function drawBrandFooter(doc: jsPDF, identity: DocIdentity, margin = 40, opts: { note?: string } = {}) {
  const n = doc.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth(), pageH = doc.internal.pageSize.getHeight();
  const line = docTitle(identity);
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setDrawColor(...PRINT_NAVY); doc.setLineWidth(0.6);
    doc.line(margin, pageH - 40, pageW - margin, pageH - 40);
    doc.setFont("times", "normal"); doc.setFontSize(8); doc.setTextColor(...PRINT_NAVY);
    if (line) doc.text(line, margin, pageH - 28);
    doc.setFont("helvetica", "normal");
    doc.text(`Page ${i} of ${n}`, pageW - margin, pageH - 28, { align: "right" });
    if (opts.note) {
      doc.setFont("times", "italic"); doc.setTextColor(...PRINT_MUTED);
      doc.text(opts.note, margin, pageH - 16, { maxWidth: pageW - margin * 2 });
    }
  }
}

/** Navy serif heading + thin gold rule (replaces the old filled navy band). Returns y + 32, the old band spacing. */
export function drawBrandSectionRule(doc: jsPDF, y: number, title: string, margin = 40): number {
  const pageW = doc.internal.pageSize.getWidth();
  const next = drawBrandSection(doc, y, title, margin);
  doc.setDrawColor(...PRINT_GOLD); doc.setLineWidth(0.6);
  doc.line(margin, next - 6, pageW - margin, next - 6);
  return y + 32;
}

export type PdfBrandDeps = { identity?: DocIdentity; crestUrl?: string | null; run?: ReturnType<typeof createPdfRun> };

/** Unit Setup crest + lodge identity for one PDF run; any crest failure gives null (image omitted). Never throws for the crest. */
export async function loadPdfBrand(deps: PdfBrandDeps = {}): Promise<{ identity: DocIdentity; crest: CrestImage | null }> {
  const [identity, crestUrl] = await Promise.all([
    deps.identity ? Promise.resolve(deps.identity) : loadDocIdentity(),
    deps.crestUrl !== undefined ? Promise.resolve(deps.crestUrl) : fetchCrestUrl(),
  ]);
  const crest = await (deps.run ?? createPdfRun()).crest(crestUrl).catch(() => null);
  return { identity, crest };
}
