// Pure part of lodgeSettings (unit-tested in src/test).
import { resolveBookingContact } from "./bookingContact.ts";
// Last-resort values used only when Unit Setup has no value (or the lookup fails).
// Deliberately NEUTRAL: never a host-lodge value. siteUrl stays a valid URL
// (RFC 2606 example.com) because callers build links/hosts from it.
export const LODGE_FALLBACK = {
  siteUrl: "https://example.com",
  senderName: "Your Lodge",
  formalSenderName: "Your Lodge",
  secretaryEmail: "",
  membershipCcEmail: "",
  // No typed fallback: unknown = "" and callers word around it (see bookingContactEmail).
  assistantSecretaryEmail: "",
  webmasterEmail: "",
  communicationsEmail: "",
  lodgePostcode: "",
  provinceName: "",
  facebookUrl: "",
  instagramUrl: "",
  twitterUrl: "",
  newsletterMasthead: "Your Lodge",
  newsletterFooterNote: "",
  calendarName: "Your Lodge",
  meetingVenue: "",
  provincialReturnFile: "Provincial-Return-{year}",
  installationReturnFile: "Installation-Return-{year}",
} as const;

export type LodgeSettings = { -readonly [K in keyof typeof LODGE_FALLBACK]: string } & { bookingContactEmail: string; bookingContactOffice: string; /** site_url as saved, "" when not set (no fallback). */ configuredSiteUrl: string; /** formal_sender_name as saved, "" when not set (no fallback). */ configuredFormalSenderName: string;
  /** Unit Setup crest_image url (https only), "" when not set: no fallback, callers omit the image. */ crestImageUrl: string;
  /** Lodge record name/number (get_lodge_identity sources), "" when not set: no fallback. */ lodgeName: string; lodgeNumber: string };

type Row = Record<string, string | null | undefined> | null | undefined;
/** unit_settings rows keyed by setting key. */
export type UnitSettingsMap = Record<string, Record<string, unknown> | null | undefined> | null | undefined;
const pick = (v: unknown, fb: string) => (typeof v === "string" && v.trim() ? v.trim() : fb);

/** officers.assistantSecretaryHeld: current_officer_holder("assistant_secretary") is not null. */
export function resolveLodgeSettings(row: Row, us?: UnitSettingsMap, officers?: { assistantSecretaryHeld?: boolean }, identity?: { lodgeName?: string | null; lodgeNumber?: string | null }): LodgeSettings {
  const f = LODGE_FALLBACK;
  const u = (k: string, _f?: string) => (us?.[k] ?? {}) as Record<string, unknown>;
  const bc = resolveBookingContact({
    explicitEmail: u("booking_contact_email", "").email,
    assistantSecretaryHeld: !!officers?.assistantSecretaryHeld,
    assistantSecretaryEmail: row?.assistant_secretary_email,
    secretaryEmail: row?.secretary_email,
  });
  return {
    siteUrl: pick(row?.site_url, f.siteUrl).replace(/\/+$/, ""),
    configuredSiteUrl: pick(row?.site_url, "").replace(/\/+$/, ""),
    crestImageUrl: ((v) => (/^https:\/\/\S+$/.test(v) ? v : ""))(pick(u("crest_image", "").url, "")),
    lodgeName: pick(identity?.lodgeName, pick(row?.sender_name, "")),
    lodgeNumber: pick(identity?.lodgeNumber, ""),
    senderName: pick(row?.sender_name, f.senderName),
    formalSenderName: pick(row?.formal_sender_name, f.formalSenderName),
    configuredFormalSenderName: pick(row?.formal_sender_name, ""),
    secretaryEmail: pick(row?.secretary_email, f.secretaryEmail),
    membershipCcEmail: pick(row?.membership_cc_email, f.membershipCcEmail),
    assistantSecretaryEmail: pick(row?.assistant_secretary_email, f.assistantSecretaryEmail),
    webmasterEmail: pick(row?.webmaster_email, f.webmasterEmail),
    communicationsEmail: pick(row?.communications_email, f.communicationsEmail),
    lodgePostcode: pick(row?.lodge_postcode, f.lodgePostcode),
    // Booking queries: see bookingContact.ts (Unit Setup, else held Assistant Secretary, else Secretary).
    bookingContactEmail: bc.email,
    bookingContactOffice: bc.office,
    provinceName: pick(u("province", "").name, f.provinceName),
    facebookUrl: pick(u("web_social", "").facebook_url, f.facebookUrl),
    instagramUrl: pick(u("web_social", "").instagram_url, f.instagramUrl),
    twitterUrl: pick(u("web_social", "").twitter_url, f.twitterUrl),
    newsletterMasthead: pick(u("newsletter", "").masthead, f.newsletterMasthead),
    newsletterFooterNote: pick(u("newsletter", "").footer_note, f.newsletterFooterNote),
    calendarName: pick(u("calendar_feed", "").name, f.calendarName),
    meetingVenue: pick(u("meeting_place", "").venue_name, f.meetingVenue),
    provincialReturnFile: pick(u("return_files", "").provincial, f.provincialReturnFile),
    installationReturnFile: pick(u("return_files", "").installation, f.installationReturnFile),
  };
}

/** Fill a file-name pattern like "L1234-Provincial-Return-{year}" and keep it filesystem-safe. */
export function returnFileName(pattern: string, year: string | number, ext: string): string {
  return `${pattern.replace(/\{year\}/g, String(year)).replace(/[\\/:*?"<>|]+/g, "-")}.${ext}`;
}

