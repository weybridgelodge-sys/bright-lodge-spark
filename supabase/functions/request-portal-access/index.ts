// Public "request access" form for the members portal. Creates NO account
// and stores nothing: it only emails the unit's Secretary (from lodge settings).
// Honeypot + Turnstile; always returns the same neutral reply on success.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { verifyTurnstile } from "../_shared/verify-turnstile.ts";
import { sendTransactionalEmail } from "../_shared/send-email.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { loadLodgeSettings } from "../_shared/lodgeSettings.ts";
import { resolveUnit } from "../_shared/resolveUnit.ts";

const Body = z.object({
  fullName: z.string().trim().min(2).max(120),
  motherLodge: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(255),
  company: z.string().max(200).optional(), // honeypot
  turnstileToken: z.string().trim().max(4096).optional(),
});

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: "Please complete every field." }, 400);
  const d = parsed.data;
  if (d.company) return json({ ok: true }); // bot: pretend success

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  if (!(await verifyTurnstile(d.turnstileToken, ip))) {
    return json({ error: "Verification failed. Please tick the verification box and try again." }, 400);
  }

  // Unit comes from the web address the form was sent from, never from the body.
  const unit = await resolveUnit(req, createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!));
  if (!unit.ok) return json({ error: unit.error }, 400);
  const lodge = await loadLodgeSettings(unit.unitId);
  const res = await sendTransactionalEmail({
    templateName: "portal-access-request",
    recipientEmail: lodge.secretaryEmail,
    replyTo: d.email.toLowerCase(),
    templateData: {
      fullName: d.fullName,
      email: d.email.toLowerCase(),
      motherLodge: d.motherLodge,
      crestUrl: lodge.crestImageUrl || null,
      lodgeName: lodge.lodgeName,
      lodgeNumber: lodge.lodgeNumber,
      provinceName: lodge.provinceName,
      submittedAt: new Date().toLocaleString("en-GB", { timeZone: "Europe/London" }),
    },
  });
  if (!res.ok) return json({ error: "We couldn't send your request. Please try again later." }, 500);
  return json({ ok: true });
});
