import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Download, Loader2, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAccounts, treasurerYearBounds, treasurerYearContaining, fmtDate, money, type Account } from "@/lib/treasurer/reports";
import { formatEntryNumber, entryNumberMatches, compareWithinEntry } from "@/lib/treasurer/entryNumber";
import EntryDrilldown from "@/components/members/treasurer/EntryDrilldown";

type SortKey = "date" | "account" | "doc";

type Line = {
  id: string;
  entryId: string;
  entryNumber: number;
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
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: "asc" | "desc" }>({
    key: "date",
    direction: "asc",
  });
  const [search, setSearch] = useState("");
  const [drill, setDrill] = useState<{ entryId: string; lineId: string | null } | null>(null);

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
            "journal_entries!inner(id,entry_number,entry_date,description,source_type,payee,reconciled)," +
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
        entryNumber: Number(r.journal_entries.entry_number ?? 0),
        reconciled: !!r.journal_entries.reconciled,
        date: r.journal_entries.entry_date,
        code: r.chart_of_accounts.code,
        accountName: r.chart_of_accounts.name,
        description: r.description || r.journal_entries.description || "",
        debit: Number(r.debit_pence ?? 0),
        credit: Number(r.credit_pence ?? 0),
        eventId: r.event_id ?? null,
      }));
      rows.sort((a, b) => a.date.localeCompare(b.date) || compareWithinEntry(a, b));
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

  const sortedLines = useMemo(() => {
    const filtered = search.trim()
      ? lines.filter(
          (l) =>
            entryNumberMatches(l.entryNumber, search) ||
            l.description.toLowerCase().includes(search.trim().toLowerCase())
        )
      : [...lines];
    const dir = sortConfig.direction === "asc" ? 1 : -1;
    filtered.sort((a, b) => {
      let primary = 0;
      if (sortConfig.key === "date") primary = a.date.localeCompare(b.date);
      else if (sortConfig.key === "account") primary = a.code.localeCompare(b.code, undefined, { numeric: true });
      else primary = a.entryNumber - b.entryNumber;
      if (primary !== 0) return primary * dir;
      if (sortConfig.key === "account") return a.date.localeCompare(b.date) || a.entryNumber - b.entryNumber;
      return compareWithinEntry(a, b);
    });
    return filtered;
  }, [lines, sortConfig, search]);

  const sortHeader = (key: SortKey, label: string) => (
    <button
      type="button"
      onClick={() =>
        setSortConfig((prev) => ({ key, direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc" }))
      }
      className="inline-flex items-center gap-1 hover:text-gold focus:outline-none"
    >
      {label}
      {sortConfig.key === key &&
        (sortConfig.direction === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
    </button>
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

  const assignEvent = async (lineId: string, value: string) => {
    const next = value === NO_EVENT ? null : value;
    const prev = lines.find((l) => l.id === lineId)?.eventId ?? null;
    setLines((ls) => ls.map((l) => (l.id === lineId ? { ...l, eventId: next } : l)));
    const { data, error } = await supabase
      .from("journal_lines" as any)
      .update({ event_id: next })
      .eq("id", lineId)
      .select("id");
    if (error || !data || data.length === 0) {
      setLines((ls) => ls.map((l) => (l.id === lineId ? { ...l, eventId: prev } : l)));
      toast({
        title: "Couldn't tag this line to an event",
        description: error?.message ?? "The entry's period may be locked.",
        variant: "destructive",
      });
    }
  };

  const exportCsv = () => {
    const header = ["Doc No", "Date", "Account Code", "Account Name", "Description", "Debit (£)", "Credit (£)"];
    const body = sortedLines.map((l) => [
      formatEntryNumber(l.entryNumber),
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

      <div className="flex flex-wrap gap-2 items-end">
        <Button onClick={load} disabled={loading} className="bg-gold text-navy hover:bg-gold/90">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Run report
        </Button>
        <Button variant="outline" onClick={exportCsv} disabled={loading || lines.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
        <div className="w-full sm:w-64 sm:ml-auto space-y-1">
          <Label htmlFor="td-search">Search doc no. or description</Label>
          <Input id="td-search" placeholder="e.g. JE-000123" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Doc no. is assigned automatically and never changes; every line of the same entry shares it. Gaps in the
        sequence are normal where an entry was deleted. Click any row to see every line of that entry.
      </p>

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
                    <th className="px-3 py-2 font-medium whitespace-nowrap">{sortHeader("doc", "Doc no.")}</th>
                    <th className="px-3 py-2 font-medium">{sortHeader("date", "Date")}</th>
                    <th className="px-3 py-2 font-medium">{sortHeader("account", "Account")}</th>
                    <th className="px-3 py-2 font-medium">Description</th>
                    <th className="px-3 py-2 font-medium text-right">Debit</th>
                    <th className="px-3 py-2 font-medium text-right">Credit</th>
                    <th className="px-3 py-2 font-medium text-center">Reconciled</th>
                    {events.length > 0 && <th className="px-3 py-2 font-medium">Event</th>}
                  </tr>
                </thead>
                <tbody>
                  {sortedLines.map((l, i) => (
                    <tr
                      key={l.id}
                      tabIndex={0}
                      aria-label={`View all lines of ${formatEntryNumber(l.entryNumber)}`}
                      onClick={() => setDrill({ entryId: l.entryId, lineId: l.id })}
                      onKeyDown={(e) => {
                        if (e.target !== e.currentTarget) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setDrill({ entryId: l.entryId, lineId: l.id });
                        }
                      }}
                      className={`h-12 cursor-pointer transition-colors hover:bg-gold/10 focus-visible:outline-none focus-visible:bg-gold/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold ${
                        i > 0 && sortedLines[i - 1].entryNumber === l.entryNumber
                          ? "border-t border-border/40"
                          : "border-t border-border"
                      }`}
                    >
                      <td className="px-3 py-1.5 whitespace-nowrap font-mono text-xs text-muted-foreground">
                        {formatEntryNumber(l.entryNumber)}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap">{fmtDate(l.date)}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        {l.code} — {l.accountName}
                      </td>
                      <td className="px-3 py-1.5">{l.description}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{l.debit ? money(l.debit) : ""}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{l.credit ? money(l.credit) : ""}</td>
                      <td className="px-3 py-1.5 text-center" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={l.reconciled}
                          onCheckedChange={() => toggleReconciled(l.entryId, l.reconciled)}
                          aria-label="Mark entry reconciled"
                        />
                      </td>
                      {events.length > 0 && (
                        <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                          <Select value={l.eventId ?? NO_EVENT} onValueChange={(v) => assignEvent(l.id, v)}>
                            <SelectTrigger className="h-8 min-w-[170px]" aria-label="Assign to event">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NO_EVENT}>No event</SelectItem>
                              {events.map((e) => (
                                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      )}
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
      <EntryDrilldown
        entryId={drill?.entryId ?? null}
        highlightLineId={drill?.lineId}
        onClose={() => setDrill(null)}
        onNavigate={(id) => setDrill({ entryId: id, lineId: null })}
      />
    </div>
  );
}
