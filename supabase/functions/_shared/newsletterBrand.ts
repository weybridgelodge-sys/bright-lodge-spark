// Newsletter header/footer HTML (Batch C 3d). Pure: used by broadcast-newsletter (sent email)
// and NewsletterHub (in-portal preview) so both show the same thing.
// Navy crest on white from Unit Setup (blank = image omitted), lodge name/number/province,
// then the Unit Setup newsletter masthead as a navy serif title line. No host literals.
import { BRAND, BRAND_GOLD_DARK, brandFooterHtml, brandHeaderLines, type BrandIdentity } from "./transactional-email-templates/_brand.ts";

export type NewsletterBrand = BrandIdentity & {
  masthead?: string | null;
  footerNote?: string | null;
  siteUrl?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  twitterUrl?: string | null;
};

type SettingsLike = {
  crestImageUrl: string; lodgeName: string; lodgeNumber: string; provinceName: string;
  newsletterMasthead: string; newsletterFooterNote: string; siteUrl: string;
  facebookUrl: string; instagramUrl: string; twitterUrl: string;
};
export const newsletterBrandFrom = (l: SettingsLike): NewsletterBrand => ({
  crestUrl: l.crestImageUrl || null, lodgeName: l.lodgeName, lodgeNumber: l.lodgeNumber, provinceName: l.provinceName,
  masthead: l.newsletterMasthead, footerNote: l.newsletterFooterNote, siteUrl: l.siteUrl,
  facebookUrl: l.facebookUrl, instagramUrl: l.instagramUrl, twitterUrl: l.twitterUrl,
});

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const clean = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");
const SERIF = "Georgia,'Times New Roman',serif";

export function newsletterHeaderHtml(b: NewsletterBrand | null | undefined): string {
  const l = brandHeaderLines(b);
  const masthead = clean(b?.masthead);
  const img = l.crestUrl
    ? `<img src="${esc(l.crestUrl)}" width="120" height="120" alt="${esc(l.name ? `${l.name} crest` : "Lodge crest")}" style="display:block;margin:0 auto;width:120px;height:120px;object-fit:contain;border:0">`
    : "";
  const name = l.name ? `<h1 style="color:${BRAND.navy};font-family:${SERIF};font-size:24px;font-weight:700;margin:${l.crestUrl ? "12px 0 0" : "0"};letter-spacing:0.5px">${esc(l.name)}</h1>` : "";
  const sub = l.sub ? `<p style="color:${BRAND.muted};font-family:Arial,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:4px 0 0">${esc(l.sub)}</p>` : "";
  const title = masthead ? `<p style="color:${BRAND.navy};font-family:${SERIF};font-size:20px;line-height:1.2;margin:14px 0 0">${esc(masthead)}</p>` : "";
  const strap = `<p style="color:${BRAND.muted};font-family:Arial,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:4px 0 0">Monthly Chronicle &amp; Labours</p>`;
  return `<div style="border-top:4px solid ${BRAND.navy};text-align:center;padding:20px 24px 0;background-color:${BRAND.bg}">${img}${name}${sub}${title}${strap}<div style="border-top:2px solid ${BRAND.gold};width:120px;margin:14px auto 4px;line-height:0;font-size:0">&nbsp;</div></div>`;
}

const ICON = `display:inline-block;background:${BRAND.gold};color:${BRAND.navy};font-family:Arial,sans-serif;font-weight:bold;text-decoration:none;width:28px;height:28px;line-height:28px;border-radius:14px;text-align:center`;

/** unsubscribeUrl = per-recipient newsletter-preferences link (preview passes "#"). Blank social/site links are left out. */
export function newsletterFooterHtml(b: NewsletterBrand | null | undefined, unsubscribeUrl: string, year = new Date().getFullYear()): string {
  const masthead = clean(b?.masthead);
  const note = clean(b?.footerNote);
  const sender = masthead || brandHeaderLines(b).name || "the Lodge";
  const icons = ([
    [b?.instagramUrl, "IG", 11], [b?.facebookUrl, "f", 13], [b?.twitterUrl, "X", 12], [b?.siteUrl, "Web", 10],
  ] as const).filter(([u]) => clean(u))
    .map(([u, label, size]) => `<td style="padding:0 6px"><a href="${esc(clean(u))}" style="${ICON};font-size:${size}px">${label}</a></td>`).join("");
  const iconRow = icons ? `<table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 10px"><tr>${icons}</tr></table>` : "";
  const copy = ["&copy; " + year, [masthead, note].filter(Boolean).map(esc).join(" &middot; ")].filter(Boolean).join(" ");
  return `<div style="padding:18px 28px 8px;text-align:center;background-color:${BRAND.bg}">
    ${iconRow}
    <div style="color:${BRAND.muted};font-family:Arial,sans-serif;font-size:12px;padding:6px 0 4px;line-height:1.6">
      ${copy}<br>
      You're receiving this because ${esc(sender)} sends newsletters to members and visitors.
      <!-- The email API always appends its own mandatory unsubscribe footer (it cannot
           be suppressed), which opts the address out of ALL mail from this domain.
           This link is the newsletter-only alternative, deliberately NOT worded as a
           second "unsubscribe" so there is only one unsubscribe link in the email. -->
      To receive lodge summonses and booking confirmations but no further newsletters,
      <a href="${esc(unsubscribeUrl)}" style="color:${BRAND_GOLD_DARK};text-decoration:underline">change your newsletter preferences here</a>.
    </div>
    ${brandFooterHtml(b)}
  </div>`;
}
