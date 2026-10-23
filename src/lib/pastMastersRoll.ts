// Past Masters roll (public.past_masters) as WM terms keyed by member — the
// only source for "first installed as WM" outside the public Worshipful
// Masters page. Rows without a linked member are skipped (never name-matched).
export type RollRow = { member_id?: string | null; lodge_year?: number | null };

export function pastMasterTerms(rows: unknown): { member_id: string; year_started: number }[] {
  if (!Array.isArray(rows)) return [];
  return (rows as RollRow[])
    .filter((r) => !!r?.member_id && typeof r.lodge_year === "number")
    .map((r) => ({ member_id: r.member_id as string, year_started: r.lodge_year as number }));
}
