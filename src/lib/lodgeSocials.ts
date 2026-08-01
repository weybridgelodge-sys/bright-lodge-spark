import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type LodgeSocial = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  venue: string;
  description: string | null;
  /** Count only — guest email addresses are organiser-only (see lodgeSocialGuestEmails). */
  guest_count: number;
  notified_member_count: number;
  notified_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

const COLS =
  "id,title,starts_at,ends_at,venue,description,guest_count,notified_member_count,notified_at,created_by,created_at,updated_at";

export async function listSocials(): Promise<LodgeSocial[]> {
  const { data, error } = await sb
    .from("lodge_socials")
    .select(COLS)
    .order("starts_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LodgeSocial[];
}

export async function createSocial(
  input: Omit<LodgeSocial, "id" | "guest_count" | "notified_member_count" | "notified_at" | "created_by" | "created_at" | "updated_at"> & {
    guest_emails: string[];
  },
) {
  const { data, error } = await sb
    .from("lodge_socials")
    .insert(input)
    .select(COLS)
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

/** Organiser-only: fetch the actual guest email addresses for one social. */
export async function lodgeSocialGuestEmails(id: string): Promise<string[]> {
  const { data, error } = await sb.rpc("lodge_social_guest_emails", { _social_id: id });
  if (error) throw error;
  return (data ?? []) as string[];
}
