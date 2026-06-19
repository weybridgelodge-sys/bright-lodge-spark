import { supabase } from "@/integrations/supabase/client";

export type WorkingGroup = {
  id: string;
  slug: string;
  name: string;
  remit: string;
  founding_statement: string | null;
  lead_member_id: string | null;
  is_active: boolean;
};

export type WorkingGroupMember = {
  id: string;
  working_group_id: string;
  member_id: string;
  role: "lead" | "member";
  joined_on: string | null;
};

export type WorkingGroupActivity = {
  id: string;
  working_group_id: string;
  activity_date: string;
  kind: "meeting" | "event" | "outcome";
  title: string;
  notes: string | null;
  logged_by: string | null;
  created_at: string;
};

export async function listGroups(): Promise<WorkingGroup[]> {
  const { data, error } = await supabase
    .from("working_groups")
    .select("*")
    .order("name");
  if (error) throw error;
  return (data ?? []) as WorkingGroup[];
}

export async function getGroupBySlug(slug: string): Promise<WorkingGroup | null> {
  const { data } = await supabase.from("working_groups").select("*").eq("slug", slug).maybeSingle();
  return (data as WorkingGroup) ?? null;
}

export async function listGroupMembers(groupId: string) {
  const { data } = await supabase
    .from("working_group_members")
    .select("id, working_group_id, member_id, role, joined_on, profiles:member_id(id, full_name, first_name, last_name, preferred_name)")
    .eq("working_group_id", groupId);
  return (data ?? []) as Array<WorkingGroupMember & {
    profiles: { id: string; full_name: string | null; first_name: string | null; last_name: string | null; preferred_name: string | null } | null;
  }>;
}

export async function listActivities(groupId: string): Promise<WorkingGroupActivity[]> {
  const { data, error } = await supabase
    .from("working_group_activities")
    .select("*")
    .eq("working_group_id", groupId)
    .order("activity_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as WorkingGroupActivity[];
}

export async function listAllActivitiesInYear(start: string, end: string) {
  const { data } = await supabase
    .from("working_group_activities")
    .select("id, working_group_id, activity_date, kind, title, notes, working_groups:working_group_id(name, slug)")
    .gte("activity_date", start)
    .lte("activity_date", end)
    .order("activity_date", { ascending: true });
  return (data ?? []) as Array<{
    id: string; working_group_id: string; activity_date: string; kind: string; title: string; notes: string | null;
    working_groups: { name: string; slug: string } | null;
  }>;
}

export async function upsertGroup(input: Partial<WorkingGroup> & { name: string; slug: string; remit: string }) {
  const { data, error } = await supabase
    .from("working_groups")
    .upsert(input, { onConflict: "slug" })
    .select()
    .single();
  if (error) throw error;
  return data as WorkingGroup;
}

export async function setGroupMembers(groupId: string, memberIds: string[], leadId: string | null) {
  await supabase.from("working_group_members").delete().eq("working_group_id", groupId);
  const rows = memberIds.map((id) => ({
    working_group_id: groupId,
    member_id: id,
    role: id === leadId ? "lead" : "member",
  }));
  if (rows.length > 0) {
    const { error } = await supabase.from("working_group_members").insert(rows);
    if (error) throw error;
  }
  if (leadId !== undefined) {
    await supabase.from("working_groups").update({ lead_member_id: leadId }).eq("id", groupId);
  }
}

export async function addActivity(input: {
  working_group_id: string;
  activity_date: string;
  kind: "meeting" | "event" | "outcome";
  title: string;
  notes?: string | null;
  logged_by?: string | null;
}) {
  const { error } = await supabase.from("working_group_activities").insert(input);
  if (error) throw error;
}

export async function listMyGroups(memberId: string) {
  const { data } = await supabase
    .from("working_group_members")
    .select("role, working_groups:working_group_id(id, slug, name, remit)")
    .eq("member_id", memberId);
  return (data ?? []).map((r: any) => ({ role: r.role as "lead" | "member", group: r.working_groups }));
}
