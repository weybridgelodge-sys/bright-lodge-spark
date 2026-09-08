import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const PAYEES = ["GMC", "UGLE", "Provincial Grand Lodge", "Other"] as const;

const money = (pence: number) =>
  `${pence < 0 ? "-" : ""}£${(Math.abs(pence) / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type LineRow = {
  debit_pence: number;
  credit_pence: number;
  journal_entries: { id: string; payee: string | null } | null;
};

export default function CreditorsTab({ canEdit }: { canEdit: boolean }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payee, setPayee] = useState<string>("GMC");
  const [otherPayee, setOtherPayee] = useState("");
  const [amount, setAmount] = useState("0.00");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  const [lines, setLines] = useState<LineRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: acct } = await supabase
      .from("chart_of_accounts" as any)
      .select("id")
      .eq("code", "2000")
      .maybeSingle();
    const accountId = (acct as any)?.id as string | undefined;
    if (!accountId) {
      setLines([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("journal_lines" as any)
      .select("debit_pence,credit_pence,journal_entries(id,payee)")
      .eq("account_id", accountId);
    if (error) toast({ title: "Could not load creditors", description: error.message, variant: "destructive" });
    setLines(((data as unknown as LineRow[]) ?? []));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const balancePence = useMemo(
    () => lines.reduce((s, l) => s + (l.credit_pence ?? 0) - (l.debit_pence ?? 0), 0),
    [lines],
  );

  const byPayee = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of lines) {
      const key = l.journal_entries?.payee?.trim() || "Uncategorised";
      m.set(key, (m.get(key) ?? 0) + (l.credit_pence ?? 0) - (l.debit_pence ?? 0));
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [lines]);

  const resolvedPayee = payee === "Other" ? otherPayee.trim() : payee;

  const submit = async () => {
    const pence = Math.round(parseFloat(amount || "0") * 100);
    if (!Number.isFinite(pence) || pence <= 0) {
      toast({ title: "Enter a positive amount", variant: "destructive" });
      return;
    }
    if (!resolvedPayee) {
      toast({ title: "Enter a payee name", variant: "destructive" });
      return;
    }
    setSaving(true);

    const [{ data: u }, accounts, openPeriod] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("chart_of_accounts" as any).select("id,code").in("code", ["1000", "2000"]),
      supabase.from("treasurer_periods" as any).select("id").eq("status", "open").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    const rows = (accounts.data as any[]) ?? [];
    const bank = rows.find((a) => a.code === "1000")?.id;
    const creditors = rows.find((a) => a.code === "2000")?.id;
    if (!bank || !creditors) {
      setSaving(false);
      toast({ title: "Accounts 1000 / 2000 not found", variant: "destructive" });
      return;
    }

    const ref = reference.trim();
    const { data: entry, error: entryErr } = await supabase
      .from("journal_entries" as any)
      .insert({
        entry_date: date,
        description: ref ? `Payment to ${resolvedPayee} — ${ref}` : `Payment to ${resolvedPayee}`,
        source_type: "creditor_payment",
        payee: resolvedPayee,
        period_id: (openPeriod.data as any)?.id ?? null,
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
    const { error: lineErr } = await supabase.from("journal_lines" as any).insert([
      { entry_id: entryId, account_id: creditors, debit_pence: pence, credit_pence: 0, description: ref || null },
      { entry_id: entryId, account_id: bank, debit_pence: 0, credit_pence: pence, description: ref || null },
    ]);

    if (lineErr) {
      await supabase.from("journal_entries" as any).delete().eq("id", entryId);
      setSaving(false);
      toast({ title: "Save failed", description: lineErr.message, variant: "destructive" });
      return;
    }

    setSaving(false);
    setAmount("0.00");
    setReference("");
    toast({ title: "Creditor payment recorded" });
    load();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-gold/20 bg-primary-foreground/5 p-4">
        <h2 className="font-serif text-lg text-gold mb-1">Record a Creditor Payment</h2>
        <p className="text-primary-foreground/60 text-sm mb-4">
          Posts a double-entry: Dr 2000 Creditors, Cr 1000 Bank.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!canEdit} />
          </div>
          <div>
            <Label>Payee</Label>
            <Select value={payee} onValueChange={setPayee} disabled={!canEdit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYEES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {payee === "Other" && (
            <div>
              <Label>Payee name</Label>
              <Input value={otherPayee} onChange={(e) => setOtherPayee(e.target.value)} placeholder="e.g. Surrey Masonic Hall Ltd" disabled={!canEdit} />
            </div>
          )}
          <div>
            <Label>Amount (£)</Label>
            <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={!canEdit} />
          </div>
          <div className="sm:col-span-2">
            <Label>Description / reference</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional — e.g. invoice 1042" disabled={!canEdit} />
          </div>
        </div>
        <div className="mt-4">
          <Button className="bg-gold text-navy hover:bg-gold/90" disabled={!canEdit || saving} onClick={submit}>
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Record payment
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-gold/20 bg-primary-foreground/5 p-4">
        <h2 className="font-serif text-lg text-gold mb-3">Creditors Balance</h2>
        {loading ? (
          <p className="text-primary-foreground/60"><Loader2 className="w-4 h-4 mr-1 inline animate-spin" /> Loading…</p>
        ) : (
          <>
            <p className="text-primary-foreground mb-4">
              Overall balance (owed): <span className="text-gold font-semibold">{money(balancePence)}</span>
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-primary-foreground/60 border-b border-gold/20">
                  <th className="py-2">Payee</th>
                  <th className="py-2 text-right">Net movement</th>
                </tr>
              </thead>
              <tbody>
                {byPayee.length === 0 ? (
                  <tr><td colSpan={2} className="py-3 text-primary-foreground/60">No creditor entries yet.</td></tr>
                ) : byPayee.map(([name, pence]) => (
                  <tr key={name} className="border-b border-gold/10">
                    <td className="py-2 text-primary-foreground">{name}</td>
                    <td className="py-2 text-right text-primary-foreground">{money(pence)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>
    </div>
  );
}
