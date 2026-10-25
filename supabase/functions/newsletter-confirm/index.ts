import { createClient } from "npm:@supabase/supabase-js@2";
import { loadLodgeSettings } from "../_shared/lodgeSettings.ts";
import { handleConfirm, welcomeSignOff, type SubscriberRow } from "../_shared/newsletterOptIn.ts";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const COLS = "id,email,confirmed,unsubscribed_at,confirm_token_hash,confirm_sent_at";

async function wmName(): Promise<string | null> {
  try {
    const { data: id, error } = await supabase.rpc("current_officer_holder", { _position_key: "worshipful_master" });
    if (error || !id) return null;
    const { data: p } = await supabase.from("profiles")
      .select("full_name, first_name, last_name, is_past_master").eq("id", id as string).maybeSingle();
    if (!p) return null;
    const r = p as any;
    const built = `${r.is_past_master ? "W Bro. " : "Bro. "}${[r.first_name, r.last_name].filter(Boolean).join(" ")}`.trim();
    return (r.full_name && String(r.full_name).trim()) || (r.first_name || r.last_name ? built : null);
  } catch (e) {
    console.error("newsletter-confirm: WM lookup failed", e instanceof Error ? e.message : e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const result = await handleConfirm({
      async findByTokenHash(hash) {
        const { data, error } = await supabase.from("newsletter_subscribers").select(COLS).eq("confirm_token_hash", hash).maybeSingle();
        if (error) throw error;
        return data as SubscriberRow | null;
      },
      async confirm(id, hash, nowIso) {
        // Matching on the hash makes this single-use even if two clicks race.
        const { data, error } = await supabase.from("newsletter_subscribers")
          .update({ confirmed: true, confirmed_at: nowIso, unsubscribed_at: null, confirm_token_hash: null })
          .eq("id", id).eq("confirm_token_hash", hash).select("id,email").maybeSingle();
        if (error) throw error;
        return data as { id: string; email: string } | null;
      },
      async sendWelcome(to, idempotencyKey) {
        const lodge = await loadLodgeSettings();
        const sign = welcomeSignOff(await wmName(), lodge.formalSenderName);
        await sendTemplateEmail("newsletter-welcome", to, {
          templateData: {
            quizUrl: `${lodge.siteUrl}/quiz`,
            signOffName: sign.name,
            signOffRole: sign.role,
            lodgeName: lodge.formalSenderName,
            postcode: lodge.lodgePostcode,
            townLine: lodge.meetingTownLine,
            crestUrl: lodge.crestImageUrl || null,
            crestName: lodge.lodgeName,
          },
          idempotencyKey,
          fromName: lodge.formalSenderName,
          replyTo: lodge.communicationsEmail,
        });
      },
      log: (m, e) => console.error(`newsletter-confirm: ${m}`, e instanceof Error ? e.message : e),
    }, (body as any)?.token);
    return json({ status: result });
  } catch (e) {
    console.error("newsletter-confirm exception:", e instanceof Error ? e.message : e);
    return json({ status: "error" }, 500);
  }
});
