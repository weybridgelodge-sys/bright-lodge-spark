// almoner-widow-report — drafts short "Widows & Dependants" lines for the
// Almoner's Report from the widows contact log (and gifts sent) in a window.
// Returns JSON only; never writes. Access: can_edit_almoner (Almoner,
// Secretary, admin). Widows with nothing new in the window are never sent to
// the AI and never listed. Only names, contact notes and gift types are sent —
// no addresses, phone numbers, dates of birth or next-of-kin details.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const TYPE: Record<string, string> = { phone: "phone call", visit: "visit", card: "card", letter: "letter", gift: "gift", other: "other" };

const SYSTEM = `You are the Almoner of a Masonic Lodge drafting the widows section of your short spoken report to the Lodge meeting.
For each widow given, write ONE short, warm, plain-English line (one or two sentences, at most 40 words) saying what is genuinely new, in the style of: "Doris has not been too well.", "Ann has now moved into a care home.", "Betty thanks the Lodge for her gift."
Rules:
- Refer to her by the name given (her preferred form of address). Never include addresses, phone numbers, ages, medical detail beyond a gentle summary, or the names of officers who made contact.
- Only use what the notes support. Do not invent. If the notes contain nothing reportable, omit that widow.
- Masonic titles exactly "W Bro." and "RW Bro.".
Respond with STRICT JSON only: {"lines":[{"widow_id": string, "text": string}]}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Missing auth" }, 401);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);
    const { data: canEdit, error: permErr } = await userClient.rpc("can_edit_almoner", { _user_id: user.id });
    if (permErr || canEdit !== true) return json({ error: "Not permitted" }, 403);

    const body = await req.json().catch(() => ({}));
    const from = String(body?.from ?? ""), to = String(body?.to ?? "");
    if (!ISO.test(from) || !ISO.test(to) || from > to) return json({ error: "Provide a valid from/to date range" }, 400);

    // Reads go through the caller's own permissions (RLS).
    const [w, c, g] = await Promise.all([
      userClient.from("almoner_widows").select("id,full_name,preferred_address,status"),
      userClient.from("almoner_widow_contacts").select("widow_id,contact_date,contact_type,notes,welfare_concern")
        .gte("contact_date", from).lte("contact_date", to).order("contact_date"),
      userClient.from("almoner_widow_gifts").select("widow_id,gift_type,description,date_sent")
        .gte("date_sent", from).lte("date_sent", to),
    ]);
    if (w.error || c.error || g.error) return json({ error: "Could not read the register" }, 500);

    const byWidow = new Map<string, string[]>();
    for (const r of c.data ?? []) {
      const list = byWidow.get(r.widow_id) ?? [];
      list.push(`${r.contact_date} ${TYPE[r.contact_type] ?? r.contact_type}${r.welfare_concern ? " [welfare concern]" : ""}: ${(r.notes ?? "").slice(0, 1500) || "(no notes)"}`);
      byWidow.set(r.widow_id, list);
    }
    for (const r of g.data ?? []) {
      const list = byWidow.get(r.widow_id) ?? [];
      list.push(`${r.date_sent} the Lodge sent her a gift (${r.gift_type === "other" && r.description ? r.description : r.gift_type})`);
      byWidow.set(r.widow_id, list);
    }
    const widows = (w.data ?? []).filter((x) => byWidow.has(x.id));
    if (widows.length === 0) return json({ lines: [], considered: 0 });

    const nameOf = new Map(widows.map((x) => [x.id, (x.preferred_address?.trim() || x.full_name).slice(0, 120)]));
    const prompt = widows.map((x) =>
      `widow_id: ${x.id}\nname: ${nameOf.get(x.id)}${x.status === "deceased" ? "\n(note: she has since died)" : ""}\nentries:\n- ${byWidow.get(x.id)!.join("\n- ")}`
    ).join("\n\n");

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    let aiRes: Response;
    try {
      aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST", signal: ctrl.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}` },
        body: JSON.stringify({
          model: "openai/gpt-6-astra",
          response_format: { type: "json_object" },
          messages: [{ role: "system", content: SYSTEM }, { role: "user", content: `Period ${from} to ${to}.\n\n${prompt}\n\nReturn the strict JSON now.` }],
        }),
      });
    } catch {
      return json({ error: "Drafting timed out — please try again." }, 504);
    } finally { clearTimeout(timer); }

    if (aiRes.status === 429) return json({ error: "Too many requests — please wait a moment and try again." }, 429);
    if (aiRes.status === 402) return json({ error: "AI credits have run out for this workspace." }, 402);
    if (!aiRes.ok) return json({ error: `Drafting failed (${aiRes.status})` }, 502);

    const payload = await aiRes.json();
    const raw = String(payload?.choices?.[0]?.message?.content ?? "").replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    let parsed: { lines?: { widow_id?: string; text?: string }[] };
    try { parsed = JSON.parse(raw); } catch { return json({ error: "The draft could not be read — please try again." }, 502); }

    const order = widows.map((x) => x.id);
    const lines = (parsed.lines ?? [])
      .filter((l) => l?.widow_id && nameOf.has(l.widow_id) && String(l.text ?? "").trim())
      .map((l) => ({ widow_id: l.widow_id!, name: nameOf.get(l.widow_id!)!, text: String(l.text).trim().slice(0, 600) }))
      .filter((l, i, a) => a.findIndex((x) => x.widow_id === l.widow_id) === i)
      .sort((a, b) => order.indexOf(a.widow_id) - order.indexOf(b.widow_id));
    return json({ lines, considered: widows.length });
  } catch (e) {
    console.error("almoner-widow-report error", (e as Error).message);
    return json({ error: "Unexpected error" }, 500);
  }
});
