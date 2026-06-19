import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Cake, Calendar, Plus, Trash2, X } from "lucide-react";

type Member = { id: string; first_name: string | null; last_name: string | null; preferred_name: string | null; full_name: string | null };
type EventType = "birthday" | "initiation_anniversary" | "wedding_anniversary" | "bereavement" | "other";
type LifeEvent = {
  id: string; member_id: string; event_type: EventType; event_date: string;
  recurring: boolean; notes: string | null; created_at: string;
};

const TYPE_LABEL: Record<EventType, string> = {
  birthday: "Birthday",
  initiation_anniversary: "Initiation anniversary",
  wedding_anniversary: "Wedding anniversary",
  bereavement: "Bereavement",
  other: "Other",
};

const memberName = (m?: Member) => {
  if (!m) return "—";
  const f = m.preferred_name?.trim() || m.first_name?.trim() || "";
  return [f, m.last_name?.trim() || ""].filter(Boolean).join(" ") || m.full_name || "Unnamed";
};

// "next occurrence" for a recurring annual event, else the actual date
const nextOccurrence = (e: LifeEvent): Date => {
  const d = new Date(e.event_date);
  if (!e.recurring) return d;
  const now = new Date();
  const next = new Date(now.getFullYear(), d.getMonth(), d.getDate());
  if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    next.setFullYear(now.getFullYear() + 1);
  }
  return next;
};
const daysUntil = (d: Date) => Math.ceil((d.getTime() - Date.now()) / 86_400_000);
const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export default function LifeEventsPanel({ members, userId }: { members: Member[]; userId: string | null }) {
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const load = async () => {
    const { data, error } = await (supabase as any).from("welfare_life_events")
      .select("*").is("deleted_at", null).order("event_date", { ascending: true });
    if (error) { toast.error(error.message); return; }
    setEvents(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const upcoming = useMemo(() => {
    return [...events]
      .map((e) => ({ e, when: nextOccurrence(e), days: daysUntil(nextOccurrence(e)) }))
      .filter((x) => x.days <= 60 && x.days >= -1)
      .sort((a, b) => a.days - b.days);
  }, [events]);

  const archive = async (id: string) => {
    if (!confirm("Archive this entry?")) return;
    const { error } = await (supabase as any).from("welfare_life_events")
      .update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Archived");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg text-primary-foreground">Life Events</h3>
          <p className="text-xs text-primary-foreground/60">Birthdays, anniversaries and personal milestones</p>
        </div>
        <Button size="sm" className="bg-gold text-navy hover:bg-gold/90" onClick={() => setShowForm((v) => !v)}>
          {showForm ? <><X className="w-4 h-4 mr-1" /> Cancel</> : <><Plus className="w-4 h-4 mr-1" /> Add event</>}
        </Button>
      </div>

      {showForm && <NewEventForm members={members} userId={userId} onSaved={() => { setShowForm(false); load(); }} />}

      {/* Upcoming (next 60 days) */}
      <section>
        <p className="text-[11px] uppercase tracking-wider text-gold mb-2">Upcoming · next 60 days</p>
        {upcoming.length === 0 ? (
          <p className="text-sm text-primary-foreground/60 italic">Nothing in the next 60 days.</p>
        ) : (
          <div className="space-y-1.5">
            {upcoming.map(({ e, when, days }) => (
              <div key={e.id} className="flex items-center gap-3 bg-navy-light/40 border border-gold/15 rounded p-3">
                <Cake className="w-4 h-4 text-gold shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-primary-foreground">
                    <span className="font-semibold">{memberName(memberMap.get(e.member_id))}</span>
                    <span className="text-primary-foreground/60"> — {TYPE_LABEL[e.event_type]}</span>
                  </p>
                  <p className="text-[11px] text-primary-foreground/60">{fmt(when)} · {days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`}{e.notes ? ` · ${e.notes}` : ""}</p>
                </div>
                <Badge variant="outline" className="border-gold/40 text-gold text-[10px]">{days}d</Badge>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* All events */}
      <section>
        <p className="text-[11px] uppercase tracking-wider text-gold mb-2 mt-4">All events</p>
        {events.length === 0 ? (
          <p className="text-sm text-primary-foreground/60 italic">No events recorded yet.</p>
        ) : (
          <div className="space-y-1.5">
            {events.map((e) => (
              <div key={e.id} className="flex items-center gap-3 bg-navy-light/30 border border-gold/10 rounded p-2.5">
                <Calendar className="w-4 h-4 text-primary-foreground/50 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-primary-foreground truncate">
                    {memberName(memberMap.get(e.member_id))} <span className="text-primary-foreground/60">— {TYPE_LABEL[e.event_type]}</span>
                  </p>
                  <p className="text-[11px] text-primary-foreground/60">{fmt(new Date(e.event_date))}{e.recurring ? " · annual" : ""}{e.notes ? ` · ${e.notes}` : ""}</p>
                </div>
                <button onClick={() => archive(e.id)} className="text-primary-foreground/40 hover:text-red-400" aria-label="Archive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function NewEventForm({ members, userId, onSaved }: { members: Member[]; userId: string | null; onSaved: () => void }) {
  const [memberId, setMemberId] = useState<string>("");
  const [eventType, setEventType] = useState<EventType>("birthday");
  const [eventDate, setEventDate] = useState("");
  const [recurring, setRecurring] = useState(true);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const inputCls = "bg-navy text-primary-foreground border-gold/30";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId || !eventDate) { toast.error("Member and date are required"); return; }
    setBusy(true);
    const { error } = await (supabase as any).from("welfare_life_events").insert({
      member_id: memberId, event_type: eventType, event_date: eventDate,
      recurring, notes: notes.trim() || null, created_by: userId,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Event added");
    onSaved();
  };

  const sortedMembers = useMemo(() => [...members].sort((a, b) => memberName(a).localeCompare(memberName(b))), [members]);

  return (
    <form onSubmit={submit} className="bg-navy-light/60 border border-gold/30 rounded p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Member</Label>
          <Select value={memberId} onValueChange={setMemberId}>
            <SelectTrigger className={inputCls}><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>{sortedMembers.map((m) => <SelectItem key={m.id} value={m.id}>{memberName(m)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Type</Label>
          <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
            <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
            <SelectContent>{(Object.keys(TYPE_LABEL) as EventType[]).map((k) => <SelectItem key={k} value={k}>{TYPE_LABEL[k]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Date</Label>
          <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={inputCls} required />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-primary-foreground/80">
            <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="accent-gold w-4 h-4" />
            Annual recurring
          </label>
        </div>
      </div>
      <div>
        <Label className="text-xs">Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} rows={2} maxLength={500} />
      </div>
      <Button type="submit" disabled={busy} className="bg-gold text-navy hover:bg-gold/90">Save event</Button>
    </form>
  );
}
