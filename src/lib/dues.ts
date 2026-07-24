import { supabase } from "@/integrations/supabase/client";

export type DuesCalc = {
  annual_pence: number;
  final_pence: number;
  is_first_year: boolean;
  is_exempt: boolean;
  exempt_reason: string | null;
  meetings_total: number;
  meetings_actual_in_year: number;
  meetings_remaining: number;
  proration_pct: number;
  is_under_21: boolean;
  under_21_applied: boolean;
  dob_missing: boolean;
  joined_lodge_date: string | null;
  lodge_year: number;
  breakdown: string[];
};

export const gbp = (p: number) => `£${(p / 100).toFixed(2)}`;

export function currentLodgeYear(): number {
  const now = new Date();
  return now.getUTCMonth() >= 9 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

export async function fetchDuesCalc(memberId: string, lodgeYear = currentLodgeYear()): Promise<DuesCalc | null> {
  const { data, error } = await (supabase as any).rpc("dues_calculate_amount", {
    _member_id: memberId,
    _lodge_year: lodgeYear,
  });
  if (error) return null;
  return data as DuesCalc;
}

export type DuesSubscriptionRow = {
  id: string;
  member_id: string;
  lodge_year: number;
  plan: "lump_sum" | "monthly";
  method: "card" | "bacs";
  status: string;
  amount_pence: number;
  credit_balance_pence: number;
  stripe_subscription_id: string | null;
  next_payment_at?: string | null;
};

export type DuesPaymentRow = {
  id: string;
  subscription_id: string;
  member_id: string;
  type: "payment" | "refund";
  amount_pence: number;
  status: string;
  occurred_at: string;
};

export type DuesMemberSummary = {
  calc: DuesCalc | null;
  sub: DuesSubscriptionRow | null;
  payments: DuesPaymentRow[];
  paid_pence: number;
  refunded_pence: number;
  net_paid_pence: number;
  outstanding_pence: number;
  installments_paid: number;
  installments_total: number;
  needs_attention: boolean;
  attention_reason: string | null;
};

export async function fetchDuesSummaryForMember(memberId: string): Promise<DuesMemberSummary> {
  const ly = currentLodgeYear();
  const [calc, subRes, paysRes] = await Promise.all([
    fetchDuesCalc(memberId, ly),
    supabase.from("dues_subscriptions").select("*").eq("member_id", memberId).eq("lodge_year", ly).maybeSingle(),
    supabase.from("dues_payments").select("id,subscription_id,member_id,type,amount_pence,status,occurred_at")
      .eq("member_id", memberId).order("occurred_at", { ascending: false }),
  ]);
  const sub = (subRes.data as DuesSubscriptionRow | null) ?? null;
  const payments = ((paysRes.data as DuesPaymentRow[]) ?? []).filter(p => p.status === "succeeded");
  const paid = payments.filter(p => p.type === "payment").reduce((a, p) => a + p.amount_pence, 0);
  const refunded = payments.filter(p => p.type === "refund").reduce((a, p) => a + p.amount_pence, 0);
  const net = paid - refunded;
  const target = sub?.amount_pence ?? calc?.final_pence ?? 0;
  const outstanding = Math.max(0, target - net);
  const installments_total = sub?.plan === "monthly" ? 12 : sub?.plan === "lump_sum" ? 1 : 0;
  const installments_paid = sub?.plan === "monthly"
    ? payments.filter(p => p.type === "payment").length
    : (net >= target && target > 0 ? 1 : 0);

  let needs = false;
  let reason: string | null = null;
  if (calc?.is_exempt) {
    needs = false;
  } else if (target === 0) {
    needs = false;
  } else if (!sub) {
    needs = true;
    reason = "No dues plan set up yet";
  } else if (["past_due", "failed", "canceled"].includes(sub.status)) {
    needs = true;
    reason = `Subscription ${sub.status.replace("_", " ")}`;
  }

  return {
    calc, sub, payments,
    paid_pence: paid, refunded_pence: refunded, net_paid_pence: net,
    outstanding_pence: outstanding,
    installments_paid, installments_total,
    needs_attention: needs, attention_reason: reason,
  };
}
