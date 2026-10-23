// Newsletter preview brand: same sources as the sent email (broadcast-newsletter uses
// loadLodgeSettings -> newsletterBrandFrom). Crest from Unit Setup crest_image (blank = no image),
// masthead/footer note from unit_settings 'newsletter', social links from 'web_social'.
import { supabase } from "@/integrations/supabase/client";
import { loadDocIdentity } from "@/lib/docIdentity";
import { loadUnitProfile } from "@/lib/unitProfile";
import { resolveLodgeSettings } from "../../supabase/functions/_shared/lodgeSettingsResolve";
import { newsletterBrandFrom, type NewsletterBrand } from "../../supabase/functions/_shared/newsletterBrand";
import { brandHeaderLines } from "../../supabase/functions/_shared/transactional-email-templates/_brand";

export { newsletterHeaderHtml, newsletterFooterHtml, type NewsletterBrand } from "../../supabase/functions/_shared/newsletterBrand";

export type NewsletterPreviewBrand = { brand: NewsletterBrand; fromName: string; defaultSubject: string };

/** "<name> No. <n> — Monthly Chronicle & Labours"; just the strapline when identity is unknown. */
export const newsletterDefaultSubject = (b: NewsletterBrand | null | undefined) => {
  const t = brandHeaderLines(b).footer;
  return t ? `${t} — Monthly Chronicle & Labours` : "Monthly Chronicle & Labours";
};

export async function loadNewsletterBrand(): Promise<NewsletterPreviewBrand> {
  const [ident, profile, us] = await Promise.all([
    loadDocIdentity(),
    loadUnitProfile().catch(() => null),
    (supabase.from("unit_settings" as never) as any).select("key,value").in("key", ["newsletter", "web_social", "crest_image"]),
  ]);
  const map = Object.fromEntries(((us?.data ?? []) as { key: string; value: Record<string, unknown> }[]).map((r) => [r.key, r.value]));
  const l = resolveLodgeSettings({ site_url: profile?.siteUrl || null }, map, {}, ident);
  const brand = newsletterBrandFrom(l);
  return { brand, fromName: l.formalSenderName, defaultSubject: newsletterDefaultSubject(brand) };
}
