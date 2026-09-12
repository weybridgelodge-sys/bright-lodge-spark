import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, FileDown, ChevronDown, ChevronRight, Pencil } from "lucide-react";
import autoTable from "jspdf-autotable";
import { reportPdfDoc, reportSection, INK, GOLD, NAVY, MUTED } from "@/lib/treasurer/reports";
import { saveJsPdf } from "@/lib/nativeDownload";

const money = (pence: number) =>
  `${pence < 0 ? "-" : ""}£${(Math.abs(pence) / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const toPence = (v: string) => Math.round(parseFloat(v || "0") * 100) || 0;
const fromPence = (p: number) => (p / 100).toFixed(2);

const METHODS = ["stripe", "bank_transfer", "cash"] as const;
const STATUSES = ["planning", "active", "closed"] as const;

export type EventAccount = { id: string; name: string; event_date: string; status: string };
type LineType = "income" | "expense";
type BudgetLine = {
  id: string; event_id: string; category: string; planned_pence: number;
  unit_cost_pence: number | null; quantity: number | null; line_type: LineType;
};
type BudgetMode = "total" | "perHead";
const lineMode = (l: BudgetLine): BudgetMode => (l.unit_cost_pence != null && l.quantity != null ? "perHead" : "total");
type Booking = {
  id: string; event_id: string; payer_name: string; ticket_count: number; is_placeholder: boolean;
  deposit_pence: number; deposit_paid: boolean; deposit_method: string | null;
  balance_pence: number; balance_paid: boolean; balance_method: string | null; notes: string | null;
};
type Guest = {
  id: string; booking_id: string; name: string | null; seating_preference: string | null;
  menu_choice: string | null; allergies: string | null; wine_preorder: string | null;
};
type ActualLine = {
  event_id: string; debit_pence: number; credit_pence: number; description: string | null;
  chart_of_accounts: { code: string; name: string; account_type: string } | null;
};

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

export default function EventAccountsTab({ canEdit }: { canEdit: boolean }) {
  const [events, setEvents] = useState<EventAccount[]>([]);
  const [eventId, setEventId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [budget, setBudget] = useState<BudgetLine[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [actuals, setActuals] = useState<ActualLine[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [eventDialog, setEventDialog] = useState(false);
  const [eventDraft, setEventDraft] = useState<{ id?: string; name: string; event_date: string; status: string }>({
    name: "", event_date: new Date().toISOString().slice(0, 10), status: "planning",
  });

  const [bookingDialog, setBookingDialog] = useState(false);
  const [bookingDraft, setBookingDraft] = useState<any>(null);

  const [guestDialog, setGuestDialog] = useState(false);
  const [guestDraft, setGuestDraft] = useState<any>(null);

  const [newCategory, setNewCategory] = useState("");
  const [newPlanned, setNewPlanned] = useState("0.00");
  const [newMode, setNewMode] = useState<BudgetMode>("total");
  const [newUnitCost, setNewUnitCost] = useState("0.00");
  const [newQuantity, setNewQuantity] = useState("1");

  const loadEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from("event_accounts" as any)
      .select("id,name,event_date,status")
      .order("event_date", { ascending: false });
    if (error) toast({ title: "Could not load events", description: error.message, variant: "destructive" });
    const rows = ((data as any[]) ?? []) as EventAccount[];
    setEvents(rows);
    setEventId((cur) => cur || rows[0]?.id || "");
    setLoading(false);
  }, []);

  const loadEventData = useCallback(async (id: string) => {
    if (!id) { setBudget([]); setBookings([]); setGuests([]); setActuals([]); return; }
    const [b, bk, ac] = await Promise.all([
      supabase.from("event_budget_lines" as any).select("*").eq("event_id", id).order("category"),
      supabase.from("event_bookings" as any).select("*").eq("event_id", id).order("payer_name"),
      supabase
        .from("journal_lines" as any)
        .select("event_id,debit_pence,credit_pence,description,chart_of_accounts(code,name,account_type)")
        .eq("event_id", id),
    ]);
    const bookingRows = ((bk.data as any[]) ?? []) as Booking[];
    setBudget(((b.data as any[]) ?? []) as BudgetLine[]);
    setBookings(bookingRows);
    setActuals(((ac.data as any[]) ?? []) as ActualLine[]);
    if (bookingRows.length) {
      const { data: g } = await supabase
        .from("event_guests" as any)
        .select("*")
        .in("booking_id", bookingRows.map((r) => r.id));
      setGuests(((g as any[]) ?? []) as Guest[]);
    } else setGuests([]);
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);
  useEffect(() => { loadEventData(eventId); }, [eventId, loadEventData]);

  const event = events.find((e) => e.id === eventId) ?? null;

  // ─── Derived: catering rollup (always computed, never stored) ─────────────
  const rollup = useMemo(() => {
    const menu = new Map<string, number>();
    const wine = new Map<string, number>();
    for (const g of guests) {
      const m = (g.menu_choice || "").trim() || "Not chosen";
      menu.set(m, (menu.get(m) ?? 0) + 1);
      const w = (g.wine_preorder || "").trim() || "None";
      wine.set(w, (wine.get(w) ?? 0) + 1);
    }
    const sort = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return { menu: sort(menu), wine: sort(wine) };
  }, [guests]);

  const ticketTotal = bookings.reduce((s, b) => s + (b.ticket_count ?? 0), 0);
  const namedGuests = guests.filter((g) => (g.name || "").trim()).length;

  // ─── Derived: budget vs actual ────────────────────────────────────────────
  const expenseByAccount = useMemo(() => {
    const m = new Map<string, { code: string; name: string; pence: number }>();
    for (const l of actuals) {
      const a = l.chart_of_accounts;
      if (!a || a.account_type !== "expense") continue;
      const cur = m.get(a.code) ?? { code: a.code, name: a.name, pence: 0 };
      cur.pence += (l.debit_pence ?? 0) - (l.credit_pence ?? 0);
      m.set(a.code, cur);
    }
    return [...m.values()].sort((a, b) => a.code.localeCompare(b.code));
  }, [actuals]);

  const budgetVsActual = useMemo(() => {
    const used = new Set<string>();
    const rows = budget.map((bl) => {
      const cat = bl.category.trim().toLowerCase();
      let actual = 0;
      for (const acc of expenseByAccount) {
        const hay = `${acc.name}`.toLowerCase();
        if (cat && (hay.includes(cat) || cat.includes(hay))) { actual += acc.pence; used.add(acc.code); }
      }
      return { category: bl.category, planned: bl.planned_pence, actual, variance: bl.planned_pence - actual };
    });
    const unmatched = expenseByAccount.filter((a) => !used.has(a.code));
    return { rows, unmatched };
  }, [budget, expenseByAccount]);

  const plannedTotal = budget.reduce((s, b) => s + b.planned_pence, 0);
  const actualExpenseTotal = expenseByAccount.reduce((s, a) => s + a.pence, 0);

  // ─── Derived: event reconciliation ────────────────────────────────────────
  const expectedIncome = bookings.reduce(
    (s, b) => s + (b.deposit_paid ? b.deposit_pence : 0) + (b.balance_paid ? b.balance_pence : 0), 0);
  const invoicedTotal = bookings.reduce((s, b) => s + b.deposit_pence + b.balance_pence, 0);
  const bankedForEvent = useMemo(
    () => actuals
      .filter((l) => l.chart_of_accounts?.code === "1000")
      .reduce((s, l) => s + (l.debit_pence ?? 0) - (l.credit_pence ?? 0), 0),
    [actuals]);
  const gap = expectedIncome - bankedForEvent;

  // ─── Mutations ────────────────────────────────────────────────────────────
  const saveEvent = async () => {
    if (!eventDraft.name.trim()) { toast({ title: "Enter an event name", variant: "destructive" }); return; }
    const payload = { name: eventDraft.name.trim(), event_date: eventDraft.event_date, status: eventDraft.status };
    const { data, error } = eventDraft.id
      ? await supabase.from("event_accounts" as any).update(payload).eq("id", eventDraft.id).select("id").maybeSingle()
      : await supabase.from("event_accounts" as any).insert(payload).select("id").maybeSingle();
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    setEventDialog(false);
    await loadEvents();
    if (!eventDraft.id && (data as any)?.id) setEventId((data as any).id);
    toast({ title: "Event saved" });
  };

  const addBudgetLine = async () => {
    if (!newCategory.trim()) { toast({ title: "Enter a category", variant: "destructive" }); return; }
    const unit = toPence(newUnitCost);
    const qty = Math.max(0, Math.round(parseFloat(newQuantity || "0") || 0));
    const payload = newMode === "perHead"
      ? { event_id: eventId, category: newCategory.trim(), unit_cost_pence: unit, quantity: qty, planned_pence: unit * qty }
      : { event_id: eventId, category: newCategory.trim(), planned_pence: toPence(newPlanned), unit_cost_pence: null, quantity: null };
    const { error } = await supabase.from("event_budget_lines" as any).insert(payload);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    setNewCategory(""); setNewPlanned("0.00"); setNewMode("total"); setNewUnitCost("0.00"); setNewQuantity("1");
    loadEventData(eventId);
  };

  const updateBudgetLine = async (id: string, patch: Partial<BudgetLine>) => {
    setBudget((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    const { error } = await supabase.from("event_budget_lines" as any).update(patch).eq("id", id);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
  };

  // Switch a line between Total and Per head modes, keeping planned_pence coherent.
  const setBudgetLineMode = (l: BudgetLine, mode: BudgetMode) => {
    if (mode === "perHead") {
      const unit = l.planned_pence;
      const quantity = 1;
      updateBudgetLine(l.id, { unit_cost_pence: unit, quantity, planned_pence: unit * quantity });
    } else {
      updateBudgetLine(l.id, { unit_cost_pence: null, quantity: null });
    }
  };

  // Per-head line edit: recalculate planned_pence from unit × quantity and save both.
  const updatePerHead = (l: BudgetLine, unitPence: number, qty: number) => {
    updateBudgetLine(l.id, { unit_cost_pence: unitPence, quantity: qty, planned_pence: unitPence * qty });
  };

  const deleteBudgetLine = async (id: string) => {
    const { error } = await supabase.from("event_budget_lines" as any).delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else loadEventData(eventId);
  };

  const openBooking = (b?: Booking) => {
    setBookingDraft(b
      ? { ...b, deposit: fromPence(b.deposit_pence), balance: fromPence(b.balance_pence) }
      : {
          event_id: eventId, payer_name: "", ticket_count: 1, is_placeholder: false,
          deposit: "0.00", deposit_paid: false, deposit_method: "bank_transfer",
          balance: "0.00", balance_paid: false, balance_method: "bank_transfer", notes: "",
        });
    setBookingDialog(true);
  };

  const saveBooking = async () => {
    const d = bookingDraft;
    if (!d?.payer_name?.trim()) { toast({ title: "Enter the payer's name", variant: "destructive" }); return; }
    const payload = {
      event_id: eventId,
      payer_name: d.payer_name.trim(),
      ticket_count: Math.max(0, Number(d.ticket_count) || 0),
      is_placeholder: !!d.is_placeholder,
      deposit_pence: toPence(d.deposit),
      deposit_paid: !!d.deposit_paid,
      deposit_method: d.deposit_method || null,
      balance_pence: toPence(d.balance),
      balance_paid: !!d.balance_paid,
      balance_method: d.balance_method || null,
      notes: (d.notes || "").trim() || null,
    };
    const { error } = d.id
      ? await supabase.from("event_bookings" as any).update(payload).eq("id", d.id)
      : await supabase.from("event_bookings" as any).insert(payload);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    setBookingDialog(false);
    loadEventData(eventId);
    toast({ title: "Booking saved" });
  };

  const deleteBooking = async (id: string) => {
    if (!confirm("Delete this booking and its guests?")) return;
    const { error } = await supabase.from("event_bookings" as any).delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else loadEventData(eventId);
  };

  const openGuest = (bookingId: string, g?: Guest) => {
    setGuestDraft(g ? { ...g } : {
      booking_id: bookingId, name: "", seating_preference: "", menu_choice: "", allergies: "", wine_preorder: "",
    });
    setGuestDialog(true);
  };

  const saveGuest = async () => {
    const d = guestDraft;
    const payload = {
      booking_id: d.booking_id,
      name: (d.name || "").trim() || null,
      seating_preference: (d.seating_preference || "").trim() || null,
      menu_choice: (d.menu_choice || "").trim() || null,
      allergies: (d.allergies || "").trim() || null,
      wine_preorder: (d.wine_preorder || "").trim() || null,
    };
    const { error } = d.id
      ? await supabase.from("event_guests" as any).update(payload).eq("id", d.id)
      : await supabase.from("event_guests" as any).insert(payload);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    setGuestDialog(false);
    loadEventData(eventId);
  };

  const deleteGuest = async (id: string) => {
    const { error } = await supabase.from("event_guests" as any).delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else loadEventData(eventId);
  };

  const toggleExpanded = (id: string) =>
    setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ─── PDF ──────────────────────────────────────────────────────────────────
  const exportPdf = async () => {
    if (!event) return;
    const { doc, pageW, margin } = await reportPdfDoc(
      `Event Account — ${event.name}`,
      `Event date: ${new Date(event.event_date).toLocaleDateString("en-GB")}`,
    );
    let y = reportSection(doc, pageW, margin, 135, "Budget vs Actual");
    autoTable(doc, {
      startY: y,
      head: [["Category", "Planned", "Actual", "Variance"]],
      body: budgetVsActual.rows.map((r) => [r.category, money(r.planned), money(r.actual), money(r.variance)]),
      foot: [["Total", money(plannedTotal), money(actualExpenseTotal), money(plannedTotal - actualExpenseTotal)]],
      margin: { left: margin, right: margin, bottom: 50 },
      styles: { font: "helvetica", fontSize: 9, cellPadding: 5, textColor: INK, lineColor: [220, 215, 200], lineWidth: 0.4 },
      headStyles: { fillColor: GOLD, textColor: NAVY, fontStyle: "bold" },
      footStyles: { fillColor: [250, 247, 238], textColor: INK, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 247, 238] },
      theme: "grid",
      columnStyles: { 0: { cellWidth: 200 }, 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
    });
    y = (doc as any).lastAutoTable.finalY + 20;

    if (budgetVsActual.unmatched.length) {
      y = reportSection(doc, pageW, margin, y, "Event costs not matched to a budget category");
      autoTable(doc, {
        startY: y,
        head: [["Account", "Actual"]],
        body: budgetVsActual.unmatched.map((a) => [`${a.code} — ${a.name}`, money(a.pence)]),
        margin: { left: margin, right: margin, bottom: 50 },
        styles: { font: "helvetica", fontSize: 9, cellPadding: 5, textColor: INK, lineColor: [220, 215, 200], lineWidth: 0.4 },
        headStyles: { fillColor: GOLD, textColor: NAVY, fontStyle: "bold" },
        theme: "grid",
        columnStyles: { 0: { cellWidth: 320 }, 1: { halign: "right" } },
      });
      y = (doc as any).lastAutoTable.finalY + 20;
    }

    y = reportSection(doc, pageW, margin, y, "Bookings & reconciliation");
    autoTable(doc, {
      startY: y,
      head: [["Payer", "Tickets", "Deposit", "Balance", "Received"]],
      body: bookings.map((b) => [
        b.payer_name + (b.is_placeholder ? " (names TBC)" : ""),
        String(b.ticket_count),
        `${money(b.deposit_pence)}${b.deposit_paid ? " ✓" : ""}`,
        `${money(b.balance_pence)}${b.balance_paid ? " ✓" : ""}`,
        money((b.deposit_paid ? b.deposit_pence : 0) + (b.balance_paid ? b.balance_pence : 0)),
      ]),
      foot: [["Total", String(ticketTotal), "", "", money(expectedIncome)]],
      margin: { left: margin, right: margin, bottom: 50 },
      styles: { font: "helvetica", fontSize: 9, cellPadding: 5, textColor: INK, lineColor: [220, 215, 200], lineWidth: 0.4 },
      headStyles: { fillColor: GOLD, textColor: NAVY, fontStyle: "bold" },
      footStyles: { fillColor: [250, 247, 238], textColor: INK, fontStyle: "bold" },
      theme: "grid",
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
    });
    y = (doc as any).lastAutoTable.finalY + 20;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(`Recorded as received: ${money(expectedIncome)}`, margin, y);
    doc.text(`Landed in Bank (1000) tagged to this event: ${money(bankedForEvent)}`, margin, y + 14);
    doc.text(gap === 0 ? "Reconciled — no gap." : `Gap: ${money(gap)}`, margin, y + 28);
    doc.setTextColor(...MUTED);
    doc.setFontSize(8);
    doc.text("Catering figures are computed live from guest entries and are not stored.", margin, y + 46);

    await saveJsPdf(doc, `event-account-${event.name.toLowerCase().replace(/\s+/g, "-")}.pdf`);
  };

  if (loading) {
    return <p className="text-primary-foreground/60"><Loader2 className="w-4 h-4 mr-1 inline animate-spin" /> Loading…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-sm border border-gold/20 bg-navy-light/30 p-4">
        <h2 className="font-serif text-lg text-gold mb-1">Event Accounts</h2>
        <p className="text-primary-foreground/60 text-sm mb-3">
          The Treasurer's own record of an event — budget, bookings, guests, catering numbers and money in.
          Nothing here is public-facing.
        </p>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="min-w-[240px] flex-1">
            <Label className="text-xs">Event</Label>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger><SelectValue placeholder="Choose an event" /></SelectTrigger>
              <SelectContent>
                {events.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} — {new Date(e.event_date).toLocaleDateString("en-GB")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {canEdit && (
            <>
              <Button variant="outline" className="border-gold/30"
                onClick={() => { if (event) { setEventDraft({ id: event.id, name: event.name, event_date: event.event_date, status: event.status }); setEventDialog(true); } }}
                disabled={!event}>
                <Pencil className="w-4 h-4 mr-1" /> Edit
              </Button>
              <Button className="bg-gold text-navy hover:bg-gold/90"
                onClick={() => { setEventDraft({ name: "", event_date: new Date().toISOString().slice(0, 10), status: "planning" }); setEventDialog(true); }}>
                <Plus className="w-4 h-4 mr-1" /> New event
              </Button>
            </>
          )}
          <Button variant="outline" className="border-gold/30" onClick={exportPdf} disabled={!event}>
            <FileDown className="w-4 h-4 mr-1" /> Export PDF
          </Button>
        </div>
      </div>

      {!event ? (
        <p className="text-primary-foreground/60 text-sm">No event selected.</p>
      ) : (
        <>
          {/* Budget */}
          <Card title="Budget">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-primary-foreground/60 border-b border-gold/15">
                    <th className="px-2 py-2">Category</th>
                    <th className="px-2 py-2">Mode</th>
                    <th className="px-2 py-2 text-right">Planned (£)</th>
                    {canEdit && <th className="px-2 py-2 w-12"></th>}
                  </tr>
                </thead>
                <tbody>
                  {budget.length === 0 && (
                    <tr><td colSpan={4} className="px-2 py-4 text-primary-foreground/50">No budget lines yet.</td></tr>
                  )}
                  {budget.map((l) => (
                    <tr key={l.id} className="border-b border-gold/10">
                      <td className="px-2 py-1.5">
                        <Input value={l.category} disabled={!canEdit}
                          onChange={(e) => setBudget((ls) => ls.map((x) => x.id === l.id ? { ...x, category: e.target.value } : x))}
                          onBlur={(e) => updateBudgetLine(l.id, { category: e.target.value })} />
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="inline-flex rounded-sm border border-gold/20 overflow-hidden">
                          {(["total", "perHead"] as const).map((m) => (
                            <button key={m} type="button" disabled={!canEdit}
                              className={`px-2 py-1 text-xs ${lineMode(l) === m ? "bg-gold text-navy" : "text-primary-foreground/60 hover:text-primary-foreground"}`}
                              onClick={() => lineMode(l) !== m && setBudgetLineMode(l, m)}>
                              {m === "total" ? "Total" : "Per head"}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {lineMode(l) === "perHead" ? (
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            <Input type="number" step="0.01" className="w-24 text-right" disabled={!canEdit}
                              aria-label="Cost per head (£)"
                              defaultValue={fromPence(l.unit_cost_pence ?? 0)}
                              key={`u-${l.id}-${l.unit_cost_pence}`}
                              onBlur={(e) => updatePerHead(l, toPence(e.target.value), l.quantity ?? 0)} />
                            <span className="text-primary-foreground/60">×</span>
                            <Input type="number" min="0" step="1" className="w-20 text-right" disabled={!canEdit}
                              aria-label="Quantity"
                              defaultValue={String(l.quantity ?? 0)}
                              key={`q-${l.id}-${l.quantity}`}
                              onBlur={(e) => updatePerHead(l, l.unit_cost_pence ?? 0, Math.max(0, Math.round(parseFloat(e.target.value || "0") || 0)))} />
                            <span className="text-primary-foreground/60">=</span>
                            <span className="tabular-nums text-gold font-medium">{money(l.planned_pence)}</span>
                          </div>
                        ) : (
                          <Input type="number" step="0.01" className="text-right" disabled={!canEdit}
                            defaultValue={fromPence(l.planned_pence)}
                            key={`p-${l.id}-${l.planned_pence}`}
                            onBlur={(e) => updateBudgetLine(l.id, { planned_pence: toPence(e.target.value) })} />
                        )}
                      </td>
                      {canEdit && (
                        <td className="px-2 py-1.5">
                          <Button variant="ghost" size="icon" aria-label="Delete budget line"
                            className="text-primary-foreground/60 hover:text-destructive"
                            onClick={() => deleteBudgetLine(l.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {canEdit && (
              <div className="flex flex-wrap gap-2 items-end pt-1">
                <div className="flex-1 min-w-[180px]">
                  <Label className="text-xs">New category</Label>
                  <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="e.g. Venue" />
                </div>
                <div>
                  <Label className="text-xs">Mode</Label>
                  <div className="inline-flex rounded-sm border border-gold/20 overflow-hidden h-9">
                    {(["total", "perHead"] as const).map((m) => (
                      <button key={m} type="button"
                        className={`px-2 text-xs ${newMode === m ? "bg-gold text-navy" : "text-primary-foreground/60 hover:text-primary-foreground"}`}
                        onClick={() => setNewMode(m)}>
                        {m === "total" ? "Total" : "Per head"}
                      </button>
                    ))}
                  </div>
                </div>
                {newMode === "perHead" ? (
                  <>
                    <div className="w-28">
                      <Label className="text-xs">Cost per head (£)</Label>
                      <Input type="number" step="0.01" value={newUnitCost} onChange={(e) => setNewUnitCost(e.target.value)} />
                    </div>
                    <div className="w-20">
                      <Label className="text-xs">Quantity</Label>
                      <Input type="number" min="0" step="1" value={newQuantity} onChange={(e) => setNewQuantity(e.target.value)} />
                    </div>
                    <div className="text-sm text-primary-foreground/80 pb-2 tabular-nums">
                      = {money(toPence(newUnitCost) * Math.max(0, Math.round(parseFloat(newQuantity || "0") || 0)))}
                    </div>
                  </>
                ) : (
                  <div className="w-32">
                    <Label className="text-xs">Planned (£)</Label>
                    <Input type="number" step="0.01" value={newPlanned} onChange={(e) => setNewPlanned(e.target.value)} />
                  </div>
                )}
                <Button className="bg-gold text-navy hover:bg-gold/90" onClick={addBudgetLine}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
            )}
            <p className="text-sm text-primary-foreground">Total planned: <span className="text-gold font-medium">{money(plannedTotal)}</span></p>
          </Card>

          {/* Bookings */}
          <Card
            title="Bookings"
            action={canEdit ? (
              <Button size="sm" className="bg-gold text-navy hover:bg-gold/90" onClick={() => openBooking()}>
                <Plus className="w-4 h-4 mr-1" /> New booking
              </Button>
            ) : undefined}
          >
            {bookings.length === 0 ? (
              <p className="text-primary-foreground/50 text-sm">No bookings recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {bookings.map((b) => {
                  const bGuests = guests.filter((g) => g.booking_id === b.id);
                  const open = expanded.has(b.id);
                  return (
                    <div key={b.id} className="rounded-sm border border-gold/15">
                      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
                        <button type="button" className="text-gold" onClick={() => toggleExpanded(b.id)} aria-label="Toggle guests">
                          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <span className="text-primary-foreground font-medium">{b.payer_name}</span>
                        <span className="text-primary-foreground/60 text-xs">
                          {b.ticket_count} ticket{b.ticket_count === 1 ? "" : "s"}
                          {b.is_placeholder ? " · names TBC" : ""} · {bGuests.length} guest row{bGuests.length === 1 ? "" : "s"}
                        </span>
                        <span className="ml-auto text-xs tabular-nums text-primary-foreground/80">
                          Dep {money(b.deposit_pence)}{b.deposit_paid ? " ✓" : ""} · Bal {money(b.balance_pence)}{b.balance_paid ? " ✓" : ""}
                        </span>
                        {canEdit && (
                          <>
                            <Button variant="ghost" size="icon" aria-label="Edit booking" onClick={() => openBooking(b)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" aria-label="Delete booking"
                              className="text-primary-foreground/60 hover:text-destructive" onClick={() => deleteBooking(b.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                      {open && (
                        <div className="border-t border-gold/10 px-3 py-2 space-y-2">
                          {b.notes && <p className="text-xs text-primary-foreground/60">{b.notes}</p>}
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[640px]">
                              <thead>
                                <tr className="text-left text-xs uppercase tracking-wider text-primary-foreground/60">
                                  <th className="px-2 py-1">Guest</th>
                                  <th className="px-2 py-1">Seating</th>
                                  <th className="px-2 py-1">Menu</th>
                                  <th className="px-2 py-1">Allergies</th>
                                  <th className="px-2 py-1">Wine</th>
                                  {canEdit && <th className="px-2 py-1 w-20"></th>}
                                </tr>
                              </thead>
                              <tbody>
                                {bGuests.length === 0 && (
                                  <tr><td colSpan={6} className="px-2 py-2 text-primary-foreground/50">No guests entered.</td></tr>
                                )}
                                {bGuests.map((g) => (
                                  <tr key={g.id} className="border-t border-gold/10">
                                    <td className="px-2 py-1">{g.name || <span className="text-primary-foreground/50">TBC</span>}</td>
                                    <td className="px-2 py-1">{g.seating_preference || "—"}</td>
                                    <td className="px-2 py-1">{g.menu_choice || "—"}</td>
                                    <td className="px-2 py-1">{g.allergies || "—"}</td>
                                    <td className="px-2 py-1">{g.wine_preorder || "—"}</td>
                                    {canEdit && (
                                      <td className="px-2 py-1 whitespace-nowrap">
                                        <Button variant="ghost" size="icon" aria-label="Edit guest" onClick={() => openGuest(b.id, g)}>
                                          <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" aria-label="Delete guest"
                                          className="text-primary-foreground/60 hover:text-destructive" onClick={() => deleteGuest(g.id)}>
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {canEdit && (
                            <Button variant="outline" size="sm" className="border-gold/30" onClick={() => openGuest(b.id)}>
                              <Plus className="w-4 h-4 mr-1" /> Add guest
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-sm text-primary-foreground/80">
              {bookings.length} booking{bookings.length === 1 ? "" : "s"} · {ticketTotal} ticket{ticketTotal === 1 ? "" : "s"} · {namedGuests} named guest{namedGuests === 1 ? "" : "s"}
            </p>
          </Card>

          {/* Catering rollup */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Catering — menu choices">
              {rollup.menu.length === 0 ? <p className="text-primary-foreground/50 text-sm">No guests entered.</p> : (
                <ul className="text-sm space-y-1">
                  {rollup.menu.map(([k, v]) => (
                    <li key={k} className="flex justify-between"><span className="text-primary-foreground/80">{k}</span><span className="text-gold tabular-nums">{v}</span></li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="Catering — wine pre-orders">
              {rollup.wine.length === 0 ? <p className="text-primary-foreground/50 text-sm">No guests entered.</p> : (
                <ul className="text-sm space-y-1">
                  {rollup.wine.map(([k, v]) => (
                    <li key={k} className="flex justify-between"><span className="text-primary-foreground/80">{k}</span><span className="text-gold tabular-nums">{v}</span></li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Budget vs actual */}
          <Card title="Budget vs Actual">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-primary-foreground/60 border-b border-gold/15">
                    <th className="px-2 py-2">Category</th>
                    <th className="px-2 py-2 text-right">Planned</th>
                    <th className="px-2 py-2 text-right">Actual</th>
                    <th className="px-2 py-2 text-right">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetVsActual.rows.map((r) => (
                    <tr key={r.category} className="border-b border-gold/10">
                      <td className="px-2 py-1.5">{r.category}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{money(r.planned)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{money(r.actual)}</td>
                      <td className={`px-2 py-1.5 text-right tabular-nums ${r.variance < 0 ? "text-red-400" : "text-emerald-400"}`}>{money(r.variance)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="px-2 py-2 font-medium text-gold">Total</td>
                    <td className="px-2 py-2 text-right tabular-nums text-gold">{money(plannedTotal)}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-gold">{money(actualExpenseTotal)}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-gold">{money(plannedTotal - actualExpenseTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {budgetVsActual.unmatched.length > 0 && (
              <div className="pt-2">
                <p className="text-xs uppercase tracking-wider text-primary-foreground/60 mb-1">Event costs not matched to a budget category</p>
                <ul className="text-sm space-y-1">
                  {budgetVsActual.unmatched.map((a) => (
                    <li key={a.code} className="flex justify-between">
                      <span className="text-primary-foreground/80">{a.code} — {a.name}</span>
                      <span className="tabular-nums">{money(a.pence)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-primary-foreground/50">
              Actuals are the sum of journal lines tagged to this event. Tag lines from Transaction Detail.
            </p>
          </Card>

          {/* Reconciliation */}
          <Card title="Event reconciliation">
            <ul className="text-sm space-y-1">
              <li className="flex justify-between"><span className="text-primary-foreground/70">Invoiced to bookings (deposits + balances)</span><span className="tabular-nums">{money(invoicedTotal)}</span></li>
              <li className="flex justify-between"><span className="text-primary-foreground/70">Recorded as received (marked paid)</span><span className="tabular-nums">{money(expectedIncome)}</span></li>
              <li className="flex justify-between"><span className="text-primary-foreground/70">Landed in Bank (1000), tagged to this event</span><span className="tabular-nums">{money(bankedForEvent)}</span></li>
            </ul>
            <p className={`text-sm font-semibold ${gap === 0 ? "text-emerald-400" : "text-amber-400"}`}>
              {gap === 0 ? "Matched — no gap." : `Gap of ${money(Math.abs(gap))} — ${gap > 0 ? "marked paid but not yet seen in the bank" : "more in the bank than recorded against bookings"}.`}
            </p>
          </Card>
        </>
      )}

      {/* Event dialog */}
      <Dialog open={eventDialog} onOpenChange={setEventDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{eventDraft.id ? "Edit event" : "New event"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={eventDraft.name} onChange={(e) => setEventDraft({ ...eventDraft, name: e.target.value })} />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={eventDraft.event_date} onChange={(e) => setEventDraft({ ...eventDraft, event_date: e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={eventDraft.status} onValueChange={(v) => setEventDraft({ ...eventDraft, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button className="bg-gold text-navy hover:bg-gold/90" onClick={saveEvent}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Booking dialog */}
      <Dialog open={bookingDialog} onOpenChange={setBookingDialog}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{bookingDraft?.id ? "Edit booking" : "New booking"}</DialogTitle></DialogHeader>
          {bookingDraft && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Payer name</Label>
                  <Input value={bookingDraft.payer_name} onChange={(e) => setBookingDraft({ ...bookingDraft, payer_name: e.target.value })} />
                </div>
                <div>
                  <Label>Tickets</Label>
                  <Input type="number" min="0" value={bookingDraft.ticket_count}
                    onChange={(e) => setBookingDraft({ ...bookingDraft, ticket_count: e.target.value })} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-primary-foreground/80">
                <Checkbox checked={!!bookingDraft.is_placeholder}
                  onCheckedChange={(v) => setBookingDraft({ ...bookingDraft, is_placeholder: !!v })} />
                Placeholder — guest names to be confirmed
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label>Deposit (£)</Label>
                  <Input type="number" step="0.01" value={bookingDraft.deposit}
                    onChange={(e) => setBookingDraft({ ...bookingDraft, deposit: e.target.value })} />
                </div>
                <div>
                  <Label>Deposit method</Label>
                  <Select value={bookingDraft.deposit_method ?? "bank_transfer"}
                    onValueChange={(v) => setBookingDraft({ ...bookingDraft, deposit_method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{METHODS.map((m) => <SelectItem key={m} value={m}>{m.replace("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <label className="flex items-end gap-2 text-sm text-primary-foreground/80 pb-2">
                  <Checkbox checked={!!bookingDraft.deposit_paid}
                    onCheckedChange={(v) => setBookingDraft({ ...bookingDraft, deposit_paid: !!v })} />
                  Deposit paid
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label>Balance (£)</Label>
                  <Input type="number" step="0.01" value={bookingDraft.balance}
                    onChange={(e) => setBookingDraft({ ...bookingDraft, balance: e.target.value })} />
                </div>
                <div>
                  <Label>Balance method</Label>
                  <Select value={bookingDraft.balance_method ?? "bank_transfer"}
                    onValueChange={(v) => setBookingDraft({ ...bookingDraft, balance_method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{METHODS.map((m) => <SelectItem key={m} value={m}>{m.replace("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <label className="flex items-end gap-2 text-sm text-primary-foreground/80 pb-2">
                  <Checkbox checked={!!bookingDraft.balance_paid}
                    onCheckedChange={(v) => setBookingDraft({ ...bookingDraft, balance_paid: !!v })} />
                  Balance paid
                </label>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={bookingDraft.notes ?? ""} onChange={(e) => setBookingDraft({ ...bookingDraft, notes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button className="bg-gold text-navy hover:bg-gold/90" onClick={saveBooking}>Save booking</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Guest dialog */}
      <Dialog open={guestDialog} onOpenChange={setGuestDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{guestDraft?.id ? "Edit guest" : "Add guest"}</DialogTitle></DialogHeader>
          {guestDraft && (
            <div className="space-y-3">
              <div>
                <Label>Name (leave blank while TBC)</Label>
                <Input value={guestDraft.name ?? ""} onChange={(e) => setGuestDraft({ ...guestDraft, name: e.target.value })} />
              </div>
              <div>
                <Label>Seating preference</Label>
                <Input value={guestDraft.seating_preference ?? ""} onChange={(e) => setGuestDraft({ ...guestDraft, seating_preference: e.target.value })} />
              </div>
              <div>
                <Label>Menu choice</Label>
                <Input value={guestDraft.menu_choice ?? ""} onChange={(e) => setGuestDraft({ ...guestDraft, menu_choice: e.target.value })} />
              </div>
              <div>
                <Label>Allergies / dietary</Label>
                <Input value={guestDraft.allergies ?? ""} onChange={(e) => setGuestDraft({ ...guestDraft, allergies: e.target.value })} />
              </div>
              <div>
                <Label>Wine pre-order</Label>
                <Input value={guestDraft.wine_preorder ?? ""} onChange={(e) => setGuestDraft({ ...guestDraft, wine_preorder: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button className="bg-gold text-navy hover:bg-gold/90" onClick={saveGuest}>Save guest</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
