import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Loader2, ChevronRight, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate, money } from "@/lib/treasurer/reports";

type Side = "creditors" | "debtors";

type Line = {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  reconciled: boolean;
  eventName: string;
  party: string;
};

type Group = { party: string; balance: number; lines: Line[] };

const ACCOUNT_CODE: Record<Side, string> = { creditors: "2000", debtors: "1100" };

/**
 * Normalises a party label so the same real-world counterparty groups together
 * regardless of whether it arrived via entry payee or a line description.
 */
const normaliseParty = (raw: string) => {
  const base = raw.split("—")[0].trim() || raw.trim();
  const key = base.toLowerCase().replace(/[.,]/g, "").trim();
  if (key === "ugle" || key === "united grand lodge" || key === "united grand lodge of england") {
    return "United Grand Lodge";
  }
  if (key === "pgl" || key === "provincial grand lodge") return "Provincial Grand Lodge";
  return base;
};

export default function CreditorDebtorBalances({ canEdit }: { canEdit: boolean }) {
  const [side, setSide] = useState<Side>("creditors");
  const [unreconciledOnly, setUnreconciledOnly] = useState(true);
  const [showZero, setShowZero] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<Side, Line[]>>({ creditors: [], debtors: [] });
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("journal_lines" as any)
        .select(
          "id,debit_pence,credit_pence,description,event_id," +
            "journal_entries!inner(id,entry_date,description,payee,reconciled)," +
            "chart_of_accounts!inner(code,name)"
        )
        .in("chart_of_accounts.code", [ACCOUNT_CODE.creditors, ACCOUNT_CODE.debtors]);
      if (err) throw err;

      const { data: evData } = await supabase
        .from("event_accounts" as any)
        .select("id,name");
      const eventNames = new Map<string, string>(
        ((evData as any[]) ?? []).map((e) => [e.id as string, e.name as string])
      );

      const next: Record<Side, Line[]> = { creditors: [], debtors: [] };
      for (const r of ((data as any[]) ?? [])) {
        const code = r.chart_of_accounts.code as string;
        const target: Side = code === ACCOUNT_CODE.creditors ? "creditors" : "debtors";
        const lineDesc: string = r.description || r.journal_entries.description || "";
        const payee: string | null = r.journal_entries.payee;
        const rawParty =
          target === "creditors" ? (payee && payee.trim() ? payee : lineDesc) : lineDesc;
        next[target].push({
          id: r.id,
          date: r.journal_entries.entry_date,
          description: lineDesc,
          debit: Number(r.debit_pence ?? 0),
          credit: Number(r.credit_pence ?? 0),
          reconciled: !!r.journal_entries.reconciled,
          eventName: r.event_id ? eventNames.get(r.event_id) ?? "" : "",
          party: normaliseParty(rawParty || "Unattributed"),
        });
      }
      setRows(next);
    } catch (e: any) {
      setRows({ creditors: [], debtors: [] });
      setError(e?.message || "Unknown error");
      toast({ title: "Could not load balances", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canEdit) load();
  }, [canEdit, load]);

  const groups: Group[] = useMemo(() => {
    const source = rows[side].filter((l) => (unreconciledOnly ? !l.reconciled : true));
    const map = new Map<string, Group>();
    for (const l of source) {
      const g = map.get(l.party) ?? { party: l.party, balance: 0, lines: [] };
      // Creditors: a credit increases what we owe. Debtors: a debit increases what we're owed.
      g.balance += side === "creditors" ? l.credit - l.debit : l.debit - l.credit;
      g.lines.push(l);
      map.set(l.party, g);
    }
    const list = [...map.values()].filter((g) => (showZero ? true : g.balance !== 0));
    for (const g of list) g.lines.sort((a, b) => a.date.localeCompare(b.date));
    list.sort((a, b) => b.balance - a.balance || a.party.localeCompare(b.party));
    return list;
  }, [rows, side, unreconciledOnly, showZero]);

  const total = useMemo(() => groups.reduce((t, g) => t + g.balance, 0), [groups]);

  if (!canEdit) return null;

  const heading = side === "creditors" ? "Creditors (2000)" : "Debtors (1100)";

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-serif text-lg text-primary">Creditor &amp; Debtor Balances</h3>
        <p className="text-sm text-muted-foreground">
          Net outstanding balance per counterparty. A positive figure means money is owed — by the lodge on
          Creditors, to the lodge on Debtors.
        </p>
      </div>

      <Tabs value={side} onValueChange={(v) => { setSide(v as Side); setOpen(null); }}>
        <TabsList>
          <TabsTrigger value="creditors">Creditors</TabsTrigger>
          <TabsTrigger value="debtors">Debtors</TabsTrigger>
        </TabsList>
        <TabsContent value={side} forceMount className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={unreconciledOnly ? "default" : "outline"}
              className={unreconciledOnly ? "bg-gold text-navy hover:bg-gold/90" : ""}
              onClick={() => setUnreconciledOnly(true)}
            >
              Outstanding, unreconciled only
            </Button>
            <Button
              size="sm"
              variant={!unreconciledOnly ? "default" : "outline"}
              className={!unreconciledOnly ? "bg-gold text-navy hover:bg-gold/90" : ""}
              onClick={() => setUnreconciledOnly(false)}
            >
              All items ever posted
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowZero((v) => !v)}>
              {showZero ? "Hide settled (zero) balances" : "Show settled (zero) balances"}
            </Button>
            <Button size="sm" variant="outline" onClick={load} disabled={loading} className="ml-auto">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Refresh
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-4 text-sm text-destructive">
              <p className="font-medium">Report failed to load — no results are shown.</p>
              <p className="mt-1 break-words">{error}</p>
            </div>
          ) : groups.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nothing outstanding on {heading}.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-left">
                    <th className="px-3 py-2 font-medium">{side === "creditors" ? "Creditor" : "Debtor"}</th>
                    <th className="px-3 py-2 font-medium text-right">Items</th>
                    <th className="px-3 py-2 font-medium text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => {
                    const isOpen = open === g.party;
                    return (
                      <Fragment key={g.party}>
                        <tr className="border-t border-border">
                          <td className="px-3 py-1.5">
                            <button
                              type="button"
                              onClick={() => setOpen(isOpen ? null : g.party)}
                              className="inline-flex items-center gap-1 hover:text-gold focus:outline-none"
                              aria-expanded={isOpen}
                            >
                              {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              {g.party}
                            </button>
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{g.lines.length}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {g.balance < 0 ? `(${money(g.balance)})` : money(g.balance)}
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="border-t border-border bg-muted/20">
                            <td colSpan={3} className="px-3 py-2">
                              <div className="overflow-x-auto rounded-md border border-white/15 bg-navy text-cream">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-navy-dark text-left text-cream">
                                      <th className="px-3 py-2 font-medium">Date</th>
                                      <th className="px-3 py-2 font-medium">Description</th>
                                      <th className="px-3 py-2 font-medium text-right">Debit</th>
                                      <th className="px-3 py-2 font-medium text-right">Credit</th>
                                      <th className="px-3 py-2 font-medium text-center">Reconciled</th>
                                      <th className="px-3 py-2 font-medium">Event</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {g.lines.map((l) => (
                                      <tr key={l.id} className="border-t border-white/10 text-cream">
                                        <td className="px-3 py-1.5 whitespace-nowrap">{fmtDate(l.date)}</td>
                                        <td className="px-3 py-1.5">{l.description}</td>
                                        <td className="px-3 py-1.5 text-right tabular-nums">{l.debit ? money(l.debit) : ""}</td>
                                        <td className="px-3 py-1.5 text-right tabular-nums">{l.credit ? money(l.credit) : ""}</td>
                                        <td className="px-3 py-1.5 text-center">{l.reconciled ? "Yes" : "No"}</td>
                                        <td className="px-3 py-1.5">{l.eventName}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-muted/40 font-medium">
                    <td className="px-3 py-2">Total {side === "creditors" ? "owed by the lodge" : "owed to the lodge"}</td>
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2 text-right tabular-nums">
                      {total < 0 ? `(${money(total)})` : money(total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
