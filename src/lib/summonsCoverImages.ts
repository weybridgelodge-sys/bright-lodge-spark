// Summons cover image defaults from Unit Setup: logo = crest_image, award images =
// summons_cover_images {left_url, right_url}. Blank = no image. Never throws.
import { supabase } from "@/integrations/supabase/client";
import { CREST_IMAGE_UNIT_KEY, crestUrlFrom } from "@/lib/crestImage";
import { NO_IMAGE_DEFAULTS, type SummonsImageDefaults } from "@/lib/summons";

export const SUMMONS_COVER_UNIT_KEY = "summons_cover_images";

/** Accepts a public https:// address or a same-site path ("/..."); anything else = blank. */
export function coverImageUrl(v: unknown): string {
  const s = typeof v === "string" ? v.trim() : "";
  return /^(https:\/\/\S+|\/\S+)$/.test(s) ? s : "";
}

export function coverImageError(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return !s || coverImageUrl(s) ? null : "Enter a public https:// image address.";
}

export function imageDefaultsFrom(rows: { key: string; value: any }[] | null | undefined): SummonsImageDefaults {
  const by = Object.fromEntries((rows ?? []).map((r) => [r.key, r.value ?? {}]));
  const c = by[SUMMONS_COVER_UNIT_KEY] ?? {};
  return { logo: crestUrlFrom(by[CREST_IMAGE_UNIT_KEY]) ?? "", left: coverImageUrl(c.left_url), right: coverImageUrl(c.right_url) };
}

export async function loadSummonsImageDefaults(): Promise<SummonsImageDefaults> {
  try {
    const { data, error } = await supabase.from("unit_settings").select("key,value").in("key", [CREST_IMAGE_UNIT_KEY, SUMMONS_COVER_UNIT_KEY]);
    if (error) return NO_IMAGE_DEFAULTS;
    return imageDefaultsFrom(data as any);
  } catch {
    return NO_IMAGE_DEFAULTS;
  }
}
