export type WelfareRag = "red" | "amber" | "green";
const RANK: Record<WelfareRag, number> = { red: 0, amber: 1, green: 2 };

export type WelfareSortMember = {
  id: string;
  first_name?: string | null;
  preferred_name?: string | null;
  last_name?: string | null;
};

/** Welfare Board order: "worth a call?" badge first, then Red/Amber/Green, then surname, then first name. */
export function compareWelfareBoard(
  a: WelfareSortMember,
  b: WelfareSortMember,
  hasBadge: (id: string) => boolean,
  ragOf: (id: string) => WelfareRag,
): number {
  const ba = hasBadge(a.id) ? 0 : 1;
  const bb = hasBadge(b.id) ? 0 : 1;
  if (ba !== bb) return ba - bb;
  const ra = RANK[ragOf(a.id)] ?? 2;
  const rb = RANK[ragOf(b.id)] ?? 2;
  if (ra !== rb) return ra - rb;
  const opts = { sensitivity: "base" } as const;
  const l = (a.last_name?.trim() || "").localeCompare(b.last_name?.trim() || "", undefined, opts);
  if (l !== 0) return l;
  const fa = a.preferred_name?.trim() || a.first_name?.trim() || "";
  const fb = b.preferred_name?.trim() || b.first_name?.trim() || "";
  return fa.localeCompare(fb, undefined, opts);
}
