import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const EXCLUDED_CODES = new Set(["4120", "4500"]);

type Account = { id: string; code: string; name: string; account_type?: string };

export default function DirectReceiptTab({ canEdit }: { canEdit: boolean }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [bankId, setBankId] = useState<string | null>(null);
  const [openPeriodId, setOpenPeriodId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [accountId, setAccountId] = useState<string>("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [bankReference, setBankReference] = useState("");
  const [amount, setAmount] = useState("0.00");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: accts, error: acctErr }, { data: period }] = await Promise.all([
      supabase.from("chart_of_accounts" as any).select("id,code,name,account_type").order("code"),
      supabase
        .from("treasurer_periods" as any)
        .select("id")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (acctErr) toast({ title: "Could not load accounts", description: acctErr.message, variant: "destructive" });

    const all = ((accts as any[]) ?? []) as Account[];
    setBankId(all.find((a) => a.code === "1000")?.id ?? null);
    setAccounts(all.filter((a) => a.account_type === "income" && !EXCLUDED_CODES.has(a.code)));
    setOpenPeriodId((period as any)?.id ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    const pence = Math.round(parseFloat(amount || "0") * 100);
    if (!Number.isFinite(pence) || pence <= 0) {
      toast({ title: "Enter a positive amount", variant: "destructive" });
      return;
    }
    if (!accountId) {
      toast({ title: "Choose an income account", variant: "destructive" });
      return;
    }
    if (!description.trim()) {
      toast({ title: "Enter a description", variant: "destructive" });
      return;
    }
    if (!bankId) {
      toast({ title: "Bank account 1000 not found", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { data: u } = await supabase.auth.getUser();

    const { data: entry, error: entryErr } = await supabase
      .from("journal_entries" as any)
      .insert({
        entry_date: date,
        description: description.trim(),
        source_type: "direct_receipt",
        document_number: documentNumber.trim() || null,
        bank_reference: bankReference.trim() || null,
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
      { entry_id: entryId, account_id: bankId, debit_pence: pence, credit_pence: 0, description: description.trim() },
      { entry_id: entryId, account_id: accountId, debit_pence: 0, credit_pence: pence, description: description.trim() },
    ]);

    if (lineErr) {
      await supabase.from("journal_entries" as any).delete().eq("id", entryId);
      setSaving(false);
      toast({ title: "Save failed", description: lineErr.message, variant: "destructive" });
      return;
    }

    setSaving(false);
    setAmount("0.00");
    setDescription("");
    setDocumentNumber("");
    setBankReference("");
    toast({ title: "Direct receipt recorded" });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-gold/20 bg-primary-foreground/5 p-4">
        <h2 className="font-serif text-lg text-gold mb-1">Record a Direct Receipt</h2>
        <p className="text-primary-foreground/60 text-sm mb-4">
          For money received straight into the bank — e.g. a bank transfer or cash paid in. Posts a double-entry:
          Dr 1000 Bank, Cr the selected income account.
        </p>

        {loading ? (
          <p className="text-primary-foreground/60"><Loader2 className="w-4 h-4 mr-1 inline animate-spin" /> Loading…</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Income account</Label>
                <Select value={accountId} onValueChange={setAccountId} disabled={!canEdit}>
                  <SelectTrigger><SelectValue placeholder="Choose an income account" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-primary-foreground/50 text-xs mt-1">
                  Card fee-cover and new-member registration fees are handled by their own dedicated tabs — use this
                  for everything else, including bank-transfer or cash payments that don't go through Stripe.
                </p>
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!canEdit} />
              </div>
              <div>
                <Label>Amount (£)</Label>
                <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={!canEdit} />
              </div>
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Raffle proceeds paid in — September meeting"
                  disabled={!canEdit}
                />
              </div>
              <div>
                <Label>Document / receipt number</Label>
                <Input value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} placeholder="Optional" disabled={!canEdit} />
              </div>
              <div>
                <Label>Bank payment reference</Label>
                <Input value={bankReference} onChange={(e) => setBankReference(e.target.value)} placeholder="Optional" disabled={!canEdit} />
              </div>
            </div>
            <div className="mt-4">
              <Button className="bg-gold text-navy hover:bg-gold/90" disabled={!canEdit || saving} onClick={submit}>
                {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Record receipt
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
