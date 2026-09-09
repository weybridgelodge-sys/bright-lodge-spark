import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Download, Loader2 } from "lucide-react";
import {
  acct, fetchAccounts, fetchMovements, fmtDate, money,
  reportPdfDoc, reportSection, reportTable, shiftBackOneYear, signedBalance,
  treasurerYearBounds, treasurerYearContaining, type Account,
} from "@/lib/treasurer/reports";

type Row = { code: string; name: string; current: number; prior: number };

const today = () => new Date().toISOString().slice(0, 10);

export default function BalanceSheetReport({ canEdit }: { canEdit: boolean }) {
  const currentMasonicYear = useMemo(() => treasurerYearContaining(today()), []);
  const yearOptions = useMemo(() => [0, 1, 2, 3, 4].map((i) => currentMasonicYear - i), [currentMasonicYear]);

  const [mode, setMode] = useState<string>(String(currentMasonicYear));
  const [customDate, setCustomDate] = useState(today);

  const asAt = mode === "custom" ? customDate : treasurerYearBounds(Number(mode)).end;
  const priorAsAt = shiftBackOneYear(asAt);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [assets, setAssets] = useState<Row[]>([]);
  const [liabilities, setLiabilities] = useState<Row[]>([]);
  const [reserves, setReserves] = useState({ curBf: 0, curYtd: 0, priBf: 0, priYtd: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const accts = await fetchAccounts();
      const yearOf = (iso: string) => treasurerYearContaining(iso);
      const curYearStart = treasurerYearBounds(yearOf(asAt)).start;
      const priYearStart = treasurerYearBounds(yearOf(priorAsAt)).start;
      // day before the masonic-year start, for the brought-forward cumulative figure
      const dayBefore = (iso: string) => {
        const d = new Date(iso + "T00:00:00Z");
        d.setUTCDate(d.getUTCDate() - 1);
        return d.toISOString().slice(0, 10);
      };

      const [cum, priCum, curBfM, priBfM, curYtdM, priYtdM] = await Promise.all([
        fetchMovements(null, asAt),
        fetchMovements(null, priorAsAt),
        fetchMovements(null, dayBefore(curYearStart)),
        fetchMovements(null, dayBefore(priYearStart)),
        fetchMovements(curYearStart, asAt),
        fetchMovements(priYearStart, priorAsAt),
      ]);

      setAccounts(accts);

      const build = (type: "asset" | "liability") =>
        accts
          .filter((a) => a.account_type === type)
          .map((a) => ({
            code: a.code,
            name: a.name,
            current: signedBalance(type, cum.get(a.id)),
            prior: signedBalance(type, priCum.get(a.id)),
          }))
          .filter((r) => r.current !== 0 || r.prior !== 0);
      setAssets(build("asset"));
      setLiabilities(build("liability"));

      const generalFund = accts.find((a) => a.code === "3000");
      const surplus = (m: Map<string, any>) =>
        accts.reduce((total, a) => {
          if (a.account_type === "income") return total + signedBalance("income", m.get(a.id));
          if (a.account_type === "expense") return total - signedBalance("expense", m.get(a.id));
          return total;
        }, 0);

      setReserves({
        curBf: generalFund ? signedBalance("equity", curBfM.get(generalFund.id)) : 0,
        priBf: generalFund ? signedBalance("equity", priBfM.get(generalFund.id)) : 0,
        curYtd: surplus(curYtdM),
        priYtd: surplus(priYtdM),
      });
    } catch (e: any) {
      toast({ title: "Could not build report", description: e?.message, variant: "destructive" });
    }
    setLoading(false);
  }, [asAt, priorAsAt]);

  useEffect(() => { load(); }, [load]);

  const sum = (rows: Row[], k: "current" | "prior") => rows.reduce((a, r) => a + r[k], 0);
  const assetCur = sum(assets, "current"), assetPri = sum(assets, "prior");
  const liabCur = sum(liabilities, "current"), liabPri = sum(liabilities, "prior");
  const resCur = reserves.curBf + reserves.curYtd;
  const resPri = reserves.priBf + reserves.priYtd;
  const diffCur = assetCur - (liabCur + resCur);
  const diffPri = assetPri - (liabPri + resPri);
  const balanced = diffCur === 0 && diffPri === 0;

  const curLabel = fmtDate(asAt);
  const priLabel = fmtDate(priorAsAt);

  const exportPdf = async () => {
    try {
      const { doc, pageW, margin } = await reportPdfDoc("Balance Sheet", `As at ${curLabel} · comparative: ${priLabel}`);
      let y = 130;
      const head = [["Account", curLabel, priLabel]];

      y = reportSection(doc, pageW, margin, y, "Assets");
      y = reportTable(doc, margin, y, head, [
        ...assets.map((r) => [`${r.code} — ${r.name}`, acct(r.current), acct(r.prior)]),
        ["Total assets", acct(assetCur), acct(assetPri)],
      ]);

      y = reportSection(doc, pageW, margin, y, "Liabilities");
      y = reportTable(doc, margin, y, head, [
        ...liabilities.map((r) => [`${r.code} — ${r.name}`, acct(r.current), acct(r.prior)]),
        ["Total liabilities", acct(liabCur), acct(liabPri)],
      ]);

      y = reportSection(doc, pageW, margin, y, "Reserves");
      y = reportTable(doc, margin, y, head, [
        ["General Fund brought forward", acct(reserves.curBf), acct(reserves.priBf)],
        ["Surplus / (Deficit) for the year to date", acct(reserves.curYtd), acct(reserves.priYtd)],
        ["Total reserves", acct(resCur), acct(resPri)],
      ]);

      y = reportSection(doc, pageW, margin, y, "Balance Check");
      reportTable(doc, margin, y, head, [
        ["Total assets", acct(assetCur), acct(assetPri)],
        ["Total liabilities + reserves", acct(liabCur + resCur), acct(liabPri + resPri)],
        ["Difference", acct(diffCur), acct(diffPri)],
      ]);

      doc.save(`balance-sheet-${asAt}.pdf`);
    } catch (e: any) {
      toast({ title: "PDF export failed", description: e?.message, variant: "destructive" });
    }
  };

  const amountCls = (v: number) => (v < 0 ? "text-red-400" : "text-primary-foreground");

  const Section = ({ title, rows, totalLabel, tc, tp }: { title: string; rows: Row[]; totalLabel: string; tc: number; tp: number }) => (
    <div className="mt-5">
      <h3 className="font-serif text-gold mb-2">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-primary-foreground/60 border-b border-gold/20">
              <th className="text-left py-2 font-normal">Account</th>
              <th className="text-right py-2 font-normal">{curLabel}</th>
              <th className="text-right py-2 font-normal">{priLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={3} className="py-3 text-primary-foreground/50">No balances on either date.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.code} className="border-b border-gold/10">
                <td className="py-2 text-primary-foreground/85">{r.code} — {r.name}</td>
                <td className={`py-2 text-right tabular-nums ${amountCls(r.current)}`}>{acct(r.current)}</td>
                <td className={`py-2 text-right tabular-nums ${amountCls(r.prior)}`}>{acct(r.prior)}</td>
              </tr>
            ))}
            <tr className="border-t border-gold/30 font-semibold">
              <td className="py-2 text-gold">{totalLabel}</td>
              <td className={`py-2 text-right tabular-nums ${amountCls(tc)}`}>{acct(tc)}</td>
              <td className={`py-2 text-right tabular-nums ${amountCls(tp)}`}>{acct(tp)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-gold/20 bg-primary-foreground/5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg text-gold mb-1">Balance Sheet</h2>
            <p className="text-primary-foreground/60 text-sm">
              Cumulative balances to the chosen date. Reserves are derived (General Fund brought forward plus
              the year-to-date surplus or deficit) — no year-end closing entry is needed.
            </p>
          </div>
          <Button onClick={exportPdf} disabled={loading} className="bg-gold text-primary hover:bg-gold/90">
            <Download className="w-4 h-4 mr-1" /> Export PDF
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 mt-4">
          <div>
            <Label>As at</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    Masonic year end {treasurerYearBounds(y).label} ({fmtDate(treasurerYearBounds(y).end)})
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom date</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {mode === "custom" && (
            <div>
              <Label>As at date</Label>
              <Input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} />
            </div>
          )}
        </div>
        <p className="text-primary-foreground/50 text-xs mt-2">
          As at {curLabel} · comparative as at {priLabel}
        </p>

        {loading ? (
          <p className="text-primary-foreground/60 mt-4"><Loader2 className="w-4 h-4 mr-1 inline animate-spin" /> Building report…</p>
        ) : (
          <>
            <Section title="Assets" rows={assets} totalLabel="Total assets" tc={assetCur} tp={assetPri} />
            <Section title="Liabilities" rows={liabilities} totalLabel="Total liabilities" tc={liabCur} tp={liabPri} />

            <div className="mt-5">
              <h3 className="font-serif text-gold mb-2">Reserves</h3>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-gold/10">
                    <td className="py-2 text-primary-foreground/85">General Fund brought forward</td>
                    <td className={`py-2 text-right tabular-nums ${amountCls(reserves.curBf)}`}>{acct(reserves.curBf)}</td>
                    <td className={`py-2 text-right tabular-nums ${amountCls(reserves.priBf)}`}>{acct(reserves.priBf)}</td>
                  </tr>
                  <tr className="border-b border-gold/10">
                    <td className="py-2 text-primary-foreground/85">Surplus / (Deficit) for the year to date</td>
                    <td className={`py-2 text-right tabular-nums ${amountCls(reserves.curYtd)}`}>{acct(reserves.curYtd)}</td>
                    <td className={`py-2 text-right tabular-nums ${amountCls(reserves.priYtd)}`}>{acct(reserves.priYtd)}</td>
                  </tr>
                  <tr className="border-t border-gold/30 font-semibold">
                    <td className="py-2 text-gold">Total reserves</td>
                    <td className={`py-2 text-right tabular-nums ${amountCls(resCur)}`}>{acct(resCur)}</td>
                    <td className={`py-2 text-right tabular-nums ${amountCls(resPri)}`}>{acct(resPri)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-gold/30 pt-4">
              <p className="text-primary-foreground text-sm">
                Total assets: <span className="font-semibold tabular-nums">{acct(assetCur)}</span>
              </p>
              <p className="text-primary-foreground text-sm">
                Liabilities + reserves: <span className="font-semibold tabular-nums">{acct(liabCur + resCur)}</span>
              </p>
              {balanced ? (
                <p className="text-sm font-semibold text-emerald-400">Balanced</p>
              ) : (
                <p className="text-sm font-semibold text-red-400">
                  Out of balance by {money(diffCur !== 0 ? diffCur : diffPri)}
                </p>
              )}
            </div>
          </>
        )}
        {!canEdit && <p className="sr-only">Read only</p>}
        {accounts.length === 0 && !loading && (
          <p className="text-primary-foreground/50 text-xs mt-3">No chart of accounts found.</p>
        )}
      </section>
    </div>
  );
}
