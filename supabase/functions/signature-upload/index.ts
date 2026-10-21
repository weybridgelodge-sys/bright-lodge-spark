// signature-upload — store a member's processed signature (PNG) in the private bucket.
// Self, or admin / Secretary / current WM on behalf with consent. Logs IDs only.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { json, signatureContext, unitOf } from "../_shared/signatureAuth.ts";
import { SIGNATURE_BUCKET, base64ToBytes, canManageSignature, checkConsent, checkSignatureImage, signaturePath } from "../_shared/signatures.ts";

const Body = z.object({
  member_id: z.string().uuid(),
  image_base64: z.string().min(1).max(300_000),
  method: z.enum(["upload", "drawn"]),
  consent_note: z.string().max(500).optional().nullable(),
  consent_date: z.string().max(10).optional().nullable(),
  consent_confirmed: z.boolean().optional().nullable(),
  website: z.string().max(0).optional(), // honeypot
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
    const today = new Date().toISOString().slice(0, 10);
    if (perm.onBehalf) {
      const err = checkConsent({ note: b.consent_note, date: b.consent_date, confirmed: b.consent_confirmed }, today);
      if (err) return json({ error: err }, 400);
    }

    let bytes: Uint8Array;
    try { bytes = base64ToBytes(b.image_base64); } catch { return json({ error: "The image could not be read." }, 400); }
    const check = checkSignatureImage(bytes);
    if (!check.ok) return json({ error: check.error }, 400);

    const { data: prev } = await ctx.admin.from("member_signatures").select("id,storage_path").eq("member_id", b.member_id).eq("active", true).maybeSingle();
    const id = crypto.randomUUID();
    const path = signaturePath(targetUnit, b.member_id, id);
    const up = await ctx.admin.storage.from(SIGNATURE_BUCKET).upload(path, bytes, { contentType: "image/png", upsert: false });
    if (up.error) { console.error("signature upload failed", { member: b.member_id }); return json({ error: "The signature could not be saved." }, 500); }

    if (prev) {
      await ctx.admin.from("member_signatures").update({ active: false, revoked_at: new Date().toISOString(), revoked_by: ctx.userId }).eq("id", prev.id);
      await ctx.admin.storage.from(SIGNATURE_BUCKET).remove([prev.storage_path]);
    }
    const { error: insErr } = await ctx.admin.from("member_signatures").insert({
      id, unit_id: targetUnit, member_id: b.member_id, storage_path: path, content_type: "image/png",
      width: check.width, height: check.height, byte_size: bytes.length,
      source: perm.onBehalf ? "on_behalf" : b.method === "drawn" ? "self_drawn" : "self_upload",
      consent_note: perm.onBehalf ? b.consent_note!.trim() : null,
      consent_date: perm.onBehalf ? b.consent_date : null,
      consent_recorded_by: perm.onBehalf ? ctx.userId : null,
      created_by: ctx.userId,
    });
    if (insErr) {
      await ctx.admin.storage.from(SIGNATURE_BUCKET).remove([path]);
      console.error("signature row failed", { member: b.member_id, code: insErr.code });
      return json({ error: "The signature could not be saved." }, 500);
    }
    await ctx.admin.from("signature_event_audit").insert({
      unit_id: targetUnit, member_id: b.member_id, signature_id: id, action: prev ? "replace" : "capture",
      actor_id: ctx.userId, on_behalf: perm.onBehalf,
      consent_note: perm.onBehalf ? b.consent_note!.trim() : null, consent_date: perm.onBehalf ? b.consent_date : null,
    });
    console.log("signature saved", { member: b.member_id, signature: id, onBehalf: perm.onBehalf });
    return json({ ok: true, signature: { id, width: check.width, height: check.height } });
  } catch (_e) {
    console.error("signature-upload unexpected error");
    return json({ error: "Unexpected error" }, 500);
  }
});
