import QRCode from "qrcode";

export type QrStyle = "navy-on-white" | "white-on-navy";
export type Rgb = [number, number, number];
export type QrColours = { navy: Rgb; gold: Rgb; white: Rgb };

export const QUIET_ZONE = 4;
const BORDER = 2;

/** HSL token string ("220 40% 18%") to RGB. */
export function hslTokenToRgb(token: string): Rgb {
  const [h, s, l] = token.trim().replace(/%/g, "").split(/\s+/).map(Number);
  const S = s / 100, L = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = S * Math.min(L, 1 - L);
  const f = (n: number) => L - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

export function readTokenColours(): QrColours {
  const cs = getComputedStyle(document.documentElement);
  return {
    navy: hslTokenToRgb(cs.getPropertyValue("--navy-dark") || "220 45% 10%"),
    gold: hslTokenToRgb(cs.getPropertyValue("--gold") || "42 55% 55%"),
    white: [255, 255, 255],
  };
}

/** Renders the QR into an RGBA pixel buffer (square, ~targetPx wide). */
export function renderQrPixels(text: string, style: QrStyle, colours: QrColours, targetPx = 1600) {
  const qr = QRCode.create(text, { errorCorrectionLevel: "Q" });
  const n = qr.modules.size;
  // Both styles get the gold border outside the quiet zone.
  const border = BORDER;
  const units = n + QUIET_ZONE * 2 + border * 2;
  const scale = Math.max(1, Math.floor(targetPx / units));
  const size = units * scale;
  const data = new Uint8ClampedArray(size * size * 4);
  const [fg, bg] = style === "navy-on-white" ? [colours.navy, colours.white] : [colours.white, colours.navy];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const ux = Math.floor(x / scale), uy = Math.floor(y / scale);
      let c = bg;
      if (ux < border || uy < border || ux >= units - border || uy >= units - border) c = colours.gold;
      else {
        const mx = ux - border - QUIET_ZONE, my = uy - border - QUIET_ZONE;
        if (mx >= 0 && my >= 0 && mx < n && my < n && qr.modules.get(my, mx)) c = fg;
      }
      const i = (y * size + x) * 4;
      data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = 255;
    }
  }
  return { data, size };
}

export async function renderQrPng(text: string, style: QrStyle, colours = readTokenColours()): Promise<Blob> {
  const { data, size } = renderQrPixels(text, style, colours);
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  canvas.getContext("2d")!.putImageData(new ImageData(data, size, size), 0, 0);
  return new Promise((r) => canvas.toBlob((b) => r(b!), "image/png"));
}
