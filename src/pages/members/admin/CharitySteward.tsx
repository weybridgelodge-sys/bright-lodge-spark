import { useEffect, useMemo, useState } from "react";
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, Download, Save, ExternalLink } from "lucide-react";
import {
  fetchCharities, fetchCollections, fetchDonations, fetchFestivalSettings,
  COLLECTION_TYPE_LABEL, PAYMENT_METHOD_LABEL, AUTHORISED_LABEL,
  type Charity, type Collection, type Donation, type FestivalSettings,
  type CollectionType, type PaymentMethod, type AuthorisedBy,
  currentMasonicYear, masonicYearBounds, inYear, reliefChestBalance, gbp,
  isFestivalDonation,
} from "@/lib/charity/queries";
import { buildCharityAnnualReportPdf } from "@/lib/charity/annualReportPdf";
import { highestAwardAchieved, festivalTiers, nextTierAhead } from "@/lib/charity/festivalAwards";

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-gold/20 bg-navy-light/30 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
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

// ─────────────────────────────────────────────────────────────────────────────
// Collections tab
// ─────────────────────────────────────────────────────────────────────────────
function CollectionsTab({ collections, donations, canEdit, onChange }: {
  collections: Collection[]; donations: Donation[]; canEdit: boolean; onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Collection | null>(null);
  const year = currentMasonicYear();
  const bounds = masonicYearBounds(year);

  const ytd = collections.filter((c) => inYear(c.collection_date, year));
  const byType = (t: CollectionType) => ytd.filter((c) => c.collection_type === t).reduce((a, c) => a + Number(c.net_amount), 0);
  const reliefBal = reliefChestBalance(collections, donations);

  // per-meeting subtotals
  const byMeeting = new Map<string, number>();
  ytd.forEach((c) => {
    const key = c.collection_date;
    byMeeting.set(key, (byMeeting.get(key) ?? 0) + Number(c.net_amount));
  });
  const meetingRows = Array.from(byMeeting.entries()).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        <Card title={`Year ${bounds.label} totals`}>
          <Stat label="Charity Column" value={gbp(byType("charity_column"))} />
          <Stat label="Raffle" value={gbp(byType("raffle"))} />
          <Stat label="Ad Hoc" value={gbp(byType("ad_hoc"))} />
          <Stat label="Other" value={gbp(byType("other"))} />
          <div className="border-t border-gold/15 pt-2 mt-2">
            <Stat label="Total collected" value={<span className="text-gold">{gbp(byType("charity_column") + byType("raffle") + byType("ad_hoc") + byType("other") + byType("relief_chest"))}</span>} />
          </div>
        </Card>
        <Card title="Relief Chest">
          <Stat label="Collected into chest (year)" value={gbp(byType("relief_chest"))} />
          <Stat label="Disbursed from chest (year)" value={gbp(donations.filter((d) => d.from_relief_chest && inYear(d.donation_date, year)).reduce((a, d) => a + Number(d.amount), 0))} />
          <div className="border-t border-gold/15 pt-2 mt-2">
            <Stat label="Running balance" value={<span className="text-gold">{gbp(reliefBal)}</span>} />
          </div>
          <p className="text-[11px] text-primary-foreground/50 italic">Money held in the lodge's Relief Chest, awaiting allocation.</p>
        </Card>
        <Card title="Per-meeting subtotals">
          {meetingRows.length === 0 ? (
            <p className="text-xs text-primary-foreground/50 italic">No collections recorded this year.</p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {meetingRows.slice(0, 10).map(([date, total]) => (
                <Stat key={date} label={new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} value={gbp(total)} />
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="rounded-sm border border-gold/20 bg-navy-light/30">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gold/15">
          <h3 className="font-serif text-gold">Collections log</h3>
          {canEdit && (
            <Button size="sm" className="bg-gold text-navy hover:bg-gold/90" onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" /> New
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-primary-foreground/60 border-b border-gold/15">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2 text-right">Gross</th>
                <th className="px-4 py-2 text-right">Costs</th>
                <th className="px-4 py-2 text-right">Net</th>
                <th className="px-4 py-2">Notes</th>
                {canEdit && <th className="px-4 py-2 w-20"></th>}
              </tr>
            </thead>
            <tbody>
              {collections.length === 0 && (
                <tr><td colSpan={canEdit ? 7 : 6} className="px-4 py-6 text-center text-primary-foreground/50">No collections recorded.</td></tr>
              )}
              {collections.map((c) => (
                <tr key={c.id} className="border-b border-gold/10 hover:bg-navy-light/30">
                  <td className="px-4 py-2 tabular-nums">{new Date(c.collection_date).toLocaleDateString("en-GB")}</td>
                  <td className="px-4 py-2">{COLLECTION_TYPE_LABEL[c.collection_type]}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{gbp(Number(c.gross_amount))}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{gbp(Number(c.costs))}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gold">{gbp(Number(c.net_amount))}</td>
                  <td className="px-4 py-2 text-xs text-primary-foreground/70 max-w-[260px] truncate" title={c.notes ?? ""}>{c.notes}</td>
                  {canEdit && (
                    <td className="px-4 py-2 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(c); setOpen(true); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CollectionDialog open={open} onOpenChange={setOpen} editing={editing} onSaved={() => { setOpen(false); onChange(); }} />
    </div>
  );
}

function CollectionDialog({ open, onOpenChange, editing, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; editing: Collection | null; onSaved: () => void;
}) {
  const [date, setDate] = useState("");
  const [type, setType] = useState<CollectionType>("charity_column");
  const [gross, setGross] = useState("0");
  const [costs, setCosts] = useState("0");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setDate(editing.collection_date);
      setType(editing.collection_type);
      setGross(String(editing.gross_amount));
      setCosts(String(editing.costs));
      setNotes(editing.notes ?? "");
    } else {
      setDate(new Date().toISOString().slice(0, 10));
      setType("charity_column");
      setGross("0"); setCosts("0"); setNotes("");
    }
  }, [open, editing]);

  const save = async () => {
    setSaving(true);
    const payload = {
      collection_date: date,
      collection_type: type,
      gross_amount: Number(gross) || 0,
      costs: Number(costs) || 0,
      notes: notes || null,
    };
    const { error } = editing
      ? await supabase.from("charity_collections").update(payload).eq("id", editing.id)
      : await supabase.from("charity_collections").insert(payload);
    setSaving(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: editing ? "Updated" : "Added" });
    onSaved();
  };

  const remove = async () => {
    if (!editing || !confirm("Delete this collection?")) return;
    const { error } = await supabase.from("charity_collections").delete().eq("id", editing.id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Deleted" });
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-navy text-primary-foreground border-gold/30">
        <DialogHeader><DialogTitle className="font-serif text-gold">{editing ? "Edit collection" : "New collection"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as CollectionType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(COLLECTION_TYPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Gross amount (£)</Label><Input type="number" step="0.01" value={gross} onChange={(e) => setGross(e.target.value)} /></div>
            <div><Label>Costs (£)</Label><Input type="number" step="0.01" value={costs} onChange={(e) => setCosts(e.target.value)} /></div>
          </div>
          <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></div>
        </div>
        <DialogFooter className="flex items-center justify-between gap-2">
          {editing && <Button variant="ghost" className="text-red-300 hover:text-red-200" onClick={remove}><Trash2 className="w-4 h-4 mr-1" /> Delete</Button>}
          <Button onClick={save} disabled={saving} className="bg-gold text-navy hover:bg-gold/90 ml-auto">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Donations tab
// ─────────────────────────────────────────────────────────────────────────────
function DonationsTab({ donations, charities, festival, canEdit, onChange }: {
  donations: Donation[]; charities: Charity[]; festival: FestivalSettings | null; canEdit: boolean; onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Donation | null>(null);
  const year = currentMasonicYear();
  const ytd = donations.filter((d) => inYear(d.donation_date, year));
  const sumLodge = (xs: Donation[]) => xs.reduce((a, d) => a + Number(d.amount), 0);
  const sumMatch = (xs: Donation[]) => xs.reduce((a, d) => a + Number(d.match_funding_amount ?? 0), 0);
  const ytdLodge = sumLodge(ytd);
  const ytdMatch = sumMatch(ytd);
  const ytdTotal = ytdLodge + ytdMatch;
  const grandLodge = sumLodge(donations);
  const grandMatch = sumMatch(donations);
  const grandTotal = grandLodge + grandMatch;
  const reliefOut = ytd.filter((d) => d.from_relief_chest).reduce((a, d) => a + Number(d.amount), 0);


  const charityById = new Map(charities.map((c) => [c.id, c]));

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        <Card title="Year to date">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-primary-foreground/60">Lodge donations</span><span className="tabular-nums">{gbp(ytdLodge)}</span></div>
            <div className="flex justify-between"><span className="text-primary-foreground/60">Match funded</span><span className="tabular-nums">{gbp(ytdMatch)}</span></div>
            <div className="flex justify-between border-t border-gold/15 pt-1 mt-1"><span className="text-gold">Total</span><span className="tabular-nums text-gold">{gbp(ytdTotal)}</span></div>
          </div>
        </Card>
        <Card title="All time">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-primary-foreground/60">Lodge donations</span><span className="tabular-nums">{gbp(grandLodge)}</span></div>
            <div className="flex justify-between"><span className="text-primary-foreground/60">Match funded</span><span className="tabular-nums">{gbp(grandMatch)}</span></div>
            <div className="flex justify-between border-t border-gold/15 pt-1 mt-1"><span className="text-gold">Grand total</span><span className="tabular-nums text-gold">{gbp(grandTotal)}</span></div>
          </div>
        </Card>
        <Card title="Relief Chest disbursements (year)"><Stat label="Drawn from chest" value={gbp(reliefOut)} /></Card>
      </div>


      <div className="rounded-sm border border-gold/20 bg-navy-light/30">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gold/15">
          <h3 className="font-serif text-gold">Donations log</h3>
          {canEdit && (
            <Button size="sm" className="bg-gold text-navy hover:bg-gold/90" onClick={() => { setEditing(null); setOpen(true); }} disabled={charities.length === 0}>
              <Plus className="w-4 h-4 mr-1" /> New
            </Button>
          )}
        </div>
        {charities.length === 0 && (
          <p className="px-4 py-3 text-xs text-amber-300">Add at least one charity to the Charity Ledger before logging a donation.</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-primary-foreground/60 border-b border-gold/15">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Charity</th>
                <th className="px-4 py-2 text-right">Lodge donation</th>
                <th className="px-4 py-2 text-right">Match funded</th>
                <th className="px-4 py-2 text-right">Total donation</th>
                <th className="px-4 py-2">Purpose</th>
                <th className="px-4 py-2">Method</th>
                <th className="px-4 py-2">Flags</th>
                {canEdit && <th className="px-4 py-2 w-12"></th>}
              </tr>
            </thead>
            <tbody>
              {donations.length === 0 && (
                <tr><td colSpan={canEdit ? 9 : 8} className="px-4 py-6 text-center text-primary-foreground/50">No donations recorded.</td></tr>
              )}
              {donations.map((d) => {
                const lodge = Number(d.amount);
                const match = Number(d.match_funding_amount ?? 0);
                return (
                <tr key={d.id} className="border-b border-gold/10 hover:bg-navy-light/30">
                  <td className="px-4 py-2 tabular-nums">{new Date(d.donation_date).toLocaleDateString("en-GB")}</td>
                  <td className="px-4 py-2">{charityById.get(d.charity_id)?.name ?? "—"}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{gbp(lodge)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-primary-foreground/70">{match > 0 ? gbp(match) : "—"}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gold">{gbp(lodge + match)}</td>
                  <td className="px-4 py-2 text-xs text-primary-foreground/70 max-w-[200px] truncate" title={d.purpose ?? ""}>{d.purpose}</td>
                  <td className="px-4 py-2">{PAYMENT_METHOD_LABEL[d.payment_method]}</td>
                  <td className="px-4 py-2 space-x-1">
                    {isFestivalDonation(d, charities, festival) && <Badge variant="outline" className="border-gold/40 text-gold text-[10px]">Festival</Badge>}
                    {match > 0 && <Badge variant="outline" className="border-emerald-400/40 text-emerald-300 text-[10px]">Match</Badge>}
                    {d.from_relief_chest && <Badge variant="outline" className="border-blue-400/40 text-blue-300 text-[10px]">Relief Chest</Badge>}
                    {d.confirmation_received && <Badge variant="outline" className="border-emerald-400/40 text-emerald-300 text-[10px]">✓</Badge>}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-2 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(d); setOpen(true); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  )}
                </tr>
                );
              })}
              {donations.length > 0 && (
                <tr className="border-t-2 border-gold/30 bg-navy-light/40 font-semibold">
                  <td className="px-4 py-2" colSpan={2}>Totals</td>
                  <td className="px-4 py-2 text-right tabular-nums">{gbp(grandLodge)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{gbp(grandMatch)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gold">{gbp(grandTotal)}</td>
                  <td colSpan={canEdit ? 4 : 3}></td>
                </tr>
              )}

            </tbody>
          </table>
        </div>
      </div>

      <DonationDialog open={open} onOpenChange={setOpen} editing={editing} charities={charities} onSaved={() => { setOpen(false); onChange(); }} />
    </div>
  );
}

function DonationDialog({ open, onOpenChange, editing, charities, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; editing: Donation | null; charities: Charity[]; onSaved: () => void;
}) {
  const [date, setDate] = useState("");
  const [charityId, setCharityId] = useState("");
  const [amount, setAmount] = useState("0");
  const [hasMatch, setHasMatch] = useState(false);
  const [matchAmount, setMatchAmount] = useState("0");
  const [purpose, setPurpose] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("bacs");
  const [reference, setReference] = useState("");
  const [authBy, setAuthBy] = useState<AuthorisedBy>("wm");
  const [confirmed, setConfirmed] = useState(false);
  const [isFestival, setIsFestival] = useState(false);
  const [fromChest, setFromChest] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setDate(editing.donation_date); setCharityId(editing.charity_id); setAmount(String(editing.amount));
      const m = Number(editing.match_funding_amount ?? 0);
      setHasMatch(m > 0); setMatchAmount(String(m));
      setPurpose(editing.purpose ?? ""); setMethod(editing.payment_method); setReference(editing.payment_reference ?? "");
      setAuthBy(editing.authorised_by); setConfirmed(editing.confirmation_received);
      setIsFestival(editing.is_festival_contribution); setFromChest(editing.from_relief_chest);
    } else {
      setDate(new Date().toISOString().slice(0, 10));
      setCharityId(charities[0]?.id ?? ""); setAmount("0"); setHasMatch(false); setMatchAmount("0");
      setPurpose(""); setMethod("bacs");
      setReference(""); setAuthBy("wm"); setConfirmed(false); setIsFestival(false); setFromChest(false);
    }
  }, [open, editing, charities]);

  const save = async () => {
    if (!charityId) { toast({ title: "Pick a charity" }); return; }
    setSaving(true);
    const payload = {
      donation_date: date,
      charity_id: charityId,
      amount: Number(amount) || 0,
      match_funding_amount: hasMatch ? (Number(matchAmount) || 0) : 0,
      purpose: purpose || null,
      payment_method: method,
      payment_reference: reference || null,
      authorised_by: authBy,
      confirmation_received: confirmed,
      is_festival_contribution: isFestival,
      from_relief_chest: fromChest,
    };
    const { error } = editing
      ? await supabase.from("charity_donations").update(payload).eq("id", editing.id)
      : await supabase.from("charity_donations").insert(payload);
    setSaving(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: editing ? "Updated" : "Added" });
    onSaved();
  };

  const remove = async () => {
    if (!editing || !confirm("Delete this donation?")) return;
    const { error } = await supabase.from("charity_donations").delete().eq("id", editing.id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Deleted" }); onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-navy text-primary-foreground border-gold/30 max-w-lg">
        <DialogHeader><DialogTitle className="font-serif text-gold">{editing ? "Edit donation" : "New donation"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div><Label>Amount (£)</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          </div>
          <div className="space-y-2 rounded-sm border border-gold/15 bg-navy-light/30 p-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={hasMatch} onCheckedChange={(v) => setHasMatch(!!v)} /> Match funding applicable
            </label>
            {hasMatch && (
              <div>
                <Label>Match funding received (£)</Label>
                <Input type="number" step="0.01" value={matchAmount} onChange={(e) => setMatchAmount(e.target.value)} />
                <p className="text-xs text-primary-foreground/60 mt-1">Total donation to charity: <span className="text-gold tabular-nums">{gbp((Number(amount) || 0) + (Number(matchAmount) || 0))}</span></p>
              </div>
            )}
          </div>

          <div>
            <Label>Charity</Label>
            <Select value={charityId} onValueChange={setCharityId}>
              <SelectTrigger><SelectValue placeholder="Select charity" /></SelectTrigger>
              <SelectContent>{charities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Purpose / occasion</Label><Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Payment method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PAYMENT_METHOD_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Reference</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Cheque no. / BACS ref" /></div>
          </div>
          <div>
            <Label>Authorised by</Label>
            <Select value={authBy} onValueChange={(v) => setAuthBy(v as AuthorisedBy)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(AUTHORISED_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(!!v)} /> Confirmation received</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={isFestival} onCheckedChange={(v) => setIsFestival(!!v)} /> Counts toward Surrey 2030 Festival</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={fromChest} onCheckedChange={(v) => setFromChest(!!v)} /> Drawn from Relief Chest</label>
          </div>
        </div>
        <DialogFooter className="flex items-center justify-between gap-2">
          {editing && <Button variant="ghost" className="text-red-300 hover:text-red-200" onClick={remove}><Trash2 className="w-4 h-4 mr-1" /> Delete</Button>}
          <Button onClick={save} disabled={saving} className="bg-gold text-navy hover:bg-gold/90 ml-auto">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Charity Ledger tab
// ─────────────────────────────────────────────────────────────────────────────
function LedgerTab({ charities, donations, canEdit, onChange }: {
  charities: Charity[]; donations: Donation[]; canEdit: boolean; onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Charity | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"name" | "total" | "last">("total");
  const [drawerId, setDrawerId] = useState<string | null>(null);

  const enriched = useMemo(() => {
    return charities.map((c) => {
      const ds = donations.filter((d) => d.charity_id === c.id);
      const total = ds.reduce((a, d) => a + Number(d.amount), 0);
      const last = ds.reduce((max, d) => (!max || d.donation_date > max ? d.donation_date : max), "" as string);
      return { ...c, total, last };
    });
  }, [charities, donations]);

  const filtered = enriched
    .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "last") return (b.last || "").localeCompare(a.last || "");
      return b.total - a.total;
    });

  const drawerCharity = drawerId ? charities.find((c) => c.id === drawerId) : null;
  const drawerDonations = drawerId ? donations.filter((d) => d.charity_id === drawerId).sort((a, b) => b.donation_date.localeCompare(a.donation_date)) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Search charities…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={sort} onValueChange={(v) => setSort(v as any)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="total">Sort: Total donated</SelectItem>
            <SelectItem value="last">Sort: Last donation</SelectItem>
            <SelectItem value="name">Sort: Name</SelectItem>
          </SelectContent>
        </Select>
        {canEdit && (
          <Button size="sm" className="bg-gold text-navy hover:bg-gold/90 ml-auto" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> New charity
          </Button>
        )}
      </div>

      <div className="rounded-sm border border-gold/20 bg-navy-light/30 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-primary-foreground/60 border-b border-gold/15">
              <th className="px-4 py-2">Charity</th>
              <th className="px-4 py-2">Reg no.</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Total donated</th>
              <th className="px-4 py-2">Last donation</th>
              {canEdit && <th className="px-4 py-2 w-12"></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={canEdit ? 6 : 5} className="px-4 py-6 text-center text-primary-foreground/50">No charities yet.</td></tr>
            )}
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-gold/10 hover:bg-navy-light/30 cursor-pointer" onClick={() => setDrawerId(c.id)}>
                <td className="px-4 py-2 text-primary-foreground">{c.name}</td>
                <td className="px-4 py-2 text-primary-foreground/70 text-xs">{c.charity_number ?? "—"}</td>
                <td className="px-4 py-2">
                  <Badge variant="outline" className={c.status === "active" ? "border-emerald-400/40 text-emerald-300" : "border-primary-foreground/30 text-primary-foreground/60"}>{c.status}</Badge>
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-gold">{gbp(c.total)}</td>
                <td className="px-4 py-2 text-xs text-primary-foreground/70">{c.last ? new Date(c.last).toLocaleDateString("en-GB") : "—"}</td>
                {canEdit && (
                  <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(c); setOpen(true); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CharityDialog open={open} onOpenChange={setOpen} editing={editing} onSaved={() => { setOpen(false); onChange(); }} />

      <Dialog open={!!drawerId} onOpenChange={(v) => !v && setDrawerId(null)}>
        <DialogContent className="bg-navy text-primary-foreground border-gold/30 max-w-2xl">
          <DialogHeader><DialogTitle className="font-serif text-gold">{drawerCharity?.name}</DialogTitle></DialogHeader>
          {drawerCharity && (
            <div className="space-y-3 text-sm">
              {drawerCharity.description && <p className="text-primary-foreground/80">{drawerCharity.description}</p>}
              <div className="grid grid-cols-2 gap-2 text-xs text-primary-foreground/70">
                {drawerCharity.charity_number && <div>Reg no: {drawerCharity.charity_number}</div>}
                {drawerCharity.contact_name && <div>Contact: {drawerCharity.contact_name}</div>}
                {drawerCharity.email && <div>Email: {drawerCharity.email}</div>}
                {drawerCharity.phone && <div>Phone: {drawerCharity.phone}</div>}
                {drawerCharity.website && <a href={drawerCharity.website} target="_blank" rel="noopener noreferrer" className="text-gold inline-flex items-center gap-1 col-span-2">{drawerCharity.website} <ExternalLink className="w-3 h-3" /></a>}
              </div>
              <div className="border-t border-gold/15 pt-3">
                <h4 className="font-serif text-gold mb-2">Donation history</h4>
                {drawerDonations.length === 0 ? (
                  <p className="text-primary-foreground/50 text-xs italic">No donations recorded.</p>
                ) : (
                  <ul className="divide-y divide-gold/10 max-h-72 overflow-y-auto">
                    {drawerDonations.map((d) => (
                      <li key={d.id} className="flex items-center justify-between py-2 text-xs">
                        <span>{new Date(d.donation_date).toLocaleDateString("en-GB")} · {d.purpose ?? PAYMENT_METHOD_LABEL[d.payment_method]}</span>
                        <span className="tabular-nums text-gold">{gbp(Number(d.amount))}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CharityDialog({ open, onOpenChange, editing, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; editing: Charity | null; onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [chNum, setChNum] = useState("");
  const [desc, setDesc] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name); setChNum(editing.charity_number ?? ""); setDesc(editing.description ?? "");
      setContact(editing.contact_name ?? ""); setEmail(editing.email ?? ""); setPhone(editing.phone ?? "");
      setWebsite(editing.website ?? ""); setStatus(editing.status);
    } else {
      setName(""); setChNum(""); setDesc(""); setContact(""); setEmail(""); setPhone(""); setWebsite(""); setStatus("active");
    }
  }, [open, editing]);

  const save = async () => {
    if (!name.trim()) { toast({ title: "Name required" }); return; }
    setSaving(true);
    const payload = {
      name, charity_number: chNum || null, description: desc || null,
      contact_name: contact || null, email: email || null, phone: phone || null,
      website: website || null, status,
    };
    const { error } = editing
      ? await supabase.from("charity_ledger").update(payload).eq("id", editing.id)
      : await supabase.from("charity_ledger").insert(payload);
    setSaving(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: editing ? "Updated" : "Added" }); onSaved();
  };

  const remove = async () => {
    if (!editing || !confirm("Delete this charity? Donations referencing it will block deletion.")) return;
    const { error } = await supabase.from("charity_ledger").delete().eq("id", editing.id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Deleted" }); onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-navy text-primary-foreground border-gold/30 max-w-lg">
        <DialogHeader><DialogTitle className="font-serif text-gold">{editing ? "Edit charity" : "New charity"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Registered charity no.</Label><Input value={chNum} onChange={(e) => setChNum(e.target.value)} /></div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Contact name</Label><Input value={contact} onChange={(e) => setContact(e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div><Label>Website</Label><Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" /></div>
          </div>
        </div>
        <DialogFooter className="flex items-center justify-between gap-2">
          {editing && <Button variant="ghost" className="text-red-300 hover:text-red-200" onClick={remove}><Trash2 className="w-4 h-4 mr-1" /> Delete</Button>}
          <Button onClick={save} disabled={saving} className="bg-gold text-navy hover:bg-gold/90 ml-auto">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Festival Tracker tab
// ─────────────────────────────────────────────────────────────────────────────
function FestivalTab({ donations, charities, festival, canEdit, onChange }: {
  donations: Donation[]; charities: Charity[]; festival: FestivalSettings | null; canEdit: boolean; onChange: () => void;
}) {
  const [target, setTarget] = useState(festival?.target_amount ? String(festival.target_amount) : "0");
  const [bronzeTarget, setBronzeTarget] = useState(festival?.bronze_target_amount ? String(festival.bronze_target_amount) : "");
  const [silverTarget, setSilverTarget] = useState(festival?.silver_target_amount ? String(festival.silver_target_amount) : "");
  const [platinumTarget, setPlatinumTarget] = useState(festival?.platinum_target_amount ? String(festival.platinum_target_amount) : "");
  const [name, setName] = useState(festival?.festival_name ?? "Surrey 2030 Festival");
  const [notes, setNotes] = useState(festival?.festival_notes ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTarget(festival?.target_amount ? String(festival.target_amount) : "0");
    setBronzeTarget(festival?.bronze_target_amount ? String(festival.bronze_target_amount) : "");
    setSilverTarget(festival?.silver_target_amount ? String(festival.silver_target_amount) : "");
    setPlatinumTarget(festival?.platinum_target_amount ? String(festival.platinum_target_amount) : "");
    setName(festival?.festival_name ?? "Surrey 2030 Festival");
    setNotes(festival?.festival_notes ?? "");
  }, [festival]);

  const festivalDonations = donations.filter((d) => isFestivalDonation(d, charities, festival)).sort((a, b) => b.donation_date.localeCompare(a.donation_date));
  const donationCombined = (d: Donation) => Number(d.amount) + Number(d.match_funding_amount ?? 0);
  const cumulative = festivalDonations.reduce((a, d) => a + donationCombined(d), 0);
  const bronzeN = Number(bronzeTarget) || 0;
  const silverN = Number(silverTarget) || 0;
  const goldN = Number(target) || 0;
  const platinumN = Number(platinumTarget) || 0;
  const targets = { bronze: bronzeN, silver: silverN, gold: goldN, platinum: platinumN };
  const tiers = festivalTiers(targets);
  const award = highestAwardAchieved(cumulative, targets);
  const nextTier = nextTierAhead(cumulative, targets);
  const highestTier = tiers.length ? tiers[tiers.length - 1] : null;
  const platinumReached = !!award && award.name === "Platinum";
  const goldReached = goldN > 0 && cumulative >= goldN;
  // Primary progress bar tracks toward the next un-met tier, or the highest tier once all reached.
  const progressTarget = nextTier ? nextTier.threshold : (highestTier ? highestTier.threshold : 0);
  const rawPct = progressTarget > 0 ? (cumulative / progressTarget) * 100 : 0;
  const barPct = Math.min(100, rawPct);
  const excess = highestTier && cumulative > highestTier.threshold ? cumulative - highestTier.threshold : 0;
  const goldExcess = goldReached ? cumulative - goldN : 0;
  const goldPct = goldN > 0 ? (cumulative / goldN) * 100 : 0;

  // Projected: based on rate per day since first contribution
  const projected = (() => {
    if (festivalDonations.length === 0) return cumulative;
    const first = festivalDonations[festivalDonations.length - 1].donation_date;
    const daysElapsed = Math.max(1, (Date.now() - new Date(first).getTime()) / (1000 * 60 * 60 * 24));
    const ratePerDay = cumulative / daysElapsed;
    const targetDate = new Date("2030-09-30").getTime();
    const daysRemaining = Math.max(0, (targetDate - Date.now()) / (1000 * 60 * 60 * 24));
    return cumulative + ratePerDay * daysRemaining;
  })();

  const save = async () => {
    if (!festival) return;
    setSaving(true);
    const { error } = await supabase.from("charity_festival_settings").update({
      festival_name: name,
      target_amount: goldN,
      bronze_target_amount: bronzeN > 0 ? bronzeN : null,
      silver_target_amount: silverN > 0 ? silverN : null,
      platinum_target_amount: platinumN > 0 ? platinumN : null,
      festival_notes: notes || null,
    } as any).eq("id", festival.id);
    setSaving(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Saved" }); onChange();
  };

  const tierColor = (tierName: string, achieved: boolean) => {
    if (!achieved) return "border-gold/15 bg-navy-dark/40 text-primary-foreground/50";
    switch (tierName) {
      case "Bronze": return "border-amber-700/60 bg-amber-900/20 text-amber-200";
      case "Silver": return "border-slate-300/60 bg-slate-400/10 text-slate-100";
      case "Gold": return "border-gold/60 bg-gold/10 text-gold";
      case "Platinum": return "border-cyan-300/60 bg-cyan-300/10 text-cyan-100";
      default: return "";
    }
  };

  return (
    <div className="space-y-4">
      <Card title={name}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Stat label="Bronze target" value={bronzeN > 0 ? gbp(bronzeN) : "—"} />
          <Stat label="Silver target" value={silverN > 0 ? gbp(silverN) : "—"} />
          <Stat label="Gold target" value={goldN > 0 ? gbp(goldN) : "—"} />
          <Stat label="Platinum target" value={platinumN > 0 ? gbp(platinumN) : "—"} />
          <Stat label="Contributed to date" value={<span className="text-gold">{gbp(cumulative)}</span>} />
        </div>

        {tiers.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
            {(["Bronze", "Silver", "Gold", "Platinum"] as const).map((tName) => {
              const tier = tiers.find((t) => t.name === tName);
              if (!tier) return null;
              const reached = cumulative >= tier.threshold;
              return (
                <div key={tName} className={`px-2 py-1.5 rounded-sm border text-xs text-center ${tierColor(tName, reached)}`}>
                  <div className="font-semibold uppercase tracking-wider">{tName}</div>
                  <div className="tabular-nums">{gbp(tier.threshold)}</div>
                  <div className="text-[10px] opacity-80">{reached ? "Achieved" : `${Math.min(100, (cumulative / tier.threshold) * 100).toFixed(0)}%`}</div>
                </div>
              );
            })}
          </div>
        )}

        {progressTarget > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-primary-foreground/70 mb-1">
              <span>
                {nextTier ? `Progress to ${nextTier.name}` : `Progress to ${highestTier?.name}`}
              </span>
              <span className="tabular-nums">{rawPct.toFixed(1)}%</span>
            </div>
            <div className={`h-3 bg-navy-dark rounded-sm overflow-hidden border ${!nextTier ? "border-gold shadow-[0_0_12px_rgba(201,164,50,0.4)]" : "border-gold/20"}`}>
              <div className="h-full bg-gold-shimmer transition-all" style={{ width: `${barPct}%` }} />
            </div>
          </div>
        )}

        {platinumReached ? (
          <div className="mt-3 p-3 rounded-sm border border-gold/40 bg-gold/10">
            <p className="text-sm text-gold font-semibold">Target exceeded — Platinum Award achieved</p>
            {excess > 0 && (
              <p className="text-xs text-primary-foreground/70 mt-1">{gbp(excess)} above Platinum target.</p>
            )}
          </div>
        ) : award ? (
          <div className="mt-3 p-3 rounded-sm border border-gold/30 bg-navy-dark/50">
            <p className="text-sm text-gold font-semibold">{award.name} Award achieved</p>
            {nextTier && (
              <p className="text-xs text-primary-foreground/70 mt-1">
                {gbp(Math.max(0, nextTier.threshold - cumulative))} to {nextTier.name}.
              </p>
            )}
          </div>
        ) : nextTier ? (
          <div className="mt-3 text-xs text-primary-foreground/70">
            {gbp(Math.max(0, nextTier.threshold - cumulative))} to first ({nextTier.name}) award.
          </div>
        ) : null}

        {!platinumReached && <Stat label="Projected final (at current rate)" value={gbp(projected)} />}
      </Card>

      {canEdit && (
        <Card title="Festival settings">
          <div className="space-y-3">
            <div>
              <Label>Festival name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Bronze target (£)</Label>
                <Input type="number" step="0.01" value={bronzeTarget} placeholder="Not set" onChange={(e) => setBronzeTarget(e.target.value)} />
              </div>
              <div>
                <Label>Silver target (£)</Label>
                <Input type="number" step="0.01" value={silverTarget} placeholder="Not set" onChange={(e) => setSilverTarget(e.target.value)} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Gold target (£)</Label>
                <Input type="number" step="0.01" value={target} onChange={(e) => setTarget(e.target.value)} />
              </div>
              <div>
                <Label>Platinum target (£)</Label>
                <Input type="number" step="0.01" value={platinumTarget} placeholder="Not set" onChange={(e) => setPlatinumTarget(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Provincial Festival communications / notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
            <Button onClick={save} disabled={saving} className="bg-gold text-navy hover:bg-gold/90">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />} Save settings
            </Button>
          </div>
        </Card>
      )}

      <Card title="Festival contribution history">
        {festivalDonations.length === 0 ? (
          <p className="text-xs text-primary-foreground/50 italic">No Festival-tagged donations yet.</p>
        ) : (
          <ul className="divide-y divide-gold/10">
            {festivalDonations.map((d) => {
              const cash = Number(d.amount);
              const match = Number(d.match_funding_amount ?? 0);
              const total = cash + match;
              return (
                <li key={d.id} className="flex items-center justify-between py-2 text-sm gap-3">
                  <span className="text-primary-foreground/80 flex-1">
                    {new Date(d.donation_date).toLocaleDateString("en-GB")} · {d.purpose ?? "—"}
                    {match > 0 && (
                      <span className="block text-[11px] text-primary-foreground/60">
                        Lodge {gbp(cash)} + match {gbp(match)}
                      </span>
                    )}
                  </span>
                  <span className="tabular-nums text-gold whitespace-nowrap">{gbp(total)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Annual Report tab
// ─────────────────────────────────────────────────────────────────────────────
function ReportTab({ charities, collections, donations, festival, canEdit }: {
  charities: Charity[]; collections: Collection[]; donations: Donation[]; festival: FestivalSettings | null; canEdit: boolean;
}) {
  const [year, setYear] = useState(currentMasonicYear());
  const [notes, setNotes] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const bounds = masonicYearBounds(year);

  const yearColl = collections.filter((c) => inYear(c.collection_date, year));
  const yearDon = donations.filter((d) => inYear(d.donation_date, year));
  const donationCombined = (d: Donation) => Number(d.amount) + Number(d.match_funding_amount ?? 0);
  const totalCollected = yearColl.reduce((a, c) => a + Number(c.net_amount), 0);
  const totalLodgeDonated = yearDon.reduce((a, d) => a + Number(d.amount), 0);
  const totalMatchFunded = yearDon.reduce((a, d) => a + Number(d.match_funding_amount ?? 0), 0);
  const totalDonated = totalLodgeDonated + totalMatchFunded;
  const reliefBal = reliefChestBalance(collections, donations);
  const charitiesSupported = new Set(yearDon.map((d) => d.charity_id)).size;
  const largest = yearDon.reduce((m, d) => (donationCombined(d) > (m ? donationCombined(m) : 0) ? d : m), null as Donation | null);
  const festivalYear = yearDon.filter((d) => isFestivalDonation(d, charities, festival)).reduce((a, d) => a + donationCombined(d), 0);
  const charityById = new Map(charities.map((c) => [c.id, c]));

  const yearsAvailable = useMemo(() => {
    const ys = new Set<number>([currentMasonicYear()]);
    [...collections, ...donations].forEach((x: any) => {
      const d = x.collection_date ?? x.donation_date;
      const yr = new Date(d).getMonth() >= 9 ? new Date(d).getFullYear() : new Date(d).getFullYear() - 1;
      ys.add(yr);
    });
    return Array.from(ys).sort((a, b) => b - a);
  }, [collections, donations]);

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const doc = await buildCharityAnnualReportPdf({ year, collections, donations, charities, festival, stewardNotes: notes });
      doc.save(`Charity-Annual-Report-${bounds.label}.pdf`);
    } finally { setDownloading(false); }
  };

  const finalise = async () => {
    setSaving(true);
    const payload = {
      bounds, totalCollected, totalLodgeDonated, totalMatchFunded, totalDonated, reliefBal, charitiesSupported,
      largest, festivalYear,
      byType: {
        charity_column: yearColl.filter((c) => c.collection_type === "charity_column").reduce((a, c) => a + Number(c.net_amount), 0),
        raffle: yearColl.filter((c) => c.collection_type === "raffle").reduce((a, c) => a + Number(c.net_amount), 0),
        ad_hoc: yearColl.filter((c) => c.collection_type === "ad_hoc").reduce((a, c) => a + Number(c.net_amount), 0),
        relief_chest: yearColl.filter((c) => c.collection_type === "relief_chest").reduce((a, c) => a + Number(c.net_amount), 0),
      },
    };
    const { error } = await supabase.from("charity_annual_reports").upsert({
      masonic_year: year, payload: payload as any, notes: notes || null, finalised_at: new Date().toISOString(),
    }, { onConflict: "masonic_year" });
    setSaving(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Finalised", description: `Snapshot saved for ${bounds.label}` });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label>Masonic year</Label>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>{yearsAvailable.map((y) => <SelectItem key={y} value={String(y)}>{masonicYearBounds(y).label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button onClick={downloadPdf} disabled={downloading} className="bg-gold text-navy hover:bg-gold/90">
          {downloading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />} Download PDF
        </Button>
        {canEdit && (
          <Button variant="outline" onClick={finalise} disabled={saving} className="border-gold/40 text-gold">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />} Finalise &amp; snapshot
          </Button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Headline figures">
          <Stat label="Total collected" value={gbp(totalCollected)} />
          <Stat label="Lodge donations" value={gbp(totalLodgeDonated)} />
          <Stat label="Match funding received" value={<span className="text-emerald-300">{gbp(totalMatchFunded)}</span>} />
          <Stat label="Total donated (incl. match)" value={<span className="text-gold">{gbp(totalDonated)}</span>} />
          <Stat label="Charities supported" value={charitiesSupported} />
          <Stat label="Largest single donation" value={largest ? `${gbp(donationCombined(largest))} (${charityById.get(largest.charity_id)?.name ?? ""})` : "—"} />
          <Stat label="Relief Chest balance at year end" value={gbp(reliefBal)} />
          <Stat label={`${festival?.festival_name ?? "Festival"} (this year)`} value={gbp(festivalYear)} />
        </Card>

        <Card title="Notes (included in PDF)">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={10} placeholder="Optional verbal-report notes from the Charity Steward…" />
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Website Feed tab
// ─────────────────────────────────────────────────────────────────────────────
function FeedTab({ festival, canEdit, onChange }: { festival: FestivalSettings | null; canEdit: boolean; onChange: () => void }) {
  const [startDate, setStartDate] = useState(festival?.public_feed_start_date ?? "");
  const [startAmount, setStartAmount] = useState(festival?.public_feed_start_amount ? String(festival.public_feed_start_amount) : "0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStartDate(festival?.public_feed_start_date ?? "");
    setStartAmount(festival?.public_feed_start_amount ? String(festival.public_feed_start_amount) : "0");
  }, [festival]);

  const save = async () => {
    if (!festival) return;
    setSaving(true);
    const { error } = await supabase.from("charity_festival_settings").update({
      public_feed_start_date: startDate || null,
      public_feed_start_amount: Number(startAmount) || 0,
    }).eq("id", festival.id);
    setSaving(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Saved" }); onChange();
  };

  return (
    <div className="space-y-4">
      <Card title="Public website widget">
        <p className="text-xs text-primary-foreground/60">
          Configure the homepage CTA and Our Charities page widgets. The displayed total = the baseline below + every donation logged on or after the start date.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>Public feed start date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={!canEdit} /></div>
          <div><Label>Baseline amount already raised (£)</Label><Input type="number" step="0.01" value={startAmount} onChange={(e) => setStartAmount(e.target.value)} disabled={!canEdit} /></div>
        </div>
        {canEdit && (
          <Button onClick={save} disabled={saving} className="bg-gold text-navy hover:bg-gold/90">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />} Save
          </Button>
        )}
      </Card>
      <Card title="Where this appears">
        <ul className="text-sm text-primary-foreground/80 list-disc list-inside space-y-1">
          <li>Homepage charity CTA — total raised since the start date.</li>
          <li>Our Charities page — year total, all-time total, list of charities supported this year, and Festival progress bar.</li>
        </ul>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page shell
// ─────────────────────────────────────────────────────────────────────────────
function Inner() {
  const { isAdmin, isWorshipfulMaster, isSecretary } = useAuth();
  // We can't yet rely on a charity_steward role from useAuth — check via SQL helper instead.
  const [canEdit, setCanEdit] = useState(isAdmin || isWorshipfulMaster);
  const [charities, setCharities] = useState<Charity[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [festival, setFestival] = useState<FestivalSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    try {
      const [c, col, don, fest] = await Promise.all([fetchCharities(), fetchCollections(), fetchDonations(), fetchFestivalSettings()]);
      setCharities(c); setCollections(col); setDonations(don); setFestival(fest);
    } catch (e: any) {
      toast({ title: "Load failed", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => {
    (async () => {
      // Probe edit capability by attempting a no-op update on settings? Easier: rely on server—try to read; if user has charity_steward role they'll be able to write.
      // Simpler: ask the DB.
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        const { data } = await supabase.rpc("can_edit_charity" as any, { _user: u.user.id });
        if (typeof data === "boolean") setCanEdit(data);
      }
      reload();
    })();
  }, []);

  const canView = canEdit || isSecretary || isAdmin;

  if (loading) return (
    <MembersLayout>
      <div className="flex items-center gap-2 text-primary-foreground/70"><Loader2 className="w-4 h-4 animate-spin" /> Loading charity records…</div>
    </MembersLayout>
  );

  if (!canView) return (
    <MembersLayout>
      <p className="text-primary-foreground/70">You don't have access to the Charity Steward module.</p>
    </MembersLayout>
  );

  return (
    <MembersLayout>
      <header className="mb-6">
        <h1 className="font-serif text-2xl md:text-3xl text-gold">Charity Steward</h1>
        <p className="text-primary-foreground/60 text-sm">Collections, donations, ledger, Festival tracker and annual report.</p>
        {!canEdit && <p className="text-xs text-amber-300 mt-1">Read-only access (Secretary).</p>}
      </header>

      <Tabs defaultValue="collections" className="space-y-4">
        <TabsList className="bg-navy-light/40 flex-wrap h-auto">
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="donations">Donations</TabsTrigger>
          <TabsTrigger value="ledger">Charity Ledger</TabsTrigger>
          <TabsTrigger value="festival">Festival Tracker</TabsTrigger>
          <TabsTrigger value="report">Annual Report</TabsTrigger>
          <TabsTrigger value="feed">Website Feed</TabsTrigger>
        </TabsList>
        <TabsContent value="collections"><CollectionsTab collections={collections} donations={donations} canEdit={canEdit} onChange={reload} /></TabsContent>
        <TabsContent value="donations"><DonationsTab donations={donations} charities={charities} festival={festival} canEdit={canEdit} onChange={reload} /></TabsContent>
        <TabsContent value="ledger"><LedgerTab charities={charities} donations={donations} canEdit={canEdit} onChange={reload} /></TabsContent>
        <TabsContent value="festival"><FestivalTab donations={donations} charities={charities} festival={festival} canEdit={canEdit} onChange={reload} /></TabsContent>
        <TabsContent value="report"><ReportTab charities={charities} collections={collections} donations={donations} festival={festival} canEdit={canEdit} /></TabsContent>
        <TabsContent value="feed"><FeedTab festival={festival} canEdit={canEdit} onChange={reload} /></TabsContent>
      </Tabs>
    </MembersLayout>
  );
}

export default function CharityStewardPage() {
  return <ProtectedRoute><Inner /></ProtectedRoute>;
}
