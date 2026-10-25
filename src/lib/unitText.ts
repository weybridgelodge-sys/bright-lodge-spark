// Lodge wording for portal and booking screens, built from the unit profile
// (Unit Setup). Nothing lodge-specific is typed here; blanks give neutral text.
import { unitTitle, type UnitProfile } from "@/lib/unitProfile";

type P = Pick<UnitProfile, "lodgeName" | "lodgeNumber">;
const t = (v: string | undefined | null) => (v ?? "").trim();

/** Lodge name, or "Your Lodge". */
export const nameOr = (p: Pick<UnitProfile, "lodgeName">, fb = "Your Lodge") => t(p.lodgeName) || fb;
/** "<name> No. <number>", or the fallback. */
export const titleOr = (p: P, fb = "your lodge") => unitTitle(p) || fb;
/** Name without a trailing "Lodge" ("Example Lodge" -> "Example"), or the fallback. */
export const shortNameOr = (p: Pick<UnitProfile, "lodgeName">, fb = "Your Lodge") =>
  t(p.lodgeName).replace(/\s+Lodge$/i, "").trim() || fb;
/** "<name> <number>" (no "No."), or "Your Lodge". */
export const nameNumber = (p: P) => [t(p.lodgeName), t(p.lodgeNumber)].filter(Boolean).join(" ") || "Your Lodge";
/** Crest alt text. */
export const crestAlt = (p: Pick<UnitProfile, "lodgeName">) => (t(p.lodgeName) ? `${t(p.lodgeName)} crest` : "Lodge crest");
/** Site origin from Unit Setup (https only), else the current page origin. */
export function siteOriginOr(p: Pick<UnitProfile, "siteUrl">): string {
  const u = t(p.siteUrl).replace(/\/+$/, "");
  if (/^https:\/\/[^\s/]+$/.test(u)) return u;
  return typeof window !== "undefined" ? window.location.origin : "";
}
/** Public promo paragraph on event pages (approved wording, name filled in). */
export const eventPromo = (p: Pick<UnitProfile, "lodgeName" | "provinceName">) => {
  const prov = t(p.provinceName).replace(/^(the\s+)?province\s+of\s+/i, "");
  return `${nameOr(p)} is a friendly Masonic Lodge${prov ? ` in ${prov}` : ""}.`;
};
