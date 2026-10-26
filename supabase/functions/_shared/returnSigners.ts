// Shared signer + stored-signature loader for every signed return (Provincial, UGLE Installation).
// Resolves the WM and Secretary with current_officer_holder() at the signing date and loads each one's
// single active signature from the private bucket. Images stay on the server; logs IDs only.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { SIGNATURE_BUCKET, resolvePlacements, type Placement } from "./signatures.ts";

export type SigImage = { png: Uint8Array; width: number; height: number };
export type ReturnSigners = {
  holders: { worshipful_master: string | null; secretary: string | null };
  placements: Placement[];
  /** Placements whose image actually loaded — the ones to audit. */
  usable: Placement[];
  sigs: { sec: SigImage | null; wm: SigImage | null };
};

/** Holders in the caller's own lodge (unitId passed explicitly); blank lodge = no holders, never a guess. */
export async function resolveReturnHolders(admin: SupabaseClient, atIso: string, unitId: string | null | undefined) {
  const unit = typeof unitId === "string" ? unitId.trim() : "";
  if (!unit) return { worshipful_master: null, secretary: null };
  const [w, s] = await Promise.all([
    admin.rpc("current_officer_holder", { _position_key: "worshipful_master", _at: atIso, _unit: unit }),
    admin.rpc("current_officer_holder", { _position_key: "secretary", _at: atIso, _unit: unit }),
  ]);
  return { worshipful_master: (w.data as string | null) ?? null, secretary: (s.data as string | null) ?? null };
}

export async function loadReturnSigners(admin: SupabaseClient, holders: ReturnSigners["holders"]): Promise<ReturnSigners> {
  const ids = [...new Set([holders.secretary, holders.worshipful_master].filter(Boolean))] as string[];
  const { data: sigRows } = ids.length
    ? await admin.from("member_signatures").select("id,member_id,storage_path,width,height").in("member_id", ids).eq("active", true)
    : { data: [] as { id: string; member_id: string; storage_path: string; width: number; height: number }[] };
  const byMember = Object.fromEntries((sigRows ?? []).map((r: any) => [r.member_id, r]));
  const placements = resolvePlacements(holders, byMember);
  const images: Record<string, SigImage> = {};
  for (const p of placements) {
    if (images[p.signature_id]) continue;
    const r = byMember[p.member_id];
    const dl = await admin.storage.from(SIGNATURE_BUCKET).download(r.storage_path);
    if (dl.error || !dl.data) { console.error("signature file missing", { signature: r.id }); continue; }
    images[p.signature_id] = { png: new Uint8Array(await dl.data.arrayBuffer()), width: r.width, height: r.height };
  }
  const pick = (office: string) => { const p = placements.find((x) => x.office_key === office); return p ? images[p.signature_id] ?? null : null; };
  return { holders, placements, usable: placements.filter((p) => images[p.signature_id]), sigs: { sec: pick("secretary"), wm: pick("worshipful_master") } };
}
