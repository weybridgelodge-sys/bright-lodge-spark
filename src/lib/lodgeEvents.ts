import { supabase } from "@/integrations/supabase/client";

export type LodgeEvent = {
  id: string;
  slug: string;
  title: string;
  intro: string;
  intro_heading: string | null;
  event_date: string;
  tyling_time: string;
  dining_time: string;
  location: string;
  dress_code: string;
  event_label?: string | null;
  booking_deadline: string | null;
  header_image_url: string | null;
  published: boolean;
  sort_order: number;
  archived_at?: string | null;
  archived_by?: string | null;
};

export type EventCourse = {
  id: string;
  event_id: string;
  course_label: string;
  dish: string;
  description: string;
  position: number;
};

export type DiningOption = {
  id: string;
  event_id: string;
  label: string;
  price_pence: number;
  position: number;
  is_default: boolean;
};

export type EventBundle = {
  event: LodgeEvent;
  courses: EventCourse[];
  diningOptions: DiningOption[];
};

/** Public-safe slice of the Meetings Register: date + proposed ceremony only. */
export type RegisterMeeting = {
  meeting_date: string;
  ceremony: string | null;
};

/**
 * Next upcoming meeting from the Meetings Register (festive_board_meetings),
 * via a security-definer RPC that exposes only the date and a sanitised
 * ceremony label — never internal notes, pricing, headcount or draft status.
 */
export async function fetchNextRegisterMeeting(): Promise<RegisterMeeting | null> {
  const { data, error } = await (supabase.rpc as any)("get_next_public_meeting");
  if (error) return null;
  const row = Array.isArray(data) ? data[0] : null;
  if (!row?.meeting_date) return null;
  return { meeting_date: row.meeting_date, ceremony: row.ceremony ?? null };
}

/**
 * All future-dated meetings from the Meetings Register (any status except
 * completed, so drafts are included) — date + sanitised ceremony label only.
 */
export async function fetchUpcomingRegisterMeetings(): Promise<RegisterMeeting[]> {
  const { data, error } = await (supabase.rpc as any)("get_upcoming_public_meetings");
  if (error || !Array.isArray(data)) return [];
  return (data as any[])
    .filter((r) => r?.meeting_date)
    .map((r) => ({ meeting_date: r.meeting_date as string, ceremony: (r.ceremony ?? null) as string | null }));
}

/**
 * Fetches the next published event dated today or later.
 * Returns null when the only published events are in the past — a passed
 * meeting must never be presented as bookable.
 */
export async function fetchNextEvent(): Promise<EventBundle | null> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const { data: events } = await supabase
    .from("lodge_events")
    .select("*")
    .eq("published", true)
    .is("archived_at", null)
    .gte("event_date", startOfToday.toISOString())
    .order("event_date", { ascending: true })
    .limit(1);

  if (!events || events.length === 0) return null;

  const event = events[0] as LodgeEvent;
  const [coursesRes, optsRes] = await Promise.all([
    supabase.from("lodge_event_courses").select("*").eq("event_id", event.id).order("position"),
    supabase.from("lodge_event_dining_options").select("*").eq("event_id", event.id).order("position"),
  ]);
  return {
    event,
    courses: (coursesRes.data as EventCourse[]) ?? [],
    diningOptions: (optsRes.data as DiningOption[]) ?? [],
  };
}

export async function fetchAllEvents(): Promise<LodgeEvent[]> {
  const { data } = await supabase
    .from("lodge_events")
    .select("*")
    .order("event_date", { ascending: false });
  return (data as LodgeEvent[]) ?? [];
}

export async function fetchEventBundle(id: string): Promise<EventBundle | null> {
  const { data: event } = await supabase.from("lodge_events").select("*").eq("id", id).maybeSingle();
  if (!event) return null;
  const [coursesRes, optsRes] = await Promise.all([
    supabase.from("lodge_event_courses").select("*").eq("event_id", id).order("position"),
    supabase.from("lodge_event_dining_options").select("*").eq("event_id", id).order("position"),
  ]);
  return {
    event: event as LodgeEvent,
    courses: (coursesRes.data as EventCourse[]) ?? [],
    diningOptions: (optsRes.data as DiningOption[]) ?? [],
  };
}

/** The public heading is the event Title, always. intro_heading is retired and ignored. */
export const publicEventHeading = (e: Pick<LodgeEvent, "title">) => (e.title ?? "").trim();

/** Fields written on save. Every field here is visible in the editor; intro_heading is always cleared. */
export function lodgeEventSavePayload(event: LodgeEvent, slug: string) {
  return {
    slug,
    title: event.title,
    intro: event.intro,
    intro_heading: null,
    event_date: event.event_date,
    tyling_time: event.tyling_time,
    dining_time: event.dining_time,
    location: event.location,
    dress_code: event.dress_code,
    event_label: (event.event_label || "").trim() || "Festive Board",
    booking_deadline: event.booking_deadline || null,
    header_image_url: event.header_image_url || null,
    published: event.published,
  };
}
