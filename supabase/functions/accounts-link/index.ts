// accounts-link — resolve a branded annual-accounts URL to a signed PDF download.
// Mirrors summons-link: possession of the link is the credential. `k` is the
// treasurer_year_approvals UUID (unguessable); `y` is the masonic start year.
//
// GET /accounts-link?y=2025&k=<approval uuid>            → JSON { url }
// GET /accounts-link?y=2025&k=<approval uuid>&redirect=1 → 302 to signed URL

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
    let y = url.searchParams.get("y");
    let k = url.searchParams.get("k");
    const wantRedirect = url.searchParams.get("redirect") === "1";
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      y = y ?? (body.y != null ? String(body.y) : null);
      k = k ?? (body.k ? String(body.k) : null);
    }

    const year = Number(y);
    if (!Number.isInteger(year) || !k || !UUID_RE.test(k)) {
      return json({ error: "invalid_link", message: "This accounts link is not valid." }, 400);
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: a } = await admin
      .from("treasurer_year_approvals")
      .select("id,masonic_year,status,certified_pack_path")
      .eq("id", k)
      .maybeSingle();

    if (!a || a.masonic_year !== year) {
      return json({ error: "not_found", message: "We couldn't find those accounts." }, 404);
    }
    if (a.status !== "approved" || !a.certified_pack_path) {
      return json(
        { error: "not_ready", message: "These accounts haven't been certified yet. Please check back later." },
        409,
      );
    }

    const { data: signed, error: signErr } = await admin.storage
      .from("lodge-docs")
      .createSignedUrl(a.certified_pack_path, SIGNED_URL_TTL, {
        download: `Weybridge-Lodge-Accounts-FY${year}-${String(year + 1).slice(-2)}.pdf`,
      });
    if (signErr || !signed?.signedUrl) {
      return json({ error: "sign_failed", message: "We couldn't open those accounts right now." }, 500);
    }

    if (wantRedirect) {
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: signed.signedUrl, "Cache-Control": "no-store" },
      });
    }
    return json({ url: signed.signedUrl, masonic_year: year });
  } catch (e) {
    console.error(e);
    return json({ error: "server_error", message: (e as Error).message }, 500);
  }
});
