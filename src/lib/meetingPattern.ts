// Single source for the "Regular meetings" sentence: the saved Meeting Diary
// schedule, with the Summons template text used only as an explicit manual override.
import { supabase } from "@/integrations/supabase/client";
import { chooseMeetingPattern, meetingPatternSentence, type ScheduleMonth } from "@/lib/meetingDiary";

export const MEETING_PATTERN_OVERRIDE_KEY = "meeting_pattern_manual_override";

export async function loadMeetingPatternSources(): Promise<{ generated: string; manualOverride: boolean }> {
  const [ser, set] = await Promise.all([
    (supabase.from as any)("meeting_series").select("schedule,active,created_at").eq("active", true).order("created_at"),
    supabase.from("module_settings").select("value").eq("key", MEETING_PATTERN_OVERRIDE_KEY).maybeSingle(),
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
  return supabase.from("module_settings").upsert({ key: MEETING_PATTERN_OVERRIDE_KEY, value: on } as any, { onConflict: "key" });
}
