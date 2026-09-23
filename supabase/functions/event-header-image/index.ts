// Returns a short-lived signed URL for the header image of a PUBLISHED meeting.
// The event-images bucket has no public read rule; this function is the only
// public path to an image, and only for images attached to published events.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const { path } = await req.json().catch(() => ({}));
    if (typeof path !== "string" || !path || path.length > 500 || path.includes("..")) {
      return json({ error: "Invalid request" }, 400);
    }
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: ev } = await sb
      .from("lodge_events")
      .select("id")
      .eq("header_image_url", path)
      .eq("published", true)
      .limit(1)
      .maybeSingle();
    if (!ev) return json({ error: "Not found" }, 404);
    const { data, error } = await sb.storage.from("event-images").createSignedUrl(path, 60 * 60);
    if (error || !data) return json({ error: "Not found" }, 404);
    return json({ signedUrl: data.signedUrl });
  } catch {
    return json({ error: "Server error" }, 500);
  }
});
