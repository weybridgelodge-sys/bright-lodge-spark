import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

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
  const [openPeriodId, setOpenPeriodId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [meeting, setMeeting] = useState<string>("October");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [subRate, setSubRate] = useState("250.00");
  const [ageBracket, setAgeBracket] = useState<"over25" | "under25">("over25");
  const [ugleFee, setUgleFee] = useState("132.00");
  const [pglFee, setPglFee] = useState("0.00");
  const [bankReference, setBankReference] = useState("");
  const [saving, setSaving] = useState(false);

  const lastUgleDefaultRef = useRef<string>("132.00");

  const applyAgeBandDefault = (band: "over25" | "under25") => {
    const next = band === "over25" ? "132.00" : "66.00";
    // Only overwrite if the current value is still the last auto-default, blank, or zero.
    if (ugleFee === lastUgleDefaultRef.current || ugleFee === "" || /^0\.?0*$/.test(ugleFee)) {
      setUgleFee(next);
      lastUgleDefaultRef.current = next;
    }
    setAgeBracket(band);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: accts, error: acctErr }, { data: period }] = await Promise.all([
      supabase
        .from("chart_of_accounts" as any)
        .select("id,code")
        .in("code", ["1000", "2000", "4000", "4500", "5000", "5100"]),
      supabase
        .from("treasurer_periods" as any)
        .select("id")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (acctErr) toast({ title: "Could not load accounts", description: acctErr.message, variant: "destructive" });
    const map = new Map<string, string>();
    for (const a of (accts as any[]) ?? []) if (a.code && a.id) map.set(a.code as string, a.id as string);
    setAccounts(map);
    setOpenPeriodId((period as any)?.id ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const pct = MEETINGS.find((m) => m.key === meeting)?.pct ?? 1;
  const proratedPence = useMemo(() => Math.round(toPence(subRate) * pct), [subRate, pct]);
  const uglePence = toPence(ugleFee);
  const pglPence = toPence(pglFee);
  const regPence = uglePence + pglPence;
  const totalPence = proratedPence + regPence;

  const submit = async () => {
    if (!name.trim()) {
      toast({ title: "Enter the new member's name", variant: "destructive" });
      return;
    }
    if (totalPence <= 0) {
      toast({ title: "Total received must be greater than zero", variant: "destructive" });
      return;
    }
    const need = ["1000", "2000", "4000", "4500", "5000", "5100"].filter((c) => !accounts.get(c));
    if (need.length) {
      toast({ title: `Missing accounts: ${need.join(", ")}`, variant: "destructive" });
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
      lines: { account_id: string; debit_pence: number; credit_pence: number }[],
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
        .insert(lines.map((l) => ({ entry_id: id, ...l, description: null })));
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

    const receiptLines = [
      { account_id: A("1000"), debit_pence: totalPence, credit_pence: 0 },
      { account_id: A("4000"), debit_pence: 0, credit_pence: proratedPence },
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
    setUgleFee("132.00");
    lastUgleDefaultRef.current = "132.00";
    setPglFee("0.00");
    setBankReference("");
    toast({ title: "New member fees posted", description: `${posted.length} ledger entries created.` });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-gold/20 bg-primary-foreground/5 p-4">
        <h2 className="font-serif text-lg text-gold mb-1">New Member Fees</h2>
        <p className="text-primary-foreground/60 text-sm mb-4">
          Records the one-off money received from a newly-initiated member: prorated first subscription plus UGLE and
          PGL registration fees. Posts the receipt to the bank and recognises what is owed onward.
        </p>

        {loading ? (
          <p className="text-primary-foreground/60"><Loader2 className="w-4 h-4 mr-1 inline animate-spin" /> Loading…</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>New member name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. John Smith" disabled={!canEdit} />
              </div>
              <div>
                <Label>Meeting initiated at</Label>
                <Select value={meeting} onValueChange={setMeeting} disabled={!canEdit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MEETINGS.map((m) => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date received</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!canEdit} />
              </div>
              <div>
                <Label>Annual subscription rate (£)</Label>
                <Input type="number" step="0.01" min="0" value={subRate} onChange={(e) => setSubRate(e.target.value)} disabled={!canEdit} />
              </div>
              <div className="space-y-3">
                <div>
                  <Label>New member&apos;s age</Label>
                  <Select value={ageBracket} onValueChange={(v) => applyAgeBandDefault(v as "over25" | "under25")} disabled={!canEdit}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="over25">25 and over</SelectItem>
                      <SelectItem value="under25">Under 25</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-primary-foreground/50 text-xs mt-1">
                    UGLE Form P rate — confirm this hasn&apos;t changed before relying on the default.
                  </p>
                </div>
                <div>
                  <Label>UGLE registration fee (£)</Label>
                  <Input type="number" step="0.01" min="0" value={ugleFee} onChange={(e) => setUgleFee(e.target.value)} disabled={!canEdit} />
                </div>
              </div>
              <div>
                <Label>PGL registration fee (£)</Label>
                <Input type="number" step="0.01" min="0" value={pglFee} onChange={(e) => setPglFee(e.target.value)} disabled={!canEdit} />
              </div>
              <div className="sm:col-span-2">
                <Label>Bank reference</Label>
                <Input value={bankReference} onChange={(e) => setBankReference(e.target.value)} placeholder="Optional" disabled={!canEdit} />
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-md border border-gold/20 p-3">
                <p className="text-primary-foreground/60 text-sm">Prorated subscription</p>
                <p className="text-gold font-semibold text-lg">{money(proratedPence)}</p>
              </div>
              <div className="rounded-md border border-gold/20 p-3">
                <p className="text-primary-foreground/60 text-sm">Total received</p>
                <p className="text-gold font-semibold text-lg">{money(totalPence)}</p>
              </div>
            </div>

            <div className="mt-4">
              <Button className="bg-gold text-navy hover:bg-gold/90" disabled={!canEdit || saving} onClick={submit}>
                {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Post to ledger
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
