// Unit Setup crest image: one public https URL (unit_settings key below), blank = no crest.
// Mirrors the save_unit_setup check '^https://[^\s]+$'.
export const CREST_IMAGE_UNIT_KEY = "crest_image";

export const normaliseCrestUrl = (v: string | null | undefined) => (v ?? "").trim();

export function crestUrlError(v: string | null | undefined): string | null {
  const s = normaliseCrestUrl(v);
  if (!s) return null;
  return /^https:\/\/\S+$/.test(s) ? null : "Enter a public https:// image address.";
}

/** Resolved crest URL, or null when none is set (callers then omit the image). */
export function crestUrlFrom(value: { url?: string | null } | null | undefined): string | null {
  const s = normaliseCrestUrl(value?.url);
  return s && !crestUrlError(s) ? s : null;
}
