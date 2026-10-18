// Enquiry recipients/guide link, read from lodge_contact_settings with
// fallbacks equal to the values used before the settings table existed.

export const ENQUIRY_CONTACT_FALLBACK = {
  secretaryEmail: "secretary@weybridgelodge.org.uk",
  membershipCcEmail: "membershipsecretary@weybridgelodge.org.uk",
  guideUrl: "https://weybridgelodge.org.uk/downloads/information-for-prospective-members.pdf?v=2",
} as const;

export type EnquiryContacts = { secretaryEmail: string; membershipCcEmail: string; guideUrl: string };

type Row = { secretary_email?: string | null; membership_cc_email?: string | null; guide_url?: string | null } | null | undefined;

const pick = (v: string | null | undefined, fb: string) => (typeof v === "string" && v.trim() ? v.trim() : fb);

export function resolveEnquiryContacts(row: Row): EnquiryContacts {
  const f = ENQUIRY_CONTACT_FALLBACK;
  return {
    secretaryEmail: pick(row?.secretary_email, f.secretaryEmail),
    membershipCcEmail: pick(row?.membership_cc_email, f.membershipCcEmail),
    guideUrl: pick(row?.guide_url, f.guideUrl),
  };
}
