// Tells a public page which lodge its own web address belongs to (Origin/Referer
// looked up in unit_domains via resolveUnit). Selects a lodge only; grants nothing.
import { createClient } from "npm:@supabase/supabase-js@2";
import { resolveUnit } from "../_shared/resolveUnit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const r = await resolveUnit(req, admin);
  const body = r.ok ? { unit_id: r.unitId } : { unit_id: null, error: r.error };
  return new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
