// "Balances outstanding" for deposit bookings in Event Accounts. Read-only figures; link actions
// go through the event-balance-link function, which re-checks who may copy/resend/regenerate.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { readFunctionError } from "@/lib/functionError";
import { isOverdue, validateManualBalance } from "@/lib/eventPricing";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type B = {
  id: string; reference?: string | null; payer_name: string; payment_plan?: string | null; payment_status?: string | null;
  subtotal_pence?: number | null; amount_paid_pence?: number | null; balance_due_pence?: number | null; balance_due_date?: string | null;
};
const money = (p: number) => `£${(p / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const ukDate = (d?: string | null) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
const londonToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());

export const outstandingBalances = <T extends B>(rows: T[]) =>
  rows.filter((b) => b.payment_plan === "deposit" && b.payment_status === "deposit_paid" && (b.balance_due_pence ?? 0) > 0);

type Draft = { id: string; requestId: string; amount: string; date: string; method: "cash" | "cheque" | "other"; reference: string; note: string };

export default function EventBalancesPanel({ bookings, canRegenerate, onRecorded }: { bookings: B[]; canRegenerate: boolean; onRecorded?: () => void }) {
  const rows = outstandingBalances(bookings);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSent, setLastSent] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const ids = rows.map((r) => r.id).join(",");

  useEffect(() => {
    if (!ids) return;
    supabase.from("event_booking_reminders" as any).select("booking_id,kind,sent_at").in("booking_id", ids.split(","))
      .then(({ data }) => {
        const m: Record<string, string> = {};
        for (const r of (data as any[]) ?? []) if (!m[r.booking_id] || r.sent_at > m[r.booking_id]) m[r.booking_id] = r.sent_at;
        setLastSent(m);
      });
  }, [ids]);

  if (!rows.length) return null;
  const today = londonToday();

  const act = async (b: B, action: "get" | "resend" | "regenerate") => {
    if (action === "resend" && !window.confirm(`Email the balance link to the booker for ${b.reference || b.payer_name}?`)) return;
    if (action === "regenerate" && !window.confirm("Make a new link? Links already emailed to this booker will stop working.")) return;
    setBusy(`${b.id}-${action}`);
    const { data, error } = await supabase.functions.invoke("event-balance-link", { body: { booking_id: b.id, action } });
    setBusy(null);
    if (error || (data as any)?.error) { toast({ title: "Could not complete", description: await readFunctionError(error, data, "Please try again."), variant: "destructive" }); return; }
    const url = (data as any).url as string;
    if (action === "resend") { toast({ title: "Balance link emailed" }); return; }
    try { await navigator.clipboard.writeText(url); toast({ title: action === "regenerate" ? "New link copied" : "Link copied" }); }
    catch { window.prompt("Copy the balance link:", url); }
  };

  const openRecord = (b: B) => setDraft({
    id: b.id, requestId: crypto.randomUUID(), amount: ((b.balance_due_pence ?? 0) / 100).toFixed(2),
    date: londonToday(), method: "cash", reference: "", note: "",
  });

  const saveRecord = async (b: B) => {
    if (!draft || saving) return;
    const pence = Math.round(Number(draft.amount) * 100);
    const v = validateManualBalance(b.balance_due_pence ?? 0, pence);
    if (!v.ok) { toast({ title: v.error, variant: "destructive" }); return; }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("event-record-balance", { body: {
      booking_id: b.id, request_id: draft.requestId, amount_pence: pence, paid_at: draft.date,
      manual_method: draft.method, reference: draft.reference || null, note: draft.note || null,
    } });
    setSaving(false);
    if (error || (data as any)?.error) { toast({ title: "Could not record payment", description: await readFunctionError(error, data, "Please try again."), variant: "destructive" }); return; }
    toast({ title: (data as any)?.status === "paid" ? "Balance recorded — booking fully paid" : "Part payment recorded" });
    setDraft(null);
    onRecorded?.();
  };

  return (
    <div className="rounded-sm border border-gold/20 bg-navy-light/30 p-4 space-y-3">
      <h3 className="font-serif text-gold text-base">Balances outstanding</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-primary-foreground/60 text-xs">
              <th className="py-1 pr-3 font-normal">Ref</th><th className="py-1 pr-3 font-normal">Name</th>
              <th className="py-1 pr-3 font-normal text-right">Paid</th><th className="py-1 pr-3 font-normal text-right">Due</th>
              <th className="py-1 pr-3 font-normal">Due date</th><th className="py-1 pr-3 font-normal">Last reminder</th><th className="py-1 font-normal">Link</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => {
              const overdue = isOverdue(b.balance_due_date, today, b.balance_due_pence ?? 0);
              return [
                <tr key={b.id} className="border-t border-gold/10 align-top">
                  <td className="py-2 pr-3 text-gold">{b.reference}</td>
                  <td className="py-2 pr-3 text-primary-foreground">{b.payer_name}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-primary-foreground/80">{money(b.amount_paid_pence ?? 0)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-primary-foreground">{money(b.balance_due_pence ?? 0)}</td>
                  <td className="py-2 pr-3 text-primary-foreground/80">
                    {ukDate(b.balance_due_date)}
                    {overdue && <span className="ml-2 inline-block rounded-sm border border-destructive px-1.5 text-xs font-semibold text-destructive">Overdue</span>}
                  </td>
                  <td className="py-2 pr-3 text-primary-foreground/60">{lastSent[b.id] ? ukDate(lastSent[b.id].slice(0, 10)) : "—"}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="outline" className="border-gold/30" disabled={!!busy} onClick={() => act(b, "get")}>Copy link</Button>
                      <Button size="sm" variant="outline" className="border-gold/30" disabled={!!busy} onClick={() => act(b, "resend")}>Resend</Button>
                      {canRegenerate && <Button size="sm" variant="outline" className="border-gold/30" disabled={!!busy || saving} onClick={() => openRecord(b)}>Record balance received</Button>}
                      {canRegenerate && <Button size="sm" variant="ghost" className="text-primary-foreground/70" disabled={!!busy} onClick={() => act(b, "regenerate")}>Regenerate</Button>}
                    </div>
                  </td>
                </tr>
              ,
                draft?.id === b.id && (
                  <tr key={`${b.id}-rec`} className="border-t border-gold/10">
                    <td colSpan={7} className="py-3">
                      <form className="grid gap-3 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); saveRecord(b); }}>
                        <div><Label htmlFor={`amt-${b.id}`}>Amount received (£)</Label><Input id={`amt-${b.id}`} inputMode="decimal" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} /></div>
                        <div><Label htmlFor={`dt-${b.id}`}>Date received</Label><Input id={`dt-${b.id}`} type="date" max={today} value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></div>
                        <div><Label htmlFor={`m-${b.id}`}>Method</Label>
                          <select id={`m-${b.id}`} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={draft.method} onChange={(e) => setDraft({ ...draft, method: e.target.value as Draft["method"] })}>
                            <option value="cash">Cash</option><option value="cheque">Cheque</option><option value="other">Other</option>
                          </select></div>
                        <div><Label htmlFor={`ref-${b.id}`}>Reference (optional)</Label><Input id={`ref-${b.id}`} maxLength={100} value={draft.reference} onChange={(e) => setDraft({ ...draft, reference: e.target.value })} /></div>
                        <div className="sm:col-span-2"><Label htmlFor={`note-${b.id}`}>Note (optional)</Label><Input id={`note-${b.id}`} maxLength={500} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} /></div>
                        <div className="sm:col-span-3 flex flex-wrap gap-2">
                          <Button type="submit" size="sm" disabled={saving}>{saving ? "Saving…" : "Record payment"}</Button>
                          <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={() => setDraft(null)}>Cancel</Button>
                          <span className="text-xs text-primary-foreground/60 self-center">Up to {money(b.balance_due_pence ?? 0)}. Part payments are allowed; no fee applies.</span>
                        </div>
                      </form>
                    </td>
                  </tr>
                ),
              ];
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-primary-foreground/50">Overdue balances are flagged only — seats are never released automatically.</p>
    </div>
  );
}
