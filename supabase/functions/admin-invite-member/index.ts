// Admin-only edge function: create OR update a member profile.
// - Create: provisions a new auth user (email_confirm:true) + fills profile.
// - Update: updates an existing profile by user_id.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const TITLES = ["Bro", "W Bro", "VW Bro", "RW Bro"] as const;

const Body = z.object({
  // when present => update mode
  id: z.string().uuid().optional(),

  email: z.string().trim().email().max(255),
  title: z.enum(TITLES).optional().nullable(),
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  provincial_rank: z.string().trim().max(80).optional().nullable(),
  grand_rank: z.string().trim().max(80).optional().nullable(),
  date_of_birth: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  initiation_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  degree: z.enum(["entered_apprentice", "fellow_craft", "master_mason"]).default("master_mason"),
  is_past_master: z.boolean().optional().default(false),
  is_royal_arch: z.boolean().optional().default(false),
  is_honorary_member: z.boolean().optional().default(false),
  rank: z.string().trim().max(80).optional().nullable(),
  status: z.enum(["pending", "active", "suspended"]).default("active"),
});

function composeFullName(title: string | null | undefined, first: string, last: string) {
  const t = title ? `${title}. ` : "";
  return `${t}${first} ${last}`.trim().replace(/\s+/g, " ");
}

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
    const full_name = composeFullName(b.title ?? null, b.first_name, b.last_name);

    const profileFields = {
      full_name,
      title: b.title ?? null,
      first_name: b.first_name,
      last_name: b.last_name,
      provincial_rank: b.provincial_rank ?? null,
      grand_rank: b.grand_rank ?? null,
      date_of_birth: b.date_of_birth ?? null,
      initiation_date: b.initiation_date ?? null,
      degree: b.degree,
      is_past_master: b.is_past_master ?? false,
      is_royal_arch: b.is_royal_arch ?? false,
      is_honorary_member: b.is_honorary_member ?? false,
      rank: b.rank ?? null,
      status: b.status,
      email: b.email,
    };

    let userId = b.id;

    if (!userId) {
      // CREATE
      const { data: created, error: cerr } = await admin.auth.admin.createUser({
        email: b.email,
        email_confirm: true,
        user_metadata: { full_name },
      });
      if (cerr || !created.user) {
        return json({ error: cerr?.message ?? "Could not create user" }, 400);
      }
      userId = created.user.id;
    } else {
      // UPDATE — also sync auth email if changed
      const { error: aerr } = await admin.auth.admin.updateUserById(userId, {
        email: b.email,
        user_metadata: { full_name },
      });
      if (aerr) return json({ error: aerr.message }, 400);
    }

    const { error: perr } = await admin
      .from("profiles")
      .update(profileFields)
      .eq("id", userId);
    if (perr) return json({ error: perr.message }, 500);

    return json({ ok: true, user_id: userId });
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
