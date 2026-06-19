import { supabase } from "@/integrations/supabase/client";

export type EngagementCategory =
  | "social" | "blog" | "charity" | "working_group"
  | "mentor_contact" | "visit" | "provincial" | "other";

export const ENGAGEMENT_CATEGORY_LABEL: Record<EngagementCategory, string> = {
  social: "Social event",
  blog: "Blog contribution",
  charity: "Charitable activity",
  working_group: "Working group",
  mentor_contact: "Mentor conversation",
  visit: "Lodge visit",
  provincial: "Provincial event",
  other: "Other",
};

export type EngagementEntry = {
  id: string;
  member_id: string;
  occurred_on: string;
  category: EngagementCategory;
  summary: string;
  logged_by: string | null;
  created_at: string;
};

export async function loadEngagement(memberId: string): Promise<EngagementEntry[]> {
  const { data } = await supabase
    .from("member_engagement_log")
    .select("*")
    .eq("member_id", memberId)
    .order("occurred_on", { ascending: false });
  return (data ?? []) as EngagementEntry[];
}

export async function addEngagement(input: {
  member_id: string;
  occurred_on: string;
  category: EngagementCategory;
  summary: string;
  logged_by?: string | null;
}) {
  const { error } = await supabase.from("member_engagement_log").insert(input);
  if (error) throw error;
}

export async function deleteEngagement(id: string) {
  await supabase.from("member_engagement_log").delete().eq("id", id);
}

export async function lastTouchpoint(memberId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("last_engagement_date", { _member: memberId });
  if (error) return null;
  const d = data as string | null;
  if (!d || d === "1970-01-01") return null;
  return d;
}

export function daysSince(date: string | null): number | null {
  if (!date) return null;
  const ms = Date.now() - new Date(date).getTime();
  return Math.floor(ms / 86_400_000);
}
