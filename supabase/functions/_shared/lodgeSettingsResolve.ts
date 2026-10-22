// Pure part of lodgeSettings (unit-tested in src/test).
export const LODGE_FALLBACK = {
  siteUrl: "https://weybridgelodge.org.uk",
  senderName: "Weybridge Lodge",
  formalSenderName: "Weybridge Lodge No. 6787",
  secretaryEmail: "secretary@weybridgelodge.org.uk",
  membershipCcEmail: "membershipsecretary@weybridgelodge.org.uk",
  // No typed fallback: unknown = "" and callers word around it (see bookingContactEmail).
  assistantSecretaryEmail: "",
  webmasterEmail: "webmaster@weybridgelodge.org.uk",
  communicationsEmail: "communications@weybridgelodge.org.uk",
  lodgePostcode: "GU2 4DR",
  // Unit Setup (unit_settings) values; fallbacks = the values typed before Unit Setup.
  provinceName: "Province of Surrey",
  facebookUrl: "https://facebook.com/people/Weybridge-Lodge-No-6787/61551808420513/",
  instagramUrl: "https://instagram.com/weybridgelodge/",
  twitterUrl: "https://twitter.com/weybridgelodge",
  newsletterMasthead: "Weybridge Lodge No. 6787",
  newsletterFooterNote: "Guildford Masonic Centre, GU2 4DR",
  calendarName: "Weybridge Lodge No. 6787",
  meetingVenue: "Guildford Masonic Centre",
  provincialReturnFile: "L6787-Provincial-Return-{year}",
  installationReturnFile: "Installation-Return-6787-{year}",
} as const;

export type LodgeSettings = { -readonly [K in keyof typeof LODGE_FALLBACK]: string } & { bookingContactEmail: string };

type Row = Record<string, string | null | undefined> | null | undefined;
/** unit_settings rows keyed by setting key. */
export type UnitSettingsMap = Record<string, Record<string, unknown> | null | undefined> | null | undefined;
const pick = (v: unknown, fb: string) => (typeof v === "string" && v.trim() ? v.trim() : fb);

export function resolveLodgeSettings(row: Row, us?: UnitSettingsMap): LodgeSettings {
  const f = LODGE_FALLBACK;
  const u = (k: string, _f?: string) => (us?.[k] ?? {}) as Record<string, unknown>;
  return {
    siteUrl: pick(row?.site_url, f.siteUrl).replace(/\/+$/, ""),
    senderName: pick(row?.sender_name, f.senderName),
    formalSenderName: pick(row?.formal_sender_name, f.formalSenderName),
    secretaryEmail: pick(row?.secretary_email, f.secretaryEmail),
    membershipCcEmail: pick(row?.membership_cc_email, f.membershipCcEmail),
    assistantSecretaryEmail: pick(row?.assistant_secretary_email, f.assistantSecretaryEmail),
    webmasterEmail: pick(row?.webmaster_email, f.webmasterEmail),
    communicationsEmail: pick(row?.communications_email, f.communicationsEmail),
    lodgePostcode: pick(row?.lodge_postcode, f.lodgePostcode),
    // Unit Setup booking_contact_email (null/blank = not set), else the Assistant Secretary's lodge address, else "".
    bookingContactEmail: pick(u("booking_contact_email", "").email, pick(row?.assistant_secretary_email, "")),
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

