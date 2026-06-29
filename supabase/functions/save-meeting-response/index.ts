import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { sendBookingEmails } from "../_shared/send-booking-emails.ts";
import { verifyTurnstile } from "../_shared/verify-turnstile.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const BodySchema = z.object({
  event_key: z.string().trim().min(1).max(120),
  event_label: z.string().trim().min(1).max(200),
  meeting_id: z.string().uuid().optional().nullable(),
  contact_name: z.string().trim().min(1).max(200),
  contact_email: z.string().trim().email().max(255),
  contact_phone: z.string().trim().max(40).optional().nullable(),
  meeting_option: z.enum([
    "attending",
    "meeting-only",
    "meeting-and-festive-board",
    "apologies",
  ]),
  details: z.record(z.unknown()).optional(),
  environment: z.enum(["sandbox", "live"]).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    let parsed;
    try {
      parsed = BodySchema.safeParse(await req.json());
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Validation failed", issues: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const {
      event_key,
      event_label,
      meeting_id,
      contact_name,
      contact_email,
      contact_phone,
      meeting_option,
      details,
      environment,
    } = parsed.data;


    // Link to the published Festive Board record by direct id when available,
    // otherwise by the public Meeting Event slug stored in event_key.
    let resolvedMeetingId: string | null = null;
    if (meeting_id) {
      const { data: m } = await supabase
        .from("festive_board_meetings")
        .select("id,status")
        .eq("id", meeting_id)
        .maybeSingle();
      if (m && m.status === "published") resolvedMeetingId = m.id;
    }
    if (!resolvedMeetingId) {
      const { data: m } = await supabase
        .from("festive_board_meetings")
        .select("id,status")
        .eq("event_key", event_key)
        .maybeSingle();
      if (m && m.status === "published") resolvedMeetingId = m.id;
    }

    const { data: booking, error } = await supabase
      .from("bookings")
      .insert({
        event_key,
        event_label,
        meeting_id: resolvedMeetingId,
        contact_name,
        contact_email,
        contact_phone: contact_phone ?? null,
        details: details ?? {},
        line_items: [],
        subtotal_pence: 0,
        fee_pence: 0,
        total_pence: 0,
        payment_status: meeting_option === "apologies" ? "apologies" : "confirmed",
        environment: environment ?? "sandbox",
      })
      .select()
      .single();

    if (error || !booking) {
      console.error("Booking insert failed:", error);
      return new Response(
        JSON.stringify({ error: error?.message || "Could not save response." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fire-and-forget booking emails (confirmation + assistant secretary notification)
    try {
      await sendBookingEmails(booking.id, { stage: "submitted" });
    } catch (e) {
      console.error("sendBookingEmails (submitted) failed:", e);
    }

    return new Response(
      JSON.stringify({ bookingId: booking.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("save-meeting-response error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
