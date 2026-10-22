// Names on the Summons that come from member records, not typed text.
// Typed template text is a fallback only when no member is linked / flagged.
import { formatMemberLineFormal, type MemberRow } from "@/lib/summons";

type Rep = { role: string; name: string; member_id?: string | null };
type NamedTemplate = {
  lodge_representatives: Rep[];
  royal_arch_rep: string | null;
  royal_arch_rep_member_id?: string | null;
  honorary_members: string | null;
};

const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

/** Linked member → formal rank line; otherwise the typed name (non-member). */
export function derivedName(entry: { name?: string | null; member_id?: string | null }, byId: Record<string, MemberRow>): string {
  const p = entry.member_id ? byId[entry.member_id] : null;
  return p ? formatMemberLineFormal(p) : clean(entry.name);
}

/** Honorary members flagged on member records; typed text only when none are flagged. */
export function derivedHonorary(members: MemberRow[], typed: string | null | undefined): string {
  const flagged = members.filter((m) => m.is_honorary_member).map(formatMemberLineFormal);
  return flagged.length ? flagged.join("; ") : clean(typed);
}

export function applyDerivedNames<T extends NamedTemplate>(tpl: T, members: MemberRow[]): T {
  const byId = Object.fromEntries(members.map((m) => [m.id, m]));
  return {
    ...tpl,
    lodge_representatives: (tpl.lodge_representatives ?? []).map((r) => ({ ...r, name: derivedName(r, byId) })),
    royal_arch_rep: derivedName({ name: tpl.royal_arch_rep, member_id: tpl.royal_arch_rep_member_id }, byId) || null,
    honorary_members: derivedHonorary(members, tpl.honorary_members) || null,
  };
}
