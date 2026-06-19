import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plane, Plus, Trash2, X } from "lucide-react";

type Member = { id: string; first_name: string | null; last_name: string | null; preferred_name: string | null; full_name: string | null };
type Reason = "illness" | "hospitalisation" | "bereavement" | "work" | "travel" | "personal" | "other";
type Row = { id: string; member_id: string; period_start: string; period_end: string | null; reason: Reason; notes: string | null };

const REASON_LABEL: Record<Reason, string> = {
  illness: "Illness", hospitalisation: "Hospitalisation", bereavement: "Bereavement",
  work: "Work", travel: "Travel", personal: "Personal", other: "Other",
};

const memberName = (m?: Member) => {
  if (!m) return "—";
  const f = m.preferred_name?.trim() || m.first_name?.trim() || "";
  return [f, m.last_name?.trim() || ""].filter(Boolean).join(" ") || m.full_name || "Unnamed";
};
const fmt = (s: string | null) => s ? new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "ongoing";

export default function AbsencesPanel({ members, userId }: { members: Member[]; userId: string | null }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [showForm, setShowForm] = useState(false);
  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const load = async () => {
    const { data, error } = await (supabase as any).from("welfare_absences")
      .select("*").is("deleted_at", null).order("period_start", { ascending: false });
    if (error) { toast.error(error.message); return; }
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().slice(0, 10);
  const current = rows.filter((r) => r.period_start <= today && (!r.period_end || r.period_end >= today));
  const past = rows.filter((r) => r.period_end && r.period_end < today);

  const archive = async (id: string) => {
    if (!confirm("Archive?")) return;
    const { error } = await (supabase as any).from("welfare_absences")
      .update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Archived"); load();
  };

  const renderRow = (r: Row) => (
    <div key={r.id} className="flex items-center gap-3 bg-navy-light/40 border border-gold/15 rounded p-3">
      <Plane className="w-4 h-4 text-gold shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-primary-foreground">
          <span className="font-semibold">{memberName(memberMap.get(r.member_id))}</span>
          <span className="text-primary-foreground/60"> — {REASON_LABEL[r.reason]}</span>
        </p>
        <p className="text-[11px] text-primary-foreground/60">{fmt(r.period_start)} → {fmt(r.period_end)}{r.notes ? ` · ${r.notes}` : ""}</p>
      </div>
      <button onClick={() => archive(r.id)} className="text-primary-foreground/40 hover:text-red-400" aria-label="Archive">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg text-primary-foreground">Member Absences</h3>
          <p className="text-xs text-primary-foreground/60">Known reasons members are away — illness, travel, work</p>
        </div>
        <Button size="sm" className="bg-gold text-navy hover:bg-gold/90" onClick={() => setShowForm((v) => !v)}>
          {showForm ? <><X className="w-4 h-4 mr-1" /> Cancel</> : <><Plus className="w-4 h-4 mr-1" /> Log absence</>}
        </Button>
      </div>

      {showForm && <NewForm members={members} userId={userId} onSaved={() => { setShowForm(false); load(); }} />}

      <section>
        <p className="text-[11px] uppercase tracking-wider text-gold mb-2">Currently absent</p>
        {current.length === 0
          ? <p className="text-sm text-primary-foreground/60 italic">No currently logged absences.</p>
          : <div className="space-y-1.5">{current.map(renderRow)}</div>}
      </section>

      <section>
        <p className="text-[11px] uppercase tracking-wider text-gold mb-2 mt-4">Past absences</p>
        {past.length === 0
          ? <p className="text-sm text-primary-foreground/60 italic">No past absences on record.</p>
          : <div className="space-y-1.5">{past.map(renderRow)}</div>}
      </section>
    </div>
  );
}

function NewForm({ members, userId, onSaved }: { members: Member[]; userId: string | null; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [memberId, setMemberId] = useState("");
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState<Reason>("illness");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const inputCls = "bg-navy text-primary-foreground border-gold/30";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId) { toast.error("Member required"); return; }
    setBusy(true);
    const { error } = await (supabase as any).from("welfare_absences").insert({
      member_id: memberId, period_start: start, period_end: end || null,
      reason, notes: notes.trim() || null, created_by: userId,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Absence logged"); onSaved();
  };

  const sortedMembers = useMemo(() => [...members].sort((a, b) => memberName(a).localeCompare(memberName(b))), [members]);

  return (
    <form onSubmit={submit} className="bg-navy-light/60 border border-gold/30 rounded p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2">
          <Label className="text-xs">Member</Label>
          <Select value={memberId} onValueChange={setMemberId}>
            <SelectTrigger className={inputCls}><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>{sortedMembers.map((m) => <SelectItem key={m.id} value={m.id}>{memberName(m)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">From</Label>
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} required />
        </div>
        <div>
          <Label className="text-xs">To (optional)</Label>
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
        </div>
      </div>
      <div>
        <Label className="text-xs">Reason</Label>
        <Select value={reason} onValueChange={(v) => setReason(v as Reason)}>
          <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
          <SelectContent>{(Object.keys(REASON_LABEL) as Reason[]).map((k) => <SelectItem key={k} value={k}>{REASON_LABEL[k]}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} rows={2} maxLength={1000} />
      </div>
      <Button type="submit" disabled={busy} className="bg-gold text-navy hover:bg-gold/90">Save absence</Button>
    </form>
  );
}
