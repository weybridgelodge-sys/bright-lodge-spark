// Pure part of lodgeSettings (unit-tested in src/test).
export const LODGE_FALLBACK = {
  siteUrl: "https://weybridgelodge.org.uk",
  senderName: "Weybridge Lodge",
  formalSenderName: "Weybridge Lodge No. 6787",
  secretaryEmail: "secretary@weybridgelodge.org.uk",
  membershipCcEmail: "membershipsecretary@weybridgelodge.org.uk",
  assistantSecretaryEmail: "assistantsecretary@weybridgelodge.org.uk",
  webmasterEmail: "webmaster@weybridgelodge.org.uk",
  communicationsEmail: "communications@weybridgelodge.org.uk",
} as const;

export type LodgeSettings = { -readonly [K in keyof typeof LODGE_FALLBACK]: string };

type Row = Record<string, string | null | undefined> | null | undefined;
const pick = (v: unknown, fb: string) => (typeof v === "string" && v.trim() ? v.trim() : fb);

export function resolveLodgeSettings(row: Row): LodgeSettings {
  const f = LODGE_FALLBACK;
  return {
    siteUrl: pick(row?.site_url, f.siteUrl).replace(/\/+$/, ""),
    senderName: pick(row?.sender_name, f.senderName),
    formalSenderName: pick(row?.formal_sender_name, f.formalSenderName),
    secretaryEmail: pick(row?.secretary_email, f.secretaryEmail),
    membershipCcEmail: pick(row?.membership_cc_email, f.membershipCcEmail),
    assistantSecretaryEmail: pick(row?.assistant_secretary_email, f.assistantSecretaryEmail),
    webmasterEmail: pick(row?.webmaster_email, f.webmasterEmail),
    communicationsEmail: pick(row?.communications_email, f.communicationsEmail),
  };
}

