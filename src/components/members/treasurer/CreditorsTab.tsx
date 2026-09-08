import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import AnnualReturnCalculator from "./AnnualReturnCalculator";

const PAYEES = ["GMC", "UGLE", "Provincial Grand Lodge", "Other"] as const;

const RECOGNITION_TYPES = ["GMC Levy", "Other"] as const;

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

  const [recDate, setRecDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [recPayee, setRecPayee] = useState<string>("GMC Levy");
  const [recOtherPayee, setRecOtherPayee] = useState("");
  const [recAmount, setRecAmount] = useState("0.00");
  const [recReference, setRecReference] = useState("");
  const [recSaving, setRecSaving] = useState(false);

  const [lines, setLines] = useState<LineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Map<string, string>>(new Map());
  const [openPeriodId, setOpenPeriodId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: accts }, { data: period }] = await Promise.all([
      supabase
        .from("chart_of_accounts" as any)
        .select("id,code")
        .in("code", ["1000", "2000", "5000", "5100", "5200", "5900"]),
      supabase
        .from("treasurer_periods" as any)
        .select("id")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const map = new Map<string, string>();
    for (const a of (accts as any[]) ?? []) {
      if (a.code && a.id) map.set(a.code as string, a.id as string);
    }
    setAccounts(map);
    setOpenPeriodId((period as any)?.id ?? null);

    const creditorsId = map.get("2000");
    if (!creditorsId) {
      setLines([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("journal_lines" as any)
      .select("debit_pence,credit_pence,journal_entries(id,payee)")
      .eq("account_id", creditorsId);
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

  const submitPayment = async () => {
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

    const [{ data: u }] = await Promise.all([
      supabase.auth.getUser(),
    ]);

    const bank = accounts.get("1000");
    const creditors = accounts.get("2000");
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

  const recognitionMapping: Record<string, { code: string; payee: string }> = {
    "GMC Levy": { code: "5200", payee: "GMC" },
    Other: { code: "5900", payee: "" },
  };

  const submitRecognition = async () => {
    const pence = Math.round(parseFloat(recAmount || "0") * 100);
    if (!Number.isFinite(pence) || pence <= 0) {
      toast({ title: "Enter a positive amount", variant: "destructive" });
      return;
    }

    const mapping = recognitionMapping[recPayee];
    const payeeTag = recPayee === "Other" ? recOtherPayee.trim() : mapping.payee;
    if (!payeeTag) {
      toast({ title: "Enter a payee name", variant: "destructive" });
      return;
    }

    const expenseAccountId = accounts.get(mapping.code);
    const creditorsId = accounts.get("2000");
    if (!expenseAccountId || !creditorsId) {
      toast({ title: "Required expense or creditors account not found", variant: "destructive" });
      return;
    }

    setRecSaving(true);
    const { data: u } = await supabase.auth.getUser();

    const ref = recReference.trim();
    const description = ref ? `${payeeTag} — ${ref}` : payeeTag;

    const { data: entry, error: entryErr } = await supabase
      .from("journal_entries" as any)
      .insert({
        entry_date: recDate,
        description,
        source_type: "creditor_recognition",
        payee: payeeTag,
        period_id: openPeriodId,
        created_by: u.user?.id ?? null,
      })
      .select("id")
      .single();

    if (entryErr || !entry) {
      setRecSaving(false);
      toast({ title: "Save failed", description: entryErr?.message, variant: "destructive" });
      return;
    }

    const entryId = (entry as any).id as string;
    const { error: lineErr } = await supabase.from("journal_lines" as any).insert([
      { entry_id: entryId, account_id: expenseAccountId, debit_pence: pence, credit_pence: 0, description: ref || null },
      { entry_id: entryId, account_id: creditorsId, debit_pence: 0, credit_pence: pence, description: ref || null },
    ]);

    if (lineErr) {
      await supabase.from("journal_entries" as any).delete().eq("id", entryId);
      setRecSaving(false);
      toast({ title: "Save failed", description: lineErr.message, variant: "destructive" });
      return;
    }

    setRecSaving(false);
    setRecAmount("0.00");
    setRecReference("");
    toast({ title: "Liability recognised" });
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
          <Button className="bg-gold text-navy hover:bg-gold/90" disabled={!canEdit || saving} onClick={submitPayment}>
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Record payment
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-gold/20 bg-primary-foreground/5 p-4">
        <h2 className="font-serif text-lg text-gold mb-1">Recognise a Liability</h2>
        <p className="text-primary-foreground/60 text-sm mb-4">
          Records money the lodge owes before it is paid. Posts a double-entry: Dr expense account, Cr 2000 Creditors.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Date</Label>
            <Input type="date" value={recDate} onChange={(e) => setRecDate(e.target.value)} disabled={!canEdit} />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={recPayee} onValueChange={setRecPayee} disabled={!canEdit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RECOGNITION_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {recPayee === "Other" && (
            <div className="sm:col-span-2">
              <Label>Payee name</Label>
              <Input value={recOtherPayee} onChange={(e) => setRecOtherPayee(e.target.value)} placeholder="e.g. Metropolitan Grand Lodge" disabled={!canEdit} />
            </div>
          )}
          <div>
            <Label>Amount (£)</Label>
            <Input type="number" step="0.01" min="0" value={recAmount} onChange={(e) => setRecAmount(e.target.value)} disabled={!canEdit} />
          </div>
          <div className="sm:col-span-2">
            <Label>Reference / description</Label>
            <Input value={recReference} onChange={(e) => setRecReference(e.target.value)} placeholder="Optional — e.g. Annual Return year ending 30 Sept 2027" disabled={!canEdit} />
          </div>
        </div>
        <div className="mt-4">
          <Button className="bg-gold text-navy hover:bg-gold/90" disabled={!canEdit || recSaving} onClick={submitRecognition}>
            {recSaving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Recognise liability
          </Button>
        </div>
      </section>

      <AnnualReturnCalculator canEdit={canEdit} />

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
