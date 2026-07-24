import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "https://esm.sh/zod@3.23.8";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const LineItemSchema = z.object({
  label: z.string().min(1).max(200),
  qty: z.number().int().min(1).max(99),
  unit_price_pence: z.number().int().min(0).max(1_000_000),
});

const BodySchema = z.object({
  event_key: z.string().min(1).max(120),
  meeting_id: z.string().uuid().nullable().optional(),
  event_label: z.string().min(1).max(200),
  contact_name: z.string().min(1).max(200),
  contact_email: z.string().email().max(255),
  contact_phone: z.string().max(40).optional().nullable(),
  line_items: z.array(LineItemSchema).min(1).max(50),
  details: z.record(z.unknown()).optional(),
  cover_fee: z.boolean().default(false),
  return_url: z.string().url(),
  environment: z.enum(["sandbox", "live"]),
});

// UK card surcharge if user opted in to cover Stripe fees (~1.5% + 25p).
// We charge a flat ~2% to comfortably cover it.
function calcFeePence(subtotalPence: number, coverFee: boolean): number {
  if (!coverFee) return 0;
  return Math.ceil(subtotalPence * 0.02);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const input = parsed.data;
    const env: StripeEnv = input.environment;

    let resolvedMeetingId: string | null = null;
    if (input.meeting_id) {
      const { data: meeting } = await supabase
        .from("festive_board_meetings")
        .select("id,status")
        .eq("id", input.meeting_id)
        .maybeSingle();
      if (meeting?.status === "published") resolvedMeetingId = meeting.id;
    }
    if (!resolvedMeetingId) {
      const { data: meeting } = await supabase
        .from("festive_board_meetings")
        .select("id,status")
        .eq("event_key", input.event_key)
        .maybeSingle();
      if (meeting?.status === "published") resolvedMeetingId = meeting.id;
    }

    // Optional: link booking to user if Authorization is provided
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabase.auth.getUser(token);
      userId = data?.user?.id ?? null;
    }

    const subtotalPence = input.line_items.reduce(
      (sum, li) => sum + li.unit_price_pence * li.qty,
      0,
    );
    if (subtotalPence < 50) {
      return new Response(
        JSON.stringify({ error: "Booking total must be at least 50p." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const feePence = calcFeePence(subtotalPence, input.cover_fee);
    const totalPence = subtotalPence + feePence;

    // Capacity check — decide up front whether this booking is confirmed or
    // waitlisted. Waitlisted rows still go through Stripe and pay in full;
    // they get auto-refunded later if never promoted.
    const seatsRequested = input.line_items.reduce((s, li) => s + li.qty, 0);
    let initialStatus = "pending";
    try {
      const { data: statusResult } = await supabase.rpc("check_and_book_seats", {
        _event_key: input.event_key,
        _meeting_id: resolvedMeetingId,
        _seats: seatsRequested,
      });
      const decided = (statusResult as string) || "confirmed";
      initialStatus = decided === "waitlisted" ? "waitlisted" : "pending";
    } catch (e) {
      console.error("check_and_book_seats failed, defaulting to pending:", e);
    }

    // Persist booking BEFORE checkout so webhook has a row to update.
    const { data: booking, error: insErr } = await supabase
      .from("bookings")
      .insert({
        user_id: userId,
        event_key: input.event_key,
        meeting_id: resolvedMeetingId,
        event_label: input.event_label,
        contact_name: input.contact_name,
        contact_email: input.contact_email,
        contact_phone: input.contact_phone ?? null,
        details: input.details ?? {},
        line_items: input.line_items,
        subtotal_pence: subtotalPence,
        fee_pence: feePence,
        total_pence: totalPence,
        currency: "gbp",
        payment_status: initialStatus,
        environment: env,
      })
      .select()
      .single();

    if (insErr || !booking) {
      console.error("Booking insert failed:", insErr);
      return new Response(
        JSON.stringify({ error: "Could not create booking record." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const stripe = createStripeClient(env);

    // Build Stripe line items: per-row price_data so the customer sees a breakdown.
    const stripeLineItems = input.line_items.map((li) => ({
      price_data: {
        currency: "gbp",
        product_data: { name: li.label.slice(0, 250) },
        unit_amount: li.unit_price_pence,
      },
      quantity: li.qty,
    }));
    if (feePence > 0) {
      stripeLineItems.push({
        price_data: {
          currency: "gbp",
          product_data: { name: "Card processing fee" },
          unit_amount: feePence,
        },
        quantity: 1,
      });
    }

    const description = `${input.event_label} — booking ${booking.id.slice(0, 8)}`;

    const session = await stripe.checkout.sessions.create({
      line_items: stripeLineItems,
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: input.return_url,
      customer_email: input.contact_email,
      payment_intent_data: {
        description,
        receipt_email: input.contact_email,
      },
      metadata: {
        booking_id: booking.id,
        event_key: input.event_key,
        ...(userId ? { userId } : {}),
      },
    });

    await supabase
      .from("bookings")
      .update({ stripe_session_id: session.id })
      .eq("id", booking.id);

    return new Response(
      JSON.stringify({
        clientSecret: session.client_secret,
        bookingId: booking.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e) {
    console.error("create-checkout error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
