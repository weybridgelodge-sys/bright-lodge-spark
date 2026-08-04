import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Check, AlertTriangle, Save, Plus, ExternalLink } from "lucide-react";
import {
  isWeybridgeLodge,
  meetingTypeLabel,
  paymentMethodLabel,
} from "@/lib/festiveBoard";

type Meeting = {
  id: string;
  meeting_date: string;
  meeting_type: string;
};

type AttRow = {
  meeting_id: string;
  member_id: string | null;
  visitor_lodge_name: string | null;
  attendance_status: string;
  payment_method: string | null;
  amount_pence: number | null;
  is_meeting_only: boolean | null;
};

type Invoice = {
  id: string;
  meeting_id: string;
  invoice_headcount: number | null;
  per_head_pence: number | null;
  override_total_pence: number | null;
  notes: string | null;
  transaction_id: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
};

const gbp = (pence: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);

function invoiceTotalPence(inv: {
  invoice_headcount: number | null;
  per_head_pence: number | null;
  override_total_pence: number | null;
}): number | null {
  if (inv.override_total_pence != null) return inv.override_total_pence;
  if (inv.invoice_headcount != null && inv.per_head_pence != null)
    return Math.round(inv.invoice_headcount * inv.per_head_pence);
  return null;
}

function MeetingPanel({
  meeting,
  rows,
  invoice,
  canEdit,
  onChanged,
  onGoToTransaction,
}: {
  meeting: Meeting;
  rows: AttRow[];
  invoice: Invoice | null;
  canEdit: boolean;
  onChanged: () => void;
  onGoToTransaction: (txId: string) => void;
}) {
  const [headcount, setHeadcount] = useState("");
  const [perHead, setPerHead] = useState("");
  const [override, setOverride] = useState("");
  const [notes, setNotes] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setHeadcount(invoice?.invoice_headcount != null ? String(invoice.invoice_headcount) : "");
    setPerHead(invoice?.per_head_pence != null ? (invoice.per_head_pence / 100).toFixed(2) : "");
    setOverride(invoice?.override_total_pence != null ? (invoice.override_total_pence / 100).toFixed(2) : "");
    setNotes(invoice?.notes ?? "");
    setInvoiceNumber(invoice?.invoice_number ?? "");
    setInvoiceDate(invoice?.invoice_date ?? "");
  }, [invoice]);

  // ── Portal-side dining figures (dining only, excludes meeting-only) ──
  const summary = useMemo(() => {
    const diners = rows.filter(
      (r) =>
        (r.attendance_status === "attended" || r.attendance_status === "booked") &&
        !r.is_meeting_only
    );
    let members = 0;
    let visitors = 0;
    const byMethod = new Map<string, { count: number; pence: number }>();
    let collected = 0;
    for (const r of diners) {
      if (r.member_id || isWeybridgeLodge(r.visitor_lodge_name)) members += 1;
      else visitors += 1;
      const key = r.payment_method ?? "unknown";
      const cur = byMethod.get(key) ?? { count: 0, pence: 0 };
      cur.count += 1;
      cur.pence += r.amount_pence ?? 0;
      byMethod.set(key, cur);
      collected += r.amount_pence ?? 0;
    }
    return {
      total: diners.length,
      members,
      visitors,
      collected,
      byMethod: [...byMethod.entries()].sort((a, b) => b[1].count - a[1].count),
    };
  }, [rows]);

  const draftTotal = useMemo(() => {
    const ov = override.trim() ? Math.round(parseFloat(override) * 100) : null;
    const hc = headcount.trim() ? parseInt(headcount, 10) : null;
    const ph = perHead.trim() ? Math.round(parseFloat(perHead) * 100) : null;
    return invoiceTotalPence({
      invoice_headcount: Number.isFinite(hc as number) ? hc : null,
      per_head_pence: Number.isFinite(ph as number) ? ph : null,
      override_total_pence: Number.isFinite(ov as number) ? ov : null,
    });
  }, [headcount, perHead, override]);

  const invHc = headcount.trim() ? parseInt(headcount, 10) : null;
  const diff = invHc != null && Number.isFinite(invHc) ? invHc - summary.total : null;

  const save = async () => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const payload = {
      meeting_id: meeting.id,
      invoice_headcount: headcount.trim() ? parseInt(headcount, 10) : null,
      per_head_pence: perHead.trim() ? Math.round(parseFloat(perHead) * 100) : null,
      override_total_pence: override.trim() ? Math.round(parseFloat(override) * 100) : null,
      notes: notes.trim() || null,
      created_by: u.user?.id ?? null,
    };
    const { error } = await supabase
      .from("treasurer_dining_invoices" as any)
      .upsert(payload as any, { onConflict: "meeting_id" });
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "GMC invoice saved" });
    onChanged();
  };

  const createTransaction = async () => {
    if (draftTotal == null || draftTotal <= 0) {
      toast({ title: "Enter the invoice figures first", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { data: u } = await supabase.auth.getUser();
    const { data: tx, error } = await supabase
      .from("treasurer_transactions" as any)
      .insert({
        transaction_date: meeting.meeting_date,
        direction: "expense",
        payment_method: "bank_transfer",
        category: "gmc_dining",
        amount_pence: draftTotal,
        description: `GMC dining invoice — ${new Date(meeting.meeting_date).toLocaleDateString("en-GB")} ${meetingTypeLabel(meeting.meeting_type)}${
          invHc != null ? ` (${invHc} diners)` : ""
        }`,
        reconciled: false,
        created_by: u.user?.id ?? null,
      })
      .select("id")
      .single();
    if (error || !tx) {
      setCreating(false);
      toast({ title: "Couldn't create transaction", description: error?.message, variant: "destructive" });
      return;
    }
    const { error: linkErr } = await supabase
      .from("treasurer_dining_invoices" as any)
      .upsert(
        {
          meeting_id: meeting.id,
          invoice_headcount: headcount.trim() ? parseInt(headcount, 10) : null,
          per_head_pence: perHead.trim() ? Math.round(parseFloat(perHead) * 100) : null,
          override_total_pence: override.trim() ? Math.round(parseFloat(override) * 100) : null,
          notes: notes.trim() || null,
          transaction_id: (tx as any).id,
          created_by: u.user?.id ?? null,
        } as any,
        { onConflict: "meeting_id" }
      );
    setCreating(false);
    if (linkErr) {
      toast({ title: "Transaction created but not linked", description: linkErr.message, variant: "destructive" });
    } else {
      toast({ title: "Transaction created in the register" });
    }
    onChanged();
  };

  return (
    <div className="rounded-sm border border-gold/20 bg-navy-light/30">
      <div className="flex items-center justify-between gap-2 flex-wrap px-4 py-3 border-b border-gold/15">
        <h3 className="font-serif text-gold">
          {new Date(meeting.meeting_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          <span className="text-primary-foreground/60 text-sm ml-2">{meetingTypeLabel(meeting.meeting_type)}</span>
        </h3>
        {diff == null ? (
          <Badge variant="outline" className="border-gold/40 text-primary-foreground/70">No invoice entered</Badge>
        ) : diff === 0 ? (
          <Badge variant="outline" className="border-emerald-500/60 text-emerald-300">
            <Check className="w-3.5 h-3.5 mr-1" /> Matches — {summary.total} diners
          </Badge>
        ) : (
          <Badge variant="outline" className={Math.abs(diff) > 2 ? "border-red-500/60 text-red-300" : "border-amber-500/60 text-amber-300"}>
            <AlertTriangle className="w-3.5 h-3.5 mr-1" />
            GMC {diff > 0 ? "higher" : "lower"} by {Math.abs(diff)} (invoice {invHc} vs portal {summary.total})
          </Badge>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 p-4">
        {/* Portal side */}
        <div className="space-y-2">
          <h4 className="text-sm uppercase tracking-wider text-primary-foreground/60">Portal dining register</h4>
          <div className="text-sm text-primary-foreground">
            <span className="text-gold font-medium tabular-nums">{summary.total}</span> dining
            <span className="text-primary-foreground/60"> ({summary.members} members, {summary.visitors} visitors)</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-primary-foreground/60 border-b border-gold/15">
                <th className="py-1">Payment method</th>
                <th className="py-1 text-right">Diners</th>
                <th className="py-1 text-right">Collected</th>
              </tr>
            </thead>
            <tbody>
              {summary.byMethod.length === 0 && (
                <tr><td colSpan={3} className="py-3 text-primary-foreground/50">No dining attendees recorded.</td></tr>
              )}
              {summary.byMethod.map(([m, v]) => (
                <tr key={m} className="border-b border-gold/10">
                  <td className="py-1">{paymentMethodLabel(m)}</td>
                  <td className="py-1 text-right tabular-nums">{v.count}</td>
                  <td className="py-1 text-right tabular-nums text-gold">{gbp(v.pence)}</td>
                </tr>
              ))}
              {summary.byMethod.length > 0 && (
                <tr>
                  <td className="py-1 font-medium">Total</td>
                  <td className="py-1 text-right tabular-nums font-medium">{summary.total}</td>
                  <td className="py-1 text-right tabular-nums font-medium text-gold">{gbp(summary.collected)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* GMC invoice side */}
        <div className="space-y-3">
          <h4 className="text-sm uppercase tracking-wider text-primary-foreground/60">GMC invoice</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Invoice headcount</Label>
              <Input inputMode="numeric" value={headcount} disabled={!canEdit} onChange={(e) => setHeadcount(e.target.value)} placeholder="34" />
            </div>
            <div>
              <Label>Per head (£)</Label>
              <Input inputMode="decimal" value={perHead} disabled={!canEdit} onChange={(e) => setPerHead(e.target.value)} placeholder="32.00" />
            </div>
            <div className="col-span-2">
              <Label>Override total (£) — optional</Label>
              <Input inputMode="decimal" value={override} disabled={!canEdit} onChange={(e) => setOverride(e.target.value)} placeholder="Leave blank for headcount × rate" />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Input value={notes} disabled={!canEdit} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. includes 2 complimentary covers" />
            </div>
          </div>
          <div className="flex items-baseline justify-between text-sm border-t border-gold/15 pt-2">
            <span className="text-primary-foreground/70">Invoice total</span>
            <span className="text-gold font-medium tabular-nums">{draftTotal != null ? gbp(draftTotal) : "—"}</span>
          </div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-primary-foreground/70">Net vs fees collected</span>
            <span className="tabular-nums text-primary-foreground">
              {draftTotal != null ? gbp(summary.collected - draftTotal) : "—"}
            </span>
          </div>

          {canEdit && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" className="bg-gold text-navy hover:bg-gold/90 min-h-11 sm:min-h-0" disabled={saving} onClick={save}>
                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} Save invoice
              </Button>
              {invoice?.transaction_id ? (
                <Button size="sm" variant="outline" className="min-h-11 sm:min-h-0" onClick={() => onGoToTransaction(invoice.transaction_id!)}>
                  <ExternalLink className="w-4 h-4 mr-1" /> View linked transaction
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="min-h-11 sm:min-h-0" disabled={creating} onClick={createTransaction}>
                  {creating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />} Create GMC dining transaction
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DiningReconciliationTab({
  canEdit,
  onGoToTransaction,
}: {
  canEdit: boolean;
  onGoToTransaction: (txId: string) => void;
}) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [rows, setRows] = useState<AttRow[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [m, a, i] = await Promise.all([
      supabase.from("festive_board_meetings" as any).select("id,meeting_date,meeting_type").order("meeting_date", { ascending: false }),
      supabase.from("festive_board_attendance" as any).select("meeting_id,member_id,visitor_lodge_name,attendance_status,payment_method,amount_pence,is_meeting_only"),
      supabase.from("treasurer_dining_invoices" as any).select("*"),
    ]);
    if (!m.error) setMeetings((m.data as unknown as Meeting[]) ?? []);
    if (!a.error) setRows((a.data as unknown as AttRow[]) ?? []);
    if (!i.error) setInvoices((i.data as unknown as Invoice[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const byMeeting = useMemo(() => {
    const map = new Map<string, AttRow[]>();
    for (const r of rows) {
      const arr = map.get(r.meeting_id) ?? [];
      arr.push(r);
      map.set(r.meeting_id, arr);
    }
    return map;
  }, [rows]);

  const invMap = useMemo(() => new Map(invoices.map((i) => [i.meeting_id, i])), [invoices]);

  if (loading) {
    return <p className="text-primary-foreground/60"><Loader2 className="w-4 h-4 mr-1 inline animate-spin" /> Loading…</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-primary-foreground/60">
        Dining headcounts are derived from the Festive Board Register (booked or attended, dining only — meeting-only attendees are excluded).
        Enter the GMC invoice figures to check them against the register and post the invoice to the Transaction Register.
      </p>
      {meetings.length === 0 && <p className="text-primary-foreground/50">No Festive Board meetings recorded.</p>}
      {meetings.map((m) => (
        <MeetingPanel
          key={m.id}
          meeting={m}
          rows={byMeeting.get(m.id) ?? []}
          invoice={invMap.get(m.id) ?? null}
          canEdit={canEdit}
          onChanged={load}
          onGoToTransaction={onGoToTransaction}
        />
      ))}
    </div>
  );
}
