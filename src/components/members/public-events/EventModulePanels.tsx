import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import { useInitialLoading } from "@/hooks/useInitialLoading";
import { toUploadBody } from "@/lib/nativeUpload";
import { depositPence, quoteBooking } from "@/lib/eventPricing";
import { formatGBP } from "@/lib/publicEvents";
import {
  contentImagePath, effectiveDepositPercent, MODULE_KEYS, ONE_THIRD_STORED, parseModules, penceToPounds, poundsToPence,
  SECTION_KEYS, type EventModules, type EventType, type PaymentMode,
} from "@/lib/eventModules";

export const inputCls = "w-full min-h-[44px] bg-navy-dark/50 border border-gold/20 rounded-sm px-3 py-2 text-sm text-primary-foreground placeholder:text-primary-foreground/40 focus:outline-none focus:border-gold/60";
const labelCls = "block text-xs uppercase tracking-wider text-gold mb-1.5";
const fs = "border border-gold/20 rounded-sm p-4 space-y-3";
const lg = "px-2 text-gold font-serif text-sm";
const btn = "inline-flex items-center justify-center gap-1.5 min-h-[44px] min-w-11 px-3 rounded-sm border border-gold/40 text-gold hover:bg-gold/15 text-sm disabled:opacity-50";
const delBtn = "inline-flex items-center justify-center min-h-[44px] min-w-11 rounded-sm border border-destructive/40 text-destructive hover:bg-destructive/10";
const db = supabase as any;

/* ---------------- Event-level settings (saved with the main Save) ---------------- */

export type ModuleSettings = {
  event_type: EventType; modules: Record<string, any>; payment_mode: PaymentMode; deposit_percent: string;
  balance_due_date: string; fee_cover_enabled: boolean; seo_title: string; seo_description: string; og_image_url: string;
};

const MODULE_LABELS: Record<(typeof MODULE_KEYS)[number], [string, string]> = {
  courses: ["Courses & menu choices", "Each guest picks one option per course."],
  kids_menu: ["Separate kids' menu", "Children choose from their own courses."],
  catalogue: ["Drinks & vouchers", "Priced extras added to the booking."],
  deposit: ["Deposit payments", "Allow paying a deposit now and the balance later."],
  info_blocks: ["Information blocks", "Hotel, charity, sponsor, dress and other cards."],
};
const SECTION_LABELS: Record<(typeof SECTION_KEYS)[number], string> = {
  menu: "Menu", drinks: "Drinks", info: "Information blocks", hosting_lodges: "Hosting lodges", highlights: "Highlights",
};

const Switch = ({ id, checked, onChange, label, help }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; help?: string }) => (
  <label htmlFor={id} className="flex items-start gap-3 min-h-[44px] cursor-pointer">
    <input id={id} type="checkbox" className="mt-1 h-5 w-5 accent-[hsl(var(--gold))]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span><span className="text-sm text-primary-foreground">{label}</span>{help && <span className="block text-xs text-primary-foreground/60">{help}</span>}</span>
  </label>
);

export function EventTypePanel({ s, set }: { s: ModuleSettings; set: (p: Partial<ModuleSettings>) => void }) {
  const m = parseModules(s.modules, s.event_type);
  const raw = s.modules ?? {};
  const toggle = (k: string, v: boolean) => set({ modules: { ...raw, [k]: v } });
  const toggleSection = (k: string, v: boolean) => set({ modules: { ...raw, sections: { ...(raw.sections ?? {}), [k]: v } } });
  return (
    <fieldset className={fs}><legend className={lg}>Event type</legend>
      <div>
        <label className={labelCls} htmlFor="f-event-type">Type</label>
        <select id="f-event-type" className={inputCls} value={s.event_type} onChange={(e) => set({ event_type: e.target.value as EventType })}>
          <option value="simple">Simple (tickets only)</option>
          <option value="dinner_festival">Dinner &amp; Festival</option>
        </select>
        <p className="mt-1 text-xs text-primary-foreground/60">Switching back to Simple hides the modules but keeps their content.</p>
      </div>
      {s.event_type === "dinner_festival" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <p className={labelCls}>Modules</p>
            {MODULE_KEYS.map((k) => (k === "kids_menu" && !m.courses) ? null : (
              <Switch key={k} id={`mod-${k}`} checked={raw[k] === true} onChange={(v) => toggle(k, v)} label={MODULE_LABELS[k][0]} help={MODULE_LABELS[k][1]} />
            ))}
            {m.courses && (
              <Switch id="mod-courses_decide_later" checked={raw.courses_decide_later === true} onChange={(v) => toggle("courses_decide_later", v)} label="Allow “decide later”" help="Guests may leave a course undecided and get a reminder." />
            )}
          </div>
          <div className="space-y-1">
            <p className={labelCls}>Show on the public page</p>
            {SECTION_KEYS.map((k) => <Switch key={k} id={`sec-${k}`} checked={m.sections[k]} onChange={(v) => toggleSection(k, v)} label={SECTION_LABELS[k]} />)}
          </div>
        </div>
      )}
    </fieldset>
  );
}

export function PaymentSchedulePanel({ s, set, adultPricePence }: { s: ModuleSettings; set: (p: Partial<ModuleSettings>) => void; adultPricePence: number | null }) {
  const pct = s.deposit_percent.trim() === "" ? null : Number(s.deposit_percent);
  const isThird = pct != null && Math.abs(pct - ONE_THIRD_STORED) < 1e-9;
  const sample = (adultPricePence ?? 7500) * 2;
  let example: string | null = null;
  if (s.payment_mode === "full_or_deposit" && pct && pct > 0 && pct < 100) {
    const dep = depositPence(sample, effectiveDepositPercent(pct));
    const q = quoteBooking({ orderPence: sample, plan: "deposit", depositPercent: effectiveDepositPercent(pct), method: "card", coverFee: s.fee_cover_enabled });
    example = `Example: an order of ${formatGBP(sample)} takes a deposit of ${formatGBP(dep)}${s.fee_cover_enabled && q?.feePence ? ` (plus ${formatGBP(q.feePence)} card fee if the guest covers it)` : ""}, leaving ${formatGBP(sample - dep)} due later.`;
  }
  return (
    <fieldset className={fs}><legend className={lg}>Payment schedule</legend>
      <div>
        <label className={labelCls} htmlFor="f-pay-mode">Payment options</label>
        <select id="f-pay-mode" className={inputCls} value={s.payment_mode} onChange={(e) => set({ payment_mode: e.target.value as PaymentMode })}>
          <option value="full">Full payment only</option>
          <option value="full_or_deposit">Full payment or deposit</option>
        </select>
      </div>
      {s.payment_mode === "full_or_deposit" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="f-dep-pct">Deposit (% of whole order, rounded up)</label>
            <div className="flex gap-2">
              <input id="f-dep-pct" className={inputCls} inputMode="decimal" value={s.deposit_percent} onChange={(e) => set({ deposit_percent: e.target.value })} placeholder="e.g. 25" />
              <button type="button" className={`${btn} shrink-0 ${isThird ? "bg-gold/20" : ""}`} onClick={() => set({ deposit_percent: String(ONE_THIRD_STORED) })}>One third</button>
            </div>
            {isThird && <p className="mt-1 text-xs text-primary-foreground/60">One third, rounded up to the penny.</p>}
          </div>
          <div>
            <label className={labelCls} htmlFor="f-bal-due">Balance due date</label>
            <input id="f-bal-due" type="date" className={inputCls} value={s.balance_due_date} onChange={(e) => set({ balance_due_date: e.target.value })} />
          </div>
        </div>
      )}
      {example && <p className="text-xs text-primary-foreground/70">{example}</p>}
    </fieldset>
  );
}

export function FeeCoverPanel({ s, set }: { s: ModuleSettings; set: (p: Partial<ModuleSettings>) => void }) {
  return (
    <fieldset className={fs}><legend className={lg}>Processing fee contribution</legend>
      <Switch id="f-fee-cover" checked={s.fee_cover_enabled} onChange={(v) => set({ fee_cover_enabled: v })} label="Ask guests if they will cover the processing fee"
        help="Card 2% + 20p, Pay by Bank 1% + 20p, bank transfer 1% (all rounded up). Rates are shared across all events." />
    </fieldset>
  );
}

export function SeoPanel({ s, set, eventId }: { s: ModuleSettings; set: (p: Partial<ModuleSettings>) => void; eventId: string }) {
  const [busy, setBusy] = useState(false);
  const upload = async (f: File) => {
    setBusy(true);
    try {
      const path = contentImagePath(eventId, f.name);
      const { error } = await db.storage.from("event-content-images").upload(path, await toUploadBody(f), { contentType: f.type });
      if (error) throw error;
      set({ og_image_url: `storage:${path}` });
      toast.success("Image uploaded");
    } catch (e: any) { toast.error(e.message ?? "Upload failed"); }
    setBusy(false);
  };
  return (
    <fieldset className={fs}><legend className={lg}>Search &amp; sharing</legend>
      <div>
        <label className={labelCls} htmlFor="f-seo-title">Search title ({s.seo_title.length}/70)</label>
        <input id="f-seo-title" className={inputCls} maxLength={70} value={s.seo_title} onChange={(e) => set({ seo_title: e.target.value })} placeholder="Blank uses the public title" />
      </div>
      <div>
        <label className={labelCls} htmlFor="f-seo-desc">Search description ({s.seo_description.length}/170)</label>
        <textarea id="f-seo-desc" rows={3} className={inputCls} maxLength={170} value={s.seo_description} onChange={(e) => set({ seo_description: e.target.value })} placeholder="Blank uses the tagline" />
      </div>
      <div>
        <label className={labelCls} htmlFor="f-og">Sharing image (https link or upload)</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input id="f-og" className={inputCls} value={s.og_image_url} onChange={(e) => set({ og_image_url: e.target.value })} placeholder="https://…" />
          <label className={`${btn} shrink-0 cursor-pointer`}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Upload className="w-4 h-4" aria-hidden="true" />} Upload
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
          </label>
        </div>
      </div>
    </fieldset>
  );
}

/* ---------------- Content tables (each row saves on its own) ---------------- */

function useRows<T extends { id: string; sort_order: number }>(table: string, eventId: string, extra?: (q: any) => any) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useInitialLoading();
  const load = async () => {
    let q = db.from(table).select("*").eq("event_id", eventId);
    if (extra) q = extra(q);
    const { data, error } = await q.order("sort_order").order("created_at");
    if (error) toast.error(error.message);
    setRows((data as T[]) ?? []);
    setLoading(false);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [eventId, table]);
  return { rows, setRows, loading, load };
}

async function saveRow(table: string, row: Record<string, any>) {
  const { id, created_at, updated_at, ...rest } = row;
  const res = id?.startsWith("new-") ? await db.from(table).insert(rest) : await db.from(table).update(rest).eq("id", id);
  if (res.error) { toast.error(res.error.message); return false; }
  return true;
}
async function deleteRow(table: string, id: string, what: string) {
  if (id.startsWith("new-")) return true;
  if (!window.confirm(`Delete this ${what}?`)) return false;
  const { error } = await db.from(table).delete().eq("id", id);
  if (error) { toast.error(error.message); return false; }
  return true;
}
/** Swap sort_order with a neighbour, then renumber 0..n so ties never stick. */
async function move(table: string, list: { id: string }[], idx: number, dir: -1 | 1, reload: () => void) {
  const j = idx + dir;
  if (j < 0 || j >= list.length || list.some((r) => r.id.startsWith("new-"))) { if (list.some((r) => r.id.startsWith("new-"))) toast.error("Save new rows first"); return; }
  const order = [...list]; [order[idx], order[j]] = [order[j], order[idx]];
  for (let i = 0; i < order.length; i++) {
    const { error } = await db.from(table).update({ sort_order: i }).eq("id", order[i].id);
    if (error) { toast.error(error.message); break; }
  }
  reload();
}
const nextSort = (list: { sort_order: number }[]) => (list.length ? Math.max(...list.map((r) => r.sort_order)) + 1 : 0);
const tmpId = () => `new-${crypto.randomUUID()}`;

const MoveBtns = ({ onUp, onDown, label }: { onUp: () => void; onDown: () => void; label: string }) => (
  <>
    <button type="button" className={btn} onClick={onUp} aria-label={`Move ${label} up`}><ArrowUp className="w-4 h-4" aria-hidden="true" /></button>
    <button type="button" className={btn} onClick={onDown} aria-label={`Move ${label} down`}><ArrowDown className="w-4 h-4" aria-hidden="true" /></button>
  </>
);
const Loading = () => <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-gold animate-spin" aria-label="Loading" /></div>;

type Course = { id: string; event_id: string; menu_set: "adult" | "child"; name: string; sort_order: number };
type Option = { id: string; course_id: string; event_id: string; label: string; description: string | null; dietary_tags: string[]; active: boolean; sort_order: number };

export function CoursesPanel({ eventId, kidsMenu, dietaryChoices }: { eventId: string; kidsMenu: boolean; dietaryChoices: string[] }) {
  const [set, setSet] = useState<"adult" | "child">("adult");
  const courses = useRows<Course>("event_courses", eventId);
  const options = useRows<Option>("event_course_options", eventId);
  const menuSet = kidsMenu ? set : "adult";
  const list = courses.rows.filter((c) => c.menu_set === menuSet);
  const updC = (id: string, p: Partial<Course>) => courses.setRows((r) => r.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const updO = (id: string, p: Partial<Option>) => options.setRows((r) => r.map((x) => (x.id === id ? { ...x, ...p } : x)));
  if (courses.loading || options.loading) return <fieldset className={fs}><legend className={lg}>Courses &amp; menu choices</legend><Loading /></fieldset>;
  return (
    <fieldset className={fs}><legend className={lg}>Courses &amp; menu choices</legend>
      {kidsMenu && (
        <div role="tablist" className="flex gap-2">
          {(["adult", "child"] as const).map((k) => (
            <button key={k} role="tab" aria-selected={set === k} type="button" onClick={() => setSet(k)} className={`${btn} ${set === k ? "bg-gold/20" : ""}`}>{k === "adult" ? "Adult menu" : "Kids' menu"}</button>
          ))}
        </div>
      )}
      {list.length === 0 && <p className="text-sm text-primary-foreground/70">No courses yet.</p>}
      {list.map((c, i) => {
        const opts = options.rows.filter((o) => o.course_id === c.id);
        return (
          <div key={c.id} className="border border-gold/15 rounded-sm p-3 space-y-3 bg-navy-dark/40">
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[12rem]">
                <label className={labelCls} htmlFor={`c-${c.id}`}>Course name</label>
                <input id={`c-${c.id}`} className={inputCls} value={c.name} onChange={(e) => updC(c.id, { name: e.target.value })} placeholder="Starter" />
              </div>
              <button type="button" className={btn} onClick={async () => { if (await saveRow("event_courses", c)) { toast.success("Course saved"); courses.load(); } }}><Save className="w-4 h-4" aria-hidden="true" /> Save</button>
              <MoveBtns label="course" onUp={() => move("event_courses", list, i, -1, courses.load)} onDown={() => move("event_courses", list, i, 1, courses.load)} />
              <button type="button" className={delBtn} aria-label="Delete course" onClick={async () => { if (await deleteRow("event_courses", c.id, "course and its options")) { courses.load(); options.load(); } }}><Trash2 className="w-4 h-4" aria-hidden="true" /></button>
            </div>
            {c.id.startsWith("new-") ? <p className="text-xs text-primary-foreground/60">Save the course to add options.</p> : (
              <div className="space-y-2 pl-0 md:pl-4">
                {opts.map((o, oi) => (
                  <div key={o.id} className="grid gap-2 md:grid-cols-[1fr_1fr_auto] items-end border-t border-gold/10 pt-2">
                    <div>
                      <label className={labelCls} htmlFor={`o-${o.id}`}>Option</label>
                      <input id={`o-${o.id}`} className={inputCls} value={o.label} onChange={(e) => updO(o.id, { label: e.target.value })} />
                      <input aria-label="Option description" className={`${inputCls} mt-2`} value={o.description ?? ""} onChange={(e) => updO(o.id, { description: e.target.value || null })} placeholder="Description (optional)" />
                    </div>
                    <div>
                      <p className={labelCls}>Dietary tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[...new Set([...dietaryChoices, ...o.dietary_tags])].map((t) => {
                          const on = o.dietary_tags.includes(t);
                          return <button key={t} type="button" aria-pressed={on} onClick={() => updO(o.id, { dietary_tags: on ? o.dietary_tags.filter((x) => x !== t) : [...o.dietary_tags, t] })} className={`min-h-[36px] px-2 rounded-sm border text-xs ${on ? "border-gold bg-gold/20 text-gold" : "border-gold/20 text-primary-foreground/70"}`}>{t}</button>;
                        })}
                        <input aria-label="Add a tag" className={`${inputCls} !min-h-[36px] max-w-[9rem]`} placeholder="+ tag" onKeyDown={(e) => {
                          const v = (e.target as HTMLInputElement).value.trim();
                          if (e.key === "Enter" && v) { e.preventDefault(); if (!o.dietary_tags.includes(v)) updO(o.id, { dietary_tags: [...o.dietary_tags, v] }); (e.target as HTMLInputElement).value = ""; }
                        }} />
                      </div>
                      <Switch id={`oa-${o.id}`} checked={o.active} onChange={(v) => updO(o.id, { active: v })} label="Available" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={btn} onClick={async () => { if (await saveRow("event_course_options", o)) { toast.success("Option saved"); options.load(); } }}><Save className="w-4 h-4" aria-hidden="true" /> Save</button>
                      <MoveBtns label="option" onUp={() => move("event_course_options", opts, oi, -1, options.load)} onDown={() => move("event_course_options", opts, oi, 1, options.load)} />
                      <button type="button" className={delBtn} aria-label="Delete option" onClick={async () => { if (await deleteRow("event_course_options", o.id, "option")) options.load(); }}><Trash2 className="w-4 h-4" aria-hidden="true" /></button>
                    </div>
                  </div>
                ))}
                <button type="button" className={btn} onClick={() => options.setRows((r) => [...r, { id: tmpId(), course_id: c.id, event_id: eventId, label: "", description: null, dietary_tags: [], active: true, sort_order: nextSort(opts) }])}><Plus className="w-4 h-4" aria-hidden="true" /> Add option</button>
              </div>
            )}
          </div>
        );
      })}
      <button type="button" className={btn} onClick={() => courses.setRows((r) => [...r, { id: tmpId(), event_id: eventId, menu_set: menuSet, name: "", sort_order: nextSort(list) }])}><Plus className="w-4 h-4" aria-hidden="true" /> Add course</button>
    </fieldset>
  );
}

type Cat = { id: string; event_id: string; name: string; sort_order: number };
type Item = { id: string; category_id: string; event_id: string; name: string; description: string | null; unit_note: string | null; price_pence: number; kind: "drink" | "voucher"; max_per_booking: number | null; active: boolean; sort_order: number; _price?: string };

export function CataloguePanel({ eventId }: { eventId: string }) {
  const cats = useRows<Cat>("event_catalogue_categories", eventId);
  const items = useRows<Item>("event_catalogue_items", eventId);
  const updC = (id: string, p: Partial<Cat>) => cats.setRows((r) => r.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const updI = (id: string, p: Partial<Item>) => items.setRows((r) => r.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const saveItem = async (it: Item) => {
    const price = it._price !== undefined ? poundsToPence(it._price) : it.price_pence;
    if (price == null) { toast.error("Enter a price like 24.50"); return; }
    const { _price, ...row } = it;
    if (await saveRow("event_catalogue_items", { ...row, price_pence: price })) { toast.success("Item saved"); items.load(); }
  };
  if (cats.loading || items.loading) return <fieldset className={fs}><legend className={lg}>Drinks &amp; vouchers</legend><Loading /></fieldset>;
  return (
    <fieldset className={fs}><legend className={lg}>Drinks &amp; vouchers</legend>
      {cats.rows.length === 0 && <p className="text-sm text-primary-foreground/70">No categories yet (e.g. Wine, Beer, Vouchers).</p>}
      {cats.rows.map((c, i) => {
        const its = items.rows.filter((x) => x.category_id === c.id);
        return (
          <div key={c.id} className="border border-gold/15 rounded-sm p-3 space-y-3 bg-navy-dark/40">
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[12rem]">
                <label className={labelCls} htmlFor={`cat-${c.id}`}>Category</label>
                <input id={`cat-${c.id}`} className={inputCls} value={c.name} onChange={(e) => updC(c.id, { name: e.target.value })} placeholder="Wine" />
              </div>
              <button type="button" className={btn} onClick={async () => { if (await saveRow("event_catalogue_categories", c)) { toast.success("Category saved"); cats.load(); } }}><Save className="w-4 h-4" aria-hidden="true" /> Save</button>
              <MoveBtns label="category" onUp={() => move("event_catalogue_categories", cats.rows, i, -1, cats.load)} onDown={() => move("event_catalogue_categories", cats.rows, i, 1, cats.load)} />
              <button type="button" className={delBtn} aria-label="Delete category" onClick={async () => { if (await deleteRow("event_catalogue_categories", c.id, "category and its items")) { cats.load(); items.load(); } }}><Trash2 className="w-4 h-4" aria-hidden="true" /></button>
            </div>
            {c.id.startsWith("new-") ? <p className="text-xs text-primary-foreground/60">Save the category to add items.</p> : (
              <div className="space-y-2">
                {its.map((it, ii) => (
                  <div key={it.id} className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_1fr_auto] items-end border-t border-gold/10 pt-2">
                    <div>
                      <label className={labelCls} htmlFor={`it-${it.id}`}>Item</label>
                      <input id={`it-${it.id}`} className={inputCls} value={it.name} onChange={(e) => updI(it.id, { name: e.target.value })} />
                      <input aria-label="Unit note" className={`${inputCls} mt-2`} value={it.unit_note ?? ""} onChange={(e) => updI(it.id, { unit_note: e.target.value || null })} placeholder="Unit, e.g. per bottle" />
                    </div>
                    <div>
                      <label className={labelCls} htmlFor={`ip-${it.id}`}>Price (£)</label>
                      <input id={`ip-${it.id}`} className={inputCls} inputMode="decimal" value={it._price ?? penceToPounds(it.price_pence)} onChange={(e) => updI(it.id, { _price: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelCls} htmlFor={`ik-${it.id}`}>Type</label>
                      <select id={`ik-${it.id}`} className={inputCls} value={it.kind} onChange={(e) => updI(it.id, { kind: e.target.value as Item["kind"] })}><option value="drink">Drink</option><option value="voucher">Voucher</option></select>
                    </div>
                    <div>
                      <label className={labelCls} htmlFor={`im-${it.id}`}>Max per booking</label>
                      <input id={`im-${it.id}`} className={inputCls} inputMode="numeric" value={it.max_per_booking ?? ""} onChange={(e) => { const n = parseInt(e.target.value, 10); updI(it.id, { max_per_booking: Number.isFinite(n) && n > 0 ? n : null }); }} placeholder="No limit" />
                      <Switch id={`ia-${it.id}`} checked={it.active} onChange={(v) => updI(it.id, { active: v })} label="Available" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={btn} onClick={() => saveItem(it)}><Save className="w-4 h-4" aria-hidden="true" /> Save</button>
                      <MoveBtns label="item" onUp={() => move("event_catalogue_items", its, ii, -1, items.load)} onDown={() => move("event_catalogue_items", its, ii, 1, items.load)} />
                      <button type="button" className={delBtn} aria-label="Delete item" onClick={async () => { if (await deleteRow("event_catalogue_items", it.id, "item")) items.load(); }}><Trash2 className="w-4 h-4" aria-hidden="true" /></button>
                    </div>
                  </div>
                ))}
                <button type="button" className={btn} onClick={() => items.setRows((r) => [...r, { id: tmpId(), category_id: c.id, event_id: eventId, name: "", description: null, unit_note: null, price_pence: 0, _price: "", kind: "drink", max_per_booking: null, active: true, sort_order: nextSort(its) }])}><Plus className="w-4 h-4" aria-hidden="true" /> Add item</button>
              </div>
            )}
          </div>
        );
      })}
      <button type="button" className={btn} onClick={() => cats.setRows((r) => [...r, { id: tmpId(), event_id: eventId, name: "", sort_order: nextSort(r) }])}><Plus className="w-4 h-4" aria-hidden="true" /> Add category</button>
    </fieldset>
  );
}

type Block = { id: string; event_id: string; kind: string; title: string; body: string | null; details: Record<string, any>; image_path: string | null; image_alt: string | null; link_url: string | null; visible: boolean; sort_order: number };
const BLOCK_KINDS = [["hotel", "Hotel"], ["charity", "Charity"], ["sponsor", "Sponsor"], ["dress", "Dress code"], ["timings", "Timings"], ["custom", "Other"]] as const;
const HOTEL_FIELDS = [["code", "Booking code"], ["rate", "Room rate"], ["phone", "Phone"], ["book_by", "Book by"]] as const;

function BlockPreview({ b, src }: { b: Block; src: string | null }) {
  return (
    <div className="bg-navy-dark/60 border border-gold/30 rounded-sm p-4 space-y-2">
      {src && <img src={src} alt={b.image_alt ?? ""} className="w-full max-h-48 object-cover rounded-sm" />}
      <p className="font-serif text-gold">{b.title || "Untitled"}</p>
      {b.body && <p className="text-sm text-primary-foreground whitespace-pre-line break-words">{b.body}</p>}
      {b.kind === "hotel" && HOTEL_FIELDS.map(([k, l]) => b.details?.[k] ? <p key={k} className="text-xs text-primary-foreground/80">{l}: {b.details[k]}</p> : null)}
      {b.link_url && <p className="text-xs text-gold underline break-all">{b.link_url}</p>}
    </div>
  );
}

export function InfoBlocksPanel({ eventId }: { eventId: string }) {
  const blocks = useRows<Block>("event_info_blocks", eventId);
  const [preview, setPreview] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const upd = (id: string, p: Partial<Block>) => blocks.setRows((r) => r.map((x) => (x.id === id ? { ...x, ...p } : x)));
  useEffect(() => {
    const paths = blocks.rows.map((b) => b.image_path).filter((p): p is string => !!p && !urls[p]);
    if (!paths.length) return;
    db.storage.from("event-content-images").createSignedUrls(paths, 3600).then(({ data }: any) => {
      const next: Record<string, string> = {};
      for (const d of data ?? []) if (d.signedUrl && d.path) next[d.path] = d.signedUrl;
      setUrls((u) => ({ ...u, ...next }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks.rows]);
  const upload = async (b: Block, f: File) => {
    try {
      const path = contentImagePath(eventId, f.name);
      const { error } = await db.storage.from("event-content-images").upload(path, await toUploadBody(f), { contentType: f.type });
      if (error) throw error;
      upd(b.id, { image_path: path });
      toast.success("Image uploaded. Save the block to keep it.");
    } catch (e: any) { toast.error(e.message ?? "Upload failed"); }
  };
  const save = async (b: Block) => {
    if (b.image_path && !b.image_alt?.trim()) { toast.error("Add a short image description (alt text)"); return; }
    if (b.link_url && !/^https:\/\//i.test(b.link_url)) { toast.error("Links must start with https://"); return; }
    if (await saveRow("event_info_blocks", b)) { toast.success("Block saved"); blocks.load(); }
  };
  if (blocks.loading) return <fieldset className={fs}><legend className={lg}>Information blocks</legend><Loading /></fieldset>;
  return (
    <fieldset className={fs}><legend className={lg}>Information blocks</legend>
      {blocks.rows.length === 0 && <p className="text-sm text-primary-foreground/70">No blocks yet.</p>}
      {blocks.rows.map((b, i) => (
        <div key={b.id} className="border border-gold/15 rounded-sm p-3 space-y-3 bg-navy-dark/40">
          <div className="grid gap-3 md:grid-cols-[12rem_1fr]">
            <div>
              <label className={labelCls} htmlFor={`bk-${b.id}`}>Kind</label>
              <select id={`bk-${b.id}`} className={inputCls} value={b.kind} onChange={(e) => upd(b.id, { kind: e.target.value })}>{BLOCK_KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            </div>
            <div>
              <label className={labelCls} htmlFor={`bt-${b.id}`}>Title</label>
              <input id={`bt-${b.id}`} className={inputCls} value={b.title} onChange={(e) => upd(b.id, { title: e.target.value })} />
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor={`bb-${b.id}`}>Text</label>
            <textarea id={`bb-${b.id}`} rows={4} className={inputCls} value={b.body ?? ""} onChange={(e) => upd(b.id, { body: e.target.value || null })} />
          </div>
          {b.kind === "hotel" && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {HOTEL_FIELDS.map(([k, l]) => (
                <div key={k}>
                  <label className={labelCls} htmlFor={`bh-${k}-${b.id}`}>{l}</label>
                  <input id={`bh-${k}-${b.id}`} className={inputCls} value={b.details?.[k] ?? ""} onChange={(e) => upd(b.id, { details: { ...(b.details ?? {}), [k]: e.target.value } })} />
                </div>
              ))}
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor={`bl-${b.id}`}>Link (optional)</label>
              <input id={`bl-${b.id}`} className={inputCls} value={b.link_url ?? ""} onChange={(e) => upd(b.id, { link_url: e.target.value || null })} placeholder="https://…" />
            </div>
            <div>
              <label className={labelCls} htmlFor={`ba-${b.id}`}>Image description (alt text)</label>
              <input id={`ba-${b.id}`} className={inputCls} value={b.image_alt ?? ""} onChange={(e) => upd(b.id, { image_alt: e.target.value || null })} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <label className={`${btn} cursor-pointer`}><Upload className="w-4 h-4" aria-hidden="true" /> {b.image_path ? "Replace image" : "Upload image"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(b, f); e.target.value = ""; }} />
            </label>
            {b.image_path && <button type="button" className={btn} onClick={() => upd(b.id, { image_path: null })}>Remove image</button>}
            <Switch id={`bv-${b.id}`} checked={b.visible} onChange={(v) => upd(b.id, { visible: v })} label="Visible" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn} onClick={() => save(b)}><Save className="w-4 h-4" aria-hidden="true" /> Save</button>
            <button type="button" className={btn} aria-expanded={preview === b.id} onClick={() => setPreview((p) => (p === b.id ? null : b.id))}>Preview</button>
            <MoveBtns label="block" onUp={() => move("event_info_blocks", blocks.rows, i, -1, blocks.load)} onDown={() => move("event_info_blocks", blocks.rows, i, 1, blocks.load)} />
            <button type="button" className={delBtn} aria-label="Delete block" onClick={async () => { if (await deleteRow("event_info_blocks", b.id, "block")) blocks.load(); }}><Trash2 className="w-4 h-4" aria-hidden="true" /></button>
          </div>
          {preview === b.id && <BlockPreview b={b} src={b.image_path ? urls[b.image_path] ?? null : null} />}
        </div>
      ))}
      <button type="button" className={btn} onClick={() => blocks.setRows((r) => [...r, { id: tmpId(), event_id: eventId, kind: "custom", title: "", body: null, details: {}, image_path: null, image_alt: null, link_url: null, visible: true, sort_order: nextSort(r) }])}><Plus className="w-4 h-4" aria-hidden="true" /> Add block</button>
    </fieldset>
  );
}

export type { EventModules };
