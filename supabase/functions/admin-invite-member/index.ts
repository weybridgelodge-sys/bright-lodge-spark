// Admin-only edge function: pre-create a member profile so the brother can
// sign in immediately via magic link / Google once we go live, and so the
// Progressive Officers Tracker can be populated up-front.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const Body = z.object({
  email: z.string().trim().email().max(255),
  full_name: z.string().trim().min(2).max(160),
  initiation_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  degree: z.enum(["entered_apprentice", "fellow_craft", "master_mason"]).default("master_mason"),
  rank: z.string().trim().max(80).optional().nullable(),
  office: z.string().trim().max(80).optional().nullable(),
  status: z.enum(["pending", "active"]).default("active"),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    // Verify caller and that they are an admin
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userRes, error: uerr } = await userClient.auth.getUser();
    if (uerr || !userRes.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(url, service);
    const { data: isAdmin, error: rerr } = await admin.rpc("has_role", {
      _user_id: userRes.user.id,
      _role: "admin",
    });
    if (rerr) return json({ error: rerr.message }, 500);
    if (!isAdmin) return json({ error: "Forbidden — admins only" }, 403);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: parsed.error.flatten().fieldErrors }, 400);
    }
    const b = parsed.data;

    // Create the auth user. email_confirm:true so they can sign in via magic
    // link straight away without a confirmation step. handle_new_user trigger
    // will insert the profile + default 'member' role.
    const { data: created, error: cerr } = await admin.auth.admin.createUser({
      email: b.email,
      email_confirm: true,
      user_metadata: { full_name: b.full_name },
    });
    if (cerr || !created.user) {
      return json({ error: cerr?.message ?? "Could not create user" }, 400);
    }

    // Fill in the profile fields the trigger doesn't know about.
    const { error: perr } = await admin
      .from("profiles")
      .update({
        full_name: b.full_name,
        initiation_date: b.initiation_date ?? null,
        degree: b.degree,
        rank: b.rank ?? null,
        office: b.office ?? null,
        status: b.status,
      })
      .eq("id", created.user.id);
    if (perr) return json({ error: perr.message }, 500);

    return json({ ok: true, user_id: created.user.id });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
