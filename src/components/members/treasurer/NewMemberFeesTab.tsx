import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePostingPeriod } from "@/lib/treasurer/periods";
import PeriodPicker from "@/components/members/treasurer/PeriodPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { fetchReservePots, fetchSubscriptionSettings, type ReservePot } from "@/lib/treasurer/subscriptionSettings";
import { splitSubscription, type SplitLine } from "@/lib/treasurer/subscriptionSplit";
import { LODGE_FEE_FALLBACK, discountedPence, feeDefault, validateFeeInputs } from "@/lib/treasurer/lodgeFees";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type FeeDefaults = { ugle: number; pgl: number; pct: number; updatedAt: string | null; updatedBy: string | null };

const MEETINGS = [
  { key: "October", label: "October (100%)", pct: 1 },
  { key: "December", label: "December (75%)", pct: 0.75 },
  { key: "February", label: "February (50%)", pct: 0.5 },
  { key: "May", label: "May (25%)", pct: 0.25 },
] as const;


const money = (pence: number) =>
  `£${(pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const toPence = (v: string) => {
  const n = Math.round(parseFloat(v || "0") * 100);
  return Number.isFinite(n) ? n : 0;
};

export default function NewMemberFeesTab({ canEdit }: { canEdit: boolean }) {
  const [accounts, setAccounts] = useState<Map<string, string>>(new Map());
  const [pots, setPots] = useState<ReservePot[]>([]);
  const [reliefChestPence, setReliefChestPence] = useState(1000);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [meeting, setMeeting] = useState<string>("October");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const posting = usePostingPeriod(date);
  const openPeriodId = posting.periodId;
  const [subRate, setSubRate] = useState("250.00");
  const [ageBracket, setAgeBracket] = useState<"over25" | "under25">("over25");
  const [ugleFee, setUgleFee] = useState("132.00");
  const [pglFee, setPglFee] = useState("15.12");
  const [bankReference, setBankReference] = useState("");
  const [saving, setSaving] = useState(false);

  const lastUgleDefaultRef = useRef<string>("132.00");
  const lastPglDefaultRef = useRef<string>("15.12");

  // Saved lodge defaults (Treasurer/admin only, enforced by the RPCs).
  const [defaults, setDefaults] = useState<FeeDefaults>({
    ugle: LODGE_FEE_FALLBACK.ugle_registration_fee_pence, pgl: LODGE_FEE_FALLBACK.pgl_registration_fee_pence,
    pct: LODGE_FEE_FALLBACK.under_25_discount_percent, updatedAt: null, updatedBy: null,
  });
  const [defUgle, setDefUgle] = useState("132.00");
  const [defPgl, setDefPgl] = useState("15.12");
  const [defPct, setDefPct] = useState("50");
  const [defError, setDefError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [savingDefaults, setSavingDefaults] = useState(false);

  const prefillFrom = (d: FeeDefaults, band: "over25" | "under25") => {
    const u = feeDefault(d.ugle, band === "under25", d.pct), g = feeDefault(d.pgl, band === "under25", d.pct);
    setUgleFee(u); lastUgleDefaultRef.current = u;
    setPglFee(g); lastPglDefaultRef.current = g;
  };

  const applyAgeBandDefault = (band: "over25" | "under25") => {
    const nextUgle = feeDefault(defaults.ugle, band === "under25", defaults.pct);
    const nextPgl = feeDefault(defaults.pgl, band === "under25", defaults.pct);
    // Only overwrite each field if its current value is still its own last auto-default, blank, or zero.
    if (ugleFee === lastUgleDefaultRef.current || ugleFee === "" || /^0\.?0*$/.test(ugleFee)) {
      setUgleFee(nextUgle);
      lastUgleDefaultRef.current = nextUgle;
    }
    if (pglFee === lastPglDefaultRef.current || pglFee === "" || /^0\.?0*$/.test(pglFee)) {
      setPglFee(nextPgl);
      lastPglDefaultRef.current = nextPgl;
    }
    setAgeBracket(band);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: accts, error: acctErr }, potRows, settings, feeRes] = await Promise.all([
      supabase
        .from("chart_of_accounts" as any)
        .select("id,code")
        .in("code", ["1000", "2000", "2200", "3100", "4000", "4500", "5000", "5100"]),
      fetchReservePots(),
      fetchSubscriptionSettings(),
      supabase.rpc("get_lodge_fee_settings" as any),
    ]);
    const feeRow = Array.isArray(feeRes.data) ? (feeRes.data as any[])[0] : null;
    if (feeRow) {
      const d: FeeDefaults = {
        ugle: feeRow.ugle_registration_fee_pence, pgl: feeRow.pgl_registration_fee_pence,
        pct: feeRow.under_25_discount_percent, updatedAt: feeRow.updated_at ?? null, updatedBy: feeRow.updated_by_name ?? null,
      };
      setDefaults(d);
      setDefUgle((d.ugle / 100).toFixed(2)); setDefPgl((d.pgl / 100).toFixed(2)); setDefPct(String(d.pct));
      prefillFrom(d, "over25");
      setAgeBracket("over25");
    } else if (feeRes.error) {
      toast({ title: "Could not load default fees", description: feeRes.error.message, variant: "destructive" });
    }
    setPots(potRows);
    if (settings) {
      setReliefChestPence(settings.relief_chest_pence ?? 1000);
      setSubRate((settings.annual_rate_pence / 100).toFixed(2));
    }
    if (acctErr) toast({ title: "Could not load accounts", description: acctErr.message, variant: "destructive" });
    const map = new Map<string, string>();
    for (const a of (accts as any[]) ?? []) if (a.code && a.id) map.set(a.code as string, a.id as string);
    setAccounts(map);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const pct = MEETINGS.find((m) => m.key === meeting)?.pct ?? 1;
  const proratedPence = useMemo(
    () => Math.round(toPence(subRate) * pct * (ageBracket === "under25" ? 0.5 : 1)),
    [subRate, pct, ageBracket],
  );
  const uglePence = toPence(ugleFee);
  const pglPence = toPence(pglFee);
  const regPence = uglePence + pglPence;
  const totalPence = proratedPence + regPence;
  // Reserve pots and Relief Chest are always the full annual share for the age bracket;
  // only the 4000 remainder reflects proration.
  const split = useMemo(() => {
    try {
      return { lines: splitSubscription(proratedPence, ageBracket === "under25", pots, reliefChestPence), error: null as string | null };
    } catch {
      return { lines: [] as SplitLine[], error: "The prorated subscription is smaller than the full reserve and Relief Chest shares, so it can't be split without a negative Subscriptions line. Not posted — please raise this with the Treasurer's design before recording." };
    }
  }, [proratedPence, ageBracket, pots, reliefChestPence]);
  const incomePence = split.lines.find((l) => l.code === "4000")?.pence ?? 0;
  const potLines = split.lines.filter((l) => l.code === "3100");
  const reliefPence = split.lines.find((l) => l.code === "2200")?.pence ?? 0;
  const reserveTotalPence = potLines.reduce((s, r) => s + r.pence, 0);

  const askSaveDefaults = () => {
    const v = validateFeeInputs(defUgle, defPgl, defPct);
    if ("error" in v) { setDefError(v.error); return; }
    setDefError(null);
    setConfirmOpen(true);
  };

  const saveDefaults = async () => {
    const v = validateFeeInputs(defUgle, defPgl, defPct);
    if ("error" in v) { setDefError(v.error); return; }
    setSavingDefaults(true);
    const { error } = await supabase.rpc("update_lodge_fee_settings" as any, { _ugle_pence: v.ugle, _pgl_pence: v.pgl, _discount_percent: v.pct });
    setSavingDefaults(false);
    setConfirmOpen(false);
    if (error) { toast({ title: "Default fees not saved", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Default fees saved" });
    await load();
  };

  const submit = async () => {
    if (!name.trim()) {
      toast({ title: "Enter the new member's name", variant: "destructive" });
      return;
    }
    if (!bankReference.trim()) {
      toast({ title: "Bank reference is required", variant: "destructive" });
      return;
    }
    if (totalPence <= 0) {
      toast({ title: "Total received must be greater than zero", variant: "destructive" });
      return;
    }
    if (split.error) {
      toast({ title: "Not posted", description: split.error, variant: "destructive" });
      return;
    }
    const need = ["1000", "2000", "2200", "3100", "4000", "4500", "5000", "5100"].filter((c) => !accounts.get(c));
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

    const rollbackAll = async () => {
      if (posted.length) await supabase.from("journal_entries" as any).delete().in("id", posted);
    };

    const postEntry = async (
      entry: Record<string, unknown>,
      lines: { account_id: string; debit_pence: number; credit_pence: number; fund_code?: string }[],
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
        .insert(lines.map((l) => ({ entry_id: id, fund_code: null, ...l, description: null })));
      if (lineErr) {
        await supabase.from("journal_entries" as any).delete().eq("id", id);
        await rollbackAll();
        toast({ title: `Save failed at ${stage}`, description: lineErr.message, variant: "destructive" });
        return false;
      }
      posted.push(id);
      return true;
    };

    const A = (c: string) => accounts.get(c) as string;

    const receiptLines: { account_id: string; debit_pence: number; credit_pence: number; fund_code?: string }[] = [
      { account_id: A("1000"), debit_pence: totalPence, credit_pence: 0 },
      ...split.lines
        .filter((l) => l.pence > 0)
        .map((l) => ({
          account_id: A(l.code),
          debit_pence: 0,
          credit_pence: l.pence,
          ...(l.fund_code ? { fund_code: l.fund_code } : {}),
        })),
    ];
    if (regPence > 0) receiptLines.push({ account_id: A("4500"), debit_pence: 0, credit_pence: regPence });

    const ok1 = await postEntry(
      {
        description: `New member initiation — ${name.trim()} — subscription + registration fees received`,
        source_type: "new_member_receipt",
        bank_reference: bankReference.trim() || null,
      },
      receiptLines,
      "the receipt entry",
    );
    if (!ok1) { setSaving(false); return; }

    if (uglePence > 0) {
      const ok2 = await postEntry(
        {
          description: `UGLE registration fee — ${name.trim()}`,
          source_type: "creditor_recognition",
          payee: "UGLE",
        },
        [
          { account_id: A("5000"), debit_pence: uglePence, credit_pence: 0 },
          { account_id: A("2000"), debit_pence: 0, credit_pence: uglePence },
        ],
        "the UGLE liability entry",
      );
      if (!ok2) { setSaving(false); return; }
    }

    if (pglPence > 0) {
      const ok3 = await postEntry(
        {
          description: `PGL registration fee — ${name.trim()}`,
          source_type: "creditor_recognition",
          payee: "Provincial Grand Lodge",
        },
        [
          { account_id: A("5100"), debit_pence: pglPence, credit_pence: 0 },
          { account_id: A("2000"), debit_pence: 0, credit_pence: pglPence },
        ],
        "the PGL liability entry",
      );
      if (!ok3) { setSaving(false); return; }
    }


    setSaving(false);
    setName("");
    setAgeBracket("over25");
    prefillFrom(defaults, "over25");
    setBankReference("");
    toast({ title: "New member fees posted", description: `${posted.length} ledger entries created.` });
  };

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <section className="min-w-0 rounded-lg border border-gold/20 bg-primary-foreground/5 p-4">
        <h2 className="font-serif text-lg text-gold mb-1">New Member Fees</h2>
        <p className="text-primary-foreground/80 text-sm mb-4">
          Records the one-off money received from a newly-initiated member: prorated first subscription plus UGLE and
          PGL registration fees. Posts one receipt split across 4000 Subscriptions (prorated remainder), the three 3100
          reserve pots and 2200 Relief Chest (always full annual shares), plus 4500 registration fees, and recognises what
          is owed onward to UGLE and PGL.
        </p>

        {loading ? (
          <p className="text-primary-foreground/80"><Loader2 className="w-4 h-4 mr-1 inline animate-spin" /> Loading…</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 [&>*]:min-w-0">
              <div>
                <Label>New member name</Label>
                <Input aria-label="New member name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. John Smith" disabled={!canEdit} />
              </div>
              <div>
                <Label>Meeting initiated at</Label>
                <Select value={meeting} onValueChange={setMeeting} disabled={!canEdit}>
                  <SelectTrigger aria-label="Meeting initiated at"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MEETINGS.map((m) => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date received</Label>
                <Input aria-label="Date received" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!canEdit} />
              </div>
              <PeriodPicker periods={posting.periods} value={posting.periodId} autoId={posting.autoId} onChange={posting.setPeriodId} disabled={!canEdit} />
              <div>
                <Label>Annual subscription rate (£)</Label>
                <Input aria-label="Annual subscription rate (£)" type="number" step="0.01" min="0" value={subRate} onChange={(e) => setSubRate(e.target.value)} disabled={!canEdit} />
              </div>
              <div className="space-y-3">
                <div>
                  <Label>New member&apos;s age</Label>
                  <Select value={ageBracket} onValueChange={(v) => applyAgeBandDefault(v as "over25" | "under25")} disabled={!canEdit}>
                    <SelectTrigger aria-label="New member&apos;s age"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="over25">25 and over</SelectItem>
                      <SelectItem value="under25">Under 25</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-primary-foreground/80 text-xs mt-1">
                    UGLE Form P &amp; PGL registration rates — confirm these haven&apos;t changed before relying on the defaults.
                  </p>
                </div>
                <div>
                  <Label>UGLE registration fee (£)</Label>
                  <Input aria-label="UGLE registration fee (£)" type="number" step="0.01" min="0" value={ugleFee} onChange={(e) => setUgleFee(e.target.value)} disabled={!canEdit} />
                </div>
                <div>
                  <Label>PGL registration fee (£)</Label>
                  <Input aria-label="PGL registration fee (£)" type="number" step="0.01" min="0" value={pglFee} onChange={(e) => setPglFee(e.target.value)} disabled={!canEdit} />
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label>Bank reference *</Label>
                <Input aria-label="Bank reference" value={bankReference} onChange={(e) => setBankReference(e.target.value)} placeholder="Required" disabled={!canEdit} />
                <p className="text-primary-foreground/80 text-xs mt-1">
                  Lodge Number + Registration Fee (RF) + Candidate&apos;s Surname (e.g. L6787 RF Smith)
                </p>
              </div>
            </div>

            {canEdit && (
            <section aria-labelledby="lodge-default-fees" className="mt-6 min-w-0 rounded-lg border-2 border-gold/60 bg-navy p-4">
              <h3 id="lodge-default-fees" className="font-serif text-base text-gold">Lodge default fees</h3>
              <p className="text-primary-foreground/80 text-xs mt-1 mb-3">
                Saved figures that pre-fill the form above. Changing them never alters anything already posted to the ledger.
              </p>
              <div className="grid gap-3 sm:grid-cols-3 [&>*]:min-w-0">
                <div>
                  <Label htmlFor="def-ugle">UGLE fee, 25 and over (£)</Label>
                  <Input id="def-ugle" className="min-h-11" type="number" step="0.01" min="0.01" value={defUgle} onChange={(e) => setDefUgle(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="def-pgl">PGL fee, 25 and over (£)</Label>
                  <Input id="def-pgl" className="min-h-11" type="number" step="0.01" min="0.01" value={defPgl} onChange={(e) => setDefPgl(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="def-pct">Under-25 discount (%)</Label>
                  <Input id="def-pct" className="min-h-11" type="number" step="1" min="0" max="100" value={defPct} onChange={(e) => setDefPct(e.target.value)} />
                </div>
              </div>
              <p className="text-primary-foreground/80 text-xs mt-3">
                Annual subscription rate: <span className="text-gold">{money(toPence(subRate))}</span> (read only — edit it on the Breakeven Calculator tab).
              </p>
              <p className="text-primary-foreground/80 text-xs mt-1">
                Under 25 today: UGLE {money(discountedPence(toPence(defUgle), Number(defPct) || 0))}, PGL {money(discountedPence(toPence(defPgl), Number(defPct) || 0))}.
              </p>
              <p className="text-gold text-xs mt-1">These figures appear on the public Join Us and FAQ pages.</p>
              <p className="text-primary-foreground/80 text-xs mt-1">
                {defaults.updatedAt
                  ? `Last updated by ${defaults.updatedBy || "unknown"} on ${new Date(defaults.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
                  : "Not yet updated since the figures were first saved."}
              </p>
              {defError && <p role="alert" className="mt-2 text-sm text-destructive-foreground">{defError}</p>}
              <Button className="mt-3 min-h-11 w-full bg-gold text-navy hover:bg-gold/90 sm:w-auto" disabled={savingDefaults} onClick={askSaveDefaults}>
                {savingDefaults && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Save default fees
              </Button>
              <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Save default fees?</AlertDialogTitle>
                    <AlertDialogDescription>
                      UGLE £{defUgle}, PGL £{defPgl}, under-25 discount {defPct}%. These figures appear on the public Join Us and FAQ pages. Entries already posted are not changed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="min-h-11">Cancel</AlertDialogCancel>
                    <AlertDialogAction className="min-h-11" onClick={(e) => { e.preventDefault(); saveDefaults(); }}>Save default fees</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </section>
            )}

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="min-w-0 rounded-md border border-gold/20 p-3">
                <p className="text-primary-foreground/80 text-sm">Prorated subscription</p>
                <p className="text-gold font-semibold text-lg">{money(proratedPence)}</p>
              </div>
              <div className="min-w-0 break-words rounded-md border border-gold/20 p-3">
                <p className="text-primary-foreground/80 text-sm">How the subscription is split</p>
                <p className="text-primary-foreground/80 text-xs mt-1">
                  4000 Subscriptions {money(incomePence)} (prorated remainder)
                </p>
                <div className="text-primary-foreground/80 text-xs">
                  <span>3100 reserves {money(reserveTotalPence)} — </span>
                  <span className="inline-flex flex-wrap gap-x-2">
                    {potLines.map((r) => <span key={r.fund_code}>{r.label} {money(r.pence)}</span>)}
                  </span>
                </div>
                <p className="text-primary-foreground/80 text-xs">2200 Relief Chest {money(reliefPence)}</p>
                <p className="text-primary-foreground/80 text-xs mt-1">Reserve and Relief Chest shares are always the full annual amount.</p>
              </div>
              <div className="min-w-0 rounded-md border border-gold/20 p-3">
                <p className="text-primary-foreground/80 text-sm">Total received</p>
                <p className="text-gold font-semibold text-lg">{money(totalPence)}</p>
              </div>
            </div>

            {split.error && (
              <p role="alert" className="mt-3 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive-foreground">
                {split.error}
              </p>
            )}

            <div className="mt-4">
              <Button className="w-full bg-gold text-navy hover:bg-gold/90 sm:w-auto" disabled={!canEdit || saving || !!split.error} onClick={submit}>
                {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Post to ledger
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
