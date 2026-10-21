// generate-provincial-return — builds the signed Provincial Installation Return (Word + PDF) on the server.
// Only used when module key officer_signatures is on. The browser sends the year and the return's text
// (built by the same loader as the unsigned path); the server resolves the WM and Secretary itself,
// refuses if they differ from the text, embeds their active signatures, stores both files in
// secretary-returns and audits each placement. Signature images never leave the server.
// Logs IDs only — never image bytes, base64 or URLs.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { json, signatureContext } from "../_shared/signatureAuth.ts";
import { SIGNATURE_BUCKET, resolvePlacements, validInstallDate } from "../_shared/signatures.ts";
import { buildDocx, buildPdf, type DocSignatures, type ProvincialData, type SigImage } from "../_shared/provincialReturnDoc.ts";

const OUT_BUCKET = "secretary-returns";
const LINK_SECONDS = 600;

const Row = z.object({
  label: z.string().max(40), key: z.string().max(60).nullable(),
  firstNames: z.string().max(200), surname: z.string().max(200), decorations: z.string().max(300),
  office: z.object({ memberId: z.string().uuid().nullable().optional() }).passthrough().nullable().optional(),
}).passthrough();
const Data = z.object({
  year: z.number().int(), consecrated: z.string().max(20), scheduledDate: z.string().max(10), actualDate: z.string().max(10).nullable(),
  venue: z.string().max(500), meetingPattern: z.string().max(500),
  rows: z.array(Row).max(60), lowerRows: z.array(Row).max(30),
  pastMasters: z.array(z.object({ years: z.array(z.number().int()).max(20), name: z.string().max(200) })).max(200),
  secretary: z.object({ name: z.string().max(200), address: z.string().max(500), mobile: z.string().max(60), personalEmail: z.string().max(255), lodgeEmail: z.string().max(255) }).passthrough(),
}).passthrough();
const Body = z.object({ lodge_year: z.number().int().min(2000).max(2100), data: Data, file_stem: z.string().regex(/^[\w.-]{1,80}$/) });

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
    // Same roles that can open the Provincial Return page today.
    if (!(roles.isAdmin || roles.isSecretary || roles.isCurrentWm || sec.data || asst.data || wmRole.data)) {
      return json({ error: "You can't generate the Provincial Return." }, 403);
    }
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "Invalid request" }, 400);
    const { lodge_year: year, data, file_stem } = parsed.data;
    if (data.year !== year) return json({ error: "Year mismatch." }, 400);
    const installDate = data.actualDate ?? data.scheduledDate;
    if (!validInstallDate(year, installDate)) return json({ error: "Installation date is outside that year." }, 400);

    // Resolve the signers on the server, using the same effective-date rule as current_officer_holder().
    const [w, s] = await Promise.all([
      admin.rpc("current_officer_holder", { _position_key: "worshipful_master", _at: installDate }),
      admin.rpc("current_officer_holder", { _position_key: "secretary", _at: installDate }),
    ]);
    const holders = { worshipful_master: (w.data as string | null) ?? null, secretary: (s.data as string | null) ?? null };
    const shown = (key: string) => (data.rows.find((r) => r.key === key)?.office?.memberId as string | null | undefined) ?? null;
    if (shown("worshipful_master") !== holders.worshipful_master || shown("secretary") !== holders.secretary) {
      return json({ error: "The WM or Secretary on the page no longer matches the officer records. Please refresh and try again." }, 409);
    }

    const ids = [...new Set([holders.secretary, holders.worshipful_master].filter(Boolean))] as string[];
    const { data: sigRows } = ids.length
      ? await admin.from("member_signatures").select("id,member_id,storage_path,width,height").in("member_id", ids).eq("active", true)
      : { data: [] as { id: string; member_id: string; storage_path: string; width: number; height: number }[] };
    const byMember = Object.fromEntries((sigRows ?? []).map((r) => [r.member_id, r]));
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
    const sigs: DocSignatures = { sec: pick("secretary"), wm: pick("worshipful_master") };

    const doc = data as unknown as ProvincialData;
    const [docxBlob, pdfBytes] = await Promise.all([buildDocx(doc, sigs), buildPdf(doc, sigs)]);
    const stamp = Date.now();
    const docxPath = `provincial-returns/${year}/${file_stem}-${stamp}.docx`;
    const pdfPath = `provincial-returns/${year}/${file_stem}-${stamp}.pdf`;
    const out = admin.storage.from(OUT_BUCKET);
    const u1 = await out.upload(docxPath, new Uint8Array(await docxBlob.arrayBuffer()), { contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const u2 = u1.error ? u1 : await out.upload(pdfPath, pdfBytes, { contentType: "application/pdf" });
    if (u1.error || u2.error) {
      await out.remove([docxPath, pdfPath]);
      console.error("provincial return store failed", { year });
      return json({ error: "The return could not be stored." }, 500);
    }

    const unitId = ctx.unitId;
    const usable = placements.filter((p) => images[p.signature_id]);
    if (usable.length && unitId) {
      await admin.from("signature_usage_audit").insert(usable.map((p) => ({
        unit_id: unitId, form_key: "provincial_return", lodge_year: year, office_key: p.office_key,
        signer_member_id: p.member_id, signature_id: p.signature_id, generated_by: userId, output_path: pdfPath,
      })));
    }
    const [l1, l2] = await Promise.all([out.createSignedUrl(docxPath, LINK_SECONDS), out.createSignedUrl(pdfPath, LINK_SECONDS)]);
    console.log("provincial return generated", { year, placements: usable.map((p) => p.office_key) });
    return json({
      ok: true, docx_path: docxPath, pdf_path: pdfPath,
      docx_url: l1.data?.signedUrl ?? null, pdf_url: l2.data?.signedUrl ?? null,
      signed: { secretary: !!sigs.sec, worshipful_master: !!sigs.wm },
    });
  } catch (_e) {
    console.error("generate-provincial-return unexpected error");
    return json({ error: "Unexpected error" }, 500);
  }
});
