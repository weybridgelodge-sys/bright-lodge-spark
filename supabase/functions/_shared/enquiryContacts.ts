// Enquiry recipients/guide link, read from lodge_contact_settings. Fallbacks are
// neutral (blank): never a host-lodge value; callers skip blank recipients/links.

export const ENQUIRY_CONTACT_FALLBACK = {
  secretaryEmail: "",
  membershipCcEmail: "",
  guideUrl: "",
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
