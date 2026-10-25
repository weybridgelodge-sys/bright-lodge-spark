import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { sendBookingEmails } from "../_shared/send-booking-emails.ts";
import { duplicateBookingMessage, findExistingBooking } from "../_shared/duplicate-booking.ts";
import { loadLodgeSettings } from "../_shared/lodgeSettings.ts";
import { verifyTurnstile } from "../_shared/verify-turnstile.ts";
import { isHoneypotTripped, seatCheckOutcome } from "../_shared/meetingResponseGuards.ts";
import { cleanSpaces, trimBookingNames } from "../_shared/greeting.ts";
import { expectedDiningPence } from "../_shared/bookingAmounts.ts";
import { resolveUnit } from "../_shared/resolveUnit.ts";
import { unitFor } from "../_shared/requestUnit.ts";
import { PHONE_REQUIRED_MESSAGE, isPlausiblePhone } from "../_shared/phone.ts";


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
  contact_name: z.string().transform(cleanSpaces).pipe(z.string().min(1).max(200)),
  contact_email: z.string().trim().email().max(255),
  contact_phone: z.string().trim().max(40).optional().nullable(),
  meeting_option: z.enum([
    "attending",
    "meeting-only",
    "meeting-and-festive-board",
    "apologies",
  ]),
  details: z.record(z.unknown()).optional(),
  turnstileToken: z.string().trim().max(4096).optional(),
  website: z.string().max(500).optional().nullable(),
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
      turnstileToken,
      website,
    } = parsed.data;

    // Honeypot: real visitors never fill this hidden field. Pretend success, save nothing.
    if (isHoneypotTripped(website)) {
      console.warn("save-meeting-response honeypot tripped", { event_key });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isPlausiblePhone(contact_phone)) {
      return new Response(JSON.stringify({ error: PHONE_REQUIRED_MESSAGE }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const captchaOk = await verifyTurnstile(turnstileToken, ip);
    if (!captchaOk) {
      return new Response(
        JSON.stringify({ error: "Verification failed. Please tick the verification box and try again." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }




    // Link to the published Festive Board record by direct id when available,
    // otherwise by the public Meeting Event slug stored in event_key.
    let resolvedMeetingId: string | null = null;
    let diningPricePence: number | null = null; // read server-side, never from the browser
    let meetingUnit: unknown = null;
    if (meeting_id) {
      const { data: m } = await supabase
        .from("festive_board_meetings")
        .select("id,status,dining_price_pence,unit_id")
        .eq("id", meeting_id)
        .maybeSingle();
      if (m && m.status === "published") { resolvedMeetingId = m.id; diningPricePence = m.dining_price_pence ?? null; meetingUnit = m.unit_id; }
    }
    if (!resolvedMeetingId) {
      const { data: m } = await supabase
        .from("festive_board_meetings")
        .select("id,status,dining_price_pence,unit_id")
        .eq("event_key", event_key)
        .maybeSingle();
      if (m && m.status === "published") { resolvedMeetingId = m.id; diningPricePence = m.dining_price_pence ?? null; meetingUnit = m.unit_id; }
    }
    // Unit: the meeting's own, else the web address; neither = refuse (no default).
    const unit = await unitFor(meetingUnit, () => resolveUnit(req, supabase));
    if (!unit.ok) {
      return new Response(JSON.stringify({ error: unit.error }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // HARD DUPLICATE GUARD — same rule as paid checkout: one live response per
    // person per meeting.
    const existingBooking = await findExistingBooking({
      supabase,
      meetingId: resolvedMeetingId,
      eventKey: event_key,
      email: contact_email,
    });
    if (existingBooking) {
      console.warn("Blocked duplicate meeting response", {
        event_key,
        meeting_id: resolvedMeetingId,
        existing_booking_id: existingBooking.id,
        status: existingBooking.payment_status,
      });
      return new Response(
        JSON.stringify({
          error: ((l: { bookingContactEmail: string; bookingContactOffice: string }) => duplicateBookingMessage(l.bookingContactEmail, l.bookingContactOffice))(await loadLodgeSettings(unit.unitId)),
          existingBookingId: existingBooking.id,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Capacity check: for festive-board bookings, ask the DB whether the seats
    // fit. Returns 'confirmed' if seats available (or event has no venue), or

    // 'waitlisted' if the venue is at capacity.
    let initialStatus: string;
    if (meeting_option === "apologies") {
      initialStatus = "apologies";
    } else if (meeting_option === "meeting-and-festive-board") {
      const guestCount = Number((details as any)?.guestCount) || 0;
      const seats = 1 + guestCount;
      const { data: statusResult, error: capErr } = await supabase.rpc(
        "check_and_book_seats",
        { _event_key: event_key, _meeting_id: resolvedMeetingId, _seats: seats },
      );
      const seat = seatCheckOutcome(statusResult, capErr);
      if (!seat.ok) {
        // Fail closed: never confirm a seat we could not check.
        console.error("check_and_book_seats failed (booking not saved):", { event_key, error: capErr });
        return new Response(JSON.stringify({ error: seat.message }), {
          status: seat.httpStatus,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      initialStatus = seat.status;
    } else {
      initialStatus = "confirmed";
    }

    // Expected base price for non-card dining bookings (card bookings go through create-checkout).
    const expectedPence = initialStatus === "apologies" ? 0 : expectedDiningPence(
      meeting_option, (details as any)?.paymentMethod ?? null, (details as any)?.guestCount, diningPricePence,
    );

    const { data: booking, error } = await supabase
      .from("bookings")
      .insert({
        unit_id: unit.unitId,
        event_key,
        event_label,
        meeting_id: resolvedMeetingId,
        contact_name,
        contact_email,
        contact_phone: contact_phone ?? null,
        details: trimBookingNames(details ?? {}),
        line_items: [],
        subtotal_pence: expectedPence,
        fee_pence: 0,
        total_pence: expectedPence,
        payment_status: initialStatus,
        environment: "live", // fixed server-side; client value ignored
      })
      .select()
      .single();

    if (error || !booking) {
      console.error("Booking insert failed:", error);
      const duplicate = (error as { code?: string } | null)?.code === "23505";
      return new Response(
        JSON.stringify({
          error: duplicate
            ? "You have already recorded a response for this meeting. Please contact the Assistant Secretary to change it."
            : error?.message || "Could not save response.",
        }),
        {
          status: duplicate ? 409 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
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
