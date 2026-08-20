// summons-link — resolve a branded summons URL to a signed PDF download.
//
// Trust model: identical to the raw signed-URL links we used before —
// possession of the link is the credential. The `k` parameter is the summons
// UUID, which is unguessable, so the link is exactly as secret as the signed
// storage URL it replaces. No session/login is required, deliberately, so the
// behaviour of existing summons emails is unchanged.
//
// GET /summons-link?n=385&k=<summons uuid>            → JSON { url }
// GET /summons-link?n=385&k=<summons uuid>&redirect=1 → 302 to signed URL

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 days — links are minted on demand

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    let n = url.searchParams.get("n");
    let k = url.searchParams.get("k");
    const wantRedirect = url.searchParams.get("redirect") === "1";
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      n = n ?? (body.n != null ? String(body.n) : null);
      k = k ?? (body.k ? String(body.k) : null);
    }

    const meetingNumber = Number(n);
    if (!Number.isFinite(meetingNumber) || !k || !UUID_RE.test(k)) {
      return json({ error: "invalid_link", message: "This summons link is not valid." }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: summons } = await admin
      .from("summonses")
      .select("id,meeting_number,pdf_storage_path,status")
      .eq("id", k)
      .maybeSingle();

    if (!summons || summons.meeting_number !== meetingNumber) {
      return json({ error: "not_found", message: "We couldn't find that summons." }, 404);
    }
    if (!summons.pdf_storage_path) {
      return json(
        { error: "not_ready", message: "This summons hasn't been finalised yet. Please check back shortly." },
        409,
      );
    }

    const { data: signed, error: signErr } = await admin.storage
      .from("lodge-docs")
      .createSignedUrl(summons.pdf_storage_path, SIGNED_URL_TTL, {
        download: `summons-${summons.meeting_number}.pdf`,
      });

    if (signErr || !signed?.signedUrl) {
      return json({ error: "sign_failed", message: "We couldn't open that summons right now." }, 500);
    }

    if (wantRedirect) {
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: signed.signedUrl, "Cache-Control": "no-store" },
      });
    }
    return json({ url: signed.signedUrl, meeting_number: summons.meeting_number });
  } catch (e) {
    console.error(e);
    return json({ error: "server_error", message: (e as Error).message }, 500);
  }
});
