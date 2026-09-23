import { useEffect, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import ProtectedRoute from "@/components/members/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Save, Loader2, X, CalendarClock, ChevronDown, ChevronRight } from "lucide-react";

type Entry = {
  id: string;
  title: string;
  event_date: string;
  time_from: string;
  time_to: string;
  venue: string;
  description: string | null;
};

type Draft = Omit<Entry, "id"> & { id?: string };

const inputCls = "w-full bg-navy-dark/50 border border-gold/20 rounded-sm px-3 py-2 text-sm text-primary-foreground placeholder:text-primary-foreground/30 focus:outline-none focus:border-gold/60";
const labelCls = "block text-xs uppercase tracking-wider text-gold mb-1.5";

const blank = (): Draft => ({
  title: "Lodge of Instruction",
  event_date: new Date().toISOString().slice(0, 10),
  time_from: "19:30",
  time_to: "21:30",
  venue: "Guildford Masonic Centre",
  description: "",
});

const hm = (t: string) => t.slice(0, 5);
const fmtDate = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" });

function Inner() {
  const { isAdmin, isSecretary, isAssistantSecretary, isWorshipfulMaster } = useAuth();
  const canEdit = isAdmin || isSecretary || isAssistantSecretary || isWorshipfulMaster;
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPast, setShowPast] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("loi_schedule_entries")
      .select("id,title,event_date,time_from,time_to,venue,description")
      .order("event_date", { ascending: true })
      .order("time_from", { ascending: true });
    if (error) toast.error(error.message);
    setEntries((data ?? []) as Entry[]);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  const save = async () => {
    if (!draft) return;
    if (!draft.title.trim() || !draft.event_date) { toast.error("Title and date are required"); return; }
    if (draft.time_to <= draft.time_from) { toast.error("Time To must be after Time From"); return; }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const payload = {
      title: draft.title.trim(),
      event_date: draft.event_date,
      time_from: draft.time_from,
      time_to: draft.time_to,
      venue: draft.venue.trim() || "Guildford Masonic Centre",
      description: draft.description?.trim() || null,
      updated_by: u.user?.id ?? null,
    };
    const { error } = draft.id
      ? await supabase.from("loi_schedule_entries").update(payload).eq("id", draft.id)
      : await supabase.from("loi_schedule_entries").insert({ ...payload, created_by: u.user?.id ?? null });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(draft.id ? "Entry updated" : "Entry added");
    setDraft(null);
    refresh();
  };

  const remove = async (e: Entry) => {
    if (!confirm(`Delete "${e.title}" on ${fmtDate(e.event_date)}?`)) return;
    const { error } = await supabase.from("loi_schedule_entries").delete().eq("id", e.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Entry deleted");
    refresh();
  };

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = entries.filter((e) => e.event_date >= today);
  const past = entries.filter((e) => e.event_date < today).reverse();

  const Row = ({ e, isPast }: { e: Entry; isPast?: boolean }) => (
    <li className={`rounded-sm border p-4 flex flex-wrap items-start gap-3 ${isPast ? "border-gold/10 bg-navy-dark/30 opacity-60" : "border-gold/20 bg-navy-light/30"}`}>
      <div className="flex-1 min-w-[200px]">
        <p className="font-serif text-gold">{e.title}</p>
        <p className="text-sm text-primary-foreground/80">{fmtDate(e.event_date)} · {hm(e.time_from)}–{hm(e.time_to)}</p>
        <p className="text-xs text-primary-foreground/60">{e.venue}</p>
        {e.description && <p className="text-sm text-primary-foreground/70 mt-1 whitespace-pre-line">{e.description}</p>}
      </div>
      {canEdit && (
        <div className="flex gap-2">
          <button onClick={() => setDraft({ ...e, time_from: hm(e.time_from), time_to: hm(e.time_to), description: e.description ?? "" })} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-gold/30 text-gold rounded-sm hover:bg-gold/10"><Pencil className="w-3 h-3" /> Edit</button>
          <button onClick={() => remove(e)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-destructive/40 text-destructive rounded-sm hover:bg-destructive/10"><Trash2 className="w-3 h-3" /> Delete</button>
        </div>
      )}
    </li>
  );

  return (
    <MembersLayout>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl text-gold flex items-center gap-2"><CalendarClock className="w-7 h-7" /> LOI Schedule</h1>
          <p className="text-primary-foreground/60 text-sm">Planned Lodge of Instruction and training sessions — feeds every member's personal calendar.</p>
        </div>
        {canEdit && !draft && (
          <button onClick={() => setDraft(blank())} className="inline-flex items-center gap-2 px-4 py-2 bg-gold text-navy font-semibold text-sm rounded-sm hover:bg-gold/90"><Plus className="w-4 h-4" /> Add entry</button>
        )}
      </header>

      {draft && (
        <div className="mb-6 rounded-sm border border-gold/40 bg-navy-light/40 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-gold text-lg">{draft.id ? "Edit entry" : "New entry"}</h2>
            <button onClick={() => setDraft(null)} aria-label="Cancel" className="text-primary-foreground/60 hover:text-gold"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><label className={labelCls}>Title</label><input className={inputCls} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></div>
            <div><label className={labelCls}>Date</label><input type="date" className={inputCls} value={draft.event_date} onChange={(e) => setDraft({ ...draft, event_date: e.target.value })} /></div>
            <div><label className={labelCls}>Venue</label><input className={inputCls} value={draft.venue} onChange={(e) => setDraft({ ...draft, venue: e.target.value })} /></div>
            <div><label className={labelCls}>Time from</label><input type="time" className={inputCls} value={draft.time_from} onChange={(e) => setDraft({ ...draft, time_from: e.target.value })} /></div>
            <div><label className={labelCls}>Time to</label><input type="time" className={inputCls} value={draft.time_to} onChange={(e) => setDraft({ ...draft, time_to: e.target.value })} /></div>
            <div className="sm:col-span-2"><label className={labelCls}>Description</label><textarea rows={3} className={inputCls} value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-gold text-navy font-semibold text-sm rounded-sm hover:bg-gold/90 disabled:opacity-60">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save</button>
            <button onClick={() => setDraft(null)} className="px-4 py-2 border border-gold/30 text-gold text-sm rounded-sm hover:bg-gold/10">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-primary-foreground/60 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>
      ) : (
        <>
          <h2 className="font-serif text-gold text-lg mb-3">Upcoming</h2>
          {upcoming.length === 0 ? (
            <p className="text-primary-foreground/60 text-sm mb-6">No upcoming sessions scheduled yet.</p>
          ) : (
            <ul className="space-y-3 mb-6">{upcoming.map((e) => <Row key={e.id} e={e} />)}</ul>
          )}
          {past.length > 0 && (
            <div>
              <button onClick={() => setShowPast((s) => !s)} className="inline-flex items-center gap-1 text-sm text-gold/80 hover:text-gold mb-3">
                {showPast ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />} Past sessions ({past.length})
              </button>
              {showPast && <ul className="space-y-3">{past.map((e) => <Row key={e.id} e={e} isPast />)}</ul>}
            </div>
          )}
        </>
      )}
    </MembersLayout>
  );
}

export default function LoiSchedule() {
  return <ProtectedRoute><Inner /></ProtectedRoute>;
}
