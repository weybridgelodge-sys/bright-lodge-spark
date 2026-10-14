import { createClient } from "npm:@supabase/supabase-js@2";
/** True when the caller is admin or the current Treasurer (same rule as Event Accounts writes). */
export async function isEventsTreasurer(req: Request): Promise<boolean> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: u } = await sb.auth.getUser(auth.slice(7));
  if (!u?.user) return false;
  const [a, t] = await Promise.all([
    sb.rpc("has_role", { _user_id: u.user.id, _role: "admin" }),
    sb.rpc("is_current_officer", { _user_id: u.user.id, _position_key: "treasurer" }),
  ]);
  return a.data === true || t.data === true;
}
