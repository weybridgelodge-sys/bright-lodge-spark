// Signature image processing. Pure helpers (testable) + a canvas wrapper used in the browser.
// The result is always a fresh PNG (re-encoding strips EXIF/metadata).

export const SIG_MAX_W = 600;
export const SIG_MAX_H = 200;
export const SIG_INPUT_MAX_BYTES = 2 * 1024 * 1024;
export const SIG_INPUT_TYPES = ["image/png", "image/jpeg"];
export const DEFAULT_WHITE_THRESHOLD = 225;

/** Accept only PNG/JPEG up to 2 MB as an input file. Returns an error message or null. */
export function checkInputFile(f: { type: string; size: number }): string | null {
  if (!SIG_INPUT_TYPES.includes(f.type)) return "Please choose a PNG or JPEG image.";
  if (f.size > SIG_INPUT_MAX_BYTES) return "The image must be 2 MB or smaller.";
  return null;
}

/** Near-white pixels become fully transparent (in place). */
export function whiteToTransparent(data: Uint8ClampedArray, threshold = DEFAULT_WHITE_THRESHOLD): Uint8ClampedArray {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] >= threshold && data[i + 1] >= threshold && data[i + 2] >= threshold) data[i + 3] = 0;
  }
  return data;
}

/** Bounding box of visible ink (alpha > 0), or null when blank. */
export function inkBounds(data: Uint8ClampedArray, w: number, h: number): { x: number; y: number; w: number; h: number } | null {
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] > 0) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  return maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** Shrink (never enlarge) to fit within max bounds, aspect ratio kept. */
export function fitWithin(w: number, h: number, maxW = SIG_MAX_W, maxH = SIG_MAX_H): { w: number; h: number } {
  const s = Math.min(1, maxW / w, maxH / h);
  return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) };
}

/** Scale to fit a document signature box, aspect kept; left-aligned, vertically centred. */
export function fitInBox(w: number, h: number, boxW: number, boxH: number): { w: number; h: number; dx: number; dy: number } {
  const s = Math.min(boxW / w, boxH / h);
  const fw = w * s, fh = h * s;
  return { w: fw, h: fh, dx: 0, dy: (boxH - fh) / 2 };
}

/** Browser-only: process a drawn canvas or loaded image into a trimmed transparent PNG blob. */
export async function processToPng(source: CanvasImageSource, sw: number, sh: number, threshold = DEFAULT_WHITE_THRESHOLD): Promise<{ blob: Blob; width: number; height: number } | null> {
  const c = document.createElement("canvas");
  c.width = sw; c.height = sh;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0, sw, sh);
  const img = ctx.getImageData(0, 0, sw, sh);
  whiteToTransparent(img.data, threshold);
  const box = inkBounds(img.data, sw, sh);
  if (!box) return null;
  ctx.putImageData(img, 0, 0);
  const size = fitWithin(box.w, box.h);
  const out = document.createElement("canvas");
  out.width = size.w; out.height = size.h;
  out.getContext("2d")!.drawImage(c, box.x, box.y, box.w, box.h, 0, 0, size.w, size.h);
  const blob = await new Promise<Blob | null>((r) => out.toBlob(r, "image/png"));
  return blob ? { blob, width: size.w, height: size.h } : null;
}

export async function blobToBase64(b: Blob): Promise<string> {
  const buf = new Uint8Array(await b.arrayBuffer());
  let s = "";
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}
