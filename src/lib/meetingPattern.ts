// Single source for the "Regular meetings" sentence: the saved Meeting Diary
// schedule, with the Summons template text used only as an explicit manual
// override. The override switch is per unit (unit_settings), never global.
import { supabase } from "@/integrations/supabase/client";
import { chooseMeetingPattern, meetingPatternSentence, WEEKDAYS, type ScheduleMonth } from "@/lib/meetingDiary";

export const MEETING_PATTERN_OVERRIDE_KEY = "meeting_pattern_manual_override";

/** The signed-in member's unit, from their profile. Null when unknown. */
export async function currentProfileUnitId(): Promise<string | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) return null;
  const { data } = await supabase.from("profiles").select("unit_id").eq("id", u.user.id).maybeSingle();
  return ((data as { unit_id?: string | null } | null)?.unit_id) ?? null;
}

export async function loadMeetingPatternSources(): Promise<{ generated: string; manualOverride: boolean }> {
  const unitId = await currentProfileUnitId();
  const [ser, set] = await Promise.all([
    (supabase.from as any)("meeting_series").select("schedule,active,created_at").eq("active", true).order("created_at"),
    unitId
      ? (supabase.from as any)("unit_settings").select("value").eq("unit_id", unitId).eq("key", MEETING_PATTERN_OVERRIDE_KEY).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const saved = ((ser.data ?? []) as { schedule: unknown }[]).find((x) => Array.isArray(x.schedule) && x.schedule.length);
  return {
    generated: saved ? meetingPatternSentence(saved.schedule as ScheduleMonth[]) : "",
    manualOverride: (set.data as any)?.value === true,
  };
}

export async function meetingPatternFor(manualText: string | null | undefined): Promise<string> {
  try {
    const src = await loadMeetingPatternSources();
    return chooseMeetingPattern({ ...src, manualText }).text;
  } catch {
    return chooseMeetingPattern({ generated: "", manualText, manualOverride: true }).text;
  }
}

export async function saveMeetingPatternOverride(on: boolean) {
  const unitId = await currentProfileUnitId();
  if (!unitId) return { error: { message: "Your member record has no lodge set." } };
  return (supabase.from as any)("unit_settings").upsert(
    { unit_id: unitId, key: MEETING_PATTERN_OVERRIDE_KEY, value: on, updated_at: new Date().toISOString() },
    { onConflict: "unit_id,key" },
  );
}

export type PublicMeetingPattern = { items: string[]; meetingDay: string; perYear: number };

/**
 * Public Lodge Profile parts from get_meeting_pattern(): one line per scheduled
 * meeting, the weekday(s) and the count. Null when no schedule is saved, so the
 * page keeps its existing text.
 */
export function publicMeetingPattern(rpc: unknown): PublicMeetingPattern | null {
  const sched = ((rpc as { schedule?: unknown } | null)?.schedule ?? []) as ScheduleMonth[];
  if (!Array.isArray(sched) || !sched.length) return null;
  const items = [...sched].sort((a, b) => a.month - b.month)
    .map((m) => meetingPatternSentence([m]).replace(/\.$/, "")).filter(Boolean);
  if (!items.length) return null;
  const days = [...new Set([...sched].sort((a, b) => a.month - b.month).map((m) => WEEKDAYS[m.weekday]).filter(Boolean))];
  return { items, meetingDay: days.join(" / "), perYear: items.length };
}

export async function fetchPublicMeetingPattern(): Promise<PublicMeetingPattern | null> {
  const { data, error } = await (supabase.rpc as any)("get_meeting_pattern");
  if (error) return null;
  return publicMeetingPattern(data);
}
