import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Archive, ArchiveRestore, CalendarDays, ChevronLeft, Eye, EyeOff, ExternalLink, Loader2, Pencil, Plus, Save, Trash2, Wallet } from "lucide-react";
import { canDeleteEvent, DEFAULT_VENUE, formatTime, publishBlockers, STATEMENT_DESCRIPTOR_MAX } from "@/lib/publicEvents";

const inputCls = "w-full min-h-[44px] bg-navy-dark/50 border border-gold/20 rounded-sm px-3 py-2 text-sm text-primary-foreground placeholder:text-primary-foreground/40 focus:outline-none focus:border-gold/60";
const labelCls = "block text-xs uppercase tracking-wider text-gold mb-1.5";
const actionBtn = "inline-flex items-center justify-center gap-1.5 min-h-[48px] min-w-11 px-3 rounded-sm border text-sm";

type Row = Record<string, any> & { id: string; name: string; event_date: string; is_public: boolean; archived_at: string | null };
type Draft = {
  id: string; name: string; public_title: string; slug: string; tagline: string; intro_copy: string;
  event_date: string; start_time: string; end_time: string; venue: string; booking_deadline: string; capacity: string;
  parking: string; dress_code: string; timings: string; access: string;
  menu_items: string; dietary_choices: string; highlights: string;
  adult_price: string; child_price: string; theme: "default" | "christmas"; hosting_lodges: string;
  reference_prefix: string; statement_descriptor: string; events_notify_email: string;
};

const pIn = (p: number | null | undefined) => (p == null ? "" : (p / 100).toFixed(2));
const pOut = (s: string) => (s.trim() === "" ? null : Math.round(parseFloat(s) * 100));
const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
const arr = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
const orNull = (s: string) => (s.trim() === "" ? null : s.trim());
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

function toDraft(r: Row): Draft {
  const u = r.useful_stuff ?? {};
  return {
    id: r.id, name: r.name, public_title: r.public_title ?? "", slug: r.slug ?? "", tagline: r.tagline ?? "", intro_copy: r.intro_copy ?? "",
    event_date: r.event_date, start_time: (r.start_time ?? "").slice(0, 5), end_time: (r.end_time ?? "").slice(0, 5),
    venue: r.venue ?? DEFAULT_VENUE, booking_deadline: r.booking_deadline ? new Date(r.booking_deadline).toISOString().slice(0, 16) : "",
    capacity: r.capacity == null ? "" : String(r.capacity),
    parking: u.parking ?? "", dress_code: r.dress_code ?? "", timings: u.timings ?? "", access: u.access ?? "",
    menu_items: arr(r.menu_items).join("\n"), dietary_choices: arr(r.dietary_choices).join("\n"), highlights: arr(r.highlights).join("\n"),
    adult_price: pIn(r.adult_price_pence), child_price: pIn(r.child_price_pence),
    theme: r.theme === "christmas" ? "christmas" : "default", hosting_lodges: arr(r.hosting_lodges).join("\n"),
    reference_prefix: r.reference_prefix ?? "", statement_descriptor: r.statement_descriptor ?? "", events_notify_email: r.events_notify_email ?? "",
  };
}

function toPayload(d: Draft) {
  return {
    name: d.name.trim() || d.public_title.trim() || "New event", public_title: orNull(d.public_title), slug: orNull(slugify(d.slug)),
    tagline: orNull(d.tagline), intro_copy: orNull(d.intro_copy), event_date: d.event_date,
    start_time: orNull(d.start_time), end_time: orNull(d.end_time), venue: orNull(d.venue),
    booking_deadline: d.booking_deadline ? new Date(d.booking_deadline).toISOString() : null,
    capacity: d.capacity.trim() === "" ? null : parseInt(d.capacity, 10),
    useful_stuff: { parking: d.parking.trim(), timings: d.timings.trim(), access: d.access.trim() },
    dress_code: orNull(d.dress_code), menu_items: lines(d.menu_items), dietary_choices: lines(d.dietary_choices), highlights: lines(d.highlights),
    adult_price_pence: pOut(d.adult_price), child_price_pence: pOut(d.child_price), theme: d.theme, hosting_lodges: lines(d.hosting_lodges),
    reference_prefix: orNull(d.reference_prefix.toUpperCase()), statement_descriptor: orNull(d.statement_descriptor),
    events_notify_email: orNull(d.events_notify_email),
  };
}

export default function PublicEventsAdmin() {
  const { isAdmin, isSecretary } = useAuth();
  const canEdit = isAdmin || isSecretary;
  const [params] = useSearchParams();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const refresh = async () => {
    const { data, error } = await supabase.from("event_accounts" as any).select("*").order("event_date", { ascending: true });
    if (error) toast.error(error.message);
    const list = ((data as any[]) ?? []) as Row[];
    setRows(list);
    setLoading(false);
    return list;
  };

  useEffect(() => {
    refresh().then((list) => {
      const want = params.get("event");
      const r = want && list.find((x) => x.id === want);
      if (r) setEditing(toDraft(r));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createNew = async () => {
    const { data, error } = await supabase.from("event_accounts" as any)
      .insert({ name: "New event", event_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), status: "planning" })
      .select("*").single();
    if (error) { toast.error(error.message); return; }
    await refresh();
    setEditing(toDraft(data as any));
  };

  const togglePublish = async (r: Row) => {
    if (!r.is_public) {
      const missing = publishBlockers(r as any);
      if (missing.length) { toast.error(`Before publishing, add: ${missing.join(", ")}`); return; }
    }
    const { error } = await supabase.from("event_accounts" as any).update({ is_public: !r.is_public }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success(r.is_public ? "Event unpublished" : "Event published");
    refresh();
  };

  const setArchived = async (r: Row, archive: boolean) => {
    if (archive && !window.confirm(`Archive "${r.public_title || r.name}"? It will be hidden from the public website. All bookings are kept.`)) return;
    const { error } = await supabase.from("event_accounts" as any)
      .update(archive ? { archived_at: new Date().toISOString(), is_public: false } : { archived_at: null }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success(archive ? "Event archived" : "Event restored as a draft");
    refresh();
  };

  const remove = async (r: Row) => {
    const { count } = await supabase.from("event_bookings" as any).select("id", { count: "exact", head: true }).eq("event_id", r.id);
    if (!canDeleteEvent(count ?? 0)) {
      if (window.confirm(`"${r.public_title || r.name}" has ${count} booking(s) and cannot be deleted. Archive it instead?`)) setArchived(r, true);
      return;
    }
    if (!window.confirm(`Delete "${r.public_title || r.name}" permanently? This also removes its Event Accounts record.`)) return;
    const { error } = await supabase.from("event_accounts" as any).delete().eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Event deleted");
    refresh();
  };

  if (!canEdit) {
    return <MembersLayout><p className="text-primary-foreground/70">You don't have permission to manage public events.</p></MembersLayout>;
  }

  if (editing) return <MembersLayout><Editor draft={editing} onBack={() => { setEditing(null); refresh(); }} /></MembersLayout>;

  const active = rows.filter((r) => !r.archived_at);
  const archived = rows.filter((r) => r.archived_at);

  const card = (r: Row) => {
    const status = r.archived_at ? "Archived" : r.is_public ? "Published" : "Draft";
    const time = [formatTime(r.start_time), formatTime(r.end_time)].filter(Boolean).join(" – ");
    return (
      <li key={r.id} className="bg-navy-dark/60 border border-gold/15 hover:border-gold/50 rounded-sm transition-colors p-4 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="font-serif text-base text-primary-foreground break-words">{r.public_title || r.name}</p>
            <p className="text-xs text-gold flex items-center gap-1.5 mt-1">
              <CalendarDays className="w-3 h-3 shrink-0" aria-hidden="true" />
              {new Date(`${r.event_date}T12:00:00`).toLocaleDateString("en-GB", { dateStyle: "full" })}{time ? ` · ${time}` : " · times not set"}
            </p>
          </div>
          <span className="self-start shrink-0 text-xs uppercase tracking-wider px-2 py-0.5 rounded-sm border border-gold/40 text-gold">
            {status === "Published" ? <Eye className="w-3 h-3 inline mr-1" aria-hidden="true" /> : <EyeOff className="w-3 h-3 inline mr-1" aria-hidden="true" />}{status}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <button type="button" onClick={() => setEditing(toDraft(r))} className={`${actionBtn} border-gold/40 text-gold hover:bg-gold/15`}><Pencil className="w-4 h-4" aria-hidden="true" /> Edit</button>
          {!r.archived_at && (
            <button type="button" onClick={() => togglePublish(r)} className={`${actionBtn} border-gold/40 text-gold hover:bg-gold/15`}>
              {r.is_public ? <><EyeOff className="w-4 h-4" aria-hidden="true" /> Unpublish</> : <><Eye className="w-4 h-4" aria-hidden="true" /> Publish</>}
            </button>
          )}
          <button type="button" onClick={() => setArchived(r, !r.archived_at)} className={`${actionBtn} border-gold/40 text-gold hover:bg-gold/15`}>
            {r.archived_at ? <><ArchiveRestore className="w-4 h-4" aria-hidden="true" /> Restore</> : <><Archive className="w-4 h-4" aria-hidden="true" /> Archive</>}
          </button>
          <button type="button" onClick={() => remove(r)} className={`${actionBtn} border-destructive/40 text-destructive hover:bg-destructive/10`}><Trash2 className="w-4 h-4" aria-hidden="true" /> Delete</button>
          <Link to={`/members/admin/treasurer?tab=event-accounts&event=${r.id}`} className={`${actionBtn} border-gold/30 text-gold hover:bg-gold/10`}><Wallet className="w-4 h-4" aria-hidden="true" /> Treasurer view</Link>
          {r.is_public && r.slug && <Link to={`/events/${r.slug}`} className={`${actionBtn} border-gold/30 text-gold hover:bg-gold/10`}><ExternalLink className="w-4 h-4" aria-hidden="true" /> View page</Link>}
        </div>
      </li>
    );
  };

  return (
    <MembersLayout>
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="font-serif text-3xl text-gold mb-1">Public Events</h1>
          <p className="text-xs text-primary-foreground/70">Edit public events such as the Christmas Party (intro, useful stuff, menu, tickets). Each event shares its record with Treasurer › Event Accounts.</p>
        </div>
        <button onClick={createNew} className="flex items-center gap-2 min-h-11 bg-gold/15 hover:bg-gold/25 text-gold border border-gold/40 px-4 py-2 rounded-sm text-sm">
          <Plus className="w-4 h-4" aria-hidden="true" /> New event
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-gold animate-spin" /></div>
      ) : active.length === 0 ? (
        <p className="text-sm text-primary-foreground/70">No current events. Click "New event" to add one.</p>
      ) : <ul className="space-y-3">{active.map(card)}</ul>}
      {!loading && (
        <section className="mt-10 border-t border-gold/15 pt-6">
          <button type="button" onClick={() => setShowArchived((v) => !v)} aria-expanded={showArchived} className={`${actionBtn} border-gold/30 text-gold hover:bg-gold/10`}>
            <ArchiveRestore className="w-4 h-4" aria-hidden="true" /> Archived ({archived.length}) {showArchived ? "— hide" : "— show"}
          </button>
          {showArchived && (archived.length === 0
            ? <p className="mt-4 text-sm text-primary-foreground/70">No archived events.</p>
            : <ul className="mt-4 space-y-3">{archived.map(card)}</ul>)}
        </section>
      )}
      <p className="mt-8 text-xs text-primary-foreground/60">Public list: <Link to="/events" className="text-gold underline">/events</Link> — only published, non-archived events appear.</p>
    </MembersLayout>
  );
}

function Editor({ draft: initial, onBack }: { draft: Draft; onBack: () => void }) {
  const [d, setD] = useState<Draft>(initial);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));
  const field = (k: keyof Draft, label: string, props: Record<string, unknown> = {}) => (
    <div>
      <label className={labelCls} htmlFor={`f-${k}`}>{label}</label>
      <input id={`f-${k}`} className={inputCls} value={d[k] as string} onChange={(e) => set({ [k]: e.target.value } as any)} {...props} />
    </div>
  );
  const area = (k: keyof Draft, label: string, rows = 3, placeholder = "") => (
    <div>
      <label className={labelCls} htmlFor={`f-${k}`}>{label}</label>
      <textarea id={`f-${k}`} rows={rows} placeholder={placeholder} className={inputCls} value={d[k] as string} onChange={(e) => set({ [k]: e.target.value } as any)} />
    </div>
  );
  const save = async () => {
    if (d.statement_descriptor.length > STATEMENT_DESCRIPTOR_MAX) { toast.error("Card statement text must be 22 characters or fewer"); return; }
    setSaving(true);
    const { error } = await supabase.from("event_accounts" as any).update(toPayload(d)).eq("id", d.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Event saved");
  };
  const fs = "border border-gold/20 rounded-sm p-4 space-y-3";
  const lg = "px-2 text-gold font-serif text-sm";
  return (
    <div className="space-y-5 pb-24">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 min-h-[44px] text-gold text-sm"><ChevronLeft className="w-4 h-4" aria-hidden="true" /> Back to Public Events</button>
      <h1 className="font-serif text-2xl text-gold break-words">{d.public_title || d.name}</h1>
      <fieldset className={fs}><legend className={lg}>Basics</legend>
        {field("public_title", "Public title")}
        {field("name", "Accounts name (e.g. Christmas Party 2026)")}
        {field("slug", "Page address /events/…", { placeholder: "christmas-party-2026" })}
        {field("tagline", "Tagline")}
        {area("intro_copy", "Intro (blank line between paragraphs)", 5)}
      </fieldset>
      <fieldset className={fs}><legend className={lg}>The Useful Stuff</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {field("event_date", "Date", { type: "date" })}
          {field("start_time", "Start time", { type: "time" })}
          {field("end_time", "End time", { type: "time" })}
        </div>
        {field("venue", "Venue")}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {field("booking_deadline", "Booking deadline", { type: "datetime-local" })}
          {field("capacity", "Capacity (adults + children)", { inputMode: "numeric" })}
        </div>
        {field("parking", "Parking")}
        {field("dress_code", "Dress code")}
        {field("timings", "Timings (e.g. Arrive 6.30 pm, buffet 7.30 pm)")}
        {field("access", "Access")}
      </fieldset>
      <fieldset className={fs}><legend className={lg}>Menu &amp; Dining</legend>
        {area("menu_items", "Menu (one item per line)", 3, "Hot buffet")}
        {area("dietary_choices", "Dietary choices guests can pick (one per line, optional)", 3, "Vegetarian\nVegan\nGluten free")}
      </fieldset>
      <fieldset className={fs}><legend className={lg}>Highlights</legend>
        {area("highlights", "One highlight per line", 4)}
      </fieldset>
      <fieldset className={fs}><legend className={lg}>Tickets &amp; theme</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {field("adult_price", "Adult price (£)", { inputMode: "decimal" })}
          {field("child_price", "Child price (£, 12 and under)", { inputMode: "decimal" })}
        </div>
        <div>
          <label className={labelCls} htmlFor="f-theme">Theme</label>
          <select id="f-theme" className={inputCls} value={d.theme} onChange={(e) => set({ theme: e.target.value as any })}>
            <option value="default">Default</option><option value="christmas">Christmas</option>
          </select>
        </div>
        {area("hosting_lodges", "Hosting lodges (one per line)", 2)}
      </fieldset>
      <details className={fs}>
        <summary className="cursor-pointer min-h-[44px] flex items-center text-gold font-serif text-sm">Advanced (payments and emails)</summary>
        {field("reference_prefix", "Booking reference prefix", { placeholder: "XMAS26" })}
        {field("statement_descriptor", `Card statement text (max ${STATEMENT_DESCRIPTOR_MAX})`, { maxLength: STATEMENT_DESCRIPTOR_MAX })}
        {field("events_notify_email", "Notification emails (blank = Secretary + Treasurer)")}
      </details>
      <p className="text-xs text-primary-foreground/70">Publishing needs both prices and start/end times. Online booking stays closed until then.</p>
      <div className="sticky bottom-20 md:bottom-4">
        <button type="button" onClick={save} disabled={saving} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[48px] px-6 bg-gold text-navy rounded-sm font-semibold disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />} Save event
        </button>
      </div>
    </div>
  );
}
