import { useCallback, useEffect, useMemo, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import ProtectedRoute from "@/components/members/ProtectedRoute";
import DiningReconciliationTab from "@/components/members/treasurer/DiningReconciliationTab";
import CreditorsTab from "@/components/members/treasurer/CreditorsTab";
import DirectPaymentTab from "@/components/members/treasurer/DirectPaymentTab";
import DirectReceiptTab from "@/components/members/treasurer/DirectReceiptTab";
import NewMemberFeesTab from "@/components/members/treasurer/NewMemberFeesTab";
import GeneralJournalTab from "@/components/members/treasurer/GeneralJournalTab";
import IncomeExpenditureReport from "@/components/members/treasurer/IncomeExpenditureReport";
import BalanceSheetReport from "@/components/members/treasurer/BalanceSheetReport";
import TransactionDetailReport from "@/components/members/treasurer/TransactionDetailReport";
import PropertyRegisterTab from "@/components/members/treasurer/PropertyRegisterTab";
import BankStatementsTab from "@/components/members/treasurer/BankStatementsTab";
import BankReconciliationTab from "@/components/members/treasurer/BankReconciliationTab";
import BreakevenCalculatorTab from "@/components/members/treasurer/BreakevenCalculatorTab";
import EventAccountsTab from "@/components/members/treasurer/EventAccountsTab";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, Lock, Unlock, ShieldCheck, Utensils, Handshake, ArrowUpCircle, ArrowDownCircle, UserPlus, BookOpen, TrendingUp, Scale, Search, Archive, Calculator, Landmark, PartyPopper } from "lucide-react";

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
          <h3 className="font-serif text-gold">Closed periods</h3>
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
        <DialogContent className="bg-navy-light text-primary-foreground border-gold/30 max-h-[90vh] overflow-y-auto">
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
      <DialogContent className="bg-navy-light text-primary-foreground border-gold/30 max-h-[90vh] overflow-y-auto">
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
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("bank-reconciliation");

  const load = useCallback(async () => {
    setLoading(true);
    const ps = await supabase.from("treasurer_periods" as any).select("*").order("created_at", { ascending: false });
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
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-col w-full h-auto items-stretch gap-1 bg-navy p-2 rounded-sm border border-gold/20 mb-4">
            {canEditTx && (
              <TabsTrigger
                value="balance-sheet"
                className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-sm text-sm font-sans text-primary-foreground/80 transition-colors hover:text-gold hover:bg-navy-light/40 data-[state=active]:bg-gold/15 data-[state=active]:text-gold data-[state=active]:shadow-none"
              >
                <Scale className="w-4 h-4 shrink-0" />
                <span>Balance Sheet</span>
              </TabsTrigger>
            )}
            <TabsTrigger
              value="bank-reconciliation"
              className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-sm text-sm font-sans text-primary-foreground/80 transition-colors hover:text-gold hover:bg-navy-light/40 data-[state=active]:bg-gold/15 data-[state=active]:text-gold data-[state=active]:shadow-none"
            >
              <Scale className="w-4 h-4 shrink-0" />
              <span>Bank Reconciliation</span>
            </TabsTrigger>
            <TabsTrigger
              value="bank-statements"
              className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-sm text-sm font-sans text-primary-foreground/80 transition-colors hover:text-gold hover:bg-navy-light/40 data-[state=active]:bg-gold/15 data-[state=active]:text-gold data-[state=active]:shadow-none"
            >
              <Landmark className="w-4 h-4 shrink-0" />
              <span>Bank Statement Repository</span>
            </TabsTrigger>
            {canEditTx && (
              <TabsTrigger
                value="creditors"
                className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-sm text-sm font-sans text-primary-foreground/80 transition-colors hover:text-gold hover:bg-navy-light/40 data-[state=active]:bg-gold/15 data-[state=active]:text-gold data-[state=active]:shadow-none"
              >
                <Handshake className="w-4 h-4 shrink-0" />
                <span>Creditors</span>
              </TabsTrigger>
            )}
            <TabsTrigger
              value="dining"
              className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-sm text-sm font-sans text-primary-foreground/80 transition-colors hover:text-gold hover:bg-navy-light/40 data-[state=active]:bg-gold/15 data-[state=active]:text-gold data-[state=active]:shadow-none"
            >
              <Utensils className="w-4 h-4 shrink-0" />
              <span>Dining Reconciliation</span>
            </TabsTrigger>
            {canEditTx && (
              <TabsTrigger
                value="direct-payment"
                className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-sm text-sm font-sans text-primary-foreground/80 transition-colors hover:text-gold hover:bg-navy-light/40 data-[state=active]:bg-gold/15 data-[state=active]:text-gold data-[state=active]:shadow-none"
              >
                <ArrowUpCircle className="w-4 h-4 shrink-0" />
                <span>Direct Payment</span>
              </TabsTrigger>
            )}
            {canEditTx && (
              <TabsTrigger
                value="direct-receipt"
                className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-sm text-sm font-sans text-primary-foreground/80 transition-colors hover:text-gold hover:bg-navy-light/40 data-[state=active]:bg-gold/15 data-[state=active]:text-gold data-[state=active]:shadow-none"
              >
                <ArrowDownCircle className="w-4 h-4 shrink-0" />
                <span>Direct Receipt</span>
              </TabsTrigger>
            )}
            <TabsTrigger
              value="event-accounts"
              className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-sm text-sm font-sans text-primary-foreground/80 transition-colors hover:text-gold hover:bg-navy-light/40 data-[state=active]:bg-gold/15 data-[state=active]:text-gold data-[state=active]:shadow-none"
            >
              <PartyPopper className="w-4 h-4 shrink-0" />
              <span>Event Accounts</span>
            </TabsTrigger>
            {canEditTx && (
              <TabsTrigger
                value="general-journal"
                className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-sm text-sm font-sans text-primary-foreground/80 transition-colors hover:text-gold hover:bg-navy-light/40 data-[state=active]:bg-gold/15 data-[state=active]:text-gold data-[state=active]:shadow-none"
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>General Journal</span>
              </TabsTrigger>
            )}
            {canEditTx && (
              <TabsTrigger
                value="income-expenditure"
                className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-sm text-sm font-sans text-primary-foreground/80 transition-colors hover:text-gold hover:bg-navy-light/40 data-[state=active]:bg-gold/15 data-[state=active]:text-gold data-[state=active]:shadow-none"
              >
                <TrendingUp className="w-4 h-4 shrink-0" />
                <span>Income &amp; Expenditure</span>
              </TabsTrigger>
            )}
            {canEditTx && (
              <TabsTrigger
                value="breakeven"
                className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-sm text-sm font-sans text-primary-foreground/80 transition-colors hover:text-gold hover:bg-navy-light/40 data-[state=active]:bg-gold/15 data-[state=active]:text-gold data-[state=active]:shadow-none"
              >
                <Calculator className="w-4 h-4 shrink-0" />
                <span>Membership Breakeven</span>
              </TabsTrigger>
            )}
            {canEditTx && (
              <TabsTrigger
                value="new-member-fees"
                className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-sm text-sm font-sans text-primary-foreground/80 transition-colors hover:text-gold hover:bg-navy-light/40 data-[state=active]:bg-gold/15 data-[state=active]:text-gold data-[state=active]:shadow-none"
              >
                <UserPlus className="w-4 h-4 shrink-0" />
                <span>New Member Fees</span>
              </TabsTrigger>
            )}
            <TabsTrigger
              value="reconciliation"
              className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-sm text-sm font-sans text-primary-foreground/80 transition-colors hover:text-gold hover:bg-navy-light/40 data-[state=active]:bg-gold/15 data-[state=active]:text-gold data-[state=active]:shadow-none"
            >
              <Lock className="w-4 h-4 shrink-0" />
              <span>Period Close</span>
            </TabsTrigger>
            <TabsTrigger
              value="property"
              className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-sm text-sm font-sans text-primary-foreground/80 transition-colors hover:text-gold hover:bg-navy-light/40 data-[state=active]:bg-gold/15 data-[state=active]:text-gold data-[state=active]:shadow-none"
            >
              <Archive className="w-4 h-4 shrink-0" />
              <span>Property Register</span>
            </TabsTrigger>
            {canEditTx && (
              <TabsTrigger
                value="transaction-detail"
                className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-sm text-sm font-sans text-primary-foreground/80 transition-colors hover:text-gold hover:bg-navy-light/40 data-[state=active]:bg-gold/15 data-[state=active]:text-gold data-[state=active]:shadow-none"
              >
                <Search className="w-4 h-4 shrink-0" />
                <span>Transaction Detail</span>
              </TabsTrigger>
            )}
          </TabsList>
          {canEditTx && (
            <TabsContent value="breakeven" className="mt-4">
              <BreakevenCalculatorTab canEdit={canEditTx} />
            </TabsContent>
          )}
          <TabsContent value="dining" className="mt-4">
            <DiningReconciliationTab canEdit={canEditTx} />
          </TabsContent>
          {canEditTx && (
            <TabsContent value="creditors" className="mt-4">
              <CreditorsTab canEdit={canEditTx} />
            </TabsContent>
          )}
          {canEditTx && (
            <TabsContent value="direct-payment" className="mt-4">
              <DirectPaymentTab canEdit={canEditTx} />
            </TabsContent>
          )}
          {canEditTx && (
            <TabsContent value="direct-receipt" className="mt-4">
              <DirectReceiptTab canEdit={canEditTx} />
            </TabsContent>
          )}
          {canEditTx && (
            <TabsContent value="new-member-fees" className="mt-4">
              <NewMemberFeesTab canEdit={canEditTx} />
            </TabsContent>
          )}
          {canEditTx && (
            <TabsContent value="general-journal" className="mt-4">
              <GeneralJournalTab canEdit={canEditTx} />
            </TabsContent>
          )}
          {canEditTx && (
            <TabsContent value="income-expenditure" className="mt-4">
              <IncomeExpenditureReport canEdit={canEditTx} />
            </TabsContent>
          )}
          {canEditTx && (
            <TabsContent value="balance-sheet" className="mt-4">
              <BalanceSheetReport canEdit={canEditTx} />
            </TabsContent>
          )}
          {canEditTx && (
            <TabsContent value="transaction-detail" className="mt-4">
              <TransactionDetailReport canEdit={canEditTx} />
            </TabsContent>
          )}
          <TabsContent value="property" className="mt-4">
            <PropertyRegisterTab canEdit={canEditTx} />
          </TabsContent>
          <TabsContent value="bank-statements" className="mt-4">
            <BankStatementsTab canEdit={canEditTx} />
          </TabsContent>
          <TabsContent value="bank-reconciliation" className="mt-4">
            <BankReconciliationTab canEdit={canEditTx} />
          </TabsContent>
          <TabsContent value="event-accounts" className="mt-4">
            <EventAccountsTab canEdit={canEditTx} />
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
