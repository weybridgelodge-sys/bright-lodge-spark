/** Year End stage 2 — auditor sign-off helpers (pure; no Supabase). */
export type AuditStatus = "draft" | "submitted" | "query" | "approved";
export type AuditorRole = "auditor_1" | "auditor_2";
export const AUDITOR_ROLES: AuditorRole[] = ["auditor_1", "auditor_2"];
export const AUDITOR_LABEL: Record<AuditorRole, string> = { auditor_1: "Auditor 1", auditor_2: "Auditor 2" };

export type YearSnapshot = {
  masonic_year: number;
  as_at: string;
  taken_at: string;
  income_expenditure: { income: number; expenditure: number; surplus: number };
  balance_sheet: { assets: number; liabilities: number; net_assets: number; fund_bf: number; surplus: number; total_funds: number };
  trial_balance: { debit: number; credit: number };
  accounts: { code: string; name: string; type: string; net: number }[];
};
export type Approval = {
  id: string; masonic_year: number; status: AuditStatus; round_number: number;
  figures_snapshot: YearSnapshot | null; submitted_at: string | null; submitted_by: string | null;
};
export type Signoff = {
  id: string; approval_id: string; round_number: number; officer_role: AuditorRole;
  signed_by: string; signed_at: string; decision: "confirmed" | "query"; note: string | null;
};
export type Round = { id: string; approval_id: string; round_number: number; figures_snapshot: YearSnapshot; submitted_at: string; submitted_by: string | null; outcome: "query" | "approved" | null };

export const STATUS_LABEL: Record<AuditStatus, string> = {
  draft: "Draft",
  submitted: "Submitted, awaiting sign-off",
  query: "Query raised",
  approved: "Approved, ready to close",
};

export const statusOf = (a: Approval | null | undefined): AuditStatus => a?.status ?? "draft";
export const canSubmit = (s: AuditStatus) => s === "draft" || s === "query";
export const canClose = (s: AuditStatus) => s === "approved";

/** Sign-offs for the approval's current round only. */
export const currentRound = (a: Approval, sigs: Signoff[]) =>
  sigs.filter((s) => s.approval_id === a.id && s.round_number === a.round_number);

/** What a given auditor should see for this approval. */
export function auditorView(a: Approval, sigs: Signoff[], myRoles: AuditorRole[]):
  { kind: "none" } | { kind: "act"; role: AuditorRole } | { kind: "signed"; signoff: Signoff } {
  const mine = currentRound(a, sigs).find((s) => myRoles.includes(s.officer_role));
  if (mine && a.status !== "draft") return { kind: "signed", signoff: mine };
  if (a.status !== "submitted") return { kind: "none" };
  const role = myRoles.find((r) => !currentRound(a, sigs).some((s) => s.officer_role === r));
  return role ? { kind: "act", role } : { kind: "none" };
}

/** Mirrors the database trigger: any query -> query; both confirmed -> approved. */
export function nextStatus(a: Approval, sigs: Signoff[]): AuditStatus {
  if (a.status !== "submitted") return a.status;
  const round = currentRound(a, sigs);
  if (round.some((s) => s.decision === "query")) return "query";
  const confirmed = new Set(round.filter((s) => s.decision === "confirmed").map((s) => s.officer_role));
  return confirmed.size >= 2 ? "approved" : "submitted";
}

export const confirmWording = (year: number) =>
  `By confirming, you are certifying that you have examined the accounts for the year ended 30 September ${year + 1} and believe them accurate. This is recorded against your name and cannot be undone.`;
