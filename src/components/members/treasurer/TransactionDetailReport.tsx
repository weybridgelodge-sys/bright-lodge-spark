import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAccounts, treasurerYearBounds, treasurerYearContaining, fmtDate, money, type Account } from "@/lib/treasurer/reports";

type Line = {
  id: string;
  entryId: string;
  reconciled: boolean;
  date: string;
  code: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
  eventId: string | null;
};

type EventOption = { id: string; name: string; event_date: string };

const NO_EVENT = "__none__";

const defaultRange = () => {
  const todayIso = new Date().toISOString().slice(0, 10);
  return treasurerYearBounds(treasurerYearContaining(todayIso));
};

const csvEscape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export default function TransactionDetailReport({ canEdit }: { canEdit: boolean }) {
  const { start, end } = defaultRange();
  const [from, setFrom] = useState(start);
  const [to, setTo] = useState(end);
  const [codeFrom, setCodeFrom] = useState("1000");
  const [codeTo, setCodeTo] = useState("5900");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [applied, setApplied] = useState<{ from: string; to: string; codeFrom: string; codeTo: string } | null>(null);
  const [events, setEvents] = useState<EventOption[]>([]);

  useEffect(() => {
    if (!canEdit) return;
    supabase
      .from("event_accounts" as any)
      .select("id,name,event_date")
      .order("event_date", { ascending: false })
      .then(({ data }) => setEvents(((data as any[]) ?? []) as EventOption[]));
    fetchAccounts()
      .then((accs) => {
        setAccounts(accs);
        if (accs.length > 0) {
          setCodeFrom(accs[0].code);
          setCodeTo(accs[accs.length - 1].code);
        }
      })
      .catch((e: any) => {
        toast({ title: "Could not load accounts", description: e.message, variant: "destructive" });
      });
  }, [canEdit]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const cf = codeFrom.trim() || "0000";
      const ct = codeTo.trim() || "9999";
      const { data, error } = await supabase
        .from("journal_lines" as any)
        .select(
          "id,debit_pence,credit_pence,description,event_id," +
            "journal_entries!inner(id,entry_date,description,source_type,payee,reconciled)," +
            "chart_of_accounts!inner(code,name)"
        )
        .gte("journal_entries.entry_date", from)
        .lte("journal_entries.entry_date", to)
        .gte("chart_of_accounts.code", cf)
        .lte("chart_of_accounts.code", ct)
        .order("entry_date", { referencedTable: "journal_entries" })
        .order("code", { referencedTable: "chart_of_accounts" });
      if (error) throw error;
      const rows: Line[] = ((data as any[]) ?? []).map((r) => ({
        id: r.id,
        entryId: r.journal_entries.id,
        reconciled: !!r.journal_entries.reconciled,
        date: r.journal_entries.entry_date,
        code: r.chart_of_accounts.code,
        accountName: r.chart_of_accounts.name,
        description: r.description || r.journal_entries.description || "",
        debit: Number(r.debit_pence ?? 0),
        credit: Number(r.credit_pence ?? 0),
        eventId: r.event_id ?? null,
      }));
      rows.sort((a, b) => (a.date === b.date ? a.code.localeCompare(b.code) : a.date.localeCompare(b.date)));
      setLines(rows);
      setLoaded(true);
      setApplied({ from, to, codeFrom, codeTo });
    } catch (e: any) {
      setLines([]);
      setLoaded(true);
      setApplied({ from, to, codeFrom, codeTo });
      setLoadError(e?.message || "Unknown error");
      toast({ title: "Could not load transactions", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [from, to, codeFrom, codeTo]);

  useEffect(() => {
    if (canEdit) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit]);

  const filtersChanged = !!applied && (applied.from !== from || applied.to !== to || applied.codeFrom !== codeFrom || applied.codeTo !== codeTo);

  const totals = useMemo(
    () =>
      lines.reduce(
        (t, l) => ({ debit: t.debit + l.debit, credit: t.credit + l.credit }),
        { debit: 0, credit: 0 }
      ),
    [lines]
  );

  const setEntryReconciled = (entryId: string, value: boolean) =>
    setLines((prev) => prev.map((l) => (l.entryId === entryId ? { ...l, reconciled: value } : l)));

  const toggleReconciled = async (entryId: string, current: boolean) => {
    const next = !current;
    setEntryReconciled(entryId, next);
    const { data, error } = await supabase
      .from("journal_entries" as any)
      .update({ reconciled: next })
      .eq("id", entryId)
      .select("id");
    if (error || !data || data.length === 0) {
      setEntryReconciled(entryId, current);
      toast({
        title: "Can't change reconciled status — this entry's period is locked",
        description: error?.message ?? "No change was saved.",
        variant: "destructive",
      });
    }
  };

  const exportCsv = () => {
    const header = ["Date", "Account Code", "Account Name", "Description", "Debit (£)", "Credit (£)"];
    const body = lines.map((l) => [
      l.date,
      l.code,
      csvEscape(l.accountName),
      csvEscape(l.description),
      l.debit ? (l.debit / 100).toFixed(2) : "",
      l.credit ? (l.credit / 100).toFixed(2) : "",
    ]);
    const csv = [header, ...body].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transaction-detail-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!canEdit) return null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-serif text-lg text-primary">Transaction Detail</h3>
        <p className="text-sm text-muted-foreground">
          Line-level cash-book listing of every journal line in the selected date and account-code range.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
        <div className="space-y-1">
          <Label htmlFor="td-from">Start date</Label>
          <Input id="td-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="td-to">End date</Label>
          <Input id="td-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="td-cf">From code</Label>
          <Select value={codeFrom} onValueChange={setCodeFrom}>
            <SelectTrigger id="td-cf">
              <SelectValue placeholder="From code" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.code}>
                  {a.code} — {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="td-ct">To code</Label>
          <Select value={codeTo} onValueChange={setCodeTo}>
            <SelectTrigger id="td-ct">
              <SelectValue placeholder="To code" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.code}>
                  {a.code} — {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={load} disabled={loading} className="bg-gold text-navy hover:bg-gold/90">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Run report
        </Button>
        <Button variant="outline" onClick={exportCsv} disabled={loading || lines.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      {!loading && filtersChanged && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          Filters have changed since this report was run — press “Run report” to update the results below.
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : loadError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-4 text-sm text-destructive">
          <p className="font-medium">Report failed to load — no results are shown.</p>
          <p className="mt-1 break-words">{loadError}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={load}>
            Try again
          </Button>
        </div>
      ) : loaded ? (
        lines.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No journal lines found for this date and code range.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-left">
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Account</th>
                    <th className="px-3 py-2 font-medium">Description</th>
                    <th className="px-3 py-2 font-medium text-right">Debit</th>
                    <th className="px-3 py-2 font-medium text-right">Credit</th>
                    <th className="px-3 py-2 font-medium text-center">Reconciled</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.id} className="border-t border-border">
                      <td className="px-3 py-1.5 whitespace-nowrap">{fmtDate(l.date)}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        {l.code} — {l.accountName}
                      </td>
                      <td className="px-3 py-1.5">{l.description}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{l.debit ? money(l.debit) : ""}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{l.credit ? money(l.credit) : ""}</td>
                      <td className="px-3 py-1.5 text-center">
                        <Checkbox
                          checked={l.reconciled}
                          onCheckedChange={() => toggleReconciled(l.entryId, l.reconciled)}
                          aria-label="Mark entry reconciled"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">{lines.length} line{lines.length === 1 ? "" : "s"}</span>
              <span className="tabular-nums">
                Total debits <strong>{money(totals.debit)}</strong>
                {" · "}
                Total credits <strong>{money(totals.credit)}</strong>
                {totals.debit !== totals.credit && (
                  <span className="text-amber-600 dark:text-amber-400">
                    {" "}— out of balance by {money(Math.abs(totals.debit - totals.credit))} (expected when a narrow code
                    range includes only one side of an entry)
                  </span>
                )}
              </span>
            </div>
          </>
        )
      ) : null}
    </div>
  );
}
