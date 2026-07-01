import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type LodgeVisit = {
  id: string;
  host_lodge_name: string;
  host_lodge_number: string | null;
  starts_at: string;
  ends_at: string | null;
  venue: string;
  cost: string;
  payment_details: string;
  host_secretary_email: string;
  host_secretary_name: string | null;
  summons_storage_path: string;
  summons_filename: string | null;
  notes: string | null;
  notify_scope: "group" | "all_members";
  notified_member_count: number;
  notified_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export async function listVisits(): Promise<LodgeVisit[]> {
  const { data, error } = await sb
    .from("lodge_visits")
    .select("*")
    .order("starts_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LodgeVisit[];
}

export async function createVisit(input: Omit<LodgeVisit, "id" | "notified_member_count" | "notified_at" | "created_by" | "created_at" | "updated_at">) {
  const { data, error } = await sb
    .from("lodge_visits")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data as LodgeVisit;
}

export async function markVisitNotified(id: string, count: number) {
  const { error } = await sb
    .from("lodge_visits")
    .update({ notified_at: new Date().toISOString(), notified_member_count: count })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteVisit(id: string) {
  const { error } = await sb.from("lodge_visits").delete().eq("id", id);
  if (error) throw error;
}

export async function signedSummonsUrl(path: string, ttl = 60 * 60): Promise<string | null> {
  const { data, error } = await supabase.storage.from("lodge-visits").createSignedUrl(path, ttl);
  if (error) return null;
  return data.signedUrl;
}

export type LodgeDirectoryRow = {
  lodge_name: string;
  lodge_number: string | null;
  venue: string;
  secretary_email: string;
  last_visited: string;
  summons_paths: { path: string; filename: string | null; visit_date: string }[];
};

export function buildDirectory(visits: LodgeVisit[]): LodgeDirectoryRow[] {
  const grouped = new Map<string, LodgeVisit[]>();
  for (const v of visits) {
    const key = v.host_lodge_name.trim().toLowerCase();
    const arr = grouped.get(key) ?? [];
    arr.push(v);
    grouped.set(key, arr);
  }
  const rows: LodgeDirectoryRow[] = [];
  for (const [, arr] of grouped) {
    const sorted = [...arr].sort((a, b) => (a.starts_at < b.starts_at ? 1 : -1));
    const latest = sorted[0];
    rows.push({
      lodge_name: latest.host_lodge_name,
      lodge_number: latest.host_lodge_number,
      venue: latest.venue,
      secretary_email: latest.host_secretary_email,
      last_visited: latest.starts_at,
      summons_paths: sorted.map((v) => ({
        path: v.summons_storage_path,
        filename: v.summons_filename,
        visit_date: v.starts_at,
      })),
    });
  }
  return rows.sort((a, b) => a.lodge_name.localeCompare(b.lodge_name));
}
