import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";

const EXCLUDED_CODES = new Set(["4120", "4500"]);

type Account = { id: string; code: string; name: string; account_type?: string };

type ExtraLine = { key: string; accountId: string; direction: "debit" | "credit"; amount: string; description: string };

const toPence = (v: string) => Math.round(parseFloat(v || "0") * 100);
const fmt = (p: number) => `£${(p / 100).toFixed(2)}`;

export default function DirectReceiptTab({ canEdit }: { canEdit: boolean }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [bankId, setBankId] = useState<string | null>(null);
  const [openPeriodId, setOpenPeriodId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [accountId, setAccountId] = useState<string>("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [bankReference, setBankReference] = useState("");
  const [amount, setAmount] = useState("0.00");
  const [presetAmount, setPresetAmount] = useState("0.00");
  const [extraLines, setExtraLines] = useState<ExtraLine[]>([]);
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
    setAllAccounts(all.filter((a) => !EXCLUDED_CODES.has(a.code)));
    setOpenPeriodId((period as any)?.id ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onAmountChange = (v: string) => {
    setAmount(v);
    if (extraLines.length === 0) setPresetAmount(v);
  };

  const addLine = () => {
    if (extraLines.length === 0) setPresetAmount(amount);
    setExtraLines((l) => [
      ...l,
      { key: `${Date.now()}-${Math.random()}`, accountId: "", direction: "debit", amount: "0.00", description: "" },
    ]);
  };

  const updateLine = (key: string, patch: Partial<ExtraLine>) =>
    setExtraLines((l) => l.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const removeLine = (key: string) =>
    setExtraLines((l) => {
      const next = l.filter((x) => x.key !== key);
      if (next.length === 0) setPresetAmount(amount);
      return next;
    });

  const effectivePreset = extraLines.length === 0 ? amount : presetAmount;

  const { debitTotal, creditTotal, diff } = useMemo(() => {
    let d = toPence(amount); // bank line, Dr
    let c = toPence(effectivePreset); // income line, Cr
    for (const l of extraLines) {
      const p = toPence(l.amount);
      if (l.direction === "debit") d += p; else c += p;
    }
    return { debitTotal: d, creditTotal: c, diff: d - c };
  }, [amount, effectivePreset, extraLines]);

  const balanced = diff === 0 && debitTotal > 0;

  const submit = async () => {
    const bankPence = toPence(amount);
    if (!Number.isFinite(bankPence) || bankPence <= 0) {
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
    if (extraLines.some((l) => !l.accountId || toPence(l.amount) <= 0)) {
      toast({ title: "Every added line needs an account and a positive amount", variant: "destructive" });
      return;
    }
    if (!balanced) {
      toast({ title: "Entry is out of balance", variant: "destructive" });
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
    const presetPence = toPence(effectivePreset);
    const lines = [
      { entry_id: entryId, account_id: bankId, debit_pence: bankPence, credit_pence: 0, description: description.trim() },
      ...(presetPence > 0
        ? [{ entry_id: entryId, account_id: accountId, debit_pence: 0, credit_pence: presetPence, description: description.trim() }]
        : []),
      ...extraLines.map((l) => ({
        entry_id: entryId,
        account_id: l.accountId,
        debit_pence: l.direction === "debit" ? toPence(l.amount) : 0,
        credit_pence: l.direction === "credit" ? toPence(l.amount) : 0,
        description: l.description.trim() || description.trim(),
      })),
    ];
    const { error: lineErr } = await supabase.from("journal_lines" as any).insert(lines);

    if (lineErr) {
      await supabase.from("journal_entries" as any).delete().eq("id", entryId);
      setSaving(false);
      toast({ title: "Save failed", description: lineErr.message, variant: "destructive" });
      return;
    }

    setSaving(false);
    setAmount("0.00");
    setPresetAmount("0.00");
    setExtraLines([]);
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
          Dr 1000 Bank, Cr the selected income account. Add extra lines if the banking doesn't map to a single account.
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
                <Label>Amount (£) — banked to 1000 Bank</Label>
                <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => onAmountChange(e.target.value)} disabled={!canEdit} />
              </div>
              {extraLines.length > 0 && (
                <div>
                  <Label>Income line amount (£) — credit</Label>
                  <Input type="number" step="0.01" min="0" value={presetAmount} onChange={(e) => setPresetAmount(e.target.value)} disabled={!canEdit} />
                </div>
              )}
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

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-gold">Additional lines</h3>
                <Button type="button" variant="outline" size="sm" onClick={addLine} disabled={!canEdit}>
                  <Plus className="w-4 h-4 mr-1" /> Add line
                </Button>
              </div>
              {extraLines.map((l) => (
                <div key={l.key} className="grid gap-2 sm:grid-cols-12 items-end rounded border border-gold/10 p-3">
                  <div className="sm:col-span-5">
                    <Label>Account</Label>
                    <Select value={l.accountId} onValueChange={(v) => updateLine(l.key, { accountId: v })} disabled={!canEdit}>
                      <SelectTrigger><SelectValue placeholder="Choose an account" /></SelectTrigger>
                      <SelectContent>
                        {allAccounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Dr / Cr</Label>
                    <Select value={l.direction} onValueChange={(v) => updateLine(l.key, { direction: v as "debit" | "credit" })} disabled={!canEdit}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="debit">Debit</SelectItem>
                        <SelectItem value="credit">Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Amount (£)</Label>
                    <Input type="number" step="0.01" min="0" value={l.amount} onChange={(e) => updateLine(l.key, { amount: e.target.value })} disabled={!canEdit} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Line note</Label>
                    <Input value={l.description} onChange={(e) => updateLine(l.key, { description: e.target.value })} placeholder="Optional" disabled={!canEdit} />
                  </div>
                  <div className="sm:col-span-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(l.key)} disabled={!canEdit}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 text-sm text-primary-foreground/70">
              Debits {fmt(debitTotal)} · Credits {fmt(creditTotal)} ·{" "}
              {diff === 0 ? (
                <span className="text-emerald-400">Balanced</span>
              ) : (
                <span className="text-destructive">Out of balance by {fmt(Math.abs(diff))}</span>
              )}
            </div>

            <div className="mt-4">
              <Button className="bg-gold text-navy hover:bg-gold/90" disabled={!canEdit || saving || !balanced} onClick={submit}>
                {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Record receipt
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
