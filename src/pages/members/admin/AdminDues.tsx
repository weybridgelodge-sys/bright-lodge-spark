import { useEffect, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import ProtectedRoute from "@/components/members/ProtectedRoute";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertTriangle, RefreshCw, Send, PlayCircle, Loader2, ExternalLink, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { DuesCalc } from "@/lib/dues";

// ---------- Types ----------
type Profile = { id: string; full_name: string | null; email: string | null; first_name: string | null; last_name: string | null; status: string };
type DuesSub = {
  id: string; member_id: string; lodge_year: number;
  plan: "lump_sum" | "monthly"; method: "card" | "bacs";
  status: string; amount_pence: number; credit_balance_pence: number;
  stripe_subscription_id: string | null; stripe_payment_intent_id: string | null;
};
type DuesPayment = {
  id: string; subscription_id: string; member_id: string; type: "payment" | "refund";
  amount_pence: number; method: string | null; status: string; note: string | null; occurred_at: string;
  stripe_payment_intent_id: string | null;
};
type DuesSetting = {
  id: string; annual_amount_pence: number; effective_lodge_year: number;
  notice_required: boolean; notice_sent_at: string | null; applied_at: string | null; created_at: string;
};

const gbp = (p: number) => `£${(p / 100).toFixed(2)}`;
const currentLodgeYear = () => {
  const now = new Date();
  return now.getUTCMonth() >= 9 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
};

function TestModeBanner() {
  return (
    <div className="mb-6 rounded border-2 border-amber-500 bg-amber-500/10 p-4 flex items-start gap-3">
      <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-amber-300">TEST MODE — Stripe sandbox. Not yet live for real collection.</p>
        <p className="text-sm text-amber-200/80">
          All charges use Stripe test cards (e.g. <code className="bg-black/30 px-1 rounded">4242 4242 4242 4242</code>) and Bacs test details.
          Members cannot see or reach this feature. It is admin-only for the committee demo.
        </p>
      </div>
    </div>
  );
}

// ---------- Members tab ----------
function MembersTab({ members, subs, payments, calcs, onRefresh }: {
  members: Profile[]; subs: DuesSub[]; payments: DuesPayment[]; calcs: Map<string, DuesCalc>; onRefresh: () => void;
}) {
  const [historyMember, setHistoryMember] = useState<Profile | null>(null);
  const [refundTarget, setRefundTarget] = useState<DuesPayment | null>(null);

  const subByMember = new Map(subs.map(s => [s.member_id, s]));
  const paidByMember = new Map<string, number>();
  const creditByMember = new Map<string, number>();
  for (const p of payments) {
    const sign = p.type === "payment" ? 1 : -1;
    paidByMember.set(p.member_id, (paidByMember.get(p.member_id) ?? 0) + sign * p.amount_pence);
  }
  for (const s of subs) creditByMember.set(s.member_id, s.credit_balance_pence);

  return (
    <>
      <div className="overflow-x-auto rounded border border-gold/20">
        <table className="w-full text-sm text-primary-foreground">
          <thead className="bg-navy-light/60 text-left text-xs uppercase tracking-wide text-gold">
            <tr>
              <th className="px-3 py-2">Member</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Method</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Paid</th>
              <th className="px-3 py-2 text-right">Owed</th>
              <th className="px-3 py-2 text-right">Credit</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const sub = subByMember.get(m.id);
              const paid = paidByMember.get(m.id) ?? 0;
              const owed = sub ? sub.amount_pence - paid : 0;
              const credit = creditByMember.get(m.id) ?? 0;
              return (
                <tr key={m.id} className="border-t border-gold/10">
                  <td className="px-3 py-2">{m.full_name || m.email}</td>
                  <td className="px-3 py-2">{sub ? (sub.plan === "monthly" ? "Monthly" : "Lump sum") : <span className="text-primary-foreground/40">—</span>}</td>
                  <td className="px-3 py-2">{sub ? (sub.method === "bacs" ? "Bacs DD" : "Card") : <span className="text-primary-foreground/40">—</span>}</td>
                  <td className="px-3 py-2">
                    {sub ? (
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        sub.status === "active" || sub.status === "completed"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : sub.status === "past_due" || sub.status === "failed"
                          ? "bg-red-500/20 text-red-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}>{sub.status}</span>
                    ) : <span className="text-primary-foreground/40">no plan</span>}
                  </td>
                  <td className="px-3 py-2 text-right">{gbp(paid)}</td>
                  <td className={`px-3 py-2 text-right ${owed > 0 ? "text-amber-300" : "text-primary-foreground/60"}`}>{sub ? gbp(Math.max(0, owed)) : "—"}</td>
                  <td className="px-3 py-2 text-right">{credit > 0 ? gbp(credit) : "—"}</td>
                  <td className="px-3 py-2">
                    <Button variant="outline" size="sm" onClick={() => setHistoryMember(m)}>History</Button>
                  </td>
                </tr>
              );
            })}
            {members.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-primary-foreground/60">No active members.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* History dialog */}
      <Dialog open={!!historyMember} onOpenChange={(o) => !o && setHistoryMember(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment history — {historyMember?.full_name || historyMember?.email}</DialogTitle>
            <DialogDescription>All Stripe payment and refund events for this member (test mode).</DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-2 py-1">Date</th>
                  <th className="px-2 py-1">Type</th>
                  <th className="px-2 py-1 text-right">Amount</th>
                  <th className="px-2 py-1">Method</th>
                  <th className="px-2 py-1">Status</th>
                  <th className="px-2 py-1">Note</th>
                  <th className="px-2 py-1"></th>
                </tr>
              </thead>
              <tbody>
                {payments.filter(p => p.member_id === historyMember?.id).map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-2 py-1">{new Date(p.occurred_at).toLocaleDateString("en-GB")}</td>
                    <td className="px-2 py-1">{p.type}</td>
                    <td className={`px-2 py-1 text-right ${p.type === "refund" ? "text-red-600" : ""}`}>
                      {p.type === "refund" ? "−" : ""}{gbp(p.amount_pence)}
                    </td>
                    <td className="px-2 py-1">{p.method}</td>
                    <td className="px-2 py-1">{p.status}</td>
                    <td className="px-2 py-1">{p.note}</td>
                    <td className="px-2 py-1">
                      {p.type === "payment" && p.status === "succeeded" && (
                        <Button size="sm" variant="destructive" onClick={() => setRefundTarget(p)}>Refund</Button>
                      )}
                    </td>
                  </tr>
                ))}
                {payments.filter(p => p.member_id === historyMember?.id).length === 0 && (
                  <tr><td colSpan={7} className="px-2 py-4 text-center text-muted-foreground">No payments yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      <RefundDialog payment={refundTarget} onClose={() => setRefundTarget(null)} onDone={onRefresh} />
    </>
  );
}

function RefundDialog({ payment, onClose, onDone }: { payment: DuesPayment | null; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (payment) { setAmount((payment.amount_pence / 100).toFixed(2)); setNote(""); }
  }, [payment]);

  const submit = async () => {
    if (!payment) return;
    setBusy(true);
    try {
      const cents = Math.round(parseFloat(amount) * 100);
      if (!cents || cents < 0) throw new Error("Invalid amount");
      const { data, error } = await supabase.functions.invoke("dues-refund", {
        body: { payment_id: payment.id, amount_pence: cents, note },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Refund initiated (${(data as any)?.status ?? "pending"})`);
      onDone(); onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Refund failed");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={!!payment} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refund payment</DialogTitle>
          <DialogDescription>
            {payment?.method === "bacs"
              ? "Bacs Direct Debit refunds are submitted immediately but settle via BACS over roughly 5 working days."
              : "Card refunds are submitted immediately and typically appear on the cardholder's statement within 5–10 working days."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Amount (£)</Label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label>Note (optional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Overpayment refund" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Issue refund</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Settings tab ----------
function SettingsTab({ settings, onRefresh }: { settings: DuesSetting[]; onRefresh: () => void }) {
  const [newAmount, setNewAmount] = useState("");
  const [newYear, setNewYear] = useState(String(currentLodgeYear() + 1));
  const [busy, setBusy] = useState<string | null>(null);

  const cy = currentLodgeYear();
  const current = [...settings].filter(s => s.effective_lodge_year <= cy).sort((a, b) => b.effective_lodge_year - a.effective_lodge_year)[0];
  const scheduled = settings.filter(s => s.effective_lodge_year > cy).sort((a, b) => a.effective_lodge_year - b.effective_lodge_year);

  const schedule = async () => {
    const pence = Math.round(parseFloat(newAmount) * 100);
    const year = parseInt(newYear, 10);
    if (!pence || !year) { toast.error("Enter valid amount and year"); return; }
    setBusy("schedule");
    const { error } = await supabase.from("dues_settings").insert({ annual_amount_pence: pence, effective_lodge_year: year });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Scheduled");
    setNewAmount(""); onRefresh();
  };

  const notify = async (id: string) => {
    setBusy(id + ":notify");
    const { data, error } = await supabase.functions.invoke("dues-notify-price-change", { body: { settings_id: id } });
    setBusy(null);
    if (error || (data as any)?.error) { toast.error((error?.message ?? (data as any)?.error)); return; }
    toast.success(`Notice sent to ${(data as any).sent}/${(data as any).recipients} members`);
    onRefresh();
  };

  const apply = async (id: string, force = false) => {
    setBusy(id + ":apply");
    const { data, error } = await supabase.functions.invoke("dues-apply-price-change", { body: { settings_id: id, force } });
    setBusy(null);
    if (error || (data as any)?.error) { toast.error((error?.message ?? (data as any)?.error)); return; }
    toast.success(`Applied to ${(data as any).updated}/${(data as any).total} subscriptions`);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="font-serif text-gold text-lg mb-2">Current annual amount</h3>
        <p className="text-3xl font-bold">{current ? gbp(current.annual_amount_pence) : "—"}</p>
        <p className="text-sm text-muted-foreground">Effective lodge year {current?.effective_lodge_year} (Oct–Sept)</p>
      </Card>

      <Card className="p-5">
        <h3 className="font-serif text-gold text-lg mb-3">Schedule a future amount</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label>New annual amount (£)</Label>
            <Input type="number" step="0.01" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="e.g. 265.00" />
          </div>
          <div>
            <Label>Effective lodge year</Label>
            <Input type="number" value={newYear} onChange={(e) => setNewYear(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={schedule} disabled={busy === "schedule"}>Schedule</Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          After scheduling, send advance notice to affected members. UK Direct Debit rules require at least 10 working days' notice before the collection amount changes.
        </p>
      </Card>

      <Card className="p-5">
        <h3 className="font-serif text-gold text-lg mb-3">Scheduled changes</h3>
        {scheduled.length === 0 ? (
          <p className="text-sm text-muted-foreground">None scheduled.</p>
        ) : (
          <div className="space-y-3">
            {scheduled.map(s => (
              <div key={s.id} className="border rounded p-3 flex flex-wrap gap-3 items-center justify-between">
                <div>
                  <p className="font-semibold">{gbp(s.annual_amount_pence)} — LY {s.effective_lodge_year}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.notice_sent_at ? `Notice sent ${new Date(s.notice_sent_at).toLocaleString("en-GB")}` : "Notice not yet sent"}
                    {s.applied_at ? ` · Applied ${new Date(s.applied_at).toLocaleString("en-GB")}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => notify(s.id)} disabled={!!busy}>
                    <Send className="w-4 h-4 mr-1" /> {s.notice_sent_at ? "Resend notice" : "Send notice"}
                  </Button>
                  <Button size="sm" onClick={() => apply(s.id)} disabled={!!busy || !!s.applied_at || !s.notice_sent_at}>
                    <PlayCircle className="w-4 h-4 mr-1" /> Apply now
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => apply(s.id, true)} disabled={!!busy || !!s.applied_at} title="Bypass notice period (demo only)">
                    Force apply (demo)
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ---------- Demo tab ----------
function DemoTab({ members }: { members: Profile[] }) {
  const [memberId, setMemberId] = useState<string>("");
  const [plan, setPlan] = useState<"lump_sum" | "monthly">("lump_sum");
  const [method, setMethod] = useState<"card" | "bacs">("card");
  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (!memberId) { toast.error("Choose a member"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("dues-create-checkout", {
        body: {
          member_id: memberId,
          plan,
          method,
          return_url: `${window.location.origin}/members/admin/dues?checkout=complete`,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      window.open((data as any).url, "_blank", "noopener");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to open checkout");
    } finally { setBusy(false); }
  };

  return (
    <Card className="p-6 max-w-2xl">
      <h3 className="font-serif text-gold text-lg mb-2">Walk-through as a member</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Pick a member, choose a frequency and method, then open the Stripe test checkout in a new tab. Use Stripe's test details to complete the flow.
      </p>
      <div className="space-y-4">
        <div>
          <Label>Member</Label>
          <Select value={memberId} onValueChange={setMemberId}>
            <SelectTrigger><SelectValue placeholder="Select a member" /></SelectTrigger>
            <SelectContent>
              {members.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name || m.email}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Frequency</Label>
          <RadioGroup value={plan} onValueChange={(v) => setPlan(v as any)} className="flex gap-6 mt-2">
            <label className="flex items-center gap-2"><RadioGroupItem value="lump_sum" /> Lump sum (£250 once)</label>
            <label className="flex items-center gap-2"><RadioGroupItem value="monthly" /> Monthly (~£20.83 × 12)</label>
          </RadioGroup>
        </div>
        <div>
          <Label>Payment method</Label>
          <RadioGroup value={method} onValueChange={(v) => setMethod(v as any)} className="flex gap-6 mt-2">
            <label className="flex items-center gap-2"><RadioGroupItem value="card" /> Card</label>
            <label className="flex items-center gap-2"><RadioGroupItem value="bacs" /> Bacs Direct Debit</label>
          </RadioGroup>
        </div>
        <Button onClick={start} disabled={busy}>
          {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Open Stripe test checkout <ExternalLink className="w-4 h-4 ml-2" />
        </Button>
        <div className="text-xs text-muted-foreground bg-muted/40 p-3 rounded">
          <p className="font-semibold mb-1">Stripe test details</p>
          <p>Card: <code>4242 4242 4242 4242</code> · any future expiry · any CVC</p>
          <p>Bacs Direct Debit: sort code <code>10-88-00</code> · account <code>00012345</code> · any name/email</p>
        </div>
      </div>
    </Card>
  );
}

// ---------- Page shell ----------
type Tab = "members" | "settings" | "demo";

function Inner() {
  const [tab, setTab] = useState<Tab>("members");
  const [members, setMembers] = useState<Profile[]>([]);
  const [subs, setSubs] = useState<DuesSub[]>([]);
  const [payments, setPayments] = useState<DuesPayment[]>([]);
  const [settings, setSettings] = useState<DuesSetting[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: m }, { data: s }, { data: p }, { data: cfg }] = await Promise.all([
      supabase.from("profiles").select("id,full_name,email,first_name,last_name,status").eq("status", "active").order("full_name"),
      supabase.from("dues_subscriptions").select("*"),
      supabase.from("dues_payments").select("*").order("occurred_at", { ascending: false }),
      supabase.from("dues_settings").select("*"),
    ]);
    setMembers((m as any) ?? []);
    setSubs((s as any) ?? []);
    setPayments((p as any) ?? []);
    setSettings((cfg as any) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  return (
    <MembersLayout>
      <header className="mb-4">
        <h1 className="font-serif text-2xl md:text-3xl text-gold">Dues &amp; Subscriptions</h1>
        <p className="text-primary-foreground/60 text-sm">Annual Lodge subscription — collection, refunds, and price changes.</p>
      </header>

      <TestModeBanner />

      <div className="flex gap-2 mb-4 border-b border-gold/20">
        {(["members", "settings", "demo"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm capitalize border-b-2 -mb-px ${
              tab === t ? "border-gold text-gold" : "border-transparent text-primary-foreground/60 hover:text-primary-foreground"
            }`}
          >
            {t === "demo" ? "Demo as member" : t}
          </button>
        ))}
        <button onClick={load} className="ml-auto text-primary-foreground/60 hover:text-gold p-2" title="Refresh">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {tab === "members" && <MembersTab members={members} subs={subs} payments={payments} onRefresh={load} />}
      {tab === "settings" && <SettingsTab settings={settings} onRefresh={load} />}
      {tab === "demo" && <DemoTab members={members} />}
    </MembersLayout>
  );
}

export default function AdminDues() {
  return <ProtectedRoute adminOnly><Inner /></ProtectedRoute>;
}
