// TEMPORARY: regenerate summons #385 PDF with current template/officer logic.
import { createClient } from "@supabase/supabase-js";
import { generateSummonsBlob, type OfficerRollRow, type LodgeTemplate } from "../src/lib/summonsPdf";
import {
  formatMemberLine,
  formatMemberLineFormal,
  normaliseTemplateAssets,
  type MemberRow,
} from "../src/lib/summons";
import { POSITION_LABELS, NON_PROGRESSIVE_LABELS } from "../src/lib/officersProgression";
import { writeFileSync } from "fs";

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const sb = createClient(url, key, { auth: { persistSession: false } });

// Node/Bun lacks FileReader, which fetchImageAsDataUrl uses.
(globalThis as any).FileReader = class {
  result: string | null = null;
  onloadend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  async readAsDataURL(blob: Blob) {
    const buf = Buffer.from(await blob.arrayBuffer());
    this.result = `data:${blob.type};base64,${buf.toString("base64")}`;
    this.onloadend?.();
  }
};

const LODGE_YEAR = 2025;

const allKeys = [
  "worshipful_master","senior_warden","junior_warden",
  "immediate_past_master","chaplain","treasurer","secretary","assistant_secretary",
  "director_of_ceremonies","assistant_director_of_ceremonies",
  "senior_deacon","junior_deacon","inner_guard",
  "almoner","charity_steward","mentor","membership_officer",
  "senior_steward","steward_1","steward_2","steward_3","steward_4","steward_5",
  "tyler","assistant_tyler",
];

const PROFILE_COLS =
  "id,title,first_name,middle_name,last_name,full_name,preferred_name,post_nominals,rank,grand_rank,provincial_rank,initiation_date,joined_lodge_date,joined_year,is_past_master,is_royal_arch,is_honorary_member,status,email";

async function main() {
  const [{ data: tplRow }, { data: members }, { data: appts }, { data: sumRows }] = await Promise.all([
    sb.from("lodge_template").select("*").eq("id", "default").maybeSingle(),
    sb.from("profiles").select(PROFILE_COLS).eq("status", "active"),
    sb.from("officer_appointments").select("position_key,member_id").eq("lodge_year", LODGE_YEAR),
    sb.from("summonses").select("*").eq("meeting_number", 385).order("created_at", { ascending: false }).limit(1),
  ]);

  const summonsRow: any = sumRows?.[0];
  if (!summonsRow) throw new Error("summons 385 not found");
  console.log("summons id", summonsRow.id, "path", summonsRow.pdf_storage_path, "status", summonsRow.status);

  const ids = Array.from(new Set((appts ?? []).map((a: any) => a.member_id).filter(Boolean)));
  const { data: officerProfiles } = await sb.from("profiles").select(PROFILE_COLS).in("id", ids);
  const byId = new Map((officerProfiles ?? []).map((p: any) => [p.id, p]));

  const labelFor = (k: string) =>
    (POSITION_LABELS as any)[k] || (NON_PROGRESSIVE_LABELS as any)[k] || k;

  const officers: OfficerRollRow[] = allKeys.map((k) => {
    const a = (appts ?? []).find((x: any) => x.position_key === k);
    const p = a?.member_id ? byId.get(a.member_id) : null;
    return {
      label: labelFor(k),
      member: p ? formatMemberLine(p as MemberRow) : "",
      member_formal: p ? formatMemberLineFormal(p as MemberRow) : "",
      post_nominals: p?.post_nominals ?? null,
      grand_rank: p?.grand_rank ?? null,
      provincial_rank: p?.provincial_rank ?? null,
      rank: p?.rank ?? null,
      email: p?.email ?? null,
      phone: null,
    };
  });
  console.log("officers:", officers.map((o) => `${o.label}=${o.member || "(vacant)"}`).join("\n"));

  const template = normaliseTemplateAssets({
    ...(tplRow as any),
    lodge_representatives: (tplRow as any)?.lodge_representatives ?? [],
  }) as LodgeTemplate;

  const summons = {
    meeting_number: summonsRow.meeting_number,
    meeting_date: summonsRow.meeting_date,
    meeting_time: summonsRow.meeting_time,
    meeting_type: summonsRow.meeting_type,
    dress_code: summonsRow.dress_code,
    minutes_confirmation_date: summonsRow.minutes_confirmation_date,
    next_meeting_date: summonsRow.next_meeting_date,
    officer_night_date: summonsRow.officer_night_date,
    officer_night_venue: summonsRow.officer_night_venue ?? null,
    agenda: summonsRow.agenda ?? [],
    candidates: summonsRow.candidates ?? [],
    dining_enquiry_name: summonsRow.dining_enquiry_name,
    dining_enquiry_email: summonsRow.dining_enquiry_email ?? null,
    dining_menu: summonsRow.dining_menu ?? null,
    dining_price: summonsRow.dining_price ?? null,
    dining_deadline: summonsRow.dining_deadline ?? null,
  };

  const blob = await generateSummonsBlob({
    template,
    officers,
    members: (members ?? []) as any,
    summons: summons as any,
    manualHidden: ((summonsRow.notice_overrides as any)?.manualHidden ?? []) as any,
  });
  const buf = Buffer.from(await blob.arrayBuffer());
  writeFileSync("/tmp/regen385/summons-385.pdf", buf);
  console.log("wrote", buf.length, "bytes");

  if (process.env.UPLOAD === "1") {
    const path = summonsRow.pdf_storage_path;
    const up = await sb.storage.from("lodge-docs").upload(path, buf, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (up.error) throw up.error;
    console.log("uploaded to", path);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
