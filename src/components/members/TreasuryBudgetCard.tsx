import { useEffect, useState } from "react";
import { PiggyBank, Loader2 } from "lucide-react";
import { fetchBudgetSnapshot, type BudgetSnapshot } from "@/lib/treasurer/budget";

const gbpPence = (p: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(p / 100);
const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);

function Line({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={`text-xs ${muted ? "text-primary-foreground/50" : "text-primary-foreground/70"}`}>{label}</span>
      <span className={`text-sm tabular-nums ${muted ? "text-primary-foreground/60" : "text-primary-foreground"}`}>{value}</span>
    </div>
  );
}

export default function TreasuryBudgetCard() {
  const [snap, setSnap] = useState<BudgetSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchBudgetSnapshot()
      .then((s) => { if (!cancelled) setSnap(s); })
      .catch(() => { if (!cancelled) setSnap(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <section className="mb-6 bg-navy-dark/60 border border-gold/15 rounded-sm p-6">
        <p className="text-xs text-primary-foreground/50"><Loader2 className="w-3 h-3 mr-1 inline animate-spin" /> Loading treasury summary…</p>
      </section>
    );
  }
  if (!snap) return null;

  const pct = (actual: number, budget: number) => (budget > 0 ? `${Math.round((actual / budget) * 100)}% of budget` : null);

  return (
    <section className="mb-6 bg-navy-dark/60 border border-gold/15 rounded-sm p-6">
      <div className="flex items-center gap-2 mb-1">
        <PiggyBank className="w-4 h-4 text-gold" />
        <h2 className="font-serif text-lg text-gold">Treasury — {snap.lodgeYearLabel}</h2>
      </div>

      {!snap.quarter ? (
        <p className="text-xs text-primary-foreground/60 mt-2">
          No closed quarter yet this lodge year — figures appear once all three months of a quarter have been locked in Period Close.
        </p>
      ) : (
        <>
          <p className="text-[11px] uppercase tracking-wider text-gold/70 mb-4">
            Most recent closed quarter: {snap.quarter.label}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gold">Income</p>
              <Line label="Year to date actual" value={gbpPence(snap.incomeActualPence)} />
              <Line
                label="Annual budget"
                value={snap.budget ? gbpPence(snap.budget.income_budget_pence) : "—"}
                muted={!snap.budget}
              />
              {snap.budget && (
                <p className="text-[11px] text-primary-foreground/60">
                  {pct(snap.incomeActualPence, snap.budget.income_budget_pence) ?? "No budget figure set"}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gold">Expenditure</p>
              <Line label="Year to date actual" value={gbpPence(snap.expenditureActualPence)} />
              <Line
                label="Annual budget"
                value={snap.budget ? gbpPence(snap.budget.expenditure_budget_pence) : "—"}
                muted={!snap.budget}
              />
              {snap.budget && (
                <p className="text-[11px] text-primary-foreground/60">
                  {pct(snap.expenditureActualPence, snap.budget.expenditure_budget_pence) ?? "No budget figure set"}
                </p>
              )}
            </div>
          </div>
        </>
      )}

      <div className="mt-5 pt-4 border-t border-gold/10">
        <Line label="Relief Chest running balance" value={gbp(snap.reliefChestBalance)} />
      </div>

      {!snap.budget && (
        <p className="text-[11px] text-amber-300 mt-3">
          No annual budget set for {snap.lodgeYearLabel} — the Treasurer can add one on the Treasurer page, Budget tab.
        </p>
      )}
    </section>
  );
}
