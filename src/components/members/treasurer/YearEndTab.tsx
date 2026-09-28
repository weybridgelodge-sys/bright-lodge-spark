import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Lock, CalendarCheck, Scale, TrendingUp } from "lucide-react";
import { acct, fetchAccounts, fetchLedgerLines, fetchMovements, fetchReportCalendar, fmtDate, money, signedBalance } from "@/lib/treasurer/reports";
import { formatEntryNumber } from "@/lib/treasurer/entryNumber";
import { buildClosingJournal, canCloseYear, FUND_CODE, fyLabel, yearEndDate, yearEndYears } from "@/lib/treasurer/yearEnd";
import EntryDrilldown from "./EntryDrilldown";

type Closed = { id: string; entry_number: number; entry_date: string; fund: number };
type Draft = ReturnType<typeof buildClosingJournal>;

const londonToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());

export default function YearEndTab({ canEdit, onOpenTab }: { canEdit: boolean; onOpenTab: (tab: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [years, setYears] = useState<number[]>([]);
  const [closed, setClosed] = useState<Map<number, Closed>>(new Map());
  const [fundBf, setFundBf] = useState<Map<number, number>>(new Map());
  const [draft, setDraft] = useState<{ year: number; j: Draft } | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [posting, setPosting] = useState(false);
  const [entryId, setEntryId] = useState<string | null>(null);
  const today = londonToday();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cal, ps, es, accts] = await Promise.all([
        fetchReportCalendar(),
        supabase.from("treasurer_periods" as any).select("id,masonic_year").eq("period_type", "closing"),
        supabase.from("journal_entries" as any).select("id,entry_number,entry_date,period_id,journal_lines(debit_pence,credit_pence,chart_of_accounts(code))").eq("source_type", "year_close"),
        fetchAccounts(),
      ]);
      if (ps.error) throw ps.error;
      if (es.error) throw es.error;
      const yearOf = new Map(((ps.data as any[]) ?? []).map((p) => [p.id, p.masonic_year as number]));
      const m = new Map<number, Closed>();
      for (const e of (es.data as any[]) ?? []) {
        const y = yearOf.get(e.period_id);
        if (y == null) continue;
        const fund = (e.journal_lines ?? []).filter((l: any) => l.chart_of_accounts?.code === FUND_CODE)
          .reduce((s: number, l: any) => s + Number(l.credit_pence) - Number(l.debit_pence), 0);
        m.set(y, { id: e.id, entry_number: e.entry_number, entry_date: e.entry_date, fund });
      }
      const ys = yearEndYears(cal.dates, today);
      // General Fund before each closed year's closing journal (all entries to 30 Sep).
      const fundAcct = accts.find((a) => a.code === FUND_CODE);
      const bf = new Map<number, number>();
      if (fundAcct) {
        await Promise.all([...m.keys()].map(async (y) => {
          const mv = await fetchMovements(null, yearEndDate(y));
          bf.set(y, signedBalance("equity", mv.get(fundAcct.id)));
        }));
      }
      setYears(ys); setClosed(m); setFundBf(bf);
    } catch (e: any) {
      toast({ title: "Could not load Year End", description: e?.message, variant: "destructive" });
    }
    setLoading(false);
  }, [today]);

  useEffect(() => { load(); }, [load]);

  const preview = async (year: number) => {
    setBusy(year);
    try {
      const [accts, lines] = await Promise.all([fetchAccounts(), fetchLedgerLines(yearEndDate(year))]);
      setDraft({ year, j: buildClosingJournal(accts, lines, year) });
    } catch (e: any) {
      toast({ title: "Could not build closing journal", description: e?.message, variant: "destructive" });
    }
    setBusy(null);
  };

  const post = async () => {
    if (!draft) return;
    setPosting(true);
    const { error } = await supabase.rpc("post_year_close" as any, { _year: draft.year, _expected_net: draft.j.surplus } as any);
    setPosting(false);
    if (error) { toast({ title: "Closing journal not posted", description: error.message, variant: "destructive" }); return; }
    toast({ title: `${fyLabel(draft.year)} closed`, description: "Closing journal posted and the closing period locked." });
    setDraft(null);
    load();
  };

  return (
    <div className="space-y-4 overflow-x-hidden">
      <section className="rounded-lg border border-gold/20 bg-primary-foreground/5 p-4">
        <h2 className="font-serif text-lg text-gold mb-1">Year End</h2>
        <p className="text-primary-foreground/60 text-sm font-sans">
          The closing journal only sets next year's opening General Fund (3000): it moves the year's income and
          expenditure into the fund, dated 1 October, in that year's own closing period, which is then locked.
          Reports read live figures, so you can review the accounts before closing.
        </p>
      </section>

      {loading ? (
        <p className="text-primary-foreground/60"><Loader2 className="w-4 h-4 mr-1 inline animate-spin" /> Loading…</p>
      ) : (
        <ul className="space-y-3">
          {years.map((y) => {
            const c = closed.get(y);
            const guard = canCloseYear(y, today, !!c);
            return (
              <li key={y} className="rounded-lg border border-gold/20 bg-navy-light/30 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-serif text-gold">{fyLabel(y)}</h3>
                    <p className="text-xs text-primary-foreground/60">1 Oct {y} – 30 Sep {y + 1}</p>
                  </div>
                  {c
                    ? <Badge variant="outline" className="border-gold/60 text-gold"><Lock className="w-3 h-3 mr-1" />Closed</Badge>
                    : <Badge variant="outline" className="border-primary-foreground/30 text-primary-foreground/70">Not closed</Badge>}
                </div>

                {c ? (
                  <div className="space-y-2 text-sm font-sans">
                    <Button variant="outline" className="min-h-[48px]" onClick={() => setEntryId(c.id)} aria-label={`Open closing journal ${formatEntryNumber(c.entry_number)}`}>
                      Closing journal {formatEntryNumber(c.entry_number)} · {fmtDate(c.entry_date)}
                    </Button>
                    <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 max-w-md">
                      <dt className="text-primary-foreground/70">General Fund at 30 Sep {y + 1}</dt>
                      <dd className="text-right tabular-nums">{acct(fundBf.get(y) ?? 0)}</dd>
                      <dt className="text-primary-foreground/70">{c.fund >= 0 ? "Surplus" : "Deficit"} transferred</dt>
                      <dd className="text-right tabular-nums">{acct(c.fund)}</dd>
                      <dt className="text-gold">Opening General Fund 1 Oct {y + 1}</dt>
                      <dd className="text-right tabular-nums text-gold">{acct((fundBf.get(y) ?? 0) + c.fund)}</dd>
                    </dl>
                  </div>
                ) : guard.ok ? (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" className="min-h-[48px]" onClick={() => onOpenTab("balance-sheet")}>
                      <Scale className="w-4 h-4 mr-1" /> Review Balance Sheet
                    </Button>
                    <Button variant="outline" className="min-h-[48px]" onClick={() => onOpenTab("income-expenditure")}>
                      <TrendingUp className="w-4 h-4 mr-1" /> Review Income &amp; Expenditure
                    </Button>
                    {canEdit && (
                      <Button className="min-h-[48px] bg-gold text-navy hover:bg-gold/90" disabled={busy === y} onClick={() => preview(y)}>
                        {busy === y ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CalendarCheck className="w-4 h-4 mr-1" />}
                        Close {fyLabel(y)}
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-primary-foreground/60">{"reason" in guard ? guard.reason : ""}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!draft} onOpenChange={(v) => { if (!v && !posting) setDraft(null); }}>
        <DialogContent className="bg-navy-light text-primary-foreground border-gold/30 max-w-2xl max-h-[90vh] overflow-y-auto">
          {draft && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif text-gold">Close {fyLabel(draft.year)} — preview</DialogTitle>
                <DialogDescription className="text-primary-foreground/70 font-sans">
                  Dated {fmtDate(draft.j.entryDate)} in “{draft.j.periodLabel}”, which locks straight after posting.
                  Nothing is posted until you confirm.
                </DialogDescription>
              </DialogHeader>
              {draft.j.fundMissing && <p className="text-sm text-destructive">Account 3000 General Fund is missing from the chart of accounts.</p>}
              {draft.j.lines.length === 0 ? (
                <p className="text-sm text-primary-foreground/70">No income or expenditure to close for this year.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm font-sans">
                    <thead><tr className="text-primary-foreground/60 border-b border-gold/20">
                      <th className="text-left py-2 font-normal">Account</th>
                      <th className="text-right py-2 font-normal">Debit</th>
                      <th className="text-right py-2 font-normal">Credit</th>
                    </tr></thead>
                    <tbody>
                      {draft.j.lines.map((l) => (
                        <tr key={l.account.id} className={`border-b border-gold/10 ${l.account.code === FUND_CODE ? "text-gold" : ""}`}>
                          <td className="py-2">{l.account.code} — {l.account.name}</td>
                          <td className="py-2 text-right tabular-nums">{l.debit ? money(l.debit) : ""}</td>
                          <td className="py-2 text-right tabular-nums">{l.credit ? money(l.credit) : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr className="font-semibold">
                      <td className="py-2">Total {draft.j.balanced ? "✓ balanced" : "✗ unbalanced"}</td>
                      <td className="py-2 text-right tabular-nums">{money(draft.j.debit)}</td>
                      <td className="py-2 text-right tabular-nums">{money(draft.j.credit)}</td>
                    </tr></tfoot>
                  </table>
                  <p className="mt-2 text-sm">{draft.j.surplus >= 0 ? "Surplus" : "Deficit"} for the year: <strong>{acct(draft.j.surplus)}</strong></p>
                </div>
              )}
              <DialogFooter className="gap-2">
                <Button variant="outline" className="min-h-[48px]" disabled={posting} onClick={() => setDraft(null)}>Cancel</Button>
                <Button className="min-h-[48px] bg-gold text-navy hover:bg-gold/90"
                  disabled={posting || !draft.j.balanced || draft.j.lines.length === 0 || draft.j.fundMissing}
                  onClick={post}>
                  {posting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Post closing journal
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <EntryDrilldown entryId={entryId} onClose={() => setEntryId(null)} />
    </div>
  );
}
