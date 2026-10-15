import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "https://esm.sh/zod@3.23.8";
import { serviceClient, londonToday } from "../_shared/stripe-events.ts";
import { loadByBalanceToken } from "../_shared/eventBalanceAccess.ts";
import { isOverdue } from "../_shared/eventPricing.ts";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const INVALID = { error: "This link is no longer valid. Please contact the Secretary if you think this is wrong." };
const Body = z.object({
  token: z.string().max(100),
  action: z.enum(["get", "choices"]).default("get"),
  choices: z.array(z.object({ choice_id: z.string().uuid(), option_id: z.string().uuid() })).max(200).optional(),
  website: z.string().max(0).optional().default(""),
});

// Public: open a balance / course-choice link. Returns only what the booker needs.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const p = Body.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return json(INVALID, 404);
  const sb = serviceClient();
  const ctx = await loadByBalanceToken(sb, p.data.token);
  if (!ctx) return json(INVALID, 404);
  const { booking: b, ev } = ctx;

  if (p.data.action === "choices") {
    const picks = p.data.choices ?? [];
    if (!picks.length) return json({ error: "Please choose at least one dish." }, 400);
    const { data: rows } = await sb.from("event_guest_course_choices").select("id,guest_id,course_id,decide_later").eq("booking_id", b.id);
    const { data: opts } = await sb.from("event_course_options").select("id,course_id,label,active").eq("event_id", ev.id);
    const touched = new Set<string>();
    for (const pick of picks) {
      const row = (rows ?? []).find((r: any) => r.id === pick.choice_id);
      const opt = (opts ?? []).find((o: any) => o.id === pick.option_id);
      if (!row || !row.decide_later || !opt || !opt.active || opt.course_id !== row.course_id) return json({ error: "One of the menu choices is no longer available. Please choose again." }, 400);
      const { error } = await sb.from("event_guest_course_choices").update({ option_id: opt.id, option_label_snapshot: opt.label, decide_later: false }).eq("id", row.id).eq("decide_later", true);
      if (error) throw error;
      touched.add(row.guest_id);
    }
    // Refresh each guest's readable menu summary (same wording as at booking).
    for (const gid of touched) {
      const { data: all } = await sb.from("event_guest_course_choices").select("course_name_snapshot,option_label_snapshot,decide_later,course_id").eq("guest_id", gid);
      const made = (all ?? []).filter((c: any) => !c.decide_later).map((c: any) => `${c.course_name_snapshot}: ${c.option_label_snapshot}`);
      const later = (all ?? []).filter((c: any) => c.decide_later).map((c: any) => c.course_name_snapshot);
      const summary = [made.join("; "), later.length ? `(decide later: ${later.join(", ")})` : ""].filter(Boolean).join(" ") || null;
      await sb.from("event_guests").update({ menu_choice: summary }).eq("id", gid);
    }
    return json({ ok: true });
  }

  const { data: choices } = await sb.from("event_guest_course_choices").select("id,guest_id,course_id,course_name_snapshot").eq("booking_id", b.id).eq("decide_later", true);
  const guestIds = [...new Set((choices ?? []).map((c: any) => c.guest_id))];
  const [{ data: guests }, { data: options }] = await Promise.all([
    guestIds.length ? sb.from("event_guests").select("id,name,is_child").in("id", guestIds) : Promise.resolve({ data: [] }),
    (choices ?? []).length ? sb.from("event_course_options").select("id,course_id,label,description,sort_order").eq("event_id", ev.id).eq("active", true).order("sort_order") : Promise.resolve({ data: [] }),
  ] as any[]);
  const today = londonToday();
  return json({
    reference: b.reference, name: b.payer_name, event_title: ev.public_title || ev.name, event_date: ev.event_date, event_slug: ev.slug,
    order_pence: b.subtotal_pence ?? b.total_pence, amount_paid_pence: b.amount_paid_pence ?? 0,
    balance_due_pence: ctx.balanceOpen ? b.balance_due_pence : 0, balance_due_date: b.balance_due_date,
    overdue: ctx.balanceOpen && isOverdue(b.balance_due_date, today, b.balance_due_pence),
    can_pay: ctx.balanceOpen, fee_cover_enabled: ev.fee_cover_enabled !== false, methods: ["card", "pay_by_bank"],
    undecided: (guests ?? []).map((g: any) => ({
      guest_name: g.name, is_child: g.is_child,
      courses: (choices ?? []).filter((c: any) => c.guest_id === g.id).map((c: any) => ({
        choice_id: c.id, course_name: c.course_name_snapshot,
        options: (options ?? []).filter((o: any) => o.course_id === c.course_id).map((o: any) => ({ id: o.id, label: o.label, description: o.description })),
      })),
    })),
  });
});
