import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "https://esm.sh/zod@3.23.8";
import { eventFeePence } from "../_shared/cardFee.ts";
import { eventsStripe, sendEventBookingEmails, serviceClient } from "../_shared/stripe-events.ts";

const GuestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  age: z.number().int().min(0).max(120).nullable().optional(),
  is_child: z.boolean(),
  dietary: z.string().trim().max(500).optional().default(""),
  dietary_choice: z.string().trim().max(80).nullable().optional(),
});

const BodySchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{1,80}$/),
  contact_name: z.string().trim().min(1).max(200),
  contact_email: z.string().trim().email().max(255),
  contact_phone: z.string().trim().max(40).optional().default(""),
  lodge_label: z.enum(["Weybridge", "Astolat", "Other", "Guest"]),
  adults: z.number().int().min(0).max(50),
  children: z.number().int().min(0).max(50),
  guests: z.array(GuestSchema).max(100),
  payment_method: z.enum(["card", "pay_by_bank", "bank_transfer"]),
  cover_fee: z.boolean().default(false),
  origin: z.string().url(),
  website: z.string().max(0).optional().default(""), // honeypot
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Please check the form and try again.", details: parsed.error.flatten().fieldErrors }, 400);
    const input = parsed.data;
    const party = input.adults + input.children;
    if (party < 1) return json({ error: "Please add at least one guest." }, 400);
    if (input.guests.length !== party) return json({ error: "Please give a name for every guest." }, 400);
    if (input.guests.filter((g) => g.is_child).length !== input.children) return json({ error: "Guest list does not match the number of children." }, 400);
    if (input.guests.some((g) => g.is_child && (g.age == null || g.age > 12))) return json({ error: "Children must be aged 12 and under." }, 400);

    const sb = serviceClient();
    const { data: ev } = await sb.from("event_accounts").select("*").eq("slug", input.slug).eq("is_public", true).is("archived_at", null).maybeSingle();
    if (!ev) return json({ error: "Event not found." }, 404);
    if (ev.adult_price_pence == null || ev.child_price_pence == null) return json({ error: "Booking is not open yet." }, 409);
    const deadline = ev.booking_deadline ? new Date(ev.booking_deadline) : new Date(`${ev.event_date}T23:59:59Z`);
    if (new Date() > deadline) return json({ error: "Booking for this event has closed." }, 409);
    if (ev.capacity != null) {
      const { data: rows } = await sb.from("event_bookings").select("adult_count,child_count,payment_status,payment_method,created_at")
        .eq("event_id", ev.id).eq("source", "public");
      // Paid bookings and pending bank transfers hold seats; unpaid card/Pay by Bank holds lapse after 30 minutes.
      const cutoff = Date.now() - 30 * 60 * 1000;
      const holds = (r: any) => r.payment_status === "paid" ||
        (r.payment_status === "pending" && (r.payment_method === "bank_transfer" || new Date(r.created_at).getTime() > cutoff));
      const taken = (rows ?? []).filter(holds).reduce((s: number, r: any) => s + r.adult_count + r.child_count, 0);
      if (taken + party > ev.capacity) return json({ error: `Sorry, only ${Math.max(0, ev.capacity - taken)} places remain.` }, 409);
    }

    const subtotal = input.adults * ev.adult_price_pence + input.children * ev.child_price_pence;
    // Server recalculates the fee itself from cover_fee; card only.
    const fee = eventFeePence(subtotal, input.payment_method, input.cover_fee);
    const total = subtotal + fee;
    const title = ev.public_title || ev.name;
    const stripeName = ev.name || title; // Accounts name for Stripe descriptions/line items
    const prefix = (ev.reference_prefix || "EVT").toUpperCase();

    // Create booking with a sequential reference (retry on collision).
    let booking: any = null;
    for (let attempt = 0; attempt < 5 && !booking; attempt++) {
      const { count } = await sb.from("event_bookings").select("id", { count: "exact", head: true }).like("reference", `${prefix}-%`);
      const reference = `${prefix}-${String((count ?? 0) + 1 + attempt).padStart(4, "0")}`;
      const { data, error } = await sb.from("event_bookings").insert({
        event_id: ev.id,
        payer_name: input.contact_name,
        ticket_count: party,
        deposit_pence: 0,
        balance_pence: total,
        balance_method: input.payment_method,
        reference,
        contact_email: input.contact_email,
        contact_phone: input.contact_phone || null,
        lodge_label: input.lodge_label,
        adult_count: input.adults,
        child_count: input.children,
        subtotal_pence: subtotal,
        fee_pence: fee,
        total_pence: total,
        payment_method: input.payment_method,
        payment_status: "pending",
        source: "public",
      }).select("*").maybeSingle();
      if (!error) booking = data;
      else if (error.code !== "23505") throw error;
    }
    if (!booking) throw new Error("Could not allocate a booking reference");

    await sb.from("event_guests").insert(input.guests.map((g) => ({
      booking_id: booking.id, name: g.name, age: g.age ?? null, is_child: g.is_child, dietary_choice: g.dietary_choice || null,
      allergies: [g.dietary_choice, g.dietary].filter(Boolean).join(" — ") || null,
    })));

    const metadata = { event_id: ev.id, event_slug: ev.slug, booking_id: booking.id, booking_reference: booking.reference };
    const suffix = ev.statement_descriptor ? String(ev.statement_descriptor).slice(0, 22) : undefined;
    const stripe = eventsStripe();
    const confirmUrl = `${input.origin}/events/${ev.slug}/confirmation?ref=${encodeURIComponent(booking.reference)}&t=${booking.access_token}`;

    if (input.payment_method === "bank_transfer") {
      const customer = await stripe.customers.create({ name: input.contact_name, email: input.contact_email, metadata });
      const pi = await stripe.paymentIntents.create({
        amount: total,
        currency: "gbp",
        customer: customer.id,
        description: stripeName,
        metadata,
        ...(suffix && { statement_descriptor_suffix: suffix }),
        payment_method_types: ["customer_balance"],
        payment_method_data: { type: "customer_balance" },
        payment_method_options: { customer_balance: { funding_type: "bank_transfer", bank_transfer: { type: "gb_bank_transfer" } } },
        confirm: true,
      } as any);
      const instr: any = (pi as any).next_action?.display_bank_transfer_instructions;
      const addr = instr?.financial_addresses?.find((a: any) => a.sort_code)?.sort_code;
      const bank = instr ? {
        account_holder_name: addr?.account_holder_name ?? null,
        sort_code: addr?.sort_code ?? null,
        account_number: addr?.account_number ?? null,
        reference: instr.reference ?? null,
        amount_pence: instr.amount_remaining ?? total,
      } : null;
      await sb.from("event_bookings").update({
        stripe_customer_id: customer.id, stripe_payment_intent_id: pi.id, bank_instructions: bank,
      }).eq("id", booking.id);
      await sendEventBookingEmails(sb, booking.id, "booked");
      return json({ reference: booking.reference, token: booking.access_token, confirm_url: confirmUrl });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: input.contact_email,
      payment_method_types: input.payment_method === "card" ? ["card"] : ["pay_by_bank"],
      line_items: [
        ...(input.adults ? [{ quantity: input.adults, price_data: { currency: "gbp", unit_amount: ev.adult_price_pence, product_data: { name: `${stripeName} — adult` } } }] : []),
        ...(input.children ? [{ quantity: input.children, price_data: { currency: "gbp", unit_amount: ev.child_price_pence, product_data: { name: `${stripeName} — child (12 and under)` } } }] : []),
        ...(fee > 0 ? [{ quantity: 1, price_data: { currency: "gbp", unit_amount: fee, product_data: { name: "Card processing fee" } } }] : []),
      ],
      metadata,
      client_reference_id: booking.id,
      payment_intent_data: { description: stripeName, metadata, ...(suffix && { statement_descriptor_suffix: suffix }) },
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60, // session dies with the 30-minute seat hold
      success_url: confirmUrl,
      cancel_url: `${input.origin}/events/${ev.slug}?cancelled=1`,
    } as any);
    await sb.from("event_bookings").update({ stripe_session_id: session.id }).eq("id", booking.id);
    return json({ reference: booking.reference, token: booking.access_token, url: session.url });
  } catch (e) {
    console.error("create-event-checkout error", e);
    return json({ error: "Sorry, we could not start your booking. Please try again or contact the Secretary." }, 500);
  }
});
