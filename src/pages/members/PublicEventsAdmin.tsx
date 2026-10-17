import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, QrCode, X, Download, Link2, Archive, ArchiveRestore, CalendarDays, ChevronLeft, Eye, EyeOff, ExternalLink, Loader2, Pencil, Plus, Save, Trash2, Wallet } from "lucide-react";
import { buildDuplicatePayload, eventQrTarget, isValidShortLink } from "@/lib/eventDuplicate";
import { renderQrPng, type QrStyle } from "@/lib/eventQr";
import { saveBlob } from "@/lib/nativeDownload";
import { CataloguePanel, CoursesPanel, EventTypePanel, FeeCoverPanel, InfoBlocksPanel, PaymentSchedulePanel, SeoPanel, type ModuleSettings } from "@/components/members/public-events/EventModulePanels";
import { paymentScheduleErrors, parseModules, remapImagePath } from "@/lib/eventModules";
import { canDeleteEvent, DEFAULT_VENUE, formatTime, publishBlockers, STATEMENT_DESCRIPTOR_MAX } from "@/lib/publicEvents";

const inputCls = "w-full min-h-[44px] bg-navy-dark/50 border border-gold/20 rounded-sm px-3 py-2 text-sm text-primary-foreground placeholder:text-primary-foreground/80 focus:outline-none focus:border-gold/60";
const labelCls = "block text-xs uppercase tracking-wider text-gold mb-1.5";
const actionBtn = "inline-flex items-center justify-center gap-1.5 min-h-[48px] min-w-11 px-3 rounded-sm border text-sm";

type Row = Record<string, any> & { id: string; name: string; event_date: string; is_public: boolean; archived_at: string | null };
type Draft = {
  id: string; name: string; public_title: string; slug: string; tagline: string; intro_copy: string;
  event_date: string; start_time: string; end_time: string; venue: string; booking_deadline: string; capacity: string;
  parking: string; dress_code: string; timings: string; access: string;
  menu_items: string; dietary_choices: string; highlights: string;
  adult_price: string; child_price: string; theme: "default" | "christmas"; hosting_lodges: string;
  reference_prefix: string; statement_descriptor: string; events_notify_email: string; short_link: string; is_public: boolean;
} & ModuleSettings;

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
    reference_prefix: r.reference_prefix ?? "", statement_descriptor: r.statement_descriptor ?? "", events_notify_email: r.events_notify_email ?? "", short_link: r.short_link ?? "", is_public: !!r.is_public,
    event_type: r.event_type === "dinner_festival" ? "dinner_festival" : "simple", modules: r.modules ?? {},
    payment_mode: r.payment_mode === "full_or_deposit" ? "full_or_deposit" : "full",
    deposit_percent: r.deposit_percent == null ? "" : String(Number(r.deposit_percent)), balance_due_date: r.balance_due_date ?? "",
    fee_cover_enabled: r.fee_cover_enabled !== false, seo_title: r.seo_title ?? "", seo_description: r.seo_description ?? "", og_image_url: r.og_image_url ?? "",
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
    events_notify_email: orNull(d.events_notify_email), short_link: orNull(d.short_link),
    event_type: d.event_type, modules: d.modules ?? {},
    // Deposit mode only applies while the deposit module is on.
    payment_mode: parseModules(d.modules, d.event_type).deposit ? d.payment_mode : "full",
    deposit_percent: d.deposit_percent.trim() === "" ? null : Number(d.deposit_percent), balance_due_date: orNull(d.balance_due_date),
    fee_cover_enabled: d.fee_cover_enabled, seo_title: orNull(d.seo_title), seo_description: orNull(d.seo_description), og_image_url: orNull(d.og_image_url),
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
  const [dupFrom, setDupFrom] = useState<string | null>(null);
  const [qrFor, setQrFor] = useState<Row | Draft | null>(null);

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

  const duplicate = async (r: Row) => {
    const { data: slugs } = await supabase.from("event_accounts" as any).select("slug");
    const payload = buildDuplicatePayload(r, ((slugs as any[]) ?? []).map((x) => x.slug));
    const { data, error } = await supabase.from("event_accounts" as any).insert(payload).select("*").single();
    if (error) { toast.error(error.message); return; }
    const newId = (data as any).id as string;
    // Courses, catalogue and info blocks copy in one database transaction; on failure the new draft is removed.
    const { error: cErr } = await (supabase as any).rpc("duplicate_event_content", { _src: r.id, _dst: newId });
    if (cErr) {
      await supabase.from("event_accounts" as any).delete().eq("id", newId);
      toast.error(`Duplicate failed, nothing was created: ${cErr.message}`);
      return;
    }
    await copyImages(r.id, newId, data as any);
    toast.success("Draft copy created");
    await refresh();
    setDupFrom(r.public_title || r.name);
    setEditing(toDraft(data as any));
  };

  /** Images live in each event's own folder so archiving the old event never hides the new one's pictures. */
  const copyImages = async (srcId: string, newId: string, row: Record<string, any>) => {
    const st = (supabase as any).storage.from("event-content-images");
    const { data: blocks } = await (supabase as any).from("event_info_blocks").select("id,image_path").eq("event_id", newId).not("image_path", "is", null);
    let failed = 0;
    for (const b of (blocks as any[]) ?? []) {
      const to = remapImagePath(b.image_path, newId);
      const { error } = await st.copy(b.image_path, to);
      if (error) { failed++; continue; }
      await (supabase as any).from("event_info_blocks").update({ image_path: to }).eq("id", b.id);
    }
    const og: string | null = row.og_image_url;
    if (og?.startsWith(`storage:${srcId}/`)) {
      const to = remapImagePath(og.slice(8), newId);
      const { error } = await st.copy(og.slice(8), to);
      if (error) failed++; else await supabase.from("event_accounts" as any).update({ og_image_url: `storage:${to}` }).eq("id", newId);
    }
    if (failed) toast.warning(`${failed} image(s) could not be copied; re-upload them in the copy.`);
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

  if (editing) return <MembersLayout><Editor draft={editing} duplicatedFrom={dupFrom} onQr={setQrFor} onBack={() => { setEditing(null); setDupFrom(null); refresh(); }} />{qrFor && <QrDialog row={qrFor} onClose={() => setQrFor(null)} />}</MembersLayout>;

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
          <button type="button" onClick={() => duplicate(r)} className={`${actionBtn} border-gold/40 text-gold hover:bg-gold/15`}><Copy className="w-4 h-4" aria-hidden="true" /> Duplicate</button>
          {r.is_public && r.slug && <button type="button" onClick={() => setQrFor(r)} className={`${actionBtn} border-gold/40 text-gold hover:bg-gold/15`}><QrCode className="w-4 h-4" aria-hidden="true" /> Event QR</button>}
          <button type="button" onClick={() => remove(r)} className={`${actionBtn} border-destructive/40 text-destructive-foreground hover:bg-destructive/10`}><Trash2 className="w-4 h-4" aria-hidden="true" /> Delete</button>
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
      {qrFor && <QrDialog row={qrFor} onClose={() => setQrFor(null)} />}
      <p className="mt-8 text-xs text-primary-foreground/80">Public list: <Link to="/events" className="text-gold underline">/events</Link> — only published, non-archived events appear.</p>
    </MembersLayout>
  );
}

function Editor({ draft: initial, onBack, duplicatedFrom, onQr }: { draft: Draft; onBack: () => void; duplicatedFrom: string | null; onQr: (d: Draft) => void }) {
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
    if (!isValidShortLink(d.short_link)) { toast.error("Short link must start with https://"); return; }
    const errs = paymentScheduleErrors({ payment_mode: d.payment_mode, deposit_percent: d.deposit_percent.trim() === "" ? null : Number(d.deposit_percent), balance_due_date: orNull(d.balance_due_date), event_date: d.event_date });
    if (errs.length) { toast.error(errs.join(". ")); return; }
    if (d.og_image_url && !/^(https:\/\/|storage:)/i.test(d.og_image_url.trim())) { toast.error("Sharing image must be an https link or an upload"); return; }
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
      {duplicatedFrom && (
        <p role="status" className="border-2 border-gold rounded-sm p-3 text-sm text-primary-foreground font-semibold">
          Duplicated from {duplicatedFrom}. Check the date, times and prices before publishing. This copy is a draft and not public.
        </p>
      )}
      {d.is_public && d.slug && (
        <button type="button" onClick={() => onQr(d)} className={`${actionBtn} border-gold/40 text-gold hover:bg-gold/15`}><QrCode className="w-4 h-4" aria-hidden="true" /> Event QR</button>
      )}
      <fieldset className={fs}><legend className={lg}>Basics</legend>
        {field("public_title", "Public title")}
        {field("name", "Accounts name (e.g. Christmas Party 2026)")}
        {field("slug", "Page address /events/…", { placeholder: "christmas-party-2026" })}
        {field("tagline", "Tagline")}
        {area("intro_copy", "Intro (blank line between paragraphs)", 5)}
        {field("short_link", "Short link for QR (optional, e.g. https://bit.ly/…)", { placeholder: "https://bit.ly/…", inputMode: "url" })}
      </fieldset>
      <EventTypePanel s={d} set={set} />
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
        <div>
          {area("timings", "Timings (e.g. Arrive 6.30 pm, buffet 7.30 pm)", 5, "5.00 pm Doors open\n6.30 pm Arrive\n7.30 pm Buffet")}
          <p className="mt-1 text-xs text-primary-foreground/80">One timing per line, e.g. 6.30 pm Arrive.</p>
        </div>
        {field("parking", "Parking")}
        {field("dress_code", "Dress code")}
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
      {d.event_type === "dinner_festival" && (() => {
        const m = parseModules(d.modules, d.event_type);
        return (
          <>
            {m.courses && <CoursesPanel eventId={d.id} kidsMenu={m.kids_menu} dietaryChoices={lines(d.dietary_choices)} />}
            {m.catalogue && <CataloguePanel eventId={d.id} />}
            {m.deposit && <PaymentSchedulePanel s={d} set={set} adultPricePence={pOut(d.adult_price)} />}
            {m.info_blocks && <InfoBlocksPanel eventId={d.id} />}
          </>
        );
      })()}
      <FeeCoverPanel s={d} set={set} />
      <SeoPanel s={d} set={set} eventId={d.id} />
      <details className={fs}>
        <summary className="cursor-pointer min-h-[44px] flex items-center text-gold font-serif text-sm">Advanced (payments and emails)</summary>
        {field("reference_prefix", "Booking reference prefix", { placeholder: "XMAS26" })}
        {field("statement_descriptor", `Card statement text (max ${STATEMENT_DESCRIPTOR_MAX})`, { maxLength: STATEMENT_DESCRIPTOR_MAX })}
        {field("events_notify_email", "Notification emails (blank = Secretary + Webmaster)")}
      </details>
      <p className="text-xs text-primary-foreground/70">Course, drink and information rows save with their own Save buttons; the event settings above save with Save event. Publishing needs both prices and start/end times. Online booking stays closed until then.</p>
      <div className="sticky bottom-20 md:bottom-4">
        <button type="button" onClick={save} disabled={saving} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[48px] px-6 bg-gold text-navy rounded-sm font-semibold disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />} Save event
        </button>
      </div>
    </div>
  );
}

function QrDialog({ row, onClose }: { row: Record<string, any> & { name: string }; onClose: () => void }) {
  const url = eventQrTarget({ slug: row.slug, short_link: row.short_link || null });
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!url) return;
    let u: string | null = null;
    renderQrPng(url, "navy-on-white").then((b) => { u = URL.createObjectURL(b); setPreview(u); });
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [url]);
  if (!url) return null;
  const download = async (style: QrStyle) => {
    const blob = await renderQrPng(url, style);
    await saveBlob(blob, `${row.slug}-qr-${style}.png`);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast.success("Link copied"); } catch { toast.error("Could not copy link"); }
  };
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="qr-title" className="fixed inset-0 z-[60] bg-navy-dark/90 overflow-y-auto overscroll-contain">
      <div className="min-h-full w-full flex items-center justify-center p-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="w-full max-w-md bg-navy border border-gold/40 rounded-sm p-4 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <h2 id="qr-title" className="font-serif text-lg text-gold break-words min-w-0">Event QR: {row.public_title || row.name}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 inline-flex items-center justify-center min-h-11 min-w-11 text-gold"><X className="w-5 h-5" aria-hidden="true" /></button>
        </div>
        {preview && <img src={preview} alt={`QR code for ${url}`} className="w-full max-w-[260px] mx-auto bg-background" />}
        <p className="text-sm text-primary-foreground break-all">{url}</p>
        <div className="grid grid-cols-1 gap-2">
          <button type="button" onClick={copy} className={`${actionBtn} border-gold/40 text-gold hover:bg-gold/15`}><Link2 className="w-4 h-4" aria-hidden="true" /> Copy link</button>
          <button type="button" onClick={() => download("navy-on-white")} className={`${actionBtn} border-gold/40 text-gold hover:bg-gold/15`}><Download className="w-4 h-4" aria-hidden="true" /> PNG: navy on white, gold border</button>
          <button type="button" onClick={() => download("white-on-navy")} className={`${actionBtn} border-gold/40 text-gold hover:bg-gold/15`}><Download className="w-4 h-4" aria-hidden="true" /> PNG: white on navy, gold border</button>
        </div>
      </div>
      </div>
    </div>
  );
}
