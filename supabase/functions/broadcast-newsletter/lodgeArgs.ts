// Pure per-request lodge helpers for broadcast-newsletter. Every value comes from the
// LodgeSettings argument; no module-level lodge state, so concurrent requests never mix.
import type { LodgeSettings } from "../_shared/lodgeSettingsResolve.ts";
import { newsletterBrandFrom, type NewsletterBrand } from "../_shared/newsletterBrand.ts";

export const brandFor = (lodge: LodgeSettings): NewsletterBrand => newsletterBrandFrom(lodge);

export const senderFields = (lodge: LodgeSettings, fromAddress: (l: LodgeSettings) => string) => ({
  from: fromAddress(lodge),
  reply_to: lodge.communicationsEmail,
});

export const archiveFileStem = (lodge: LodgeSettings): string =>
  (lodge.senderName ?? "").split(/\s+/)[0].replace(/[^A-Za-z0-9]/g, "");
