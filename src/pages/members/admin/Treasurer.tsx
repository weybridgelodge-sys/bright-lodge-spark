import { useCallback, useEffect, useMemo, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import ProtectedRoute from "@/components/members/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, Lock, Unlock, ShieldCheck, Paperclip } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────
type Period = {
  id: string;
  label: string;
  meeting_id: string | null;
  period_start: string | null;
  period_end: string | null;
  status: "open" | "locked";
  locked_at: string | null;
  locked_by: string | null;
  unlock_requested_by: string | null;
  unlock_requested_at: string | null;
  unlock_reason: string | null;
  unlock_approved_by_treasurer: boolean;
  unlock_approved_by_secretary: boolean;
};

type Direction = "income" | "expense";
type PaymentMethod = "cash" | "cheque" | "bank_transfer" | "stripe" | "other";

type Tx = {
  id: string;
  period_id: string | null;
  transaction_date: string;
  direction: Direction;
  payment_method: PaymentMethod;
  category: string;
  amount_pence: number;
  description: string | null;
  reconciled: boolean;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_size: number | null;
};

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "stripe", label: "Stripe" },
  { value: "other", label: "Other" },
];

const COMMON_CATEGORIES = [
  "subscriptions", "charity_column", "raffle", "gmc_levy", "gmc_dining",
  "stationery", "raffle_prizes", "new_member_purchases", "bank_interest",
  "apron_stock", "other",
];

const gbp = (pence: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);

// ─── UI helpers (match CharitySteward style) ────────────────────────────────
function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-gold/20 bg-navy-light/30 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-serif text-gold text-base">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="text-primary-foreground/70">{label}</span>
      <span className="text-primary-foreground font-medium tabular-nums">{value}</span>
    </div>
  );
}

// ─── Transaction Register ───────────────────────────────────────────────────
function TransactionsTab({
  transactions, periods, canEdit, onChange,
}: {
  transactions: Tx[]; periods: Period[]; canEdit: boolean; onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tx | null>(null);
  const periodMap = useMemo(() => new Map(periods.map(p => [p.id, p])), [periods]);

  const income = transactions.filter(t => t.direction === "income").reduce((a, t) => a + t.amount_pence, 0);
  const expense = transactions.filter(t => t.direction === "expense").reduce((a, t) => a + t.amount_pence, 0);

  const isTxLocked = (t: Tx) => t.period_id ? periodMap.get(t.period_id)?.status === "locked" : false;

  const remove = async (t: Tx) => {
    if (!confirm("Delete this transaction?")) return;
    const { error } = await supabase.from("treasurer_transactions" as any).delete().eq("id", t.id);
    if (error) toast({ title: isTxLocked(t) ? "This period is locked" : "Delete failed", description: error.message, variant: "destructive" });
    else {
      if (t.attachment_path) {
        await supabase.storage.from("treasurer-attachments").remove([t.attachment_path]);
      }
      toast({ title: "Deleted" }); onChange();
    }
  };

  const openAttachment = async (path: string) => {
    const { data, error } = await supabase.storage.from("treasurer-attachments").createSignedUrl(path, 60);
    if (error || !data) { toast({ title: "Couldn't open attachment", variant: "destructive" }); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <Card title="Income (all shown)"><Stat label="Total" value={<span className="text-gold">{gbp(income)}</span>} /></Card>
        <Card title="Expense (all shown)"><Stat label="Total" value={<span className="text-gold">{gbp(expense)}</span>} /></Card>
        <Card title="Net"><Stat label="Balance" value={<span className="text-gold">{gbp(income - expense)}</span>} /></Card>
      </div>

      <div className="rounded-sm border border-gold/20 bg-navy-light/30">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gold/15 flex-wrap gap-2">
          <h3 className="font-serif text-gold">Transactions</h3>
          {canEdit && (
            <Button size="sm" className="bg-gold text-navy hover:bg-gold/90 min-h-11 sm:min-h-0" onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" /> New
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-primary-foreground/60 border-b border-gold/15">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Dir</th>
                <th className="px-4 py-2">Method</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2 text-right">Amount</th>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2">Period</th>
                <th className="px-4 py-2">Rec.</th>
                {canEdit && <th className="px-4 py-2 w-24"></th>}
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && (
                <tr><td colSpan={canEdit ? 9 : 8} className="px-4 py-6 text-center text-primary-foreground/50">No transactions recorded.</td></tr>
              )}
              {transactions.map((t) => {
                const p = t.period_id ? periodMap.get(t.period_id) : null;
                const locked = p?.status === "locked";
                return (
                  <tr key={t.id} className="border-b border-gold/10 hover:bg-navy-light/30">
                    <td className="px-4 py-2 tabular-nums">{new Date(t.transaction_date).toLocaleDateString("en-GB")}</td>
                    <td className="px-4 py-2">
                      <Badge variant="outline" className={t.direction === "income" ? "border-emerald-500/60 text-emerald-300" : "border-red-500/60 text-red-300"}>
                        {t.direction}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 capitalize">{t.payment_method.replace("_", " ")}</td>
                    <td className="px-4 py-2">{t.category}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-gold">{gbp(t.amount_pence)}</td>
                    <td className="px-4 py-2 text-xs text-primary-foreground/70 max-w-[220px]" title={t.description ?? ""}>
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">{t.description}</span>
                        {t.attachment_path && (
                          <button
                            type="button"
                            onClick={() => openAttachment(t.attachment_path!)}
                            className="shrink-0 p-1 text-gold/80 hover:text-gold"
                            title={t.attachment_name || "Open attachment"}
                            aria-label="Open attachment"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {p ? <span className="inline-flex items-center gap-1">{locked && <Lock className="w-3 h-3 text-gold" />}{p.label}</span> : <span className="text-primary-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-2">{t.reconciled ? "✓" : ""}</td>
                    {canEdit && (
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 p-1.5" disabled={locked} onClick={() => { setEditing(t); setOpen(true); }} title={locked ? "Period is locked" : "Edit"}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 p-1.5 text-red-300 hover:text-red-200" disabled={locked} onClick={() => remove(t)} title={locked ? "Period is locked" : "Delete"}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <TxDialog open={open} onOpenChange={setOpen} editing={editing} periods={periods.filter(p => p.status === "open")} onSaved={() => { setOpen(false); onChange(); }} />
    </div>
  );
}

function TxDialog({
  open, onOpenChange, editing, periods, onSaved,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; editing: Tx | null; periods: Period[]; onSaved: () => void;
}) {
  const [date, setDate] = useState("");
  const [direction, setDirection] = useState<Direction>("income");
  const [method, setMethod] = useState<PaymentMethod>("bank_transfer");
  const [category, setCategory] = useState("subscriptions");
  const [amount, setAmount] = useState("0.00");
  const [description, setDescription] = useState("");
  const [periodId, setPeriodId] = useState<string>("none");
  const [reconciled, setReconciled] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [removeAttachment, setRemoveAttachment] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setDate(editing.transaction_date);
      setDirection(editing.direction);
      setMethod(editing.payment_method);
      setCategory(editing.category);
      setAmount((editing.amount_pence / 100).toFixed(2));
      setDescription(editing.description ?? "");
      setPeriodId(editing.period_id ?? "none");
      setReconciled(editing.reconciled);
    } else {
      setDate(new Date().toISOString().slice(0, 10));
      setDirection("income");
      setMethod("bank_transfer");
      setCategory("subscriptions");
      setAmount("0.00");
      setDescription("");
      setPeriodId("none");
      setReconciled(false);
    }
    setFile(null);
    setRemoveAttachment(false);
  }, [open, editing]);

  const save = async () => {
    setSaving(true);
    const pence = Math.round(parseFloat(amount || "0") * 100);
    if (!Number.isFinite(pence) || pence <= 0) {
      toast({ title: "Enter a positive amount", variant: "destructive" });
      setSaving(false);
      return;
    }
    if (file && file.size > 15 * 1024 * 1024) {
      toast({ title: "Attachment must be 15 MB or smaller", variant: "destructive" });
      setSaving(false);
      return;
    }

    const { data: u } = await supabase.auth.getUser();

    let attachment_path: string | null = editing?.attachment_path ?? null;
    let attachment_name: string | null = editing?.attachment_name ?? null;
    let attachment_size: number | null = editing?.attachment_size ?? null;

    if (removeAttachment && editing?.attachment_path) {
      await supabase.storage.from("treasurer-attachments").remove([editing.attachment_path]);
      attachment_path = null; attachment_name = null; attachment_size = null;
    }

    if (file) {
      if (editing?.attachment_path && !removeAttachment) {
        await supabase.storage.from("treasurer-attachments").remove([editing.attachment_path]);
      }
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${u.user?.id ?? "anon"}/${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage.from("treasurer-attachments").upload(path, file);
      if (upErr) {
        setSaving(false);
        toast({ title: "Attachment upload failed", description: upErr.message, variant: "destructive" });
        return;
      }
      attachment_path = path; attachment_name = file.name; attachment_size = file.size;
    }

    const payload = {
      transaction_date: date,
      direction, payment_method: method, category: category.trim(),
      amount_pence: pence, description: description.trim() || null,
      period_id: periodId === "none" ? null : periodId,
      reconciled,
      attachment_path, attachment_name, attachment_size,
      created_by: u.user?.id ?? null,
    };
    const res = editing
      ? await supabase.from("treasurer_transactions" as any).update(payload).eq("id", editing.id)
      : await supabase.from("treasurer_transactions" as any).insert(payload);
    setSaving(false);
    if (res.error) {
      const msg = /row-level|policy/i.test(res.error.message)
        ? "This period is locked — unlock it first to make changes."
        : res.error.message;
      toast({ title: "Save failed", description: msg, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Updated" : "Added" });
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-navy-light border-gold/30">
        <DialogHeader><DialogTitle className="font-serif text-gold">{editing ? "Edit transaction" : "New transaction"}</DialogTitle></DialogHeader>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Direction</Label>
            <Select value={direction} onValueChange={(v) => setDirection(v as Direction)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Payment method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Category</Label>
            <Input list="tx-cats" value={category} onChange={(e) => setCategory(e.target.value)} />
            <datalist id="tx-cats">
              {COMMON_CATEGORIES.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div>
            <Label>Amount (£)</Label>
            <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label>Period (open only)</Label>
            <Select value={periodId} onValueChange={setPeriodId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {periods.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Description</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="sm:col-span-2 flex items-center gap-2">
            <Checkbox id="rec" checked={reconciled} onCheckedChange={(v) => setReconciled(!!v)} />
            <Label htmlFor="rec" className="cursor-pointer">Reconciled</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-gold text-navy hover:bg-gold/90" disabled={saving} onClick={save}>
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reconciliation Tab ─────────────────────────────────────────────────────
function ReconciliationTab({
  periods, isTreasurer, isSecretary, isAdmin, onChange,
}: {
  periods: Period[]; isTreasurer: boolean; isSecretary: boolean; isAdmin: boolean; onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Period | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [unlockFor, setUnlockFor] = useState<Period | null>(null);
  const [reason, setReason] = useState("");

  const canEditPeriods = isTreasurer || isAdmin;

  const lock = async (p: Period) => {
    if (!confirm(`Lock "${p.label}"? Transactions in this period will become read-only.`)) return;
    setBusyId(p.id);
    const { error } = await supabase.rpc("lock_treasurer_period" as any, { _period_id: p.id } as any);
    setBusyId(null);
    if (error) toast({ title: "Lock failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Period locked" }); onChange(); }
  };

  const submitUnlock = async () => {
    if (!unlockFor) return;
    if (!reason.trim()) { toast({ title: "Provide a reason", variant: "destructive" }); return; }
    setBusyId(unlockFor.id);
    const { error } = await supabase.rpc("request_unlock_treasurer_period" as any, { _period_id: unlockFor.id, _reason: reason.trim() } as any);
    setBusyId(null);
    if (error) toast({ title: "Request failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Unlock requested" }); setUnlockFor(null); setReason(""); onChange(); }
  };

  const approve = async (p: Period) => {
    setBusyId(p.id);
    const { error } = await supabase.rpc("approve_unlock_treasurer_period" as any, { _period_id: p.id } as any);
    setBusyId(null);
    if (error) toast({ title: "Approval failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Approval recorded" }); onChange(); }
  };

  const remove = async (p: Period) => {
    if (!confirm(`Delete period "${p.label}"? Transactions linked to it will be unlinked.`)) return;
    const { error } = await supabase.from("treasurer_periods" as any).delete().eq("id", p.id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); onChange(); }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-sm border border-gold/20 bg-navy-light/30">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gold/15 flex-wrap gap-2">
          <h3 className="font-serif text-gold">Reconciliation periods</h3>
          {canEditPeriods && (
            <Button size="sm" className="bg-gold text-navy hover:bg-gold/90 min-h-11 sm:min-h-0" onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" /> New period
            </Button>
          )}
        </div>
        <div className="divide-y divide-gold/10">
          {periods.length === 0 && (
            <p className="px-4 py-6 text-center text-primary-foreground/50">No periods yet.</p>
          )}
          {periods.map((p) => (
            <div key={p.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-serif text-gold">{p.label}</h4>
                    {p.status === "locked"
                      ? <Badge variant="outline" className="border-gold/60 text-gold"><Lock className="w-3 h-3 mr-1" />Locked</Badge>
                      : <Badge variant="outline" className="border-emerald-500/60 text-emerald-300"><Unlock className="w-3 h-3 mr-1" />Open</Badge>}
                  </div>
                  <p className="text-xs text-primary-foreground/60">
                    {p.period_start && new Date(p.period_start).toLocaleDateString("en-GB")}
                    {p.period_start && p.period_end && " → "}
                    {p.period_end && new Date(p.period_end).toLocaleDateString("en-GB")}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {p.status === "open" && isTreasurer && (
                    <Button size="sm" variant="outline" className="min-h-11 sm:min-h-0" disabled={busyId === p.id} onClick={() => lock(p)}>
                      <Lock className="w-3.5 h-3.5 mr-1" /> Lock
                    </Button>
                  )}
                  {p.status === "locked" && (isTreasurer || isSecretary || isAdmin) && !p.unlock_requested_by && (
                    <Button size="sm" variant="outline" className="min-h-11 sm:min-h-0" onClick={() => { setUnlockFor(p); setReason(""); }}>
                      <Unlock className="w-3.5 h-3.5 mr-1" /> Request unlock
                    </Button>
                  )}
                  {canEditPeriods && (
                    <>
                      <Button size="sm" variant="ghost" className="min-h-11 sm:min-h-0" onClick={() => { setEditing(p); setOpen(true); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="min-h-11 sm:min-h-0 text-red-300 hover:text-red-200" onClick={() => remove(p)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {p.status === "locked" && p.unlock_requested_by && (
                <div className="rounded-sm border border-gold/15 bg-navy/40 p-3 space-y-2">
                  <p className="text-xs text-primary-foreground/70">
                    <strong>Unlock requested</strong>
                    {p.unlock_requested_at && ` on ${new Date(p.unlock_requested_at).toLocaleString("en-GB")}`}
                  </p>
                  {p.unlock_reason && <p className="text-sm text-primary-foreground/85 italic">"{p.unlock_reason}"</p>}
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className={p.unlock_approved_by_treasurer ? "text-emerald-300" : "text-primary-foreground/50"}>
                      {p.unlock_approved_by_treasurer ? "✓" : "○"} Treasurer approved
                    </span>
                    <span className={p.unlock_approved_by_secretary ? "text-emerald-300" : "text-primary-foreground/50"}>
                      {p.unlock_approved_by_secretary ? "✓" : "○"} Secretary approved
                    </span>
                  </div>
                  {(isTreasurer || isSecretary) && (
                    <div className="pt-1">
                      <Button size="sm" variant="outline" className="min-h-11 sm:min-h-0" disabled={busyId === p.id || (isTreasurer && p.unlock_approved_by_treasurer && !isSecretary) || (isSecretary && p.unlock_approved_by_secretary && !isTreasurer)} onClick={() => approve(p)}>
                        <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Approve unlock (as {isTreasurer ? "Treasurer" : "Secretary"})
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <PeriodDialog open={open} onOpenChange={setOpen} editing={editing} onSaved={() => { setOpen(false); onChange(); }} />

      <Dialog open={!!unlockFor} onOpenChange={(v) => { if (!v) setUnlockFor(null); }}>
        <DialogContent className="bg-navy-light border-gold/30">
          <DialogHeader><DialogTitle className="font-serif text-gold">Request unlock</DialogTitle></DialogHeader>
          <p className="text-sm text-primary-foreground/70">Both Treasurer and Secretary must approve before the period reopens.</p>
          <Label>Reason</Label>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why does this period need to reopen?" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlockFor(null)}>Cancel</Button>
            <Button className="bg-gold text-navy hover:bg-gold/90" onClick={submitUnlock}>Submit request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PeriodDialog({
  open, onOpenChange, editing, onSaved,
}: { open: boolean; onOpenChange: (v: boolean) => void; editing: Period | null; onSaved: () => void }) {
  const [label, setLabel] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLabel(editing?.label ?? "");
    setStart(editing?.period_start ?? "");
    setEnd(editing?.period_end ?? "");
  }, [open, editing]);

  const save = async () => {
    if (!label.trim()) { toast({ title: "Label required", variant: "destructive" }); return; }
    setSaving(true);
    const payload = { label: label.trim(), period_start: start || null, period_end: end || null };
    const res = editing
      ? await supabase.from("treasurer_periods" as any).update(payload).eq("id", editing.id)
      : await supabase.from("treasurer_periods" as any).insert(payload);
    setSaving(false);
    if (res.error) { toast({ title: "Save failed", description: res.error.message, variant: "destructive" }); return; }
    toast({ title: editing ? "Updated" : "Added" });
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-navy-light border-gold/30">
        <DialogHeader><DialogTitle className="font-serif text-gold">{editing ? "Edit period" : "New period"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. October 2026 Meeting" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Start date</Label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <Label>End date</Label>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-gold text-navy hover:bg-gold/90" disabled={saving} onClick={save}>
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────
function Inner() {
  const { isAdmin, isSecretary, isCurrentTreasurer, canAccessTreasurer } = useAuth();
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [tx, ps] = await Promise.all([
      supabase.from("treasurer_transactions" as any).select("*").order("transaction_date", { ascending: false }),
      supabase.from("treasurer_periods" as any).select("*").order("created_at", { ascending: false }),
    ]);
    if (!tx.error) setTransactions((tx.data as unknown as Tx[]) ?? []);
    if (!ps.error) setPeriods((ps.data as unknown as Period[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!canAccessTreasurer) {
    return (
      <MembersLayout>
        <p className="text-primary-foreground/70">You do not have access to the Treasurer module.</p>
      </MembersLayout>
    );
  }

  const canEditTx = isAdmin || isCurrentTreasurer;

  return (
    <MembersLayout>
      <header className="mb-6">
        <h1 className="font-serif text-2xl md:text-3xl text-gold">Treasurer</h1>
        <p className="text-primary-foreground/60 text-sm">
          Transaction register and reconciliation-period locking. Access follows the current Treasurer, Auditor 1, and Auditor 2 offices — it rotates automatically at Installation.
        </p>
      </header>

      {loading ? (
        <p className="text-primary-foreground/60"><Loader2 className="w-4 h-4 mr-1 inline animate-spin" /> Loading…</p>
      ) : (
        <Tabs defaultValue="transactions">
          <TabsList className="h-auto flex-wrap justify-start sm:flex-nowrap">
            <TabsTrigger value="transactions">Transaction Register</TabsTrigger>
            <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
          </TabsList>
          <TabsContent value="transactions" className="mt-4">
            <TransactionsTab transactions={transactions} periods={periods} canEdit={canEditTx} onChange={load} />
          </TabsContent>
          <TabsContent value="reconciliation" className="mt-4">
            <ReconciliationTab periods={periods} isTreasurer={isCurrentTreasurer} isSecretary={isSecretary} isAdmin={isAdmin} onChange={load} />
          </TabsContent>
        </Tabs>
      )}
    </MembersLayout>
  );
}

export default function TreasurerPage() {
  return <ProtectedRoute><Inner /></ProtectedRoute>;
}
