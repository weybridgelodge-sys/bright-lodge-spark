import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type LodgeSocial = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  venue: string;
  description: string | null;
  guest_emails: string[];
  notified_member_count: number;
  notified_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export async function listSocials(): Promise<LodgeSocial[]> {
  const { data, error } = await sb
    .from("lodge_socials")
    .select("*")
    .order("starts_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LodgeSocial[];
}

export async function createSocial(input: Omit<LodgeSocial, "id" | "notified_member_count" | "notified_at" | "created_by" | "created_at" | "updated_at">) {
  const { data, error } = await sb
    .from("lodge_socials")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data as LodgeSocial;
}

export async function markSocialNotified(id: string, count: number) {
  const { error } = await sb
    .from("lodge_socials")
    .update({ notified_at: new Date().toISOString(), notified_member_count: count })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteSocial(id: string) {
  const { error } = await sb.from("lodge_socials").delete().eq("id", id);
  if (error) throw error;
}
