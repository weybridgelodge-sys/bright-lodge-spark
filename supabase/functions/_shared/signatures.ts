// Pure signature rules shared by the signature-* edge functions and unit tests.
// Never log image bytes, base64 or URLs from anything that uses this module.

export const SIGNATURE_BUCKET = "member-signatures";
export const SIGNATURE_MODULE_KEY = "officer_signatures";
export const MAX_SIGNATURE_BYTES = 200 * 1024;
export const MAX_SIGNATURE_W = 600;
export const MAX_SIGNATURE_H = 200;
export const MIN_SIGNATURE_SIDE = 8;

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function isPng(bytes: Uint8Array): boolean {
  if (bytes.length < 24) return false;
  return PNG_MAGIC.every((b, i) => bytes[i] === b);
}

/** Width/height from the PNG IHDR chunk (bytes 16–23, big-endian). */
export function pngSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (!isPng(bytes)) return null;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: dv.getUint32(16), height: dv.getUint32(20) };
}

export type ImageCheck = { ok: true; width: number; height: number } | { ok: false; error: string };

/** Server-side re-check of the browser-processed image. */
export function checkSignatureImage(bytes: Uint8Array): ImageCheck {
  if (!bytes.length) return { ok: false, error: "No image received." };
  if (bytes.length > MAX_SIGNATURE_BYTES) return { ok: false, error: "The signature image is too large (over 200 KB)." };
  const size = pngSize(bytes);
  if (!size) return { ok: false, error: "The signature must be a processed PNG image." };
  const { width, height } = size;
  if (width > MAX_SIGNATURE_W || height > MAX_SIGNATURE_H) return { ok: false, error: "The signature image is larger than 600 × 200 pixels." };
  if (width < MIN_SIGNATURE_SIDE || height < MIN_SIGNATURE_SIDE) return { ok: false, error: "The signature image is too small." };
  return { ok: true, width, height };
}

export type ActorRoles = { isAdmin: boolean; isSecretary: boolean; isCurrentWm: boolean };

/** May this actor manage (upload/remove) the target's signature? On-behalf = admin, Secretary or current WM in the same unit. */
export function canManageSignature(actorId: string, targetId: string, roles: ActorRoles, sameUnit: boolean): { allowed: boolean; onBehalf: boolean } {
  if (actorId === targetId) return { allowed: true, onBehalf: false };
  const officer = roles.isAdmin || roles.isSecretary || roles.isCurrentWm;
  return { allowed: officer && sameUnit, onBehalf: true };
}

/** Preview: the owner, or admin / Secretary / current WM in the same unit. */
export function canPreviewSignature(actorId: string, targetId: string, roles: ActorRoles, sameUnit: boolean): boolean {
  return canManageSignature(actorId, targetId, roles, sameUnit).allowed;
}

/** On-behalf actions need a non-empty consent note, a real date (not in the future) and the confirm tick. */
export function checkConsent(c: { note?: string | null; date?: string | null; confirmed?: boolean | null }, today: string): string | null {
  if (!c.note || !c.note.trim()) return "A consent note is required when acting for another member.";
  if (c.note.trim().length > 500) return "The consent note is too long.";
  if (!c.date || !/^\d{4}-\d{2}-\d{2}$/.test(c.date) || Number.isNaN(Date.parse(c.date))) return "A consent date is required.";
  if (c.date > today) return "The consent date cannot be in the future.";
  if (c.confirmed !== true) return "Please confirm the member agreed.";
  return null;
}

export const signaturePath = (unitId: string, memberId: string, signatureId: string) => `${unitId}/${memberId}/${signatureId}.png`;

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export type Placement = { office_key: "secretary" | "worshipful_master"; member_id: string; signature_id: string };
/**
 * Which signature goes on which line. Vacant office or no active signature → that line stays blank.
 * One placement (and one audit row) per office, even when one person holds both.
 */
export function resolvePlacements(holders: { secretary: string | null; worshipful_master: string | null }, active: Record<string, { id: string } | undefined>): Placement[] {
  const out: Placement[] = [];
  for (const office_key of ["secretary", "worshipful_master"] as const) {
    const m = holders[office_key];
    const s = m ? active[m] : undefined;
    if (m && s) out.push({ office_key, member_id: m, signature_id: s.id });
  }
  return out;
}

/** Installation date for the signature lines must fall inside that Masonic year (Sept–Aug window). */
export function validInstallDate(year: number, iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && iso >= `${year}-09-01` && iso < `${year + 1}-09-01`;
}
