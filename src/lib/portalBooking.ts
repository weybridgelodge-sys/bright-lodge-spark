// Portal booking helpers: resolve a Book my place meeting item to the same event bundle the public page uses.
import { supabase } from "@/integrations/supabase/client";
import type { DiningOption, EventCourse, EventBundle, LodgeEvent } from "@/lib/lodgeEvents";
import type { BookableItem } from "@/lib/memberBookings";

/** Published lodge_events row on the meeting's date whose published meeting is exactly this item. */
export async function loadMeetingBundle(item: Pick<BookableItem, "id" | "event_date">): Promise<{ bundle: EventBundle; meeting: { id: string; event_key: string } } | null> {
  const day = item.event_date.slice(0, 10);
  const next = new Date(`${day}T00:00:00Z`); next.setUTCDate(next.getUTCDate() + 2);
  const prev = new Date(`${day}T00:00:00Z`); prev.setUTCDate(prev.getUTCDate() - 1);
  const { data: events } = await supabase.from("lodge_events").select("*").eq("published", true).is("archived_at", null)
    .gte("event_date", prev.toISOString()).lt("event_date", next.toISOString());
  for (const ev of (events as LodgeEvent[] | null) ?? []) {
    const { data } = await (supabase.rpc as any)("get_published_meeting_for_event", { _event_key: ev.slug });
    const row = Array.isArray(data) ? data[0] : null;
    if (row?.id !== item.id) continue;
    const [c, o] = await Promise.all([
      supabase.from("lodge_event_courses").select("*").eq("event_id", ev.id).order("position"),
      supabase.from("lodge_event_dining_options").select("*").eq("event_id", ev.id).order("position"),
    ]);
    return { bundle: { event: ev, courses: (c.data as EventCourse[]) ?? [], diningOptions: (o.data as DiningOption[]) ?? [] }, meeting: { id: row.id, event_key: row.event_key } };
  }
  return null;
}

/** Where a card's Book button goes: meetings book inside the portal; events keep their public page. */
export const portalBookPath = (item: Pick<BookableItem, "kind" | "id" | "book_path">) =>
  item.kind === "meeting" ? `/members/book/meeting/${item.id}` : item.book_path;

/** Public /bookings → portal only for a signed-in active member and with the redirect switch on. Deep links with a query stay put. */
export const MEMBER_BOOKINGS_REDIRECT_KEY = "member_bookings_redirect";
export function shouldRedirectToPortal(o: { signedIn: boolean; activeMember: boolean; switchOn: boolean; search: string }): boolean {
  return o.signedIn && o.activeMember && o.switchOn && !o.search.replace(/^\?/, "");
}

/** The meeting form's title choices; a member's stored title ("W Bro.") is matched ignoring dots/spaces/case. */
export const MEETING_FORM_TITLES = ["Bro", "W. Bro", "VW. Bro", "RW. Bro", "Mr", "Mrs"] as const;
const titleKey = (t: string) => t.toLowerCase().replace(/[.\s]/g, "");
export function matchFormTitle(stored: string | null | undefined): string {
  const k = titleKey(stored ?? "");
  return MEETING_FORM_TITLES.find((t) => titleKey(t) === k) ?? "";
}
