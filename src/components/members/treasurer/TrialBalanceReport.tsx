import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Check, ChevronRight, Download, Loader2, AlertTriangle } from "lucide-react";
import autoTable from "jspdf-autotable";
import {
  GOLD, INK, NAVY, fetchAccounts, fetchLedgerLines, fetchReportCalendar, fmtDate, money, reportPdfDoc,
  treasurerYearBounds, type Account,
} from "@/lib/treasurer/reports";
import { bsAsAt, computeTrialBalance, masonicYearOf, masonicYearOptions, ymOf, type BSKind } from "@/lib/treasurer/reportPeriods";
import AccountDrilldown, { type DrillTarget } from "./AccountDrilldown";

const today = () => new Date().toISOString().slice(0, 10);
const amt = (p: number) => (p ? money(p) : "");

export default function TrialBalanceReport() {
  const currentYear = useMemo(() => masonicYearOf(today()), []);
  const [months, setMonths] = useState<{ ym: string; label: string }[]>([]);
  const [calDates, setCalDates] = useState<string[]>([]);
  useEffect(() => {
    fetchReportCalendar().then((c) => { setMonths(c.months); setCalDates(c.dates); }).catch(() => {});
  }, []);
  const yearOptions = useMemo(() => masonicYearOptions(currentYear, calDates), [currentYear, calDates]);
  const monthOptions = months.length ? months : [{ ym: ymOf(today()), label: ymOf(today()) }];

  const [kind, setKind] = useState<BSKind>("month");
  const [ym, setYm] = useState(ymOf(today()));
  const [year, setYear] = useState(currentYear);
  const [customDate, setCustomDate] = useState(today);
  const [hideZero, setHideZero] = useState(true);
  const asAt = bsAsAt({ kind, ym, year, customDate });

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [lines, setLines] = useState<Awaited<ReturnType<typeof fetchLedgerLines>>>([]);
  const [loading, setLoading] = useState(true);
  const [drill, setDrill] = useState<DrillTarget | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, l] = await Promise.all([fetchAccounts(), fetchLedgerLines(asAt.date)]);
      setAccounts(a);
      setLines(l);
    } catch (e: any) {
      toast({ title: "Could not build trial balance", description: e?.message, variant: "destructive" });
    }
    setLoading(false);
  }, [asAt.date]);
  useEffect(() => { load(); }, [load]);

  const tb = useMemo(() => computeTrialBalance(accounts, lines, asAt.date), [accounts, lines, asAt.date]);
  const shown = hideZero ? tb.rows.filter((r) => r.dr || r.cr) : tb.rows;
  const balanced = tb.difference === 0;
  const showPrior = tb.priorSurplus.dr || tb.priorSurplus.cr;
  const priorLabel = `Prior years' surplus/(deficit) b/f — I&E before ${fmtDate(tb.yearStart)} (computed)`;

  const open = (r: (typeof tb.rows)[number]) => {
    const net = r.dr - r.cr;
    const natural = r.account_type === "asset" || r.account_type === "expense" ? net : -net;
    setDrill({
      account: r, start: r.start, end: asAt.date,
      periodLabel: r.start ? `${fmtDate(r.start)} – ${fmtDate(asAt.date)}` : `as at ${fmtDate(asAt.date)}`,
      expected: natural,
    });
  };

  const exportPdf = async () => {
    try {
      const { doc, margin } = await reportPdfDoc("Trial Balance", `As at ${fmtDate(asAt.date)}`);
      const body: any[][] = shown.map((r) => [r.code, r.name, r.account_type, amt(r.dr), amt(r.cr)]);
      if (showPrior) body.push(["", priorLabel, "", amt(tb.priorSurplus.dr), amt(tb.priorSurplus.cr)]);
      body.push(["", "Total", "", money(tb.totalDr), money(tb.totalCr)]);
      body.push(["", balanced ? "Balanced" : `Out of balance by ${money(tb.difference)}`, "", "", ""]);
      autoTable(doc, {
        head: [["Code", "Account", "Type", "Dr", "Cr"]], body, startY: 130,
        margin: { left: margin, right: margin, bottom: 60 },
        styles: { font: "helvetica", fontSize: 9, cellPadding: 5, textColor: INK, lineColor: [220, 215, 200], lineWidth: 0.4 },
        headStyles: { fillColor: GOLD, textColor: NAVY, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [250, 247, 238] },
        theme: "grid",
        columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 235 }, 2: { cellWidth: 65 }, 3: { cellWidth: 85, halign: "right" }, 4: { cellWidth: 85, halign: "right" } },
      });
      doc.save(`trial-balance-${asAt.date}.pdf`);
    } catch (e: any) {
      toast({ title: "PDF export failed", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 overflow-x-hidden">
      <section className="rounded-lg border border-gold/20 bg-primary-foreground/5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg text-gold mb-1">Trial Balance</h2>
            <p className="text-primary-foreground/60 text-sm font-sans">
              Every account in the chart of accounts, by code, with its balance as at the chosen date. Balance-sheet accounts
              are cumulative; income and expenditure show the year to date. Click any account to see its transactions.
            </p>
          </div>
          <Button onClick={exportPdf} disabled={loading} className="bg-gold text-primary hover:bg-gold/90 min-h-[48px]">
            <Download className="w-4 h-4 mr-1" /> Export PDF
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mt-4 items-end">
          <div>
            <Label>As at</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as BSKind)}>
              <SelectTrigger className="min-h-[48px]" aria-label="As at type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Month end</SelectItem>
                <SelectItem value="year">Masonic year end</SelectItem>
                <SelectItem value="custom">Custom date</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {kind === "month" && (
            <div>
              <Label>Month</Label>
              <Select value={ym} onValueChange={setYm}>
                <SelectTrigger className="min-h-[48px]" aria-label="Month"><SelectValue /></SelectTrigger>
                <SelectContent>{monthOptions.map((m) => <SelectItem key={m.ym} value={m.ym}>{m.label}</SelectItem>)}</SelectContent>
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
                    <SelectItem key={y} value={String(y)}>Masonic year end {treasurerYearBounds(y).label} ({fmtDate(treasurerYearBounds(y).end)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {kind === "custom" && (
            <div>
              <Label>As at date</Label>
              <Input type="date" className="min-h-[48px]" value={customDate} onChange={(e) => setCustomDate(e.target.value)} />
            </div>
          )}
          <label className="flex min-h-[48px] items-center gap-2 text-sm text-primary-foreground/80">
            <Switch checked={hideZero} onCheckedChange={setHideZero} aria-label="Hide zero-balance accounts" />
            Hide zero balances
          </label>
        </div>
        <p className="text-primary-foreground/50 text-xs mt-2">As at {fmtDate(asAt.date)} · income &amp; expenditure from {fmtDate(tb.yearStart)}</p>

        {loading ? (
          <p className="text-primary-foreground/60 mt-4"><Loader2 className="w-4 h-4 mr-1 inline animate-spin" /> Building trial balance…</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-primary-foreground/60 border-b border-gold/20">
                  <th className="text-left py-2 font-normal">Code</th>
                  <th className="text-left py-2 font-normal">Account</th>
                  <th className="text-left py-2 font-normal hidden sm:table-cell">Type</th>
                  <th className="text-right py-2 font-normal">Dr</th>
                  <th className="text-right py-2 font-normal">Cr</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr
                    key={r.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Show transactions for ${r.code} ${r.name}`}
                    onClick={() => open(r)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(r); } }}
                    className="h-12 cursor-pointer border-b border-gold/10 text-primary-foreground/85 hover:bg-gold/10 focus:bg-gold/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  >
                    <td className="py-2 font-mono">
                      <span className="inline-flex items-center gap-1"><ChevronRight className="h-4 w-4 text-gold" aria-hidden />{r.code}</span>
                    </td>
                    <td className="py-2">{r.name}</td>
                    <td className="py-2 hidden sm:table-cell text-primary-foreground/60 capitalize">{r.account_type}</td>
                    <td className="py-2 text-right tabular-nums">{amt(r.dr)}</td>
                    <td className="py-2 text-right tabular-nums">{amt(r.cr)}</td>
                  </tr>
                ))}
                {showPrior ? (
                  <tr className="h-12 border-b border-gold/10 text-primary-foreground/70 italic">
                    <td className="py-2" />
                    <td className="py-2" colSpan={2}>{priorLabel}</td>
                    <td className="py-2 text-right tabular-nums">{amt(tb.priorSurplus.dr)}</td>
                    <td className="py-2 text-right tabular-nums">{amt(tb.priorSurplus.cr)}</td>
                  </tr>
                ) : null}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gold/40 font-semibold text-gold">
                  <td className="py-3" colSpan={2}>Total</td>
                  <td className="hidden sm:table-cell" />
                  <td className="py-3 text-right tabular-nums">{money(tb.totalDr)}</td>
                  <td className="py-3 text-right tabular-nums">{money(tb.totalCr)}</td>
                </tr>
              </tfoot>
            </table>
            <p className={`mt-3 flex items-center gap-1 text-sm font-semibold ${balanced ? "text-emerald-400" : "text-red-400"}`}>
              {balanced ? <><Check className="h-4 w-4" /> Balanced</> : <><AlertTriangle className="h-4 w-4" /> Out of balance by {money(tb.difference)}</>}
            </p>
            <p className="text-primary-foreground/50 text-xs mt-1">
              {tb.rows.length} accounts · {lines.length} ledger lines counted{hideZero ? ` · ${tb.rows.length - shown.length} zero-balance hidden` : ""}
            </p>
          </div>
        )}
      </section>
      <AccountDrilldown target={drill} onClose={() => setDrill(null)} />
    </div>
  );
}
