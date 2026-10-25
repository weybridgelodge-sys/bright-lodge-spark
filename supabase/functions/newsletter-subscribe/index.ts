import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyTurnstile } from "../_shared/verify-turnstile.ts";
import { loadLodgeSettings } from "../_shared/lodgeSettings.ts";
import { handleSignup, type SubscriberRow } from "../_shared/newsletterOptIn.ts";
import { resolveUnit } from "../_shared/resolveUnit.ts";
import { sendTransactionalEmail } from "../_shared/send-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COLS = "id,email,confirmed,unsubscribed_at,confirm_token_hash,confirm_sent_at";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  try {
    const { email, honeypot, turnstileToken } = await req.json();
    if (typeof honeypot === "string" && honeypot.length > 0) return json({ ok: true });
    if (typeof email !== "string" || !EMAIL_RE.test(email.trim()) || email.length > 255) {
      return json({ error: "Please enter a valid email address." }, 400);
    }
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    if (!(await verifyTurnstile(turnstileToken, ip))) {
      return json({ error: "Verification failed. Please tick the verification box and try again." }, 400);
    }
    const unit = await resolveUnit(req, supabase);
    if (!unit.ok) return json({ error: unit.error }, 400);
    const UNIT_ID = unit.unitId;
    const cleanEmail = email.trim().toLowerCase();
    const lodge = await loadLodgeSettings(UNIT_ID);

    await handleSignup({
      // On-signup cleanup: unconfirmed, never-unsubscribed rows older than 30 days.
      async cleanupPending(olderThan) {
        const { error } = await supabase.from("newsletter_subscribers").delete()
          .eq("unit_id", UNIT_ID).eq("confirmed", false).is("unsubscribed_at", null).lt("created_at", olderThan);
        if (error) throw error;
      },
      async findByEmail(e) {
        const { data, error } = await supabase.from("newsletter_subscribers").select(COLS).eq("email", e).maybeSingle();
        if (error) throw error;
        return data as SubscriberRow | null;
      },
      async insertPending(e, hash, sentAt) {
        const { data, error } = await supabase.from("newsletter_subscribers")
          .insert({ email: e, unit_id: UNIT_ID, source: "public_signup", confirmed: false, confirm_token_hash: hash, confirm_sent_at: sentAt })
          .select(COLS).single();
        if (error) throw error;
        return data as SubscriberRow;
      },
      async refreshPending(id, hash, sentAt) {
        const { error } = await supabase.from("newsletter_subscribers")
          .update({ confirm_token_hash: hash, confirm_sent_at: sentAt }).eq("id", id);
        if (error) throw error;
      },
      async clearSentAt(id) {
        await supabase.from("newsletter_subscribers").update({ confirm_sent_at: null, confirm_token_hash: null }).eq("id", id);
      },
      async sendConfirm(to, confirmUrl, idempotencyKey) {
        const r = await sendTransactionalEmail({
          templateName: "newsletter-confirm",
          recipientEmail: to,
          templateData: { confirmUrl, lodgeName: lodge.formalSenderName, postcode: lodge.lodgePostcode, townLine: lodge.meetingTownLine, crestUrl: lodge.crestImageUrl || null, crestName: lodge.lodgeName },
          idempotencyKey,
          fromName: lodge.formalSenderName,
          replyTo: lodge.communicationsEmail,
        });
        // Throwing lets handleSignup reset the hourly limit, as before.
        if (!r.ok) throw new Error(String(r.error ?? "send failed"));
      },
      log: (m, e) => console.error(`newsletter-subscribe: ${m}`, e instanceof Error ? e.message : e),
    }, cleanEmail, lodge.siteUrl);

    // Same neutral answer for new, pending, throttled and already-subscribed addresses.
    return json({ ok: true });
  } catch (e) {
    console.error("newsletter-subscribe exception:", e instanceof Error ? e.message : e);
    return json({ error: "Could not subscribe. Please try again later." }, 500);
  }
});
