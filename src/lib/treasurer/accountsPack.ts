/** Year End stage 3 — accounts pack content selection (pure; no Supabase). */
import type { Approval, Round, Signoff, YearSnapshot } from "./yearAudit";

export type PackSource = {
  draft: boolean;
  snap: YearSnapshot;
  remarks: string | null;
  round: number | null;
  /** Confirmed sign-offs for the certified round (approved only). */
  certifiers: Signoff[];
};

/**
 * Approved year -> the approved round's frozen figures and remarks, plus its sign-offs.
 * Anything else -> live figures and the current draft remarks, marked DRAFT.
 */
export function selectPackSource(opts: {
  approval: (Approval & { treasurer_remarks?: string | null }) | null | undefined;
  rounds: (Round & { treasurer_remarks?: string | null })[];
  sigs: Signoff[];
  live: YearSnapshot | null;
}): PackSource {
  const { approval: a, rounds, sigs, live } = opts;
  if (a?.status === "approved") {
    const r = rounds.find((x) => x.approval_id === a.id && x.round_number === a.round_number);
    const snap = r?.figures_snapshot ?? a.figures_snapshot;
    if (!snap) throw new Error("Approved round snapshot is missing");
    return {
      draft: false, snap, remarks: r?.treasurer_remarks ?? null, round: a.round_number,
      certifiers: sigs.filter((s) => s.approval_id === a.id && s.round_number === a.round_number && s.decision === "confirmed")
        .sort((x, y) => x.officer_role.localeCompare(y.officer_role)),
    };
  }
  if (!live) throw new Error("Live figures are required for a draft pack");
  return { draft: true, snap: live, remarks: a?.treasurer_remarks ?? null, round: null, certifiers: [] };
}

/** The frozen remarks for the approval's current round (shown once submitted). */
export function frozenRemarks(a: Approval | null | undefined, rounds: (Round & { treasurer_remarks?: string | null })[]): string | null {
  if (!a || a.status === "draft") return null;
  return rounds.find((r) => r.approval_id === a.id && r.round_number === a.round_number)?.treasurer_remarks ?? null;
}

export type PackLine = { code: string; name: string; amount: number };
/** Natural-sign statement lines from a snapshot (accounts.net = debit − credit). */
export function packStatements(snap: YearSnapshot) {
  const by = (t: string, sign: 1 | -1): PackLine[] =>
    (snap.accounts ?? []).filter((a) => a.type === t).map((a) => ({ code: a.code, name: a.name, amount: sign * a.net }));
  return { income: by("income", -1), expense: by("expense", 1), assets: by("asset", 1), liabilities: by("liability", -1) };
}

export const certifiedPackPath = (year: number, round: number) =>
  `year-end-accounts/FY${year}-${year + 1}-round-${round}-certified.pdf`;

export type CompLine = { code: string; name: string; cur: number; pri: number | null };
/** Merge current and prior statement lines by account code (prior null when no comparative). */
export function packComparative(snap: YearSnapshot) {
  const cur = packStatements(snap);
  const pri = snap.comparative ? packStatements(snap.comparative as YearSnapshot) : null;
  const merge = (k: keyof typeof cur): CompLine[] => {
    const m = new Map<string, CompLine>();
    for (const l of cur[k]) m.set(l.code, { code: l.code, name: l.name, cur: l.amount, pri: pri ? 0 : null });
    for (const l of pri?.[k] ?? []) {
      const e = m.get(l.code);
      if (e) e.pri = l.amount; else m.set(l.code, { code: l.code, name: l.name, cur: 0, pri: l.amount });
    }
    return [...m.values()].sort((a, b) => a.code.localeCompare(b.code));
  };
  return { income: merge("income"), expense: merge("expense"), assets: merge("assets"), liabilities: merge("liabilities"), hasPrior: !!pri };
}
