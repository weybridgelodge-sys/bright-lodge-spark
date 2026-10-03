// Admin or current Secretary edge function: create OR update a member profile.
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
  middle_name: z.string().trim().max(160).optional().nullable(),
  last_name: z.string().trim().min(1).max(80),
  preferred_name: z.string().trim().max(80).optional().nullable(),
  post_nominals: z.string().trim().max(120).optional().nullable(),
  provincial_rank: z.string().trim().max(80).optional().nullable(),
  grand_rank: z.string().trim().max(80).optional().nullable(),
  date_of_birth: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  initiation_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  // Must match every value of the masonic_degree enum (installed_master included).
  degree: z.enum(["entered_apprentice", "fellow_craft", "master_mason", "installed_master"]).default("master_mason"),
  is_past_master: z.boolean().optional().default(false),
  is_royal_arch: z.boolean().optional().default(false),
  is_honorary_member: z.boolean().optional().default(false),
  rank: z.string().trim().max(80).optional().nullable(),
  status: z
    .enum(["pending", "active", "suspended", "year_out", "resigned", "excluded", "deceased"])
    .default("active"),
  status_changed_at: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  passing_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  raising_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  joined_lodge_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  is_ugle_portal_registered: z.boolean().optional().default(false),
  address_line1: z.string().trim().max(120).optional().nullable(),
  address_line2: z.string().trim().max(120).optional().nullable(),
  address_line3: z.string().trim().max(120).optional().nullable(),
  town: z.string().trim().max(80).optional().nullable(),
  county: z.string().trim().max(80).optional().nullable(),
  postcode: z.string().trim().max(20).optional().nullable(),
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
    let isSecretary = false;
    if (!isAdmin) {
      const { data: sec, error: serr } = await admin.rpc("is_lodge_secretary", { _user: userRes.user.id });
      if (serr) return json({ error: serr.message }, 500);
      isSecretary = sec === true;
    }
    if (!isAdmin && !isSecretary) return json({ error: "Forbidden — admin or Secretary only" }, 403);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>;
      const detail = Object.entries(fe).map(([k, v]) => `${k}: ${(v ?? []).join(", ")}`).join("; ");
      console.error("admin-invite-member validation failed:", detail);
      return json({ error: `Invalid member details — ${detail || "check the form"}` }, 400);
    }
    const b = parsed.data;
    const full_name = composeFullName(b.title ?? null, b.first_name, b.last_name);

    const profileFields = {
      full_name,
      title: b.title ?? null,
      first_name: b.first_name,
      middle_name: b.middle_name ?? null,
      last_name: b.last_name,
      preferred_name: b.preferred_name ?? null,
      post_nominals: b.post_nominals ?? null,
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
      status_changed_at: b.status_changed_at ?? null,
      email: b.email,
      passing_date: b.passing_date ?? null,
      raising_date: b.raising_date ?? null,
      joined_lodge_date: b.joined_lodge_date ?? null,
      is_ugle_portal_registered: b.is_ugle_portal_registered ?? false,
      address_line1: b.address_line1 ?? null,
      address_line2: b.address_line2 ?? null,
      address_line3: b.address_line3 ?? null,
      town: b.town ?? null,
      county: b.county ?? null,
      postcode: b.postcode ?? null,
    };

    let userId = b.id;

    // Secretary limits (admin is unrestricted). Roles are never part of this
    // function; unknown keys are stripped by the schema.
    if (isSecretary) {
      if (userId) {
        const { data: cur, error: ce } = await admin
          .from("profiles").select("email,status,status_changed_at").eq("id", userId).maybeSingle();
        if (ce) return json({ error: ce.message }, 500);
        if (!cur) return json({ error: "Member not found" }, 404);
        const { data: au } = await admin.auth.admin.getUserById(userId);
        const loginEmail = (au?.user?.email ?? cur.email ?? "").toLowerCase();
        if (b.email.toLowerCase() !== loginEmail) {
          return json({ error: "Only an admin can change a member's sign-in email" }, 403);
        }
        // Approve/suspend stays admin-only: keep the existing status.
        profileFields.status = cur.status;
        profileFields.status_changed_at = cur.status_changed_at;
      } else if (b.status !== "active" && b.status !== "pending") {
        return json({ error: "New members can only be added as active or pending" }, 403);
      }
    }

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
