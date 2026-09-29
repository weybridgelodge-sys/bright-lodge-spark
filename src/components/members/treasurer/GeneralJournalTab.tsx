import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePostingPeriod } from "@/lib/treasurer/periods";
import PeriodPicker from "@/components/members/treasurer/PeriodPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { fetchReservePots, type ReservePot } from "@/lib/treasurer/subscriptionSettings";

type Account = { id: string; code: string; name: string; account_type?: string };

type LineRow = {
  key: number;
  accountId: string;
  side: "dr" | "cr";
  amount: string;
  description: string;
  fundCode: string;
};

let nextKey = 1;
const blankLine = (): LineRow => ({ key: nextKey++, accountId: "", side: "dr", amount: "0.00", description: "", fundCode: "" });

const money = (pence: number) =>
  `£${(pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function GeneralJournalTab({ canEdit }: { canEdit: boolean }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const posting = usePostingPeriod(date);
  const openPeriodId = posting.periodId;
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<LineRow[]>([blankLine(), blankLine()]);
  const [saving, setSaving] = useState(false);
  const [pots, setPots] = useState<ReservePot[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: accts, error: acctErr }, potRows] = await Promise.all([
      supabase.from("chart_of_accounts" as any).select("id,code,name,account_type").order("code"),
      fetchReservePots(),
    ]);
    setPots(potRows);
    if (acctErr) toast({ title: "Could not load accounts", description: acctErr.message, variant: "destructive" });
    setAccounts(((accts as any[]) ?? []) as Account[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => {
    let dr = 0, cr = 0;
    for (const l of lines) {
      const pence = Math.round(parseFloat(l.amount || "0") * 100);
      if (!Number.isFinite(pence) || pence < 0) continue;
      if (l.side === "dr") dr += pence; else cr += pence;
    }
    return { dr, cr };
  }, [lines]);

  const balanced = totals.dr === totals.cr && totals.dr > 0;
  const diff = Math.abs(totals.dr - totals.cr);

  const updateLine = (key: number, patch: Partial<LineRow>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const removeLine = (key: number) =>
    setLines((ls) => (ls.length > 2 ? ls.filter((l) => l.key !== key) : ls));

  const addLine = () => setLines((ls) => [...ls, blankLine()]);

  const submit = async () => {
    if (!balanced) {
      toast({ title: "Debits and credits must be equal before posting", variant: "destructive" });
      return;
    }
    if (!description.trim()) {
      toast({ title: "Enter a description for the entry", variant: "destructive" });
      return;
    }
    const reservesId = accounts.find((a) => a.code === "3100")?.id;
    if (reservesId && lines.some((l) => l.accountId === reservesId && !l.fundCode)) {
      toast({ title: "Choose a reserve pot on every 3100 Designated Reserves line", variant: "destructive" });
      return;
    }
    if (lines.some((l) => !l.accountId)) {
      toast({ title: "Choose an account on every line", variant: "destructive" });
      return;
    }

    if (!openPeriodId) {
      toast({ title: "Choose a period to post into", description: "No unlocked period is selected for this date.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();

    const { data: entry, error: entryErr } = await supabase
      .from("journal_entries" as any)
      .insert({
        entry_date: date,
        description: description.trim(),
        source_type: "general_journal",
        period_id: openPeriodId,
        created_by: u.user?.id ?? null,
      })
      .select("id")
      .single();

    if (entryErr || !entry) {
      setSaving(false);
      toast({ title: "Save failed", description: entryErr?.message, variant: "destructive" });
      return;
    }

    const entryId = (entry as any).id as string;
    const lineRows = lines.map((l) => {
      const pence = Math.round(parseFloat(l.amount || "0") * 100);
      return {
        entry_id: entryId,
        account_id: l.accountId,
        debit_pence: l.side === "dr" ? pence : 0,
        credit_pence: l.side === "cr" ? pence : 0,
        description: l.description.trim() || null,
        fund_code: l.accountId === accounts.find((a) => a.code === "3100")?.id ? l.fundCode || null : null,
      };
    });

    const { error: lineErr } = await supabase.from("journal_lines" as any).insert(lineRows);

    if (lineErr) {
      await supabase.from("journal_entries" as any).delete().eq("id", entryId);
      setSaving(false);
      toast({ title: "Save failed", description: lineErr.message, variant: "destructive" });
      return;
    }

    setSaving(false);
    setDescription("");
    setLines([blankLine(), blankLine()]);
    toast({ title: "General journal entry posted" });
  };

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <section className="min-w-0 rounded-lg border border-gold/20 bg-primary-foreground/5 p-4">
        <h2 className="font-serif text-lg text-gold mb-1">General Journal</h2>
        <p className="text-primary-foreground/60 text-sm mb-1">
          For corrections, adjustments, and opening balances. For routine transactions, use the specific
          tab instead (Creditors, Direct Payment, Dining Reconciliation, New Member Fees) — those keep the
          right accounts and safeguards in place automatically.
        </p>
        <p className="text-primary-foreground/50 text-xs mb-4">
          Posts one journal entry with one line per row entered, to the period you choose — it defaults to the unlocked period containing the entry date.
          Debits must equal credits before the entry can be posted.
        </p>

        {loading ? (
          <p className="text-primary-foreground/60"><Loader2 className="w-4 h-4 mr-1 inline animate-spin" /> Loading…</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 mb-5 [&>*]:min-w-0">
              <div>
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!canEdit} />
              </div>
              <PeriodPicker periods={posting.periods} value={posting.periodId} autoId={posting.autoId} onChange={posting.setPeriodId} disabled={!canEdit} />
              <div>
                <Label>Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Opening balances as at 30 Sept 2026"
                  disabled={!canEdit}
                />
              </div>
            </div>

            <div className="space-y-3">
              {lines.map((line, idx) => (
                <div key={line.key} className="grid min-w-0 gap-2 sm:grid-cols-[1fr_110px_110px_1fr_auto] items-end rounded-md border border-gold/10 p-3">
                  <div className="min-w-0">
                    <Label className="text-xs">Account</Label>
                    <Select value={line.accountId} onValueChange={(v) => updateLine(line.key, { accountId: v })} disabled={!canEdit}>
                      <SelectTrigger><SelectValue placeholder="Choose an account" /></SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Dr / Cr</Label>
                    <Select value={line.side} onValueChange={(v) => updateLine(line.key, { side: v as "dr" | "cr" })} disabled={!canEdit}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dr">Debit</SelectItem>
                        <SelectItem value="cr">Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Amount (£)</Label>
                    <Input type="number" step="0.01" min="0" value={line.amount} onChange={(e) => updateLine(line.key, { amount: e.target.value })} disabled={!canEdit} />
                  </div>
                  <div>
                    <Label className="text-xs">Line description (optional)</Label>
                    <Input value={line.description} onChange={(e) => updateLine(line.key, { description: e.target.value })} disabled={!canEdit} />
                  </div>
                  {line.accountId && line.accountId === accounts.find((a) => a.code === "3100")?.id ? (
                    <div className="min-w-0 sm:col-span-5 sm:order-last">
                      <Label className="text-xs">Reserve pot</Label>
                      <Select value={line.fundCode} onValueChange={(v) => updateLine(line.key, { fundCode: v })} disabled={!canEdit}>
                        <SelectTrigger><SelectValue placeholder="Choose the reserve pot" /></SelectTrigger>
                        <SelectContent>
                          {pots.map((p) => (
                            <SelectItem key={p.fund_code} value={p.fund_code}>{p.label} ({p.fund_code})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLine(line.key)}
                    disabled={!canEdit || lines.length <= 2}
                    aria-label={`Remove line ${idx + 1}`}
                    className="justify-self-end text-primary-foreground/60 hover:text-destructive sm:justify-self-auto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-3">
              <Button variant="outline" size="sm" onClick={addLine} disabled={!canEdit} className="border-gold/30">
                <Plus className="w-4 h-4 mr-1" /> Add line
              </Button>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-gold/20 pt-4">
              <p className="text-primary-foreground text-sm">
                Debits: <span className="font-semibold">{money(totals.dr)}</span>
              </p>
              <p className="text-primary-foreground text-sm">
                Credits: <span className="font-semibold">{money(totals.cr)}</span>
              </p>
              {balanced ? (
                <p className="text-sm font-semibold text-emerald-400">Balanced</p>
              ) : (
                <p className="text-sm font-semibold text-red-400">
                  Out of balance by {money(diff)}
                </p>
              )}
            </div>

            <div className="mt-4">
              <Button className="w-full bg-gold text-navy hover:bg-gold/90 sm:w-auto" disabled={!canEdit || saving || !balanced} onClick={submit}>
                {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Post journal entry
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
