// sign-installation-return — adds the stored WM and Secretary signatures (and signed dates) to the
// UGLE Installation Return the browser just filled and stored. Only used when officer_signatures is on.
// Same signer source, switch and permission rules as generate-provincial-return (shared helpers);
// never creates or uploads a signature. Signature images never leave the server. Logs IDs only.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { json, signatureContext } from "../_shared/signatureAuth.ts";
import { validInstallDate } from "../_shared/signatures.ts";
import { loadReturnSigners, resolveReturnHolders } from "../_shared/returnSigners.ts";
import { stampUgleSignatures, ugleSignedDate } from "../_shared/ugleReturnSignatures.ts";

const BUCKET = "secretary-returns";
const LINK_SECONDS = 600;
const Body = z.object({
  lodge_year: z.number().int().min(2000).max(2100),
  unsigned_path: z.string().regex(/^installation-returns\/\d{4}\/[\w.-]+-unsigned\.pdf$/),
  installation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  prescribed_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  wm_member_id: z.string().uuid().nullable(),
  secretary_member_id: z.string().uuid().nullable(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const ctx = await signatureContext(req);
    if (ctx instanceof Response) return ctx;
    const { admin, userId, roles } = ctx;
    const [sec, asst, wmRole] = await Promise.all([
      admin.rpc("has_role", { _user_id: userId, _role: "secretary" }),
      admin.rpc("has_role", { _user_id: userId, _role: "assistant_secretary" }),
      admin.rpc("has_role", { _user_id: userId, _role: "worshipful_master" }),
    ]);
    if (!(roles.isAdmin || roles.isSecretary || roles.isCurrentWm || sec.data || asst.data || wmRole.data)) {
      return json({ error: "You can't generate the Installation Return." }, 403);
    }
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "Invalid request" }, 400);
    const b = parsed.data;
    if (!b.unsigned_path.startsWith(`installation-returns/${b.lodge_year}/`)) return json({ error: "Year mismatch." }, 400);
    const signed = ugleSignedDate(b.installation_date, b.prescribed_date);
    if (!validInstallDate(b.lodge_year, signed.iso)) return json({ error: "Installation date is outside that year." }, 400);

    const holders = await resolveReturnHolders(admin, signed.iso, ctx.unitId);
    if (b.wm_member_id !== holders.worshipful_master || b.secretary_member_id !== holders.secretary) {
      return json({ error: "The WM or Secretary on the page no longer matches the officer records. Please refresh and try again." }, 409);
    }
    const { sigs, usable } = await loadReturnSigners(admin, holders);

    const out = admin.storage.from(BUCKET);
    const dl = await out.download(b.unsigned_path);
    if (dl.error || !dl.data) return json({ error: "The filled return could not be found." }, 400);
    const stamped = await stampUgleSignatures(new Uint8Array(await dl.data.arrayBuffer()), sigs, signed.text);
    const signedPath = b.unsigned_path.replace(/-unsigned\.pdf$/, ".pdf");
    const up = await out.upload(signedPath, stamped.bytes, { contentType: "application/pdf" });
    await out.remove([b.unsigned_path]);
    if (up.error) { console.error("installation return store failed", { year: b.lodge_year }); return json({ error: "The return could not be stored." }, 500); }

    const placedUsable = usable.filter((p) => stamped.placed.includes(p.office_key));
    if (placedUsable.length && ctx.unitId) {
      await admin.from("signature_usage_audit").insert(placedUsable.map((p) => ({
        unit_id: ctx.unitId, form_key: "installation_return", lodge_year: b.lodge_year, office_key: p.office_key,
        signer_member_id: p.member_id, signature_id: p.signature_id, generated_by: userId, output_path: signedPath,
      })));
    }
    const link = await out.createSignedUrl(signedPath, LINK_SECONDS);
    console.log("installation return signed", { year: b.lodge_year, placements: stamped.placed, missing_fields: stamped.missingFields });
    return json({
      ok: true, path: signedPath, url: link.data?.signedUrl ?? null, signed_date: signed.text,
      signed: { secretary: stamped.placed.includes("secretary"), worshipful_master: stamped.placed.includes("worshipful_master") },
      missing_fields: stamped.missingFields,
    });
  } catch (_e) {
    console.error("sign-installation-return unexpected error");
    return json({ error: "Unexpected error" }, 500);
  }
});
