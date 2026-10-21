// signature-preview — returns one member's active signature PNG bytes (no URL), no-store.
// Owner, or admin / Secretary / current WM in the same unit. Rate-limited. Logs IDs only.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { json, rateLimited, signatureContext, unitOf } from "../_shared/signatureAuth.ts";
import { SIGNATURE_BUCKET, canPreviewSignature } from "../_shared/signatures.ts";

const Body = z.object({ member_id: z.string().uuid() });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const ctx = await signatureContext(req);
    if (ctx instanceof Response) return ctx;
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "Invalid request" }, 400);
    const { member_id } = parsed.data;
    if (rateLimited(ctx.userId)) return json({ error: "Too many previews. Please wait a minute." }, 429);
    const targetUnit = await unitOf(ctx.admin, member_id);
    if (!targetUnit || !canPreviewSignature(ctx.userId, member_id, ctx.roles, ctx.unitId === targetUnit)) {
      return json({ error: "You can't view this signature." }, 403);
    }
    const { data: row } = await ctx.admin.from("member_signatures").select("storage_path").eq("member_id", member_id).eq("active", true).maybeSingle();
    if (!row) return json({ error: "No signature on file." }, 404);
    const { data: file, error } = await ctx.admin.storage.from(SIGNATURE_BUCKET).download(row.storage_path);
    if (error || !file) return json({ error: "No signature on file." }, 404);
    return new Response(await file.arrayBuffer(), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "image/png", "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" },
    });
  } catch (_e) {
    console.error("signature-preview unexpected error");
    return json({ error: "Unexpected error" }, 500);
  }
});
