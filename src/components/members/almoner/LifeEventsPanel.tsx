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
import { firstWmYearForMember } from "@/data/worshipfulMasters";

type Member = {
  id: string; first_name: string | null; last_name: string | null;
  preferred_name: string | null; full_name: string | null;
  date_of_birth?: string | null; initiation_date?: string | null;
};
type EventType = "birthday" | "initiation_anniversary" | "wm_anniversary" | "wedding_anniversary" | "bereavement" | "other";
type LifeEvent = {
  id: string; member_id: string; event_type: EventType; event_date: string;
  recurring: boolean; notes: string | null; created_at: string;
};
type ManualEventType = Exclude<EventType, "birthday" | "initiation_anniversary" | "wm_anniversary">;

const TYPE_LABEL: Record<EventType, string> = {
  birthday: "Birthday",
  initiation_anniversary: "Initiation anniversary",
  wm_anniversary: "Worshipful Master anniversary",
  wedding_anniversary: "Wedding anniversary",
  bereavement: "Bereavement",
  other: "Other",
};

const MILESTONE_YEARS = [10, 15, 20, 25, 30, 35, 40];
const MANUAL_TYPES: ManualEventType[] = ["wedding_anniversary", "bereavement", "other"];

const memberName = (m?: Member) => {
  if (!m) return "—";
  const f = m.preferred_name?.trim() || m.first_name?.trim() || "";
  return [f, m.last_name?.trim() || ""].filter(Boolean).join(" ") || m.full_name || "Unnamed";
};

const nextOccurrence = (iso: string, recurring: boolean): Date => {
  const d = new Date(iso);
  if (!recurring) return d;
  const now = new Date();
  const next = new Date(now.getFullYear(), d.getMonth(), d.getDate());
  if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    next.setFullYear(now.getFullYear() + 1);
  }
  return next;
};
const daysUntil = (d: Date) => Math.ceil((d.getTime() - Date.now()) / 86_400_000);
const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const yearsBetween = (fromIso: string, on: Date) => {
  const f = new Date(fromIso);
  let y = on.getFullYear() - f.getFullYear();
  if (on.getMonth() < f.getMonth() || (on.getMonth() === f.getMonth() && on.getDate() < f.getDate())) y--;
  return y;
};

const HORIZON_DAYS = 92; // ~3 months

type UpcomingItem = {
  key: string; memberId: string; type: EventType; when: Date; days: number;
  notes?: string | null; milestone?: number | null; derived: boolean; eventId?: string;
};

export default function LifeEventsPanel({ members, userId }: { members: Member[]; userId: string | null }) {
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [wmTerms, setWmTerms] = useState<{ member_id: string; year_started: number }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const load = async () => {
    const [{ data: ev, error: evErr }, { data: wm, error: wmErr }] = await Promise.all([
      (supabase as any).from("welfare_life_events")
        .select("*").is("deleted_at", null).order("event_date", { ascending: true }),
      (supabase as any).from("member_wm_terms").select("member_id,year_started"),
    ]);
    if (evErr) { toast.error(evErr.message); return; }
    if (wmErr) { toast.error(wmErr.message); return; }
    setEvents(ev ?? []);
    setWmTerms(wm ?? []);
  };
  useEffect(() => { load(); }, []);

  // Manual stored events only (birthdays, initiation + WM anniversaries are derived)
  const manualEvents = useMemo(
    () => events.filter((e) => e.event_type !== "birthday"
      && e.event_type !== "initiation_anniversary"
      && e.event_type !== "wm_anniversary"),
    [events],
  );

  // Earliest WM year per member: from member_wm_terms + historical roll by name match
  const firstWmByMember = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of wmTerms) {
      const cur = map.get(t.member_id);
      if (cur == null || t.year_started < cur) map.set(t.member_id, t.year_started);
    }
    for (const m of members) {
      const fromRoll = firstWmYearForMember(m.first_name, m.last_name);
      if (fromRoll != null) {
        const cur = map.get(m.id);
        if (cur == null || fromRoll < cur) map.set(m.id, fromRoll);
      }
    }
    return map;
  }, [wmTerms, members]);

  const upcoming = useMemo<UpcomingItem[]>(() => {
    const items: UpcomingItem[] = [];

    for (const m of members) {
      // Birthdays — annual, every year
      if (m.date_of_birth) {
        const when = nextOccurrence(m.date_of_birth, true);
        items.push({
          key: `dob-${m.id}`, memberId: m.id, type: "birthday", when, days: daysUntil(when),
          milestone: yearsBetween(m.date_of_birth, when), derived: true,
        });
      }
      // Initiation anniversaries — milestone years only
      if (m.initiation_date) {
        const initDate = new Date(m.initiation_date);
        for (const years of MILESTONE_YEARS) {
          const when = new Date(initDate.getFullYear() + years, initDate.getMonth(), initDate.getDate());
          const days = daysUntil(when);
          if (days >= -1 && days <= HORIZON_DAYS) {
            items.push({
              key: `init-${m.id}-${years}`, memberId: m.id, type: "initiation_anniversary",
              when, days, milestone: years, derived: true,
            });
          }
        }
      }
      // Worshipful Master anniversaries — milestone years only, installation in October
      const firstWm = firstWmByMember.get(m.id);
      if (firstWm) {
        for (const years of MILESTONE_YEARS) {
          // Installation night is the first Thursday of October by convention; use 1 Oct as proxy
          const when = new Date(firstWm + years, 9, 1);
          const days = daysUntil(when);
          if (days >= -1 && days <= HORIZON_DAYS) {
            items.push({
              key: `wm-${m.id}-${years}`, memberId: m.id, type: "wm_anniversary",
              when, days, milestone: years, derived: true,
            });
          }
        }
      }
    }

    for (const e of manualEvents) {
      const when = nextOccurrence(e.event_date, e.recurring);
      items.push({
        key: `ev-${e.id}`, memberId: e.member_id, type: e.event_type, when, days: daysUntil(when),
        notes: e.notes, derived: false, eventId: e.id,
      });
    }

    return items
      .filter((x) => x.days <= HORIZON_DAYS && x.days >= -1)
      .sort((a, b) => a.days - b.days);
  }, [members, manualEvents, firstWmByMember]);


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
          <p className="text-xs text-primary-foreground/60">
            Birthdays, initiation &amp; Worshipful Master milestone anniversaries pulled from member records · add weddings, bereavements and other milestones below
          </p>
        </div>
        <Button size="sm" className="bg-gold text-navy hover:bg-gold/90" onClick={() => setShowForm((v) => !v)}>
          {showForm ? <><X className="w-4 h-4 mr-1" /> Cancel</> : <><Plus className="w-4 h-4 mr-1" /> Add event</>}
        </Button>
      </div>

      {showForm && <NewEventForm members={members} userId={userId} onSaved={() => { setShowForm(false); load(); }} />}

      <section>
        <p className="text-[11px] uppercase tracking-wider text-gold mb-2">Upcoming · next 3 months</p>
        {upcoming.length === 0 ? (
          <p className="text-sm text-primary-foreground/60 italic">Nothing in the next 3 months.</p>
        ) : (
          <div className="space-y-1.5">
            {upcoming.map((x) => (
              <div key={x.key} className="flex items-center gap-3 bg-navy-light/40 border border-gold/15 rounded p-3">
                <Cake className="w-4 h-4 text-gold shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-primary-foreground">
                    <span className="font-semibold">{memberName(memberMap.get(x.memberId))}</span>
                    <span className="text-primary-foreground/60"> — {TYPE_LABEL[x.type]}{x.milestone != null && x.milestone > 0 ? ` · ${x.milestone}${x.type === "initiation_anniversary" ? " years" : ""}` : ""}</span>
                  </p>
                  <p className="text-[11px] text-primary-foreground/60">
                    {fmt(x.when)} · {x.days === 0 ? "today" : x.days === 1 ? "tomorrow" : `in ${x.days} days`}
                    {x.notes ? ` · ${x.notes}` : ""}
                    {x.derived ? " · from member record" : ""}
                  </p>
                </div>
                <Badge variant="outline" className="border-gold/40 text-gold text-[10px]">{x.days}d</Badge>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <p className="text-[11px] uppercase tracking-wider text-gold mb-2 mt-4">Manually added events</p>
        {manualEvents.length === 0 ? (
          <p className="text-sm text-primary-foreground/60 italic">No manual events recorded yet.</p>
        ) : (
          <div className="space-y-1.5">
            {manualEvents.map((e) => (
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
  const [eventType, setEventType] = useState<ManualEventType>("wedding_anniversary");
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
      <p className="text-[11px] text-primary-foreground/60">
        Birthdays and initiation anniversaries are pulled automatically from member records — use this form for weddings, bereavements and other milestones only.
      </p>
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
          <Select value={eventType} onValueChange={(v) => setEventType(v as ManualEventType)}>
            <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
            <SelectContent>{MANUAL_TYPES.map((k) => <SelectItem key={k} value={k}>{TYPE_LABEL[k]}</SelectItem>)}</SelectContent>
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
