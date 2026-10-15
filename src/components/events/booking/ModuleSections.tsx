// Optional Dinner & Festival booking pieces. Simple events never load or render these.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { coursesForGuest, orderModules, type CourseRow, type OptionRow } from "@/lib/eventOrder";
import { formatGBP } from "@/lib/publicEvents";
import { inputCls, Stepper } from "./BookingCore";

export type CatItem = { id: string; category_id: string; name: string; description: string | null; unit_note: string | null; price_pence: number; kind: "drink" | "voucher"; max_per_booking: number | null; active: boolean; sort_order: number };
export type InfoBlock = { id: string; title: string; body: string | null; image_path: string | null; image_alt: string | null; link_url: string | null; sort_order: number };
export type EventContent = {
  courses: CourseRow[]; options: (OptionRow & { dietary_tags: string[]; sort_order: number })[];
  categories: { id: string; name: string; sort_order: number }[]; items: CatItem[]; blocks: InfoBlock[];
};
export const DECIDE_LATER = "__later";

const bySort = <T extends { sort_order?: number }>(a: T, b: T) => (a.sort_order ?? 0) - (b.sort_order ?? 0);

export function useEventContent(eventId: string | undefined, eventType: string | null | undefined, rawModules: unknown) {
  const [content, setContent] = useState<EventContent | null>(null);
  useEffect(() => {
    if (!eventId || !eventType || eventType === "simple") { setContent(null); return; }
    const m = orderModules(rawModules, eventType);
    const info = (rawModules as any)?.info_blocks === true;
    const db = supabase as any;
    const none = Promise.resolve({ data: [] });
    Promise.all([
      m.courses ? db.from("event_courses").select("id,menu_set,name,sort_order").eq("event_id", eventId) : none,
      m.courses ? db.from("event_course_options").select("id,course_id,label,active,dietary_tags,sort_order").eq("event_id", eventId).eq("active", true) : none,
      m.catalogue ? db.from("event_catalogue_categories").select("id,name,sort_order").eq("event_id", eventId) : none,
      m.catalogue ? db.from("event_catalogue_items").select("*").eq("event_id", eventId).eq("active", true) : none,
      info ? db.from("event_info_blocks").select("id,title,body,image_path,image_alt,link_url,sort_order").eq("event_id", eventId).eq("visible", true) : none,
    ]).then(([c, o, cat, it, b]: any[]) => setContent({
      courses: (c.data ?? []).sort(bySort), options: (o.data ?? []).sort(bySort), categories: (cat.data ?? []).sort(bySort),
      items: (it.data ?? []).sort(bySort), blocks: (b.data ?? []).sort(bySort),
    }));
  }, [eventId, eventType, rawModules]);
  return content;
}

/** Permanent, public image link served by the event-image function. */
export const eventImageUrl = (slug: string, key: string) =>
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/event-image/${encodeURIComponent(slug)}/${encodeURIComponent(key)}`;

export function CourseSelects({ content, modules, eventType, isChild, value, onChange, guestLabel }: {
  content: EventContent; modules: unknown; eventType: string; isChild: boolean;
  value: Record<string, string>; onChange: (v: Record<string, string>) => void; guestLabel: string;
}) {
  const mods = orderModules(modules, eventType);
  const courses = coursesForGuest(content, mods, isChild);
  if (!courses.length) return null;
  return (
    <div className="space-y-2">
      {courses.map((c) => (
        <label key={c.id} className="block">
          <span className="block text-sm font-medium text-foreground mb-1">{c.name}</span>
          <select className={inputCls} aria-label={`${c.name} for ${guestLabel}`} value={value[c.id] ?? ""} onChange={(e) => onChange({ ...value, [c.id]: e.target.value })}>
            <option value="">Choose…</option>
            {content.options.filter((o) => o.course_id === c.id).map((o) => (
              <option key={o.id} value={o.id}>{o.label}{o.dietary_tags?.length ? ` (${o.dietary_tags.join(", ")})` : ""}</option>
            ))}
            {mods.decide_later && <option value={DECIDE_LATER}>Decide later (we'll remind you)</option>}
          </select>
        </label>
      ))}
    </div>
  );
}

export function CatalogueSteppers({ content, qty, onChange }: { content: EventContent; qty: Record<string, number>; onChange: (q: Record<string, number>) => void }) {
  if (!content.items.length) return null;
  const subtotal = content.items.reduce((s, i) => s + (qty[i.id] ?? 0) * i.price_pence, 0);
  const groups = content.categories.map((c) => ({ ...c, items: content.items.filter((i) => i.category_id === c.id) })).filter((g) => g.items.length);
  return (
    <fieldset className="space-y-4">
      <legend className="font-serif text-xl text-foreground mb-2">Pre-order drinks &amp; extras</legend>
      {groups.map((g) => (
        <div key={g.id} className="space-y-2">
          <h3 className="font-serif text-lg text-foreground">{g.name}</h3>
          {g.items.map((i) => (
            <Stepper key={i.id} label={i.name} value={qty[i.id] ?? 0}
              hint={[formatGBP(i.price_pence), i.unit_note, i.description].filter(Boolean).join(" · ")}
              onChange={(n) => onChange({ ...qty, [i.id]: Math.min(n, i.max_per_booking ?? 20) })} />
          ))}
        </div>
      ))}
      <p className="text-right text-foreground" aria-live="polite">Pre-orders: <strong>{formatGBP(subtotal)}</strong></p>
    </fieldset>
  );
}

export function InfoBlocks({ content, slug }: { content: EventContent; slug: string }) {
  if (!content.blocks.length) return null;
  return (
    <section className="py-20 md:py-28 bg-card border-t border-border" aria-labelledby="info-heading">
      <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
        <h2 id="info-heading" className="font-serif text-3xl text-foreground text-center mb-8">Good to know</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {content.blocks.map((b) => (
            <div key={b.id} className="border border-border bg-background rounded-sm p-4 font-sans space-y-2 min-w-0">
              {b.image_path && <img src={eventImageUrl(slug, b.id)} alt={b.image_alt ?? ""} loading="lazy" className="w-full h-auto rounded-sm" />}
              <h3 className="font-serif text-xl text-foreground break-words">{b.title}</h3>
              {b.body && <p className="text-muted-foreground whitespace-pre-line break-words">{b.body}</p>}
              {b.link_url && <a href={b.link_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-[48px] text-gold-dark underline font-semibold">More information</a>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
