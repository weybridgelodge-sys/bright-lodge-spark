// signature-revoke — deactivate a member's signature and delete the file. Issued documents are not changed.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { json, signatureContext, unitOf } from "../_shared/signatureAuth.ts";
import { SIGNATURE_BUCKET, canManageSignature, checkConsent } from "../_shared/signatures.ts";

const Body = z.object({
  member_id: z.string().uuid(),
  consent_note: z.string().max(500).optional().nullable(),
  consent_date: z.string().max(10).optional().nullable(),
  consent_confirmed: z.boolean().optional().nullable(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const ctx = await signatureContext(req);
    if (ctx instanceof Response) return ctx;
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "Invalid request" }, 400);
    const b = parsed.data;
    const targetUnit = await unitOf(ctx.admin, b.member_id);
    if (!targetUnit) return json({ error: "Member not found." }, 404);
    const perm = canManageSignature(ctx.userId, b.member_id, ctx.roles, ctx.unitId === targetUnit);
    if (!perm.allowed) return json({ error: "You can't change this member's signature." }, 403);
    if (perm.onBehalf) {
      const err = checkConsent({ note: b.consent_note, date: b.consent_date, confirmed: b.consent_confirmed }, new Date().toISOString().slice(0, 10));
      if (err) return json({ error: err }, 400);
    }
    const { data: row } = await ctx.admin.from("member_signatures").select("id,storage_path").eq("member_id", b.member_id).eq("active", true).maybeSingle();
    if (!row) return json({ ok: true, removed: false });
    await ctx.admin.from("member_signatures").update({ active: false, revoked_at: new Date().toISOString(), revoked_by: ctx.userId }).eq("id", row.id);
    const rm = await ctx.admin.storage.from(SIGNATURE_BUCKET).remove([row.storage_path]);
    if (rm.error) console.error("signature file delete failed", { signature: row.id });
    await ctx.admin.from("signature_event_audit").insert({
      unit_id: targetUnit, member_id: b.member_id, signature_id: row.id, action: "revoke", actor_id: ctx.userId, on_behalf: perm.onBehalf,
      consent_note: perm.onBehalf ? b.consent_note!.trim() : null, consent_date: perm.onBehalf ? b.consent_date : null,
    });
    console.log("signature revoked", { member: b.member_id, signature: row.id, onBehalf: perm.onBehalf });
    return json({ ok: true, removed: true });
  } catch (_e) {
    console.error("signature-revoke unexpected error");
    return json({ error: "Unexpected error" }, 500);
  }
});
