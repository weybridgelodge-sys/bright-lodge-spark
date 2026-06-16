import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllEvents, fetchEventBundle, type LodgeEvent, type EventCourse, type DiningOption } from "@/lib/lodgeEvents";
import { toast } from "sonner";
import { Plus, Trash2, Save, Loader2, CalendarDays, Eye, EyeOff, ChevronLeft } from "lucide-react";

type CourseDraft = Partial<EventCourse> & { _tempId?: string };
type OptionDraft = Partial<DiningOption> & { _tempId?: string };

const inputCls = "w-full bg-navy-dark/50 border border-gold/20 rounded-sm px-3 py-2 text-sm text-primary-foreground placeholder:text-primary-foreground/30 focus:outline-none focus:border-gold/60";
const labelCls = "block text-xs uppercase tracking-wider text-gold mb-1.5";

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || `event_${Date.now()}`;
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EventsAdmin() {
  const { isAdmin, isSecretary } = useAuth();
  const canEdit = isAdmin || isSecretary;

  const [events, setEvents] = useState<LodgeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    const list = await fetchAllEvents();
    setEvents(list);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const createNew = async () => {
    const title = "New Meeting";
    const slug = `event_${Date.now()}`;
    const { data, error } = await supabase
      .from("lodge_events")
      .insert({
        slug,
        title,
        intro: "",
        event_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        published: false,
      })
      .select("id")
      .single();
    if (error) { toast.error(error.message); return; }
    await refresh();
    setSelectedId(data!.id);
  };

  if (!canEdit) {
    return (
      <MembersLayout>
        <p className="text-primary-foreground/70">You don't have permission to manage events.</p>
      </MembersLayout>
    );
  }

  return (
    <MembersLayout>
      {selectedId ? (
        <EventEditor id={selectedId} onBack={() => { setSelectedId(null); refresh(); }} onDeleted={() => { setSelectedId(null); refresh(); }} />
      ) : (
        <>
          <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
            <div>
              <h1 className="font-serif text-3xl text-gold mb-1">Meeting Events</h1>
              <p className="text-xs text-primary-foreground/60">Edit the meeting shown on the public Bookings page (intro, useful stuff, menu and dining options).</p>
            </div>
            <button onClick={createNew} className="flex items-center gap-2 bg-gold/15 hover:bg-gold/25 text-gold border border-gold/40 px-4 py-2 rounded-sm text-sm">
              <Plus className="w-4 h-4" /> New meeting
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-gold animate-spin" /></div>
          ) : events.length === 0 ? (
            <p className="text-sm text-primary-foreground/60">No meetings yet. Click "New meeting" to add one.</p>
          ) : (
            <ul className="space-y-2">
              {events.map((e) => (
                <li key={e.id}>
                  <button onClick={() => setSelectedId(e.id)} className="w-full text-left bg-navy-dark/60 border border-gold/15 hover:border-gold/50 rounded-sm p-4 transition-colors">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <p className="font-serif text-base text-primary-foreground">{e.title}</p>
                        <p className="text-xs text-gold flex items-center gap-1.5 mt-1">
                          <CalendarDays className="w-3 h-3" />
                          {new Date(e.event_date).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })}
                        </p>
                      </div>
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm border ${e.published ? "border-emerald-500/40 text-emerald-400" : "border-amber-500/40 text-amber-400"}`}>
                        {e.published ? <><Eye className="w-3 h-3 inline mr-1" />Published</> : <><EyeOff className="w-3 h-3 inline mr-1" />Draft</>}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-8 text-xs text-primary-foreground/50">
            Public page: <Link to="/bookings" className="text-gold underline">/bookings</Link>
            {" "}— it shows the next upcoming published meeting.
          </p>
        </>
      )}
    </MembersLayout>
  );
}

function EventEditor({ id, onBack, onDeleted }: { id: string; onBack: () => void; onDeleted: () => void }) {
  const [event, setEvent] = useState<LodgeEvent | null>(null);
  const [courses, setCourses] = useState<CourseDraft[]>([]);
  const [options, setOptions] = useState<OptionDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const bundle = await fetchEventBundle(id);
      if (bundle) {
        setEvent(bundle.event);
        setCourses(bundle.courses);
        setOptions(bundle.diningOptions);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading || !event) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-gold animate-spin" /></div>;
  }

  const update = <K extends keyof LodgeEvent>(k: K, v: LodgeEvent[K]) => setEvent({ ...event, [k]: v });

  const save = async () => {
    if (!event.title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      const slug = event.slug?.trim() || slugify(event.title);

      // Enforce single-published: if this event is being published, revert all others to draft.
      if (event.published) {
        const { error: unpubErr } = await supabase
          .from("lodge_events")
          .update({ published: false })
          .eq("published", true)
          .neq("id", event.id);
        if (unpubErr) throw unpubErr;
      }

      const { error: evErr } = await supabase
        .from("lodge_events")
        .update({
          slug,
          title: event.title,
          intro: event.intro,
          intro_heading: event.intro_heading || event.title,
          event_date: event.event_date,
          tyling_time: event.tyling_time,
          dining_time: event.dining_time,
          location: event.location,
          dress_code: event.dress_code,
          booking_deadline: event.booking_deadline || null,
          published: event.published,
        })
        .eq("id", event.id);
      if (evErr) throw evErr;

      // Replace courses
      await supabase.from("lodge_event_courses").delete().eq("event_id", event.id);
      const courseRows = courses
        .filter((c) => (c.dish || "").trim() || (c.course_label || "").trim())
        .map((c, i) => ({
          event_id: event.id,
          course_label: c.course_label || "",
          dish: c.dish || "",
          description: c.description || "",
          position: i + 1,
        }));
      if (courseRows.length) {
        const { error } = await supabase.from("lodge_event_courses").insert(courseRows);
        if (error) throw error;
      }

      // Replace dining options
      await supabase.from("lodge_event_dining_options").delete().eq("event_id", event.id);
      const optRows = options
        .filter((o) => (o.label || "").trim())
        .map((o, i) => ({
          event_id: event.id,
          label: o.label || "",
          price_pence: Math.max(0, Math.round(Number(o.price_pence) || 0)),
          position: i + 1,
          is_default: !!o.is_default,
        }));
      if (optRows.length) {
        const { error } = await supabase.from("lodge_event_dining_options").insert(optRows);
        if (error) throw error;
      }

      toast.success("Meeting saved");
      onBack();
      return;
      toast.error(err.message || "Could not save meeting");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm("Delete this meeting? This cannot be undone.")) return;
    const { error } = await supabase.from("lodge_events").delete().eq("id", event.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Meeting deleted");
    onDeleted();
  };

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-gold hover:underline mb-4">
        <ChevronLeft className="w-3 h-3" /> Back to meetings
      </button>

      <h1 className="font-serif text-2xl text-gold mb-6">Edit Meeting</h1>

      <div className="space-y-6">
        {/* Status row */}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-sm text-primary-foreground/80">
            <input type="checkbox" checked={event.published} onChange={(e) => update("published", e.target.checked)} className="accent-[hsl(var(--gold))]" />
            Published (visible on public Bookings page)
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Heading / Title</label>
            <input className={inputCls} value={event.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Initiation Ceremony — April Meeting" />
          </div>
          <div>
            <label className={labelCls}>Meeting Date & Time</label>
            <input type="datetime-local" className={inputCls} value={toLocalInput(event.event_date)} onChange={(e) => update("event_date", new Date(e.target.value).toISOString())} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Intro paragraphs</label>
          <textarea rows={8} className={inputCls} value={event.intro} onChange={(e) => update("intro", e.target.value)} placeholder="Use blank lines to separate paragraphs. Use **bold** for emphasis." />
          <p className="text-[11px] text-primary-foreground/40 mt-1">Separate paragraphs with blank lines. Wrap text in **double asterisks** for bold.</p>
        </div>

        {/* Useful stuff */}
        <fieldset className="bg-navy-dark/40 border border-gold/15 rounded-sm p-4 space-y-4">
          <legend className="px-2 text-gold font-serif text-sm">The Useful Stuff</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Tyling Time</label>
              <input className={inputCls} value={event.tyling_time} onChange={(e) => update("tyling_time", e.target.value)} placeholder="Tyling at 6.00 pm prompt" />
            </div>
            <div>
              <label className={labelCls}>Dining Time</label>
              <input className={inputCls} value={event.dining_time} onChange={(e) => update("dining_time", e.target.value)} placeholder="Festive Board Dining at 7:45 pm" />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Location</label>
              <input className={inputCls} value={event.location} onChange={(e) => update("location", e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Dress Code</label>
              <input className={inputCls} value={event.dress_code} onChange={(e) => update("dress_code", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Booking Deadline</label>
              <input type="date" className={inputCls} value={event.booking_deadline || ""} onChange={(e) => update("booking_deadline", e.target.value)} />
            </div>
          </div>
        </fieldset>

        {/* Menu */}
        <fieldset className="bg-navy-dark/40 border border-gold/15 rounded-sm p-4 space-y-3">
          <legend className="px-2 text-gold font-serif text-sm">Festive Board Menu</legend>
          {courses.map((c, i) => (
            <div key={c.id || c._tempId || i} className="grid grid-cols-1 md:grid-cols-[140px_1fr_auto] gap-2 items-start border-b border-gold/10 pb-3 last:border-b-0">
              <input className={inputCls} placeholder="Course (e.g. Main)" value={c.course_label || ""} onChange={(e) => setCourses(courses.map((x, j) => j === i ? { ...x, course_label: e.target.value } : x))} />
              <div className="space-y-2">
                <input className={inputCls} placeholder="Dish" value={c.dish || ""} onChange={(e) => setCourses(courses.map((x, j) => j === i ? { ...x, dish: e.target.value } : x))} />
                <input className={inputCls} placeholder="Description (optional)" value={c.description || ""} onChange={(e) => setCourses(courses.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
              </div>
              <button type="button" onClick={() => setCourses(courses.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 p-2" aria-label="Remove course">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setCourses([...courses, { _tempId: crypto.randomUUID(), course_label: "", dish: "", description: "" }])} className="text-sm text-gold hover:underline flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add course
          </button>
        </fieldset>

        {/* Dining options */}
        <fieldset className="bg-navy-dark/40 border border-gold/15 rounded-sm p-4 space-y-3">
          <legend className="px-2 text-gold font-serif text-sm">Dining Options (Booking Form)</legend>
          <p className="text-[11px] text-primary-foreground/50 -mt-1">Members choose one of these when booking. Price is per head.</p>
          {options.map((o, i) => (
            <div key={o.id || o._tempId || i} className="grid grid-cols-1 md:grid-cols-[1fr_120px_auto_auto] gap-2 items-center border-b border-gold/10 pb-3 last:border-b-0">
              <input className={inputCls} placeholder="Label (e.g. 3-course dinner)" value={o.label || ""} onChange={(e) => setOptions(options.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
              <div className="relative">
                <span className="absolute left-3 top-2 text-primary-foreground/50 text-sm">£</span>
                <input type="number" min={0} step="0.01" className={inputCls + " pl-6"} placeholder="32.00" value={o.price_pence != null ? (o.price_pence / 100).toFixed(2) : ""} onChange={(e) => setOptions(options.map((x, j) => j === i ? { ...x, price_pence: Math.round(parseFloat(e.target.value || "0") * 100) } : x))} />
              </div>
              <label className="flex items-center gap-1 text-xs text-primary-foreground/70 whitespace-nowrap">
                <input type="radio" name="default-option" checked={!!o.is_default} onChange={() => setOptions(options.map((x, j) => ({ ...x, is_default: j === i })))} className="accent-[hsl(var(--gold))]" />
                Default
              </label>
              <button type="button" onClick={() => setOptions(options.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 p-2" aria-label="Remove option">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setOptions([...options, { _tempId: crypto.randomUUID(), label: "", price_pence: 0, is_default: options.length === 0 }])} className="text-sm text-gold hover:underline flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add dining option
          </button>
        </fieldset>

        <div className="flex items-center justify-between gap-3 sticky bottom-0 bg-navy/95 py-4 border-t border-gold/15">
          <button type="button" onClick={remove} className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-sm">
            <Trash2 className="w-4 h-4" /> Delete meeting
          </button>
          <button type="button" onClick={save} disabled={saving} className="flex items-center gap-2 bg-gold text-navy-dark px-6 py-2.5 rounded-sm text-sm font-semibold hover:bg-gold/90 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
