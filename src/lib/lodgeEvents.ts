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
  booking_deadline: string | null;
  published: boolean;
  sort_order: number;
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

/** Fetches the next upcoming published event, or the most recent if none upcoming. */
export async function fetchNextEvent(): Promise<EventBundle | null> {
  const nowIso = new Date().toISOString();
  let { data: events } = await supabase
    .from("lodge_events")
    .select("*")
    .eq("published", true)
    .gte("event_date", nowIso)
    .order("event_date", { ascending: true })
    .limit(1);

  if (!events || events.length === 0) {
    const fallback = await supabase
      .from("lodge_events")
      .select("*")
      .eq("published", true)
      .order("event_date", { ascending: false })
      .limit(1);
    events = fallback.data ?? [];
  }
  if (!events.length) return null;

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
