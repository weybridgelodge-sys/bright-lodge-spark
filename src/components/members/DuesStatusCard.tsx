import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchDuesSummaryForMember, gbp, type DuesMemberSummary } from "@/lib/dues";
import { AlertTriangle, CheckCircle2, Info, ShieldCheck, Wallet } from "lucide-react";

type Props = { memberId: string; showTestBadge?: boolean };

export default function DuesStatusCard({ memberId, showTestBadge = true }: Props) {
  const [s, setS] = useState<DuesMemberSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchDuesSummaryForMember(memberId).then((r) => { if (!cancelled) { setS(r); setLoading(false); } });
    return () => { cancelled = true; };
  }, [memberId]);

  if (loading) return null;
  if (!s) return null;

  const { calc, sub, net_paid_pence, outstanding_pence, installments_paid, installments_total } = s;

  // Layout containers
  const wrap = "bg-navy-dark/60 border border-gold/15 rounded-sm p-6";
  const testBadge = showTestBadge ? (
    <span className="inline-block mt-2 text-[10px] uppercase tracking-wider text-amber-300 bg-amber-500/10 border border-amber-500/40 px-2 py-0.5 rounded">
      Test mode — sandbox only
    </span>
  ) : null;

  // Exempt
  if (calc?.is_exempt) {
    return (
      <section className={wrap}>
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4 text-gold" />
          <h2 className="font-serif text-lg text-gold">Annual dues</h2>
        </div>
        <p className="text-sm">
          <span className="text-emerald-300 font-semibold">£0 — Exempt as {calc.exempt_reason}.</span>
        </p>
        <p className="text-xs text-primary-foreground/60 mt-1">
          Members currently serving as Treasurer or Secretary are exempt from the annual subscription.
        </p>
        {testBadge}
      </section>
    );
  }

  // No plan
  if (!sub) {
    return (
      <section className={wrap}>
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="w-4 h-4 text-gold" />
          <h2 className="font-serif text-lg text-gold">Annual dues</h2>
        </div>
        <p className="text-sm text-amber-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          You haven't set up a dues plan for {calc?.lodge_year}/{(calc?.lodge_year ?? 0) + 1} yet.
        </p>
        {calc && (
          <div className="mt-3 text-xs text-primary-foreground/70 space-y-1">
            <p className="text-primary-foreground">Your amount: <span className="text-gold font-semibold">{gbp(calc.final_pence)}</span></p>
            {calc.breakdown.map((b, i) => <p key={i}>• {b}</p>)}
          </div>
        )}
        {testBadge}
      </section>
    );
  }

  const target = sub.amount_pence;
  const fullyPaid = outstanding_pence === 0 && net_paid_pence >= target && target > 0;
  const credit = sub.credit_balance_pence ?? 0;

  return (
    <section className={wrap}>
      <div className="flex items-center gap-2 mb-3">
        <Wallet className="w-4 h-4 text-gold" />
        <h2 className="font-serif text-lg text-gold">Annual dues</h2>
      </div>

      {fullyPaid ? (
        <p className="text-sm text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Fully paid — {gbp(net_paid_pence)} for {sub.lodge_year}/{sub.lodge_year + 1}.
        </p>
      ) : sub.plan === "monthly" ? (
        <div className="text-sm">
          <p>
            Paid <span className="text-gold font-semibold">{installments_paid} of {installments_total}</span> instalments
            {" — "}<span className="text-gold">{gbp(net_paid_pence)}</span> of {gbp(target)}.
          </p>
          {sub.next_payment_at && (
            <p className="text-xs text-primary-foreground/60 mt-1">
              Next collection: {new Date(sub.next_payment_at).toLocaleDateString("en-GB")}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm">
          Lump sum plan — paid {gbp(net_paid_pence)} of {gbp(target)}.
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
        <span className="px-2 py-0.5 rounded bg-navy-light/60 border border-gold/20">
          {sub.plan === "monthly" ? "Monthly" : "Lump sum"} · {sub.method === "bacs" ? "Bacs Direct Debit" : "Card"}
        </span>
        <span className={`px-2 py-0.5 rounded ${
          sub.status === "active" || sub.status === "completed"
            ? "bg-emerald-500/20 text-emerald-300"
            : sub.status === "past_due" || sub.status === "failed"
            ? "bg-red-500/20 text-red-300"
            : "bg-amber-500/20 text-amber-300"
        }`}>{sub.status}</span>
      </div>

      {credit > 0 && (
        <p className="text-xs text-emerald-300 mt-2 flex items-center gap-1">
          <Info className="w-3 h-3" /> Credit balance: {gbp(credit)}
        </p>
      )}

      {calc && calc.final_pence !== calc.annual_pence && (
        <div className="mt-3 border-t border-gold/10 pt-2 text-xs text-primary-foreground/70 space-y-1">
          <p className="text-primary-foreground">Why this amount:</p>
          {calc.breakdown.map((b, i) => <p key={i}>• {b}</p>)}
        </div>
      )}

      {testBadge}
    </section>
  );
}

/** Compact dashboard banner — only renders if the member needs to take action. */
export function DuesAttentionBanner({ memberId }: { memberId: string }) {
  const [s, setS] = useState<DuesMemberSummary | null>(null);
  useEffect(() => { fetchDuesSummaryForMember(memberId).then(setS); }, [memberId]);
  if (!s || !s.needs_attention) return null;

  return (
    <Link
      to="/members/profile"
      className="block mb-6 rounded-sm border border-amber-500/40 bg-amber-500/10 p-4 hover:bg-amber-500/15 transition-colors"
    >
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-200">Annual dues need your attention</p>
          <p className="text-xs text-amber-100/80">{s.attention_reason} — tap to view details.</p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded">
          Test mode
        </span>
      </div>
    </Link>
  );
}
