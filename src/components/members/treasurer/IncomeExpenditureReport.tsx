import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Download, Loader2 } from "lucide-react";
import {
  acct, fetchAccounts, fetchMovements, fetchReportCalendar, fmtDate, money, reportPdfDoc, reportSection, reportTable,
  signedBalance, treasurerYearBounds, type Account,
} from "@/lib/treasurer/reports";
import {
  defaultBasis, ieComparative, ieRange, masonicYearOf, masonicYearOptions, ymOf,
  type CompareBasis, type IEKind,
} from "@/lib/treasurer/reportPeriods";
import AccountDrilldown, { DrillAccountRow, type DrillTarget } from "./AccountDrilldown";

type Row = { account: Account; code: string; name: string; current: number; prior: number };

const today = () => new Date().toISOString().slice(0, 10);

export default function IncomeExpenditureReport({ canEdit }: { canEdit: boolean }) {
  const currentMasonicYear = useMemo(() => masonicYearOf(today()), []);
  const [months, setMonths] = useState<{ ym: string; label: string }[]>([]);
  const [calDates, setCalDates] = useState<string[]>([]);
  useEffect(() => {
    fetchReportCalendar().then((c) => { setMonths(c.months); setCalDates(c.dates); }).catch(() => {});
  }, []);
  const yearOptions = useMemo(() => masonicYearOptions(currentMasonicYear, calDates), [currentMasonicYear, calDates]);
  const monthOptions = months.length ? months : [{ ym: ymOf(today()), label: ymOf(today()) }];

  const [kind, setKind] = useState<IEKind>("year");
  const [ym, setYm] = useState(ymOf(today()));
  const [year, setYear] = useState(currentMasonicYear);
  const [customStart, setCustomStart] = useState(() => treasurerYearBounds(currentMasonicYear).start);
  const [customEnd, setCustomEnd] = useState(today);
  const [basis, setBasis] = useState<CompareBasis>(defaultBasis("year"));
  const changeKind = (k: IEKind) => { setKind(k); setBasis(defaultBasis(k)); };

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [income, setIncome] = useState<Row[]>([]);
  const [expense, setExpense] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [drill, setDrill] = useState<DrillTarget | null>(null);

  const period = useMemo(() => {
    const sel = { kind, ym, year, customStart, customEnd };
    const cur = ieRange(sel);
    const pri = ieComparative(sel, basis);
    return { label: cur.label, start: cur.start, end: cur.end, priorLabel: pri.label, priorStart: pri.start, priorEnd: pri.end };
  }, [kind, ym, year, customStart, customEnd, basis]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [accts, cur, pri] = await Promise.all([
        fetchAccounts(),
        fetchMovements(period.start, period.end),
        fetchMovements(period.priorStart, period.priorEnd),
      ]);
      setAccounts(accts);
      const build = (type: "income" | "expense") =>
        accts
          .filter((a) => a.account_type === type)
          .map((a) => ({
            account: a,
            code: a.code,
            name: a.name,
            current: signedBalance(type, cur.get(a.id)),
            prior: signedBalance(type, pri.get(a.id)),
          }))
          .filter((r) => r.current !== 0 || r.prior !== 0);
      setIncome(build("income"));
      setExpense(build("expense"));
    } catch (e: any) {
      toast({ title: "Could not build report", description: e?.message, variant: "destructive" });
    }
    setLoading(false);
  }, [period.start, period.end, period.priorStart, period.priorEnd]);

  useEffect(() => { load(); }, [load]);

  const sum = (rows: Row[], k: "current" | "prior") => rows.reduce((a, r) => a + r[k], 0);
  const incCur = sum(income, "current"), incPri = sum(income, "prior");
  const expCur = sum(expense, "current"), expPri = sum(expense, "prior");
  const surCur = incCur - expCur, surPri = incPri - expPri;

  const exportPdf = async () => {
    try {
      const { doc, pageW, margin } = await reportPdfDoc(
        "Income & Expenditure Account",
        `${period.label} (${fmtDate(period.start)} – ${fmtDate(period.end)}) · comparative: ${period.priorLabel} (${fmtDate(period.priorStart)} – ${fmtDate(period.priorEnd)})`,
      );
      let y = 130;
      const head = [["Account", period.label, period.priorLabel]];

      y = reportSection(doc, pageW, margin, y, "Income");
      y = reportTable(doc, margin, y, head, [
        ...income.map((r) => [`${r.code} — ${r.name}`, acct(r.current), acct(r.prior)]),
        ["Total income", acct(incCur), acct(incPri)],
      ]);

      y = reportSection(doc, pageW, margin, y, "Expenditure");
      y = reportTable(doc, margin, y, head, [
        ...expense.map((r) => [`${r.code} — ${r.name}`, acct(r.current), acct(r.prior)]),
        ["Total expenditure", acct(expCur), acct(expPri)],
      ]);

      y = reportSection(doc, pageW, margin, y, "Result for the Period");
      reportTable(doc, margin, y, head, [
        ["Surplus / (Deficit)", acct(surCur), acct(surPri)],
      ]);

      doc.save(`income-expenditure-${period.label.replace(/[^\w]+/g, "-")}.pdf`);
    } catch (e: any) {
      toast({ title: "PDF export failed", description: e?.message, variant: "destructive" });
    }
  };

  const amountCls = (v: number) => (v < 0 ? "text-red-400" : "text-primary-foreground");
  const openDrill = (r: Row, which: "current" | "prior") =>
    setDrill({
      account: r.account,
      start: which === "current" ? period.start : period.priorStart,
      end: which === "current" ? period.end : period.priorEnd,
      periodLabel: which === "current" ? period.label : period.priorLabel,
      expected: r[which],
    });

  const Section = ({ title, rows, totalLabel, tc, tp }: { title: string; rows: Row[]; totalLabel: string; tc: number; tp: number }) => (
    <div className="mt-5">
      <h3 className="font-serif text-gold mb-2">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-primary-foreground/60 border-b border-gold/20">
              <th className="text-left py-2 font-normal">Account</th>
              <th className="text-right py-2 font-normal">{period.label}</th>
              <th className="text-right py-2 font-normal">{period.priorLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={3} className="py-3 text-primary-foreground/50">No activity in either period.</td></tr>
            )}
            {rows.map((r) => (
              <DrillAccountRow key={r.code} code={r.code} name={r.name} current={r.current} prior={r.prior}
                onCurrent={() => openDrill(r, "current")} onPrior={() => openDrill(r, "prior")} />
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
    <div className="space-y-6 overflow-x-hidden">
      <section className="rounded-lg border border-gold/20 bg-primary-foreground/5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg text-gold mb-1">Income &amp; Expenditure</h2>
            <p className="text-primary-foreground/60 text-sm">
              Net movement on every income and expenditure account, with a comparative period alongside. Click any account to see its transactions.
            </p>
          </div>
          <Button onClick={exportPdf} disabled={loading} className="bg-gold text-primary hover:bg-gold/90 min-h-[48px]">
            <Download className="w-4 h-4 mr-1" /> Export PDF
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mt-4">
          <div>
            <Label>Period type</Label>
            <Select value={kind} onValueChange={(v) => changeKind(v as IEKind)}>
              <SelectTrigger className="min-h-[48px]" aria-label="Period type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="ytd">Year to date</SelectItem>
                <SelectItem value="year">Masonic year</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(kind === "month" || kind === "ytd") && (
            <div>
              <Label>{kind === "ytd" ? "Up to end of" : "Month"}</Label>
              <Select value={ym} onValueChange={setYm}>
                <SelectTrigger className="min-h-[48px]" aria-label="Month"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {monthOptions.map((m) => <SelectItem key={m.ym} value={m.ym}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {kind === "year" && (
            <div>
              <Label>Masonic year</Label>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="min-h-[48px]" aria-label="Masonic year"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>Masonic year {treasurerYearBounds(y).label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {kind === "custom" && (
            <>
              <div>
                <Label>Start date</Label>
                <Input type="date" className="min-h-[48px]" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
              </div>
              <div>
                <Label>End date</Label>
                <Input type="date" className="min-h-[48px]" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
              </div>
            </>
          )}
          <div>
            <Label>Compare with</Label>
            <Select value={basis} onValueChange={(v) => setBasis(v as CompareBasis)}>
              <SelectTrigger className="min-h-[48px]" aria-label="Compare with"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="previous">{kind === "month" ? "Previous month" : kind === "custom" ? "Previous period" : "Previous period (prior year)"}</SelectItem>
                <SelectItem value="last_year">Same period last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-primary-foreground/50 text-xs mt-2">
          {period.label}: {fmtDate(period.start)} – {fmtDate(period.end)} · comparative {period.priorLabel}: {fmtDate(period.priorStart)} – {fmtDate(period.priorEnd)}
        </p>

        {loading ? (
          <p className="text-primary-foreground/60 mt-4"><Loader2 className="w-4 h-4 mr-1 inline animate-spin" /> Building report…</p>
        ) : (
          <>
            <Section title="Income" rows={income} totalLabel="Total income" tc={incCur} tp={incPri} />
            <Section title="Expenditure" rows={expense} totalLabel="Total expenditure" tc={expCur} tp={expPri} />

            <div className="mt-6 border-t border-gold/30 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-serif text-gold">Surplus / (Deficit) for the period</p>
                <div className="flex gap-6">
                  <p className={`text-lg font-semibold tabular-nums ${surCur < 0 ? "text-red-400" : "text-emerald-400"}`}>
                    {acct(surCur)} <span className="text-xs text-primary-foreground/50">{period.label}</span>
                  </p>
                  <p className={`text-lg font-semibold tabular-nums ${surPri < 0 ? "text-red-400" : "text-emerald-400"}`}>
                    {acct(surPri)} <span className="text-xs text-primary-foreground/50">{period.priorLabel}</span>
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
        {!canEdit && <p className="sr-only">Read only</p>}
        {accounts.length === 0 && !loading && (
          <p className="text-primary-foreground/50 text-xs mt-3">No chart of accounts found. {money(0)}</p>
        )}
      </section>
      <AccountDrilldown target={drill} onClose={() => setDrill(null)} />
    </div>
  );
}
