// ============================================================================
// Play Store reviewer bypass — TEMPORARY, scoped to a single email only.
//
// Google Play reviewers cannot access a real email inbox, so they cannot use
// our magic-link / 6-digit code flow. This function accepts a fixed bypass
// code for ONE hard-scoped email address and mints a real Supabase session
// so the reviewer can sign in.
//
// Scope guard is server-side ONLY, via exact email match against the env
// var REVIEWER_BYPASS_EMAIL (currently: playreview@weybridgelodge.org.uk).
// The bypass code lives in REVIEWER_BYPASS_CODE — never in client code.
//
// Real members' auth is completely unaffected — the normal Supabase OTP flow
// is unchanged and this function refuses every other email address.
//
// To rotate / remove: change or delete the REVIEWER_BYPASS_CODE secret and/or
// delete this function + the reviewer profile row (is_test_account = true).
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const BYPASS_EMAIL = (Deno.env.get("REVIEWER_BYPASS_EMAIL") ?? "").trim().toLowerCase();
const BYPASS_CODE = (Deno.env.get("REVIEWER_BYPASS_CODE") ?? "").trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!BYPASS_EMAIL || !BYPASS_CODE) {
      return json({ error: "not_configured" }, 503);
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? "").trim().toLowerCase();
    const code = String(body?.code ?? "").trim();

    // Hard scope: exact email match + exact code match. Anything else = 401,
    // with a small delay to blunt any timing/brute-force attempts.
    if (email !== BYPASS_EMAIL || code !== BYPASS_CODE) {
      await new Promise((r) => setTimeout(r, 400));
      return json({ error: "invalid_credentials" }, 401);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Ensure the reviewer auth user exists.
    let userId: string | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: byEmail } = await (admin.auth.admin as any).getUserByEmail?.(email) ?? { data: null };
    if (byEmail?.user?.id) {
      userId = byEmail.user.id;
    } else {
      // Fallback: paginate list until found.
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = list?.users?.find((u) => (u.email ?? "").toLowerCase() === email);
      if (found) userId = found.id;
    }

    if (!userId) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          full_name: "Play Reviewer",
          is_test_account: true,
        },
      });
      if (createErr || !created?.user) {
        return json({ error: "create_failed", detail: createErr?.message }, 500);
      }
      userId = created.user.id;
    }

    // Ensure the profile is active + flagged as a test account.
    await admin
      .from("profiles")
      .update({
        status: "active",
        degree: "master_mason",
        first_name: "Play",
        last_name: "Reviewer",
        full_name: "Play Reviewer",
        is_test_account: true,
      })
      .eq("id", userId);

    // Mint a real session by generating a magic-link OTP and immediately
    // verifying it server-side. Client receives access + refresh tokens
    // and calls supabase.auth.setSession().
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkErr || !linkData?.properties?.email_otp) {
      return json({ error: "link_failed", detail: linkErr?.message }, 500);
    }
    const emailOtp = linkData.properties.email_otp;

    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: verify, error: verifyErr } = await anon.auth.verifyOtp({
      email,
      token: emailOtp,
      type: "email",
    });
    if (verifyErr || !verify?.session) {
      return json({ error: "verify_failed", detail: verifyErr?.message }, 500);
    }

    return json({
      access_token: verify.session.access_token,
      refresh_token: verify.session.refresh_token,
    });
  } catch (err) {
    return json({ error: "server_error", detail: String(err) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
