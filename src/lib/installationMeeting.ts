// One place for "when was this year's Installation meeting?" — used by the
// UGLE Installation Return and the Provincial Return.
// First choice: the meeting register (festive_board_meetings, any status except
// cancelled). Fallback: a published event with "installation" in its title.
// Dates stay as date-only strings; never parsed through new Date().
import { supabase } from "@/integrations/supabase/client";

export type InstallationMeeting = { date: string; title: string | null; source: "register" | "event" };
export type InstallationMeetingResult = { meeting: InstallationMeeting | null; issues: string[] };

const window = (year: number) => ({ from: `${year}-09-01`, to: `${year + 1}-09-01` });
const yy = (year: number) => `${year}/${String((year + 1) % 100).padStart(2, "0")}`;

export async function findInstallationMeeting(year: number, client: any = supabase): Promise<InstallationMeetingResult> {
  const { from, to } = window(year);
  const issues: string[] = [];

  // Rows are scoped to the signed-in member's lodge by row-level security, as the other return queries are.
  const reg = await client
    .from("festive_board_meetings")
    .select("meeting_date,lodge_event_id,cancelled_at,meeting_type")
    .eq("meeting_type", "installation")
    .is("cancelled_at", null)
    .gte("meeting_date", from)
    .lt("meeting_date", to)
    .order("meeting_date", { ascending: true });
  const rows = ((reg?.data ?? []) as { meeting_date: string; lodge_event_id: string | null }[]);
  if (rows.length) {
    if (rows.length > 1) issues.push(`${rows.length} Installation meetings found in the register for ${yy(year)}; using the earliest.`);
    const first = rows[0];
    let title: string | null = null;
    if (first.lodge_event_id) {
      const ev = await client.from("lodge_events").select("title").eq("id", first.lodge_event_id).maybeSingle();
      title = (ev?.data?.title as string | undefined)?.trim() || null;
    }
    return { meeting: { date: String(first.meeting_date).slice(0, 10), title, source: "register" }, issues };
  }

  const evRes = await client
    .from("lodge_events")
    .select("title,event_date")
    .ilike("title", "%installation%")
    .eq("published", true)
    .gte("event_date", from)
    .lt("event_date", to)
    .order("event_date", { ascending: true });
  const events = ((evRes?.data ?? []) as { title: string | null; event_date: string }[]);
  if (events.length) {
    if (events.length > 1) issues.push(`${events.length} published Installation meetings found in ${yy(year)}; using the earliest.`);
    return { meeting: { date: String(events[0].event_date).slice(0, 10), title: events[0].title?.trim() || null, source: "event" }, issues };
  }
  return { meeting: null, issues };
}

export const noInstallationMeetingIssue = (year: number) =>
  `No Installation meeting found in the register or events for ${year}`;
