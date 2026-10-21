// Shared by every emailed lodge return (Provincial, UGLE Installation):
//  - who is Cc'd (current Secretary + current WM, resolved at send time), and
//  - filing the sent PDF into the portal Documents area (category 'returns').
// Never logs addresses' owners' personal details beyond the Cc address itself.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { loadLodgeSettings } from "./lodgeSettings.ts";

import { pickReturnCc, returnDocumentPath, returnDocumentTitle, type CcUsed } from "./returnFilingRules.ts";
export * from "./returnFilingRules.ts";

/** Resolves today's Secretary and WM from officer records and returns the Cc list for a return email. */
export async function resolveReturnCc(admin: SupabaseClient, to: string): Promise<{ cc: string[]; used: CcUsed[] }> {
  const [s, w, settings] = await Promise.all([
    admin.rpc("current_officer_holder", { _position_key: "secretary" }),
    admin.rpc("current_officer_holder", { _position_key: "worshipful_master" }),
    loadLodgeSettings(),
  ]);
  const secId = (s.data as string | null) ?? null;
  const wmId = (w.data as string | null) ?? null;
  const ids = [secId, wmId].filter(Boolean) as string[];
  const { data: profs } = ids.length
    ? await admin.from("profiles").select("id,email").in("id", ids)
    : { data: [] as { id: string; email: string | null }[] };
  const emailOf = (id: string | null) => (profs ?? []).find((p) => p.id === id)?.email ?? null;
  return pickReturnCc(to, [
    // The lodge settings hold a Secretary role address; there is no WM role address field.
    { office: "secretary", memberId: secId, roleEmail: settings.secretaryEmail, memberEmail: emailOf(secId) },
    { office: "worshipful_master", memberId: wmId, roleEmail: null, memberEmail: emailOf(wmId) },
  ]);
}

/**
 * Copies the sent PDF into the Documents bucket and adds a 'returns' document row.
 * Re-filing the same file reuses the existing row. Never throws; returns the row id or null.
 */
export async function fileReturnDocument(admin: SupabaseClient, opts: {
  formKey: string; formLabel: string; lodgeYear: number; sourcePath: string; uploadedBy: string; description?: string;
}): Promise<string | null> {
  try {
    const dest = returnDocumentPath(opts.formKey, opts.lodgeYear, opts.sourcePath);
    const { data: existing } = await admin.from("lodge_documents").select("id").eq("file_path", dest).maybeSingle();
    if (existing?.id) return existing.id as string;
    const dl = await admin.storage.from("secretary-returns").download(opts.sourcePath);
    if (dl.error || !dl.data) { console.error("return filing: source missing", { form: opts.formKey, year: opts.lodgeYear }); return null; }
    const bytes = new Uint8Array(await dl.data.arrayBuffer());
    const up = await admin.storage.from("lodge-docs").upload(dest, bytes, { contentType: "application/pdf", upsert: true });
    if (up.error) { console.error("return filing: upload failed", { form: opts.formKey, year: opts.lodgeYear }); return null; }
    const { data: row, error } = await admin.from("lodge_documents").insert({
      title: returnDocumentTitle(opts.formLabel, opts.lodgeYear, new Date()),
      description: opts.description ?? null,
      category: "returns",
      file_path: dest,
      file_size_bytes: bytes.byteLength,
      uploaded_by: opts.uploadedBy,
      is_general: false,
      required_degree: null,
    }).select("id").single();
    if (error) { console.error("return filing: row insert failed", { form: opts.formKey, code: error.code }); return null; }
    return row.id as string;
  } catch (_e) {
    console.error("return filing: unexpected error", { form: opts.formKey });
    return null;
  }
}
