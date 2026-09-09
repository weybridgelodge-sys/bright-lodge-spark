import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Download, Loader2 } from "lucide-react";
import { masonicYearBounds } from "@/lib/charity/queries";
import {
  acct, fetchAccounts, fetchMovements, fmtDate, money, reportPdfDoc, reportSection, reportTable,
  shiftBackOneYear, signedBalance, type Account,
} from "@/lib/treasurer/reports";

type Row = { code: string; name: string; current: number; prior: number };

const today = () => new Date().toISOString().slice(0, 10);

export default function IncomeExpenditureReport({ canEdit }: { canEdit: boolean }) {
  const currentMasonicYear = useMemo(() => {
    const iso = today();
    const y = Number(iso.slice(0, 4));
    return iso >= masonicYearBounds(y).start ? y : y - 1;
  }, []);
  const yearOptions = useMemo(
    () => [0, 1, 2, 3, 4].map((i) => currentMasonicYear - i),
    [currentMasonicYear],
  );

  const [mode, setMode] = useState<string>(String(currentMasonicYear));
  const [customStart, setCustomStart] = useState(() => masonicYearBounds(currentMasonicYear).start);
  const [customEnd, setCustomEnd] = useState(today);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [income, setIncome] = useState<Row[]>([]);
  const [expense, setExpense] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const period = useMemo(() => {
    if (mode === "custom") {
      return {
        label: `${fmtDate(customStart)} – ${fmtDate(customEnd)}`,
        start: customStart,
        end: customEnd,
        priorLabel: `${fmtDate(shiftBackOneYear(customStart))} – ${fmtDate(shiftBackOneYear(customEnd))}`,
        priorStart: shiftBackOneYear(customStart),
        priorEnd: shiftBackOneYear(customEnd),
      };
    }
    const y = Number(mode);
    const b = masonicYearBounds(y);
    const p = masonicYearBounds(y - 1);
    return { label: b.label, start: b.start, end: b.end, priorLabel: p.label, priorStart: p.start, priorEnd: p.end };
  }, [mode, customStart, customEnd]);

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
        `${period.label} · comparative: ${period.priorLabel}`,
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
            <h2 className="font-serif text-lg text-gold mb-1">Income &amp; Expenditure</h2>
            <p className="text-primary-foreground/60 text-sm">
              Net movement on every income and expenditure account, with the prior period shown alongside.
            </p>
          </div>
          <Button onClick={exportPdf} disabled={loading} className="bg-gold text-primary hover:bg-gold/90">
            <Download className="w-4 h-4 mr-1" /> Export PDF
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 mt-4">
          <div>
            <Label>Period</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>Masonic year {masonicYearBounds(y).label}</SelectItem>
                ))}
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {mode === "custom" && (
            <>
              <div>
                <Label>Start date</Label>
                <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
              </div>
              <div>
                <Label>End date</Label>
                <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
              </div>
            </>
          )}
        </div>
        <p className="text-primary-foreground/50 text-xs mt-2">
          {fmtDate(period.start)} – {fmtDate(period.end)} · comparative {fmtDate(period.priorStart)} – {fmtDate(period.priorEnd)}
        </p>

        {loading ? (
          <p className="text-primary-foreground/60 mt-4"><Loader2 className="w-4 h-4 mr-1 inline animate-spin" /> Building report…</p>
        ) : (
          <>
            <Section title="Income" rows={income} totalLabel="Total income" tc={incCur} tp={incPri} />
            <Section title="Expenditure" rows={expense} totalLabel="Total expenditure" tc={expCur} tp={expPri} />

            <div className="mt-6 border-t border-gold/30 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-serif text-gold">Surplus / (Deficit) for the year</p>
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
    </div>
  );
}
