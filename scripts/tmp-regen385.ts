import { createClient } from "@supabase/supabase-js";
import { generateSummonsBlob } from "@/lib/summonsPdf";
import { normaliseTemplateAssets, sortMembersBySeniority, formatMemberLine, formatMemberLineFormal, POSITION_LABELS, NON_PROGRESSIVE_LABELS } from "@/lib/summons";
import { writeFileSync } from "node:fs";

// FileReader polyfill for Bun/Node
// @ts-ignore
if (typeof FileReader === "undefined") {
  // @ts-ignore
  globalThis.FileReader = class {
    result: any = null;
    onload: any = null;
    onerror: any = null;
    readAsDataURL(blob: Blob) {
      blob.arrayBuffer().then((buf) => {
        const b64 = Buffer.from(buf).toString("base64");
        this.result = `data:${blob.type || "image/png"};base64,${b64}`;
        this.onload?.({ target: this });
      }).catch((e) => this.onerror?.(e));
    }
  };
}

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const { data: sRow } = await sb.from("summonses").select("*").eq("meeting_number", 385).single();
const { data: tplRow } = await sb.from("lodge_template").select("*").eq("id", "default").single();
const { data: mem } = await sb.from("profiles")
  .select("id,title,first_name,middle_name,last_name,full_name,preferred_name,post_nominals,rank,grand_rank,provincial_rank,initiation_date,joined_lodge_date,joined_year,is_past_master,is_royal_arch,is_honorary_member,status")
  .eq("status", "active");

const lodgeYear = 2025;
const { data: appts } = await sb.from("officer_appointments").select("position_key,member_id").eq("lodge_year", lodgeYear);
const ids = Array.from(new Set((appts ?? []).map((a: any) => a.member_id).filter(Boolean)));
const { data: profs } = await sb.from("profiles").select("*").in("id", ids);
const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
const allKeys = ["worshipful_master","senior_warden","junior_warden","immediate_past_master","chaplain","treasurer","secretary","assistant_secretary","director_of_ceremonies","assistant_director_of_ceremonies","senior_deacon","junior_deacon","inner_guard","almoner","charity_steward","mentor","membership_officer","senior_steward","steward_1","steward_2","steward_3","steward_4","steward_5","tyler","assistant_tyler"];
const labelFor = (k: string) => (POSITION_LABELS as any)[k] || (NON_PROGRESSIVE_LABELS as any)[k] || k;
const officers = allKeys.map((k) => {
  const a = (appts ?? []).find((x: any) => x.position_key === k);
  const p = a?.member_id ? byId.get(a.member_id) : null;
  return {
    label: labelFor(k),
    member: p ? formatMemberLine(p as any) : "",
    member_formal: p ? formatMemberLineFormal(p as any) : "",
    post_nominals: p?.post_nominals ?? null,
    grand_rank: p?.grand_rank ?? null,
    provincial_rank: p?.provincial_rank ?? null,
    rank: p?.rank ?? null,
    email: p?.email ?? null,
    phone: p?.phone ?? null,
  };
});

const template = normaliseTemplateAssets({ ...(tplRow as any), lodge_representatives: (tplRow as any).lodge_representatives ?? [] } as any);
const summons: any = { ...sRow, dining_enquiry_email: (sRow as any).dining_enquiry_email ?? "" };
const members = sortMembersBySeniority((mem ?? []) as any);

const blob = await generateSummonsBlob({
  template: template as any,
  officers: officers as any,
  members: members as any,
  summons,
  manualHidden: ((sRow as any).notice_overrides?.manualHidden ?? []) as any,
});
const buf = Buffer.from(await blob.arrayBuffer());
writeFileSync("/tmp/browser/385.pdf", buf);
console.log("size", buf.length);

const path = (sRow as any).pdf_storage_path;
const up = await sb.storage.from("lodge-docs").upload(path, buf, { contentType: "application/pdf", upsert: true });
console.log("upload", path, up.error?.message ?? "ok");
