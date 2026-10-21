// Caller context for signature functions. Logs IDs only — never image data or URLs.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { SIGNATURE_MODULE_KEY, type ActorRoles } from "./signatures.ts";

export const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });

export type SigCtx = { admin: SupabaseClient; userId: string; unitId: string | null; roles: ActorRoles };

export async function signatureContext(req: Request): Promise<SigCtx | Response> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "Please sign in again." }, 401);
  const URL_ = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data, error } = await userClient.auth.getClaims(auth.slice(7));
  if (error || !data?.claims?.sub) return json({ error: "Please sign in again." }, 401);
  const userId = data.claims.sub as string;
  const admin = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: flag } = await admin.from("module_settings").select("value").eq("key", SIGNATURE_MODULE_KEY).maybeSingle();
  if (flag?.value !== true) return json({ error: "Stored signatures are not switched on." }, 403);

  const [{ data: prof }, a, s, w, act] = await Promise.all([
    admin.from("profiles").select("unit_id").eq("id", userId).maybeSingle(),
    admin.rpc("has_role", { _user_id: userId, _role: "admin" }),
    admin.rpc("is_lodge_secretary", { _user: userId }),
    admin.rpc("is_current_officer", { _user_id: userId, _position_key: "worshipful_master" }),
    admin.rpc("is_active_member", { _user_id: userId }),
  ]);
  if (act.data !== true && a.data !== true) return json({ error: "Only active members can use signatures." }, 403);
  return { admin, userId, unitId: (prof?.unit_id as string) ?? null, roles: { isAdmin: a.data === true, isSecretary: s.data === true, isCurrentWm: w.data === true } };
}

export async function unitOf(admin: SupabaseClient, memberId: string): Promise<string | null> {
  const { data } = await admin.from("profiles").select("unit_id").eq("id", memberId).maybeSingle();
  return (data?.unit_id as string) ?? null;
}

// Best-effort per-instance rate limit (previews).
const hits = new Map<string, number[]>();
export function rateLimited(key: string, max = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > max;
}
