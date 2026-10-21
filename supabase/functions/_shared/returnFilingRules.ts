// Pure rules for lodge return emails (unit-tested in src/test/returnFiling.test.ts).

export type CcCandidate = {
  office: "secretary" | "worshipful_master";
  memberId: string | null;
  /** Lodge role address for the office, if the lodge settings hold one. */
  roleEmail?: string | null;
  /** The member's own portal email (profiles.email). */
  memberEmail?: string | null;
};
export type CcUsed = { office: CcCandidate["office"]; address: string; source: "role" | "member" };

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
const valid = (s: string) => /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/.test(s);

/** Pure: vacant offices skipped; one Cc per person and per address; never the To address. */
export function pickReturnCc(to: string, candidates: CcCandidate[]): { cc: string[]; used: CcUsed[] } {
  const seenMembers = new Set<string>();
  const seen = new Set<string>([norm(to)]);
  const used: CcUsed[] = [];
  for (const c of candidates) {
    if (!c.memberId) continue; // vacant office
    if (seenMembers.has(c.memberId)) continue; // one person holding both offices
    seenMembers.add(c.memberId);
    const role = norm(c.roleEmail);
    const own = norm(c.memberEmail);
    const [address, source] = role && valid(role) ? [role, "role" as const] : own && valid(own) ? [own, "member" as const] : ["", "member" as const];
    if (!address || seen.has(address)) continue;
    seen.add(address);
    used.push({ office: c.office, address, source });
  }
  return { cc: used.map((u) => u.address), used };
}

/** Pure: dated document title, e.g. "Provincial Installation Return 2026/27 (sent 21 Oct 2026)". */
export function returnDocumentTitle(formLabel: string, lodgeYear: number, sentAt: Date): string {
  const yearLabel = `${lodgeYear}/${String(lodgeYear + 1).slice(2)}`;
  const d = sentAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });
  return `${formLabel} ${yearLabel} (sent ${d})`;
}

/** Pure: where the sent copy lives in the Documents bucket. Same source file → same path (no duplicates). */
export function returnDocumentPath(formKey: string, lodgeYear: number, sourcePath: string): string {
  const base = sourcePath.split("/").pop() ?? "return.pdf";
  return `returns/${formKey}/${lodgeYear}/${base}`;
}

