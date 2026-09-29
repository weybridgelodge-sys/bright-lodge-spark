import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePostingPeriod } from "@/lib/treasurer/periods";
import PeriodPicker from "@/components/members/treasurer/PeriodPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import type { ReactNode } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { splitSubscription } from "@/lib/treasurer/subscriptionSplit";
import { fetchReservePots, fetchSubscriptionSettings, type ReservePot } from "@/lib/treasurer/subscriptionSettings";

const EXCLUDED_CODES = new Set(["4120", "4500"]);

type Account = { id: string; code: string; name: string; account_type?: string };

type SubMode = "none" | "candidate" | "advance" | "in_year" | "clear_prepayment";
type DebtorLine = { id: string; name: string; pence: number; entry_number: number | null };

type ExtraLine = { key: string; accountId: string; direction: "debit" | "credit"; amount: string; description: string };

const toPence = (v: string) => Math.round(parseFloat(v || "0") * 100);
const fmt = (p: number) => `£${(p / 100).toFixed(2)}`;

export default function DirectReceiptTab({ canEdit }: { canEdit: boolean }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [bankId, setBankId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [accountId, setAccountId] = useState<string>("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const posting = usePostingPeriod(date);
  const openPeriodId = posting.periodId;
  const [description, setDescription] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [bankReference, setBankReference] = useState("");
  const [amount, setAmount] = useState("0.00");
  const [presetAmount, setPresetAmount] = useState("0.00");
  const [extraLines, setExtraLines] = useState<ExtraLine[]>([]);
  const [saving, setSaving] = useState(false);

  const [codeMap, setCodeMap] = useState<Map<string, string>>(new Map());
  const [mode, setMode] = useState<SubMode>("none");
  const isRenewal = mode !== "none";
  const [reliefPence, setReliefPence] = useState(1000);
  const [debtorLines, setDebtorLines] = useState<DebtorLine[]>([]);
  const [clearPick, setClearPick] = useState<Record<string, boolean>>({});
  const [memberName, setMemberName] = useState("");
  const [ageBracket, setAgeBracket] = useState<"over25" | "under25">("over25");
  const [pots, setPots] = useState<ReservePot[]>([]);
  const [annualRatePence, setAnnualRatePence] = useState(25000);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: accts, error: acctErr }, potRows, settings] = await Promise.all([
      supabase.from("chart_of_accounts" as any).select("id,code,name,account_type").order("code"),
      fetchReservePots(),
      fetchSubscriptionSettings(),
    ]);
    setPots(potRows);
    if (settings) {
      setAnnualRatePence(settings.annual_rate_pence);
      if (settings.relief_chest_pence != null) setReliefPence(settings.relief_chest_pence);
    }
    if (acctErr) toast({ title: "Could not load accounts", description: acctErr.message, variant: "destructive" });

    const all = ((accts as any[]) ?? []) as Account[];
    const cm = new Map<string, string>();
    for (const a of all) if (a.code && a.id) cm.set(a.code, a.id);
    setCodeMap(cm);
    setBankId(all.find((a) => a.code === "1000")?.id ?? null);
    setAccounts(all.filter((a) => a.account_type === "income" && !EXCLUDED_CODES.has(a.code)));
    setAllAccounts(all.filter((a) => !EXCLUDED_CODES.has(a.code)));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const under25 = ageBracket === "under25";
  const split = useMemo(() => {
    try { return splitSubscription(toPence(amount), under25, pots, reliefPence); } catch { return null; }
  }, [amount, under25, pots, reliefPence]);

  const loadDebtors = useCallback(async () => {
    const acct1100 = codeMap.get("1100");
    if (!acct1100) return;
    const { data: dr } = await supabase
      .from("journal_lines" as any)
      .select("id,description,debit_pence,journal_entries!inner(entry_number,source_type,description)")
      .eq("account_id", acct1100)
      .gt("debit_pence", 0);
    const { data: cr } = await supabase
      .from("journal_lines" as any)
      .select("description,credit_pence")
      .eq("account_id", acct1100)
      .gt("credit_pence", 0);
    // Net credits already posted against each member name (by line text), oldest debit first.
    const paid = new Map<string, number>();
    for (const c of (cr as any[]) ?? []) {
      const n = String(c.description ?? "").trim().toLowerCase();
      paid.set(n, (paid.get(n) ?? 0) + c.credit_pence);
    }
    const out: DebtorLine[] = [];
    for (const d of ((dr as any[]) ?? []).sort((x, y) => (x.journal_entries?.entry_number ?? 0) - (y.journal_entries?.entry_number ?? 0))) {
      const name = String(d.description ?? "").trim();
      const key = name.toLowerCase();
      const used = Math.min(paid.get(key) ?? 0, d.debit_pence);
      paid.set(key, (paid.get(key) ?? 0) - used);
      if (d.debit_pence - used > 0) out.push({ id: d.id, name, pence: d.debit_pence - used, entry_number: d.journal_entries?.entry_number ?? null });
    }
    setDebtorLines(out);
  }, [codeMap]);

  useEffect(() => { if (mode === "clear_prepayment") loadDebtors(); }, [mode, loadDebtors]);

  useEffect(() => {
    if (mode !== "candidate") return;
    setAmount((annualRatePence * (ageBracket === "under25" ? 0.5 : 1) / 100).toFixed(2));
  }, [isRenewal, ageBracket, annualRatePence]);

  const submitRenewal = async () => {
    const bankPence = toPence(amount);
    if (!memberName.trim()) {
      toast({ title: "Enter the member's name", variant: "destructive" });
      return;
    }
    if (bankPence <= 0) {
      toast({ title: "Enter a positive amount", variant: "destructive" });
      return;
    }
    const need = (mode === "candidate" ? ["1000", "4000", "3100", "2200"] : mode === "advance" ? ["1000", "2100"] : ["1000", "1100"]).filter((c) => !codeMap.get(c));
    if (need.length) {
      toast({ title: `Missing accounts: ${need.join(", ")}`, variant: "destructive" });
      return;
    }

    if (!openPeriodId) {
      toast({ title: "Choose a period to post into", description: "No unlocked period is selected for this date.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const createdBy = u.user?.id ?? null;
    const posted: string[] = [];
    const A = (c: string) => codeMap.get(c) as string;

    const rollbackAll = async () => {
      if (posted.length) await supabase.from("journal_entries" as any).delete().in("id", posted);
    };

    const postEntry = async (
      entry: Record<string, unknown>,
      lines: { account_id: string; debit_pence: number; credit_pence: number; fund_code?: string; description?: string }[],
      stage: string,
    ): Promise<boolean> => {
      const { data: e, error: entryErr } = await supabase
        .from("journal_entries" as any)
        .insert({ entry_date: date, period_id: openPeriodId, created_by: createdBy, ...entry })
        .select("id")
        .single();
      if (entryErr || !e) {
        await rollbackAll();
        toast({ title: `Save failed at ${stage}`, description: entryErr?.message, variant: "destructive" });
        return false;
      }
      const id = (e as any).id as string;
      const { error: lineErr } = await supabase
        .from("journal_lines" as any)
        .insert(lines.map((l) => ({ entry_id: id, fund_code: null, description: null, ...l })));
      if (lineErr) {
        await supabase.from("journal_entries" as any).delete().eq("id", id);
        await rollbackAll();
        toast({ title: `Save failed at ${stage}`, description: lineErr.message, variant: "destructive" });
        return false;
      }
      posted.push(id);
      return true;
    };

    const who = `${memberName.trim()}${under25 ? " (under 25)" : ""}`;
    let ok = false;
    if (mode === "in_year") {
      ok = await postEntry(
        { description: `Subscription received — ${memberName.trim()}`, source_type: "subscription_renewal",
          document_number: documentNumber.trim() || null, bank_reference: bankReference.trim() || null },
        [
          { account_id: A("1000"), debit_pence: bankPence, credit_pence: 0 },
          { account_id: A("1100"), debit_pence: 0, credit_pence: bankPence, description: memberName.trim() },
        ],
        "the subscription receipt entry",
      );
    } else if (mode === "advance") {
      ok = await postEntry(
        { description: `Subscription paid in advance — ${memberName.trim()}`, source_type: "subscription_advance",
          document_number: documentNumber.trim() || null, bank_reference: bankReference.trim() || null },
        [
          { account_id: A("1000"), debit_pence: bankPence, credit_pence: 0 },
          { account_id: A("2100"), debit_pence: 0, credit_pence: bankPence, description: memberName.trim() },
        ],
        "the advance subscription entry",
      );
    } else {
      if (!split) { toast({ title: "Amount is too small for the subscription split", variant: "destructive" }); setSaving(false); return; }
      ok = await postEntry(
        { description: `New candidate subscription — ${who}`, source_type: "subscription_candidate",
          document_number: documentNumber.trim() || null, bank_reference: bankReference.trim() || null },
        [
          { account_id: A("1000"), debit_pence: bankPence, credit_pence: 0 },
          ...split.filter((l) => l.pence > 0).map((l) => ({
            account_id: A(l.code), debit_pence: 0, credit_pence: l.pence,
            ...(l.fund_code ? { fund_code: l.fund_code } : {}),
          })),
        ],
        "the candidate subscription entry",
      );
    }
    if (!ok) { setSaving(false); return; }

    setSaving(false);
    setMemberName("");
    setDocumentNumber("");
    setBankReference("");
    toast({ title: mode === "in_year" ? "Subscription payment posted" : mode === "advance" ? "Advance subscription posted to Deferred Income" : "Candidate subscription posted" });
  };

  const submitClear = async () => {
    const chosen = debtorLines.filter((l) => clearPick[l.id]);
    if (!chosen.length) { toast({ title: "Tick at least one member", variant: "destructive" }); return; }
    const a2100 = codeMap.get("2100"); const a1100 = codeMap.get("1100");
    if (!a2100 || !a1100) { toast({ title: "Accounts 2100 / 1100 not found", variant: "destructive" }); return; }
    if (!openPeriodId) { toast({ title: "Choose a period to post into", variant: "destructive" }); return; }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { data: e, error } = await supabase.from("journal_entries" as any).insert({
      entry_date: date, period_id: openPeriodId, created_by: u.user?.id ?? null, source_type: "subscription_prepayment_clear",
      description: `Prepayments cleared against subscription charges — ${chosen.map((c) => c.name).join(", ")}`,
    }).select("id").single();
    if (error || !e) { setSaving(false); toast({ title: "Save failed", description: error?.message, variant: "destructive" }); return; }
    const id = (e as any).id as string;
    const rows = chosen.flatMap((c) => [
      { entry_id: id, account_id: a2100, debit_pence: c.pence, credit_pence: 0, description: c.name },
      { entry_id: id, account_id: a1100, debit_pence: 0, credit_pence: c.pence, description: c.name },
    ]);
    const { error: le } = await supabase.from("journal_lines" as any).insert(rows);
    if (le) {
      await supabase.from("journal_entries" as any).delete().eq("id", id);
      setSaving(false); toast({ title: "Save failed", description: le.message, variant: "destructive" }); return;
    }
    setSaving(false); setClearPick({});
    toast({ title: `Cleared ${chosen.length} prepayment${chosen.length > 1 ? "s" : ""}` });
    loadDebtors();
  };

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
    const presetPence = toPence(effectivePreset);
    if (!Number.isFinite(bankPence) || bankPence <= 0) {
      toast({ title: "Enter a positive amount", variant: "destructive" });
      return;
    }
    if (presetPence > 0 && !accountId) {
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
            <div className="mb-4 max-w-xl">
              <Label>What is this receipt?</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as SubMode)} disabled={!canEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not a subscription — ordinary receipt</SelectItem>
                  <SelectItem value="candidate">Subscription: new candidate&apos;s first payment (not yet a member, never charged)</SelectItem>
                  <SelectItem value="advance">Subscription: existing member paying in advance, before this year&apos;s charge exists</SelectItem>
                  <SelectItem value="in_year">Subscription: member paying a balance already charged in October</SelectItem>
                  <SelectItem value="clear_prepayment">Subscription: clear an advance payment now the year has been charged</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-primary-foreground/50 text-xs mt-1">
                {mode === "in_year" && "Dr 1000 Bank · Cr 1100 Debtors. No split — the reserves and Relief Chest shares were posted when the year was charged."}
                {mode === "candidate" && "Dr 1000 Bank · Cr 4000 Subscriptions, 3100 reserve pots (tagged) and 2200 Relief Chest — the full split, because no charge exists yet for this person."}
                {mode === "clear_prepayment" && "No money moves: Dr 2100 Deferred Income · Cr 1100 Debtors for each member you tick, matched to their own charge."}
              </p>
            </div>

            {mode === "clear_prepayment" ? (
              <ClearPrepayment
                lines={debtorLines}
                pick={clearPick}
                setPick={setClearPick}
                canEdit={canEdit}
                saving={saving}
                onSubmit={submitClear}
                period={<PeriodPicker periods={posting.periods} value={posting.periodId} autoId={posting.autoId} onChange={posting.setPeriodId} disabled={!canEdit} />}
                dateInput={<div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!canEdit} /></div>}
              />
            ) : (<>
            <div className="grid gap-3 sm:grid-cols-2">
              {!isRenewal ? (
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
              ) : (
                <>
                  <div>
                    <Label>Member name</Label>
                    <Input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="e.g. John Smith" disabled={!canEdit} />
                  </div>
                  {mode === "candidate" && <div>
                    <Label>Member&apos;s age</Label>
                    <Select value={ageBracket} onValueChange={(v) => setAgeBracket(v as "over25" | "under25")} disabled={!canEdit}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="over25">25 and over</SelectItem>
                        <SelectItem value="under25">Under 25</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>}
                </>
              )}
              <div>
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!canEdit} />
              </div>
              <PeriodPicker periods={posting.periods} value={posting.periodId} autoId={posting.autoId} onChange={posting.setPeriodId} disabled={!canEdit} />
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
              {!isRenewal && (
                <div className="sm:col-span-2">
                  <Label>Description</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Raffle proceeds paid in — September meeting"
                    disabled={!canEdit}
                  />
                </div>
              )}
              <div>
                <Label>Document / receipt number</Label>
                <Input value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} placeholder="Optional" disabled={!canEdit} />
              </div>
              <div>
                <Label>Bank payment reference</Label>
                <Input value={bankReference} onChange={(e) => setBankReference(e.target.value)} placeholder="Optional" disabled={!canEdit} />
              </div>
            </div>

            {isRenewal ? (
              <div className="mt-4 rounded-md border border-gold/20 p-3 text-sm">
                {mode === "in_year" ? (
                  <p className="text-primary-foreground/80">Dr 1000 Bank {fmt(toPence(amount))} · Cr 1100 Debtors {fmt(toPence(amount))}</p>
                ) : split ? (
                  <ul className="space-y-1 text-primary-foreground/80">
                    <li>Dr 1000 Bank {fmt(toPence(amount))}</li>
                    {split.map((l) => (
                      <li key={l.code + (l.fund_code ?? "")}>Cr {l.code} {l.label}{l.fund_code ? ` (${l.fund_code})` : ""} {fmt(l.pence)}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-destructive">The amount is smaller than the reserve and Relief Chest shares.</p>
                )}
              </div>
            ) : (
              <>
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
              </>
            )}

            <div className="mt-4">
              <Button
                className="bg-gold text-navy hover:bg-gold/90"
                disabled={!canEdit || saving || (!isRenewal && !balanced) || (mode === "candidate" && !split)}
                onClick={isRenewal ? submitRenewal : submit}
              >
                {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                {isRenewal ? "Post subscription payment" : "Record receipt"}
              </Button>
            </div>
            </>)}
          </>
        )}
      </section>
    </div>
  );
}

function ClearPrepayment({ lines, pick, setPick, canEdit, saving, onSubmit, period, dateInput }: {
  lines: DebtorLine[]; pick: Record<string, boolean>; setPick: (p: Record<string, boolean>) => void;
  canEdit: boolean; saving: boolean; onSubmit: () => void; period: ReactNode; dateInput: ReactNode;
}) {
  const total = lines.filter((l) => pick[l.id]).reduce((s, l) => s + l.pence, 0);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">{dateInput}{period}</div>
      <p className="text-primary-foreground/60 text-sm">
        Outstanding subscription charges. Tick each member whose prepayment is sitting in 2100 Deferred Income — each gets its own pair of lines.
      </p>
      {lines.length === 0 ? (
        <p className="text-primary-foreground/50 text-sm">No outstanding charges found.</p>
      ) : (
        <ul className="divide-y divide-gold/10 rounded border border-gold/10">
          {lines.map((l) => (
            <li key={l.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <Checkbox id={`clr-${l.id}`} checked={!!pick[l.id]} disabled={!canEdit}
                onCheckedChange={(v) => setPick({ ...pick, [l.id]: v === true })} />
              <Label htmlFor={`clr-${l.id}`} className="flex-1 cursor-pointer">{l.name}</Label>
              <span className="text-primary-foreground/50 text-xs">{l.entry_number ? `JE-${String(l.entry_number).padStart(6, "0")}` : ""}</span>
              <span className="text-gold w-20 text-right">{fmt(l.pence)}</span>
            </li>
          ))}
        </ul>
      )}
      <Button className="bg-gold text-navy hover:bg-gold/90" disabled={!canEdit || saving || total === 0} onClick={onSubmit}>
        {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Clear {fmt(total)} of prepayments
      </Button>
    </div>
  );
}
