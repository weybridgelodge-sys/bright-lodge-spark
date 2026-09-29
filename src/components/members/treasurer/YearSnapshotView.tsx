import { acct, fmtDate } from "@/lib/treasurer/reports";
import type { YearSnapshot } from "@/lib/treasurer/yearAudit";

const Row = ({ k, v, strong }: { k: string; v: number; strong?: boolean }) => (
  <>
    <dt className={strong ? "text-gold font-semibold" : "text-primary-foreground/70"}>{k}</dt>
    <dd className={`text-right tabular-nums ${strong ? "text-gold font-semibold" : ""}`}>{acct(v)}</dd>
  </>
);

/** Figures exactly as submitted for audit — never live. */
export default function YearSnapshotView({ snap, round }: { snap: YearSnapshot; round?: number }) {
  const ie = snap.income_expenditure, bs = snap.balance_sheet, tb = snap.trial_balance;
  return (
    <div className="min-w-0 space-y-4 text-sm font-sans">
      <p className="rounded border border-gold/30 bg-gold/10 px-3 py-2 text-xs text-gold">
        Submitted snapshot{round ? ` · round ${round}` : ""} · taken {fmtDate(snap.taken_at.slice(0, 10))} · as at {fmtDate(snap.as_at)}.
        These figures do not change if the ledger is edited later.
      </p>
      <section>
        <h4 className="font-serif text-gold mb-1">Income &amp; Expenditure</h4>
        <dl className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1">
          <Row k="Total income" v={ie.income} />
          <Row k="Total expenditure" v={ie.expenditure} />
          <Row k={ie.surplus >= 0 ? "Surplus for the year" : "Deficit for the year"} v={ie.surplus} strong />
        </dl>
      </section>
      <section>
        <h4 className="font-serif text-gold mb-1">Balance Sheet</h4>
        <dl className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1">
          <Row k="Assets" v={bs.assets} />
          <Row k="Liabilities" v={bs.liabilities} />
          <Row k="Net assets" v={bs.net_assets} strong />
          <Row k="General Fund brought forward" v={bs.fund_bf} />
          <Row k="Surplus/(deficit) for the year" v={bs.surplus} />
          <Row k="Total funds" v={bs.total_funds} strong />
        </dl>
      </section>
      <p className="text-xs text-primary-foreground/60">
        Trial balance: Dr {acct(tb.debit)} · Cr {acct(tb.credit)} {tb.debit === tb.credit ? "· balanced" : "· OUT OF BALANCE"}
      </p>
      {snap.accounts?.length ? (
        <details>
          <summary className="cursor-pointer text-gold text-xs min-h-[48px] flex items-center">Account balances ({snap.accounts.length})</summary>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-xs mt-1">
            <tbody>
              {snap.accounts.map((a) => {
                const natural = a.type === "asset" || a.type === "expense" ? a.net : -a.net;
                return (
                  <tr key={a.code} className="border-b border-gold/10">
                    <td className="py-1 font-mono">{a.code}</td>
                    <td className="py-1">{a.name}</td>
                    <td className="py-1 capitalize text-primary-foreground/60">{a.type}</td>
                    <td className="py-1 text-right tabular-nums">{acct(natural)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </details>
      ) : null}
    </div>
  );
}
