import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "https://esm.sh/zod@3.23.8";
import { feeLineItemName } from "../_shared/cardFee.ts";
import { orderModules, priceOrder, stripeLines, type ItemRow } from "../_shared/eventOrder.ts";
import { depositAllowed, depositLineName, planMethods, quoteBooking } from "../_shared/eventPricing.ts";
import { eventsStripe, londonToday, sendEventBookingEmails, serviceClient } from "../_shared/stripe-events.ts";

const GuestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  age: z.number().int().min(0).max(120).nullable().optional(),
  is_child: z.boolean(),
  dietary: z.string().trim().max(500).optional().default(""),
  dietary_choice: z.string().trim().max(80).nullable().optional(),
  courses: z.array(z.object({ course_id: z.string().uuid(), option_id: z.string().uuid().nullable(), decide_later: z.boolean().optional() })).max(20).optional(),
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
  plan: z.enum(["full", "deposit"]).optional().default("full"),
  items: z.array(z.object({ item_id: z.string().uuid(), qty: z.number().int().min(0).max(500) })).max(100).optional(),
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
      const holds = (r: any) => r.payment_status === "paid" || r.payment_status === "deposit_paid" ||
        (r.payment_status === "pending" && (r.payment_method === "bank_transfer" || new Date(r.created_at).getTime() > cutoff));
      const taken = (rows ?? []).filter(holds).reduce((s: number, r: any) => s + r.adult_count + r.child_count, 0);
      if (taken + party > ev.capacity) return json({ error: `Sorry, only ${Math.max(0, ev.capacity - taken)} places remain.` }, 409);
    }

    // Server recalculates the whole order from database rows; client totals/labels are never trusted.
    const mods = orderModules(ev.modules, ev.event_type);
    const [coursesRes, optionsRes, catsRes, itemsRes] = await Promise.all([
      mods.courses ? sb.from("event_courses").select("id,menu_set,name,sort_order").eq("event_id", ev.id) : Promise.resolve({ data: [] }),
      mods.courses ? sb.from("event_course_options").select("id,course_id,label,active").eq("event_id", ev.id) : Promise.resolve({ data: [] }),
      mods.catalogue ? sb.from("event_catalogue_categories").select("id,name").eq("event_id", ev.id) : Promise.resolve({ data: [] }),
      mods.catalogue ? sb.from("event_catalogue_items").select("id,category_id,name,price_pence,kind,active,max_per_booking,unit_note").eq("event_id", ev.id) : Promise.resolve({ data: [] }),
    ] as any[]);
    const catName = new Map(((catsRes.data ?? []) as any[]).map((c) => [c.id, c.name]));
    const priced = priceOrder({
      event_type: ev.event_type, modules: ev.modules, fee_cover_enabled: ev.fee_cover_enabled !== false,
      adult_price_pence: ev.adult_price_pence, child_price_pence: ev.child_price_pence,
      courses: coursesRes.data ?? [], options: optionsRes.data ?? [],
      items: ((itemsRes.data ?? []) as any[]).map((i): ItemRow => ({ ...i, category_name: catName.get(i.category_id) ?? null })),
    }, { adults: input.adults, children: input.children, guests: input.guests, items: input.items, method: input.payment_method, coverFee: input.cover_fee });
    if (!priced.ok) return json({ error: priced.error }, 400);
    const order = priced.order;
    const subtotal = order.subtotalPence;
    const isDeposit = input.plan === "deposit";
    if (isDeposit) {
      if (!depositAllowed(ev, londonToday())) return json({ error: "A deposit is not available for this event. Please choose Pay in full." }, 400);
      if (!planMethods("deposit").includes(input.payment_method)) return json({ error: "Deposits can be paid by card or Pay by Bank only." }, 400);
    }
    // Deposit: fee applies to the amount charged now (the deposit), worked out on the whole order.
    const quote = quoteBooking({ orderPence: subtotal, plan: input.plan, depositPercent: Number(ev.deposit_percent), method: input.payment_method, coverFee: order.coverFee });
    const depositPlan = isDeposit && quote.kind === "deposit";
    const chargeNow = depositPlan ? quote.chargePence : subtotal;
    const fee = depositPlan ? quote.feePence : order.feePence;
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
        balance_pence: total, // legacy column, kept as before
        balance_method: input.payment_method,
        reference,
        contact_email: input.contact_email,
        contact_phone: input.contact_phone || null,
        lodge_label: input.lodge_label,
        adult_count: input.adults,
        child_count: input.children,
        subtotal_pence: subtotal,
        tickets_subtotal_pence: order.ticketsPence,
        items_subtotal_pence: order.itemsPence,
        payment_plan: depositPlan ? "deposit" : "full",
        balance_due_pence: subtotal,
        amount_paid_pence: 0,
        balance_due_date: depositPlan ? ev.balance_due_date : null,
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

    // Guests, then course choices and pre-order lines (with snapshots). Any failure removes the booking so no half booking holds seats.
    try {
      const { data: guestRows, error: gErr } = await sb.from("event_guests").insert(input.guests.map((g, i) => ({
        booking_id: booking.id, name: g.name, age: g.age ?? null, is_child: g.is_child, dietary_choice: g.dietary_choice || null,
        allergies: [g.dietary_choice, g.dietary].filter(Boolean).join(" — ") || null,
        ...(order.menuSummaries[i] && { menu_choice: order.menuSummaries[i] }),
      }))).select("id");
      if (gErr) throw gErr;
      const choiceRows = order.guestChoices.flatMap((cs, i) => cs.map((c) => ({
        guest_id: (guestRows as any[])[i].id, booking_id: booking.id, event_id: ev.id, course_id: c.course_id, option_id: c.option_id,
        course_name_snapshot: c.course_name, option_label_snapshot: c.option_label, decide_later: c.decide_later,
      })));
      if (choiceRows.length) { const { error } = await sb.from("event_guest_course_choices").insert(choiceRows); if (error) throw error; }
      if (order.items.length) {
        const { error } = await sb.from("event_booking_items").insert(order.items.map((it) => ({
          booking_id: booking.id, event_id: ev.id, catalogue_item_id: it.id, kind: it.kind, category_name: it.category_name ?? null,
          name_snapshot: it.name, unit_note_snapshot: it.unit_note ?? null, unit_price_pence: it.price_pence, quantity: it.qty,
        })));
        if (error) throw error;
      }
    } catch (e) {
      await sb.from("event_bookings").delete().eq("id", booking.id);
      throw e;
    }

    const { data: payRow, error: payErr } = await sb.from("event_booking_payments").insert({
      booking_id: booking.id, kind: depositPlan ? "deposit" : "full", method: input.payment_method,
      amount_pence: chargeNow, fee_pence: fee, status: "pending",
    }).select("id").maybeSingle();
    if (payErr || !payRow) { await sb.from("event_bookings").delete().eq("id", booking.id); throw payErr ?? new Error("payment row"); }
    const metadata = {
      event_id: ev.id, event_slug: ev.slug, booking_id: booking.id, booking_reference: booking.reference,
      payment_id: payRow.id, payment_kind: depositPlan ? "deposit" : "full",
    };
    const btMetadata = { ...metadata, fee_pence: String(fee), ...(order.itemsPence > 0 && { items_pence: String(order.itemsPence) }) };
    const suffix = ev.statement_descriptor ? String(ev.statement_descriptor).slice(0, 22) : undefined;
    const stripe = eventsStripe();
    const confirmUrl = `${input.origin}/events/${ev.slug}/confirmation?ref=${encodeURIComponent(booking.reference)}&t=${booking.access_token}`;

    if (input.payment_method === "bank_transfer") {
      const customer = await stripe.customers.create({ name: input.contact_name, email: input.contact_email, metadata: btMetadata });
      const pi = await stripe.paymentIntents.create({
        amount: total,
        currency: "gbp",
        customer: customer.id,
        description: stripeName,
        metadata: btMetadata,
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
      await sb.from("event_booking_payments").update({ stripe_payment_intent_id: pi.id }).eq("id", payRow.id);
      await sendEventBookingEmails(sb, booking.id, "booked");
      return json({ reference: booking.reference, token: booking.access_token, confirm_url: confirmUrl });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: input.contact_email,
      payment_method_types: input.payment_method === "card" ? ["card"] : ["pay_by_bank"],
      line_items: depositPlan
        ? [
            { quantity: 1, price_data: { currency: "gbp", unit_amount: chargeNow, product_data: { name: `${stripeName} — ${depositLineName(Number(ev.deposit_percent), subtotal)}` } } },
            ...(fee > 0 ? [{ quantity: 1, price_data: { currency: "gbp", unit_amount: fee, product_data: { name: feeLineItemName(input.payment_method) } } }] : []),
          ]
        : stripeLines({
            stripeName, adults: input.adults, children: input.children, adultPence: ev.adult_price_pence, childPence: ev.child_price_pence,
            items: order.items, feePence: fee, feeName: feeLineItemName(input.payment_method),
          }),
      metadata,
      client_reference_id: booking.id,
      payment_intent_data: { description: stripeName, metadata, ...(suffix && { statement_descriptor_suffix: suffix }) },
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60, // session dies with the 30-minute seat hold
      success_url: confirmUrl,
      cancel_url: `${input.origin}/events/${ev.slug}?cancelled=1`,
    } as any);
    await sb.from("event_bookings").update({ stripe_session_id: session.id }).eq("id", booking.id);
    await sb.from("event_booking_payments").update({ stripe_session_id: session.id }).eq("id", payRow.id);
    return json({ reference: booking.reference, token: booking.access_token, url: session.url });
  } catch (e) {
    console.error("create-event-checkout error", e);
    return json({ error: "Sorry, we could not start your booking. Please try again or contact the Secretary." }, 500);
  }
});
