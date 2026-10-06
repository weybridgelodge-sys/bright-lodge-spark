import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Flower2, Gift, Pencil, Plus, ShieldAlert, Trash2, X } from "lucide-react";
import { computeContactDue, formatPartialDob, isValidPartialDob, partialDobAge } from "@/lib/widowContactDue";
import { GIFT_LABEL, formatGiftHistory, fundingFromChoice, fundingLabel, raffleCollectionLabel, type FundingSource, type GiftType } from "@/lib/widowGifts";

type Widow = {
  id: string; full_name: string; preferred_address: string | null; address: string | null;
  home_type: "own_home" | "care_home" | "with_family"; care_home_name: string | null; care_home_address: string | null; care_home_contact_hours: string | null;
  phone: string | null; dob_day: number | null; dob_month: number | null; dob_year: number | null;
  husband_name: string | null; husband_lodge: string | null;
  connection_source: "lodge_member" | "smwa"; smwa_reference: string | null; smwa_liaison: string | null;
  status: "active" | "deceased"; deceased_on: string | null; contact_interval_days: number;
  notes: string | null; created_at: string;
};
type Kin = { id: string; widow_id: string; name: string; relationship: string; relationship_other: string | null; phone: string | null; email: string | null; notes: string | null };
type Contact = { id: string; widow_id: string; contact_date: string; contact_type: string; notes: string | null; welfare_concern: boolean; logged_by: string | null };
type Member = { id: string; first_name: string | null; last_name: string | null; preferred_name: string | null; full_name: string | null };

const CONTACT_LABEL: Record<string, string> = { phone: "Phone call", visit: "Visit", card: "Card", letter: "Letter", gift: "Gift", other: "Other" };
const REL_LABEL: Record<string, string> = { son: "Son", daughter: "Daughter", neighbour: "Neighbour", friend: "Friend", other: "Other" };
const inputCls = "bg-navy text-primary-foreground border-gold/30 min-h-[44px]";
const btnGold = "bg-gold text-navy hover:bg-gold/90 min-h-[48px]";
const btnOutline = "border-gold/40 text-gold bg-transparent hover:bg-gold/10 min-h-[48px]";
const db = supabase as any;
const fmt = (s: string | null) => s ? new Date(s.length === 10 ? s + "T12:00:00" : s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const memberName = (m?: Member) => {
  if (!m) return "Unknown officer";
  const f = m.preferred_name?.trim() || m.first_name?.trim() || "";
  return [f, m.last_name?.trim() || ""].filter(Boolean).join(" ") || m.full_name || "Unnamed";
};
const blank = (v: string) => (v.trim() ? v.trim() : null);

export default function WidowsPanel({ members }: { members: Member[] }) {
  const { canEditAlmoner } = useAuth();
  const [widows, setWidows] = useState<Widow[]>([]);
  const [lastContact, setLastContact] = useState<Map<string, Contact>>(new Map());
  const [show, setShow] = useState<"active" | "deceased">("active");
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = async () => {
    const [w, c] = await Promise.all([
      db.from("almoner_widows").select("*").order("full_name"),
      db.from("almoner_widow_contacts").select("id,widow_id,contact_date,contact_type,welfare_concern,notes,logged_by").order("contact_date", { ascending: false }).order("created_at", { ascending: false }),
    ]);
    if (w.error) { toast.error(w.error.message); return; }
    setWidows(w.data ?? []);
    const m = new Map<string, Contact>();
    (c.data ?? []).forEach((r: Contact) => { if (!m.has(r.widow_id)) m.set(r.widow_id, r); });
    setLastContact(m);
  };
  useEffect(() => { load(); }, []);

  const list = useMemo(() => widows
    .filter((w) => w.status === show)
    .map((w) => ({ w, due: computeContactDue(lastContact.get(w.id)?.contact_date ?? null, w.created_at, w.contact_interval_days), last: lastContact.get(w.id) }))
    .sort((a, b) => show === "active" ? a.due.daysUntil - b.due.daysUntil : a.w.full_name.localeCompare(b.w.full_name)),
  [widows, lastContact, show]);

  const open = widows.find((w) => w.id === openId);
  if (open) return <WidowDetail widow={open} members={members} canEdit={canEditAlmoner} onBack={() => { setOpenId(null); load(); }} onChanged={load} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-serif text-lg text-primary-foreground">Widows &amp; Dependants</h3>
          <p className="text-xs text-primary-foreground/60">Lodge widows and SMWA-assigned ladies in our care</p>
        </div>
        {canEditAlmoner && (
          <Button className={btnGold} onClick={() => setAdding((v) => !v)}>
            {adding ? <><X className="w-4 h-4 mr-1" /> Cancel</> : <><Plus className="w-4 h-4 mr-1" /> Add widow</>}
          </Button>
        )}
      </div>

      {canEditAlmoner && adding && <WidowForm onSaved={(id) => { setAdding(false); load(); if (id) setOpenId(id); }} />}

      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Show widows">
        {(["active", "deceased"] as const).map((s) => (
          <Button key={s} variant="outline" aria-pressed={show === s}
            className={`${btnOutline} ${show === s ? "bg-gold/15" : ""}`} onClick={() => setShow(s)}>
            {s === "active" ? "Active" : "Inactive (deceased)"}
          </Button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-primary-foreground/60 italic">{show === "active" ? "No widows on the register." : "No inactive records."}</p>
      ) : (
        <div className="space-y-2">
          {list.map(({ w, due, last }) => (
            <button key={w.id} type="button" onClick={() => setOpenId(w.id)}
              className="w-full text-left bg-navy-light/40 border border-gold/15 hover:border-gold/40 rounded p-4 min-h-[48px]">
              <div className="flex items-start gap-3">
                <Flower2 className="w-4 h-4 text-gold mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-primary-foreground break-words">{w.full_name}{w.preferred_address ? <span className="font-normal text-primary-foreground/60"> · “{w.preferred_address}”</span> : null}</p>
                  <p className="text-[11px] text-primary-foreground/60 break-words">
                    {w.connection_source === "smwa" ? "Assigned via SMWA" : "Weybridge Lodge widow"}
                    {w.home_type === "care_home" ? ` · ${w.care_home_name || "Care home"}` : ""}
                    {w.status === "deceased" ? ` · died ${fmt(w.deceased_on)}` : ` · last contact ${last ? fmt(last.contact_date) : "none yet"}`}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {w.status === "active" && (due.overdue
                      ? <Badge variant="outline" className="border-gold/50 text-gold text-[10px] px-1.5 py-0" title="Gentle check-in prompt">Check-in due · {fmt(due.dueDate)}</Badge>
                      : <span className="text-[10px] text-primary-foreground/50">Next contact by {fmt(due.dueDate)}</span>)}
                    {last?.welfare_concern && <Badge variant="outline" className="border-destructive/60 text-destructive text-[10px] px-1.5 py-0"><ShieldAlert className="w-3 h-3 mr-1" />Welfare concern</Badge>}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function WidowForm({ widow, onSaved, onCancel }: { widow?: Widow; onSaved: (id?: string) => void; onCancel?: () => void }) {
  const [f, setF] = useState(() => ({
    full_name: widow?.full_name ?? "", preferred_address: widow?.preferred_address ?? "", address: widow?.address ?? "",
    home_type: widow?.home_type ?? "own_home", care_home_name: widow?.care_home_name ?? "", care_home_address: widow?.care_home_address ?? "", care_home_contact_hours: widow?.care_home_contact_hours ?? "",
    phone: widow?.phone ?? "", dob_day: widow?.dob_day?.toString() ?? "", dob_month: widow?.dob_month?.toString() ?? "", dob_year: widow?.dob_year?.toString() ?? "",
    husband_name: widow?.husband_name ?? "", husband_lodge: widow?.husband_lodge ?? "",
    connection_source: widow?.connection_source ?? "lodge_member", smwa_reference: widow?.smwa_reference ?? "", smwa_liaison: widow?.smwa_liaison ?? "",
    contact_interval_days: (widow?.contact_interval_days ?? 90).toString(), notes: widow?.notes ?? "",
  }));
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const day = f.dob_day ? Number(f.dob_day) : null, month = f.dob_month ? Number(f.dob_month) : null, year = f.dob_year ? Number(f.dob_year) : null;
    if (!f.full_name.trim()) { toast.error("Name is required"); return; }
    if (!isValidPartialDob(day, month, year)) { toast.error("Date of birth needs a real day and month (year optional)"); return; }
    const interval = Number(f.contact_interval_days);
    if (!Number.isInteger(interval) || interval < 7 || interval > 730) { toast.error("Contact interval must be 7–730 days"); return; }
    const care = f.home_type === "care_home", smwa = f.connection_source === "smwa";
    const payload = {
      full_name: f.full_name.trim(), preferred_address: blank(f.preferred_address), address: blank(f.address),
      home_type: f.home_type, care_home_name: care ? blank(f.care_home_name) : null, care_home_address: care ? blank(f.care_home_address) : null, care_home_contact_hours: care ? blank(f.care_home_contact_hours) : null,
      phone: blank(f.phone), dob_day: day, dob_month: month, dob_year: year,
      husband_name: blank(f.husband_name), husband_lodge: blank(f.husband_lodge),
      connection_source: f.connection_source, smwa_reference: smwa ? blank(f.smwa_reference) : null, smwa_liaison: smwa ? blank(f.smwa_liaison) : null,
      contact_interval_days: interval, notes: blank(f.notes),
    };
    setBusy(true);
    const q = widow ? db.from("almoner_widows").update(payload).eq("id", widow.id).select("id") : db.from("almoner_widows").insert(payload).select("id");
    const { data, error } = await q;
    setBusy(false);
    if (error) { toast.error(`Not saved: ${error.message}`); return; }
    if (!data?.length) { toast.error("Not saved: you may not have permission"); return; }
    toast.success(widow ? "Details updated" : "Widow added — now add next of kin below"); onSaved(widow ? undefined : data[0].id);
  };

  return (
    <form onSubmit={submit} className="bg-navy-light/60 border border-gold/30 rounded p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><Label className="text-xs">Full name</Label><Input value={f.full_name} onChange={set("full_name")} className={inputCls} required maxLength={200} /></div>
        <div><Label className="text-xs">Preferred form of address</Label><Input value={f.preferred_address} onChange={set("preferred_address")} className={inputCls} placeholder="e.g. Mrs Smith or Joan" maxLength={100} /></div>
        <div><Label className="text-xs">Phone</Label><Input type="tel" value={f.phone} onChange={set("phone")} className={inputCls} maxLength={50} /></div>
        <div>
          <Label className="text-xs">Lives in</Label>
          <Select value={f.home_type} onValueChange={(v) => setF((p) => ({ ...p, home_type: v as Widow["home_type"] }))}>
            <SelectTrigger className={inputCls} aria-label="Lives in"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="own_home">Own home</SelectItem><SelectItem value="care_home">Care home</SelectItem><SelectItem value="with_family">Living with family</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div><Label className="text-xs">{f.home_type === "care_home" ? "Previous / correspondence address" : "Address"}</Label><Textarea value={f.address} onChange={set("address")} className={inputCls} rows={2} maxLength={500} /></div>
      {f.home_type === "care_home" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label className="text-xs">Care home name</Label><Input value={f.care_home_name} onChange={set("care_home_name")} className={inputCls} maxLength={200} /></div>
          <div><Label className="text-xs">Care home address</Label><Input value={f.care_home_address} onChange={set("care_home_address")} className={inputCls} maxLength={500} /></div>
          <div className="sm:col-span-2"><Label className="text-xs">Contact hours</Label><Input aria-label="Contact hours" value={f.care_home_contact_hours} onChange={set("care_home_contact_hours")} className={inputCls} maxLength={200} placeholder="e.g. Ring between 2pm and 6pm, visiting Saturdays only" /></div>
        </div>
      )}
      <fieldset>
        <legend className="text-xs mb-1">Date of birth (year optional)</legend>
        <div className="grid grid-cols-3 gap-2">
          <Input inputMode="numeric" aria-label="Day" placeholder="Day" value={f.dob_day} onChange={set("dob_day")} className={inputCls} maxLength={2} />
          <Select value={f.dob_month || "none"} onValueChange={(v) => setF((p) => ({ ...p, dob_month: v === "none" ? "" : v }))}>
            <SelectTrigger className={inputCls} aria-label="Month"><SelectValue placeholder="Month" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input inputMode="numeric" aria-label="Year (if known)" placeholder="Year?" value={f.dob_year} onChange={set("dob_year")} className={inputCls} maxLength={4} />
        </div>
      </fieldset>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><Label className="text-xs">Husband's name</Label><Input value={f.husband_name} onChange={set("husband_name")} className={inputCls} maxLength={200} /></div>
        <div><Label className="text-xs">His Lodge name and number</Label><Input value={f.husband_lodge} onChange={set("husband_lodge")} className={inputCls} maxLength={200} /></div>
        <div>
          <Label className="text-xs">Connection</Label>
          <Select value={f.connection_source} onValueChange={(v) => setF((p) => ({ ...p, connection_source: v as Widow["connection_source"] }))}>
            <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="lodge_member">Widow of a Weybridge Lodge member</SelectItem><SelectItem value="smwa">Assigned via SMWA</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Contact every (days)</Label><Input type="number" min={7} max={730} value={f.contact_interval_days} onChange={set("contact_interval_days")} className={inputCls} /></div>
      </div>
      {f.connection_source === "smwa" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label className="text-xs">SMWA reference</Label><Input value={f.smwa_reference} onChange={set("smwa_reference")} className={inputCls} maxLength={100} /></div>
          <div><Label className="text-xs">SMWA liaison contact</Label><Input value={f.smwa_liaison} onChange={set("smwa_liaison")} className={inputCls} maxLength={300} /></div>
        </div>
      )}
      <div><Label className="text-xs">Notes</Label><Textarea value={f.notes} onChange={set("notes")} className={inputCls} rows={2} maxLength={2000} /></div>
      {!widow && (
        <div className="border border-dashed border-gold/30 rounded p-3">
          <p className="font-serif text-sm text-primary-foreground">Next of kin</p>
          <p className="text-xs text-primary-foreground/60">Save her details first. Her record will then open, where you can add next of kin and log contacts.</p>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button type="submit" disabled={busy} className={btnGold}>{widow ? "Save details" : "Add widow"}</Button>
        {onCancel && <Button type="button" variant="outline" className={btnOutline} onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}

function WidowDetail({ widow, members, canEdit, onBack, onChanged }: { widow: Widow; members: Member[]; canEdit: boolean; onBack: () => void; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [kin, setKin] = useState<Kin[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [concernOnly, setConcernOnly] = useState(false);
  const [addKin, setAddKin] = useState(false);
  const [addContact, setAddContact] = useState(false);
  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const load = async () => {
    const [k, c] = await Promise.all([
      db.from("almoner_widow_kin").select("*").eq("widow_id", widow.id).order("created_at"),
      db.from("almoner_widow_contacts").select("*").eq("widow_id", widow.id).order("contact_date", { ascending: false }).order("created_at", { ascending: false }),
    ]);
    if (k.error || c.error) { toast.error((k.error || c.error).message); return; }
    setKin(k.data ?? []); setContacts(c.data ?? []);
  };
  useEffect(() => { load(); }, [widow.id]);

  const due = computeContactDue(contacts[0]?.contact_date ?? null, widow.created_at, widow.contact_interval_days);
  const age = partialDobAge(widow.dob_day, widow.dob_month, widow.dob_year);

  const setStatus = async (status: Widow["status"]) => {
    const msg = status === "deceased" ? `Mark ${widow.full_name} as deceased? Her record is kept and moves to Inactive.` : `Restore ${widow.full_name} to active?`;
    if (!confirm(msg)) return;
    const { data, error } = await db.from("almoner_widows").update({ status }).eq("id", widow.id).select("id");
    if (error || !data?.length) { toast.error(`Status not changed: ${error?.message ?? "no permission"}`); return; }
    toast.success(status === "deceased" ? "Moved to Inactive" : "Restored"); onChanged();
  };
  const del = async (table: string, id: string, label: string) => {
    if (!confirm(`Remove this ${label}?`)) return;
    const { data, error } = await db.from(table).delete().eq("id", id).select("id");
    if (error || !data?.length) { toast.error(`Not removed: ${error?.message ?? "no permission"}`); return; }
    toast.success("Removed"); load();
  };

  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <div className="min-w-0"><dt className="text-[10px] uppercase tracking-wider text-primary-foreground/50">{k}</dt><dd className="text-sm text-primary-foreground/90 break-words whitespace-pre-wrap">{v || "—"}</dd></div>
  );
  const shown = concernOnly ? contacts.filter((c) => c.welfare_concern) : contacts;

  return (
    <div className="space-y-4">
      <Button variant="outline" className={btnOutline} onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" /> All widows</Button>

      <section className="bg-navy-light/40 border border-gold/15 rounded p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-serif text-lg text-primary-foreground break-words">{widow.full_name}</h3>
            <div className="flex flex-wrap gap-1.5 mt-1">
              <Badge variant="outline" className="border-gold/40 text-gold text-[10px]">{widow.connection_source === "smwa" ? "Assigned via SMWA" : "Weybridge Lodge widow"}</Badge>
              {widow.status === "deceased" && <Badge variant="outline" className="border-primary-foreground/30 text-primary-foreground/60 text-[10px]">Deceased {fmt(widow.deceased_on)}</Badge>}
              {widow.status === "active" && due.overdue && <Badge variant="outline" className="border-gold/50 text-gold text-[10px]">Check-in due</Badge>}
            </div>
          </div>
          {canEdit && !editing && (
            <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
              <Button variant="outline" className={btnOutline} onClick={() => setEditing(true)}><Pencil className="w-4 h-4 mr-1" /> Edit</Button>
              {widow.status === "active"
                ? <Button variant="outline" className={btnOutline} onClick={() => setStatus("deceased")}>Mark deceased</Button>
                : <Button variant="outline" className={btnOutline} onClick={() => setStatus("active")}>Restore</Button>}
            </div>
          )}
        </div>
        {editing ? (
          <WidowForm widow={widow} onSaved={() => { setEditing(false); onChanged(); }} onCancel={() => setEditing(false)} />
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Row k="Preferred form of address" v={widow.preferred_address} />
            <Row k="Phone" v={widow.phone && <a className="text-gold underline" href={`tel:${widow.phone}`}>{widow.phone}</a>} />
            <Row k="Lives in" v={widow.home_type === "care_home" ? `Care home: ${widow.care_home_name ?? "—"}` : widow.home_type === "with_family" ? "Living with family" : "Own home"} />
            {widow.home_type === "care_home" && <Row k="Care home address" v={widow.care_home_address} />}
            {widow.home_type === "care_home" && <Row k="Contact hours" v={widow.care_home_contact_hours} />}
            <Row k={widow.home_type === "care_home" ? "Other address" : "Address"} v={widow.address} />
            <Row k="Date of birth" v={`${formatPartialDob(widow.dob_day, widow.dob_month, widow.dob_year)}${age != null ? ` (age ${age})` : ""}`} />
            <Row k="Husband" v={[widow.husband_name, widow.husband_lodge].filter(Boolean).join(" — ")} />
            {widow.connection_source === "smwa" && <><Row k="SMWA reference" v={widow.smwa_reference} /><Row k="SMWA liaison" v={widow.smwa_liaison} /></>}
            <Row k="Contact interval" v={`Every ${widow.contact_interval_days} days · next by ${fmt(due.dueDate)}`} />
            {widow.notes && <Row k="Notes" v={widow.notes} />}
          </dl>
        )}
      </section>

      <section className="bg-navy-light/40 border border-gold/15 rounded p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h4 className="font-serif text-base text-primary-foreground">Next of kin</h4>
          {canEdit && <Button variant="outline" className={btnOutline} onClick={() => setAddKin((v) => !v)}>{addKin ? "Cancel" : <><Plus className="w-4 h-4 mr-1" /> Add next of kin</>}</Button>}
        </div>
        {canEdit && addKin && <KinForm widowId={widow.id} onSaved={() => { setAddKin(false); load(); }} />}
        {kin.length === 0 ? <p className="text-sm text-primary-foreground/60 italic">No next of kin recorded.</p> : (
          <ul className="space-y-2">
            {kin.map((k) => (
              <li key={k.id} className="border border-gold/10 rounded p-3 flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-primary-foreground break-words">{k.name} <span className="font-normal text-primary-foreground/60">· {k.relationship === "other" ? (k.relationship_other || "Other") : REL_LABEL[k.relationship]}</span></p>
                  <p className="text-xs text-primary-foreground/70 break-words">{[k.phone, k.email].filter(Boolean).join(" · ") || "No contact details"}</p>
                  {k.notes && <p className="text-xs text-primary-foreground/60 mt-1 whitespace-pre-wrap break-words">{k.notes}</p>}
                </div>
                {canEdit && <button onClick={() => del("almoner_widow_kin", k.id, "next of kin")} className="min-w-[48px] min-h-[48px] flex items-center justify-center text-primary-foreground/40 hover:text-destructive" aria-label={`Remove ${k.name}`}><Trash2 className="w-4 h-4" /></button>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-navy-light/40 border border-gold/15 rounded p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h4 className="font-serif text-base text-primary-foreground">Contact log</h4>
          {canEdit && <Button variant="outline" className={btnOutline} onClick={() => setAddContact((v) => !v)}>{addContact ? "Cancel" : <><Plus className="w-4 h-4 mr-1" /> Log contact</>}</Button>}
        </div>
        {canEdit && addContact && <ContactForm widowId={widow.id} onSaved={() => { setAddContact(false); load(); onChanged(); }} />}
        <label className="flex items-center gap-3 min-h-[48px] text-sm text-primary-foreground/80 cursor-pointer">
          <Checkbox checked={concernOnly} onCheckedChange={(v) => setConcernOnly(v === true)} aria-label="Show welfare concerns only" />
          Welfare concerns only
        </label>
        {shown.length === 0 ? <p className="text-sm text-primary-foreground/60 italic">{concernOnly ? "No welfare concerns logged." : "No contacts logged yet."}</p> : (
          <ul className="space-y-2">
            {shown.map((c) => (
              <li key={c.id} className={`rounded p-3 border flex items-start gap-2 ${c.welfare_concern ? "border-destructive/50 bg-destructive/10" : "border-gold/10"}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-primary-foreground/70 break-words">
                    <span className="font-semibold text-primary-foreground">{CONTACT_LABEL[c.contact_type]}</span> · {fmt(c.contact_date)} · {memberName(c.logged_by ? memberMap.get(c.logged_by) : undefined)}
                  </p>
                  {c.welfare_concern && <p className="text-[11px] text-destructive flex items-center mt-0.5"><ShieldAlert className="w-3 h-3 mr-1" />Welfare concern</p>}
                  {c.notes && <p className="text-sm text-primary-foreground/85 mt-1 whitespace-pre-wrap break-words">{c.notes}</p>}
                </div>
                {canEdit && <button onClick={() => del("almoner_widow_contacts", c.id, "contact entry")} className="min-w-[48px] min-h-[48px] flex items-center justify-center text-primary-foreground/40 hover:text-destructive" aria-label="Remove contact entry"><Trash2 className="w-4 h-4" /></button>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <GiftsSection widowId={widow.id} canEdit={canEdit} memberMap={memberMap} />
    </div>
  );
}

type GiftRow = { id: string; widow_id: string; lodge_year: number; gift_type: GiftType; description: string | null; amount: number | null; date_sent: string; funding_source: FundingSource | null; funding_collection_id: string | null; notes: string | null; logged_by: string | null };
type Raffle = { id: string; collection_date: string; event_title: string | null; net_amount: number | null; allocated: number };
const raffleLabel = (r: Raffle) => raffleCollectionLabel(r, fmt);

function GiftsSection({ widowId, canEdit, memberMap }: { widowId: string; canEdit: boolean; memberMap: Map<string, Member> }) {
  const [gifts, setGifts] = useState<GiftRow[]>([]);
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [adding, setAdding] = useState(false);
  const load = async () => {
    const [g, r] = await Promise.all([
      db.from("almoner_widow_gifts").select("*").eq("widow_id", widowId).order("date_sent", { ascending: false }),
      db.rpc("get_almoner_raffle_collections"),
    ]);
    if (g.error) { toast.error(g.error.message); return; }
    setGifts(g.data ?? []); setRaffles(r.data ?? []);
  };
  useEffect(() => { load(); }, [widowId]);
  const raffleMap = new Map(raffles.map((r) => [r.id, r]));
  const del = async (id: string) => {
    if (!confirm("Remove this gift record?")) return;
    const { data, error } = await db.from("almoner_widow_gifts").delete().eq("id", id).select("id");
    if (error || !data?.length) { toast.error(`Not removed: ${error?.message ?? "no permission"}`); return; }
    toast.success("Removed"); load();
  };
  const history = formatGiftHistory(gifts);
  return (
    <section className="bg-navy-light/40 border border-gold/15 rounded p-4 space-y-3" aria-label="Gifts">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h4 className="font-serif text-base text-primary-foreground flex items-center"><Gift className="w-4 h-4 mr-2 text-gold" />Gifts</h4>
        {canEdit && <Button variant="outline" className={btnOutline} onClick={() => setAdding((v) => !v)}>{adding ? "Cancel" : <><Plus className="w-4 h-4 mr-1" /> Record gift</>}</Button>}
      </div>
      {history && <p className="text-sm text-primary-foreground/85 break-words"><span className="text-[10px] uppercase tracking-wider text-primary-foreground/50 block">History</span>{history}</p>}
      {canEdit && adding && <GiftForm widowId={widowId} raffles={raffles} onSaved={() => { setAdding(false); load(); }} />}
      {gifts.length === 0 ? <p className="text-sm text-primary-foreground/60 italic">No gifts recorded.</p> : (
        <ul className="space-y-2">
          {gifts.map((g) => {
            const r = g.funding_collection_id ? raffleMap.get(g.funding_collection_id) : undefined;
            return (
              <li key={g.id} className="border border-gold/10 rounded p-3 flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-primary-foreground break-words">
                    <span className="font-semibold">{g.gift_type === "other" && g.description ? g.description : GIFT_LABEL[g.gift_type]}</span>
                    {g.amount != null && <> · £{Number(g.amount).toFixed(2)}</>} · {fmt(g.date_sent)}
                    <span className="text-primary-foreground/60"> · {g.lodge_year}/{String((g.lodge_year + 1) % 100).padStart(2, "0")}</span>
                  </p>
                  <p className="text-xs text-primary-foreground/70 break-words">Funded by: {fundingLabel(g.funding_source, r ? raffleLabel(r) : null, !!g.funding_collection_id)} · {memberName(g.logged_by ? memberMap.get(g.logged_by) : undefined)}</p>
                  {g.notes && <p className="text-xs text-primary-foreground/60 mt-1 whitespace-pre-wrap break-words">{g.notes}</p>}
                </div>
                {canEdit && <button onClick={() => del(g.id)} className="min-w-[48px] min-h-[48px] flex items-center justify-center text-primary-foreground/40 hover:text-destructive" aria-label="Remove gift record"><Trash2 className="w-4 h-4" /></button>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function GiftForm({ widowId, raffles, onSaved }: { widowId: string; raffles: Raffle[]; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [type, setType] = useState<GiftType>("hamper");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [fund, setFund] = useState("none");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const monetary = type !== "hamper";
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = monetary && amount.trim() ? Number(amount) : null;
    if (amt != null && (!Number.isFinite(amt) || amt <= 0)) { toast.error("Amount must be more than £0"); return; }
    if ((type === "cheque" || type === "voucher") && amt == null) { toast.error("Enter the amount"); return; }
    if (date > today) { toast.error("Date sent can't be in the future"); return; }
    setBusy(true);
    const { data, error } = await db.from("almoner_widow_gifts").insert({
      widow_id: widowId, gift_type: type, description: type === "other" ? blank(description) : null,
      amount: amt, date_sent: date, ...fundingFromChoice(fund), notes: blank(notes),
      lodge_year: 0, // set by the database from the date sent
    }).select("id");
    setBusy(false);
    if (error || !data?.length) { toast.error(`Not saved: ${error?.message ?? "no permission"}`); return; }
    toast.success("Gift recorded"); onSaved();
  };
  return (
    <form onSubmit={submit} className="bg-navy-light/60 border border-gold/30 rounded p-3 space-y-3" aria-label="Record gift">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Gift type</Label>
          <Select value={type} onValueChange={(v) => setType(v as GiftType)}>
            <SelectTrigger className={inputCls} aria-label="Gift type"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(GIFT_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label htmlFor="gift-date" className="text-xs">Date sent</Label><Input id="gift-date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className={inputCls} required /></div>
        {type === "other" && <div><Label htmlFor="gift-desc" className="text-xs">Describe gift</Label><Input id="gift-desc" value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} maxLength={300} placeholder="e.g. flowers" /></div>}
        {monetary && <div><Label htmlFor="gift-amount" className="text-xs">Amount (£){type === "other" ? " — if monetary" : ""}</Label><Input id="gift-amount" type="number" inputMode="decimal" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} /></div>}
        <div className="sm:col-span-2">
          <Label className="text-xs">Funded by</Label>
          <Select value={fund} onValueChange={setFund}>
            <SelectTrigger className={inputCls} aria-label="Funded by"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="lodge_account">Lodge account</SelectItem>
              <SelectItem value="almoner_fund">Almoner fund</SelectItem>
              {raffles.map((r) => <SelectItem key={r.id} value={r.id}>{fundingLabel("raffle", raffleLabel(r))} · £{Number(r.allocated).toFixed(2)} allocated</SelectItem>)}
              <SelectItem value="none">Not linked</SelectItem>
            </SelectContent>
          </Select>
          {raffles.length === 0 && <p className="text-[11px] text-primary-foreground/60 mt-1">No raffle collections recorded by the Charity Steward yet.</p>}
        </div>
      </div>
      <div><Label className="text-xs">Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} rows={2} maxLength={2000} /></div>
      <Button type="submit" disabled={busy} className={btnGold}>Save gift</Button>
    </form>
  );
}

function KinForm({ widowId, onSaved }: { widowId: string; onSaved: () => void }) {
  const [f, setF] = useState({ name: "", relationship: "son", relationship_other: "", phone: "", email: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) { toast.error("Name is required"); return; }
    setBusy(true);
    const { data, error } = await db.from("almoner_widow_kin").insert({
      widow_id: widowId, name: f.name.trim(), relationship: f.relationship,
      relationship_other: f.relationship === "other" ? blank(f.relationship_other) : null,
      phone: blank(f.phone), email: blank(f.email), notes: blank(f.notes),
    }).select("id");
    setBusy(false);
    if (error || !data?.length) { toast.error(`Not saved: ${error?.message ?? "no permission"}`); return; }
    toast.success("Next of kin added"); onSaved();
  };
  return (
    <form onSubmit={submit} className="bg-navy-light/60 border border-gold/30 rounded p-3 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><Label className="text-xs">Name</Label><Input value={f.name} onChange={set("name")} className={inputCls} required maxLength={200} /></div>
        <div>
          <Label className="text-xs">Relationship</Label>
          <Select value={f.relationship} onValueChange={(v) => setF((p) => ({ ...p, relationship: v }))}>
            <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(REL_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {f.relationship === "other" && <div className="sm:col-span-2"><Label className="text-xs">Describe relationship</Label><Input value={f.relationship_other} onChange={set("relationship_other")} className={inputCls} maxLength={100} placeholder="e.g. niece, carer" /></div>}
        <div><Label className="text-xs">Phone</Label><Input type="tel" value={f.phone} onChange={set("phone")} className={inputCls} maxLength={50} /></div>
        <div><Label className="text-xs">Email</Label><Input type="email" value={f.email} onChange={set("email")} className={inputCls} maxLength={200} /></div>
      </div>
      <div><Label className="text-xs">Notes</Label><Textarea value={f.notes} onChange={set("notes")} className={inputCls} rows={2} maxLength={1000} /></div>
      <Button type="submit" disabled={busy} className={btnGold}>Save next of kin</Button>
    </form>
  );
}

function ContactForm({ widowId, onSaved }: { widowId: string; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [type, setType] = useState("phone");
  const [notes, setNotes] = useState("");
  const [concern, setConcern] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (date > today) { toast.error("Contact date can't be in the future"); return; }
    setBusy(true);
    const { data, error } = await db.from("almoner_widow_contacts").insert({
      widow_id: widowId, contact_date: date, contact_type: type, notes: blank(notes), welfare_concern: concern,
    }).select("id");
    setBusy(false);
    if (error || !data?.length) { toast.error(`Not saved: ${error?.message ?? "no permission"}`); return; }
    toast.success("Contact logged"); onSaved();
  };
  return (
    <form onSubmit={submit} className="bg-navy-light/60 border border-gold/30 rounded p-3 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><Label className="text-xs">Date</Label><Input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className={inputCls} required /></div>
        <div>
          <Label className="text-xs">Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(CONTACT_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div><Label className="text-xs">Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} rows={3} maxLength={3000} /></div>
      <label className="flex items-center gap-3 min-h-[48px] text-sm text-primary-foreground/85 cursor-pointer">
        <Checkbox checked={concern} onCheckedChange={(v) => setConcern(v === true)} aria-label="Flag welfare concern" />
        Flag a welfare concern
      </label>
      <Button type="submit" disabled={busy} className={btnGold}>Save contact</Button>
    </form>
  );
}
