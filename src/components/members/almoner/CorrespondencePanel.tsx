import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";

type Member = { id: string; first_name: string | null; last_name: string | null; preferred_name: string | null; full_name: string | null };
type Direction = "outgoing" | "incoming";
type Method = "card" | "letter" | "email" | "phone" | "flowers" | "gift" | "other";
type Row = {
  id: string; member_id: string | null; correspondence_date: string;
  direction: Direction; method: Method; subject: string; body: string | null; created_at: string;
};

const METHOD_LABEL: Record<Method, string> = {
  card: "Card", letter: "Letter", email: "Email", phone: "Phone",
  flowers: "Flowers", gift: "Gift", other: "Other",
};

const memberName = (m?: Member) => {
  if (!m) return "—";
  const f = m.preferred_name?.trim() || m.first_name?.trim() || "";
  return [f, m.last_name?.trim() || ""].filter(Boolean).join(" ") || m.full_name || "Unnamed";
};
const fmt = (s: string) => new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export default function CorrespondencePanel({ members, userId }: { members: Member[]; userId: string | null }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [showForm, setShowForm] = useState(false);
  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const load = async () => {
    const { data, error } = await (supabase as any).from("welfare_correspondence")
      .select("*").is("deleted_at", null).order("correspondence_date", { ascending: false }).limit(200);
    if (error) { toast.error(error.message); return; }
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const archive = async (id: string) => {
    if (!confirm("Archive this entry?")) return;
    const { error } = await (supabase as any).from("welfare_correspondence")
      .update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Archived"); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg text-primary-foreground">Correspondence Log</h3>
          <p className="text-xs text-primary-foreground/60">Cards, letters, calls and flowers sent or received</p>
        </div>
        <Button size="sm" className="bg-gold text-navy hover:bg-gold/90" onClick={() => setShowForm((v) => !v)}>
          {showForm ? <><X className="w-4 h-4 mr-1" /> Cancel</> : <><Plus className="w-4 h-4 mr-1" /> New entry</>}
        </Button>
      </div>

      {showForm && <NewForm members={members} userId={userId} onSaved={() => { setShowForm(false); load(); }} />}

      {rows.length === 0 ? (
        <p className="text-sm text-primary-foreground/60 italic">No correspondence logged yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <article key={r.id} className="bg-navy-light/40 border border-gold/15 rounded p-3">
              <div className="flex items-start gap-3">
                {r.direction === "outgoing"
                  ? <ArrowUp className="w-4 h-4 text-emerald-400 mt-0.5" />
                  : <ArrowDown className="w-4 h-4 text-amber-400 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-primary-foreground">
                    <span className="font-semibold">{r.subject}</span>
                  </p>
                  <p className="text-[11px] text-primary-foreground/60 mt-0.5">
                    {fmt(r.correspondence_date)} · {METHOD_LABEL[r.method]} · {r.direction === "outgoing" ? "to" : "from"}{" "}
                    {r.member_id ? memberName(memberMap.get(r.member_id)) : "general"}
                  </p>
                  {r.body && <p className="text-sm text-primary-foreground/80 mt-2 whitespace-pre-wrap">{r.body}</p>}
                </div>
                <button onClick={() => archive(r.id)} className="text-primary-foreground/40 hover:text-red-400" aria-label="Archive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function NewForm({ members, userId, onSaved }: { members: Member[]; userId: string | null; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [memberId, setMemberId] = useState<string>("__none");
  const [date, setDate] = useState(today);
  const [direction, setDirection] = useState<Direction>("outgoing");
  const [method, setMethod] = useState<Method>("card");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const inputCls = "bg-navy text-primary-foreground border-gold/30";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) { toast.error("Subject is required"); return; }
    setBusy(true);
    const { error } = await (supabase as any).from("welfare_correspondence").insert({
      member_id: memberId === "__none" ? null : memberId,
      correspondence_date: date, direction, method,
      subject: subject.trim(), body: body.trim() || null, logged_by: userId,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Entry saved"); onSaved();
  };

  const sortedMembers = useMemo(() => [...members].sort((a, b) => memberName(a).localeCompare(memberName(b))), [members]);

  return (
    <form onSubmit={submit} className="bg-navy-light/60 border border-gold/30 rounded p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs">Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} required />
        </div>
        <div>
          <Label className="text-xs">Direction</Label>
          <Select value={direction} onValueChange={(v) => setDirection(v as Direction)}>
            <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="outgoing">Outgoing</SelectItem>
              <SelectItem value="incoming">Incoming</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Method</Label>
          <Select value={method} onValueChange={(v) => setMethod(v as Method)}>
            <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
            <SelectContent>{(Object.keys(METHOD_LABEL) as Method[]).map((k) => <SelectItem key={k} value={k}>{METHOD_LABEL[k]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Member</Label>
          <Select value={memberId} onValueChange={setMemberId}>
            <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">— General / not a member</SelectItem>
              {sortedMembers.map((m) => <SelectItem key={m.id} value={m.id}>{memberName(m)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Subject</Label>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} maxLength={160} required />
      </div>
      <div>
        <Label className="text-xs">Body / notes</Label>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} className={inputCls} rows={3} maxLength={2000} />
      </div>
      <Button type="submit" disabled={busy} className="bg-gold text-navy hover:bg-gold/90">Save entry</Button>
    </form>
  );
}
