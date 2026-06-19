import { supabase } from "@/integrations/supabase/client";
import {
  CHECKLIST_CATALOGUE,
  RITUAL_CATALOGUE,
  CHECKLIST_STAGES,
  RITUAL_GROUPS,
} from "./catalogues";

export type ChecklistItem = {
  id: string;
  member_id: string;
  stage: string;
  topic: string;
  order_index: number;
  target_date: string | null;
  completed_date: string | null;
  status: "not_started" | "in_progress" | "complete";
  mentor_notes: string | null;
  updated_at: string;
};

export type RitualRow = {
  id: string;
  member_id: string;
  ritual_group: string;
  piece: string;
  degree: string | null;
  order_index: number;
  date_first_learned: string | null;
  date_assessed: string | null;
  date_delivered_loi: string | null;
  date_delivered_lodge: string | null;
  notes: string | null;
};

export type ExternalAppointment = {
  id: string;
  member_id: string;
  office: string;
  masonic_year: string | null;
  date_appointed: string | null;
  date_installed: string | null;
  level: "lodge" | "province" | "ugle" | "other";
  notes: string | null;
};

export type DevelopmentRecord = {
  member_id: string;
  assigned_mentor_id: string | null;
  previous_masonic_experience: string | null;
  mentoring_exempt?: boolean;
  exemption_reason?: string | null;
  exemption_note?: string | null;
  last_checkin_date?: string | null;
};

const stageIndex = (s: string) => CHECKLIST_STAGES.indexOf(s as any);
const groupIndex = (g: string) => RITUAL_GROUPS.indexOf(g as any);

export async function ensureSeeded(memberId: string) {
  // Checklist seed
  const { data: existingChecklist } = await supabase
    .from("member_checklist_items")
    .select("stage,topic")
    .eq("member_id", memberId);
  const have = new Set((existingChecklist ?? []).map((r: any) => `${r.stage}::${r.topic}`));
  const checklistRows = CHECKLIST_CATALOGUE
    .filter((c) => !have.has(`${c.stage}::${c.topic}`))
    .map((c, i) => ({
      member_id: memberId,
      stage: c.stage,
      topic: c.topic,
      order_index: stageIndex(c.stage) * 100 + i,
      status: "not_started" as const,
    }));
  if (checklistRows.length > 0) {
    await supabase.from("member_checklist_items").insert(checklistRows);
  }
  // Ritual seed
  const { data: existingRitual } = await supabase
    .from("member_ritual_records")
    .select("ritual_group,piece")
    .eq("member_id", memberId);
  const haveR = new Set((existingRitual ?? []).map((r: any) => `${r.ritual_group}::${r.piece}`));
  const ritualRows = RITUAL_CATALOGUE
    .filter((r) => !haveR.has(`${r.ritual_group}::${r.piece}`))
    .map((r, i) => ({
      member_id: memberId,
      ritual_group: r.ritual_group,
      piece: r.piece,
      degree: r.degree,
      order_index: groupIndex(r.ritual_group) * 100 + i,
    }));
  if (ritualRows.length > 0) {
    await supabase.from("member_ritual_records").insert(ritualRows);
  }
  // Dev record
  await supabase
    .from("member_development_records")
    .upsert({ member_id: memberId }, { onConflict: "member_id", ignoreDuplicates: true });
}

export async function loadDevelopmentRecord(memberId: string) {
  const { data } = await supabase
    .from("member_development_records")
    .select("*")
    .eq("member_id", memberId)
    .maybeSingle();
  return (data as DevelopmentRecord | null) ?? null;
}

export async function loadChecklist(memberId: string): Promise<ChecklistItem[]> {
  const { data } = await supabase
    .from("member_checklist_items")
    .select("*")
    .eq("member_id", memberId)
    .order("order_index", { ascending: true });
  return (data as ChecklistItem[]) ?? [];
}

export async function loadRitualRows(memberId: string): Promise<RitualRow[]> {
  const { data } = await supabase
    .from("member_ritual_records")
    .select("*")
    .eq("member_id", memberId)
    .order("order_index", { ascending: true });
  return (data as RitualRow[]) ?? [];
}

export async function loadExternalAppointments(memberId: string): Promise<ExternalAppointment[]> {
  const { data } = await supabase
    .from("member_external_appointments")
    .select("*")
    .eq("member_id", memberId)
    .order("date_appointed", { ascending: false, nullsFirst: false });
  return (data as ExternalAppointment[]) ?? [];
}

export async function loadLodgeAppointmentsForMember(memberId: string) {
  const { data } = await supabase
    .from("officer_appointments")
    .select("id, lodge_year, appointed_on, position_key, officer_positions(label, order_index)")
    .eq("member_id", memberId)
    .order("lodge_year", { ascending: false });
  return (data ?? []) as Array<{
    id: string;
    lodge_year: number;
    appointed_on: string | null;
    position_key: string;
    officer_positions: { label: string; order_index: number } | null;
  }>;
}
