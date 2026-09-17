// generate-minutes-from-transcript — turn a raw Plaud/AI meeting transcript into
// structured minutes (sections, action items, apologies) for the Minutes module.
//
// Never writes to meeting_minutes: it only returns JSON. The frontend inserts a
// fresh draft row from the result, so no existing record can be overwritten.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// The manually reviewed 10 September committee minutes — used read-only as a
// few-shot example so generated minutes match the lodge's house style.
const EXEMPLAR_ID = "3c390d34-cf3c-4d3b-8b2a-a410b7c8f324";

type AgendaItem = { label?: string; children?: AgendaItem[] };

function flattenAgenda(items: AgendaItem[], depth = 0): string[] {
  const out: string[] = [];
  for (const it of items ?? []) {
    if (it?.label) out.push(depth > 0 ? `— ${it.label}` : it.label);
    if (Array.isArray(it?.children) && it.children.length) {
      out.push(...flattenAgenda(it.children, depth + 1));
    }
  }
  return out;
}

const BASE_RULES = `You are the Secretary of a Masonic Lodge writing the formal minutes of a meeting from its recording transcript.

Rules:
- Write measured, formal minute prose in the past tense. Record decisions, reports and outcomes — not dialogue, chatter or verbatim quotes.
- Masonic titles must be written exactly as "W Bro." and "RW Bro." (space and full stop).
- Each section's "body" MUST separate distinct points, reports or decisions with a blank line ("\\n\\n") between them. Never return one dense block of text per section.
- "apologies" lists only the brethren who sent apologies for absence, as a short sentence or comma list.
- "previous_minutes_note" records the confirmation (and any amendment) of the previous meeting's minutes. Empty string if the transcript does not cover it.
- "action_items" capture tasks agreed in the meeting: task, the person responsible, a deadline as an ISO date (YYYY-MM-DD) or an empty string if none was given, and done: false.
- Infer deadlines from dates mentioned anywhere in the transcript, not only from explicit statements of a deadline. If a date is given for an event (an Installation, a meeting, a ceremony, a festive board) and a task is described as needing to happen "before", "ahead of", "in good time for", "in advance of" or "ready for" that event, use that event's date as the task's deadline. Read the transcript for contextual timing cues the way a competent Secretary would, and only leave a deadline empty when no related date can reasonably be derived.
- "next_meeting_date" is an ISO date if a next meeting date was agreed, otherwise null.
- Do not invent content that is not supported by the transcript.

Respond with STRICT JSON only — no markdown, no code fences, no commentary — matching exactly:
{"apologies": string, "previous_minutes_note": string, "sections": [{"heading": string, "body": string}], "action_items": [{"task": string, "responsible": string, "deadline": string, "done": boolean}], "next_meeting_date": string | null}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const allowed = (roles ?? []).some((r: { role: string }) =>
      ["admin", "secretary", "assistant_secretary", "worshipful_master"].includes(r.role)
    );
    if (!allowed) return json({ error: "Forbidden" }, 403);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;


    const body = await req.json().catch(() => ({}));
    const transcript_text: string = (body.transcript_text ?? "").toString();
    const meeting_type: string = body.meeting_type === "lodge" ? "lodge" : "committee";
    const meeting_date: string = (body.meeting_date ?? "").toString();
    const lodge_event_id: string | undefined = body.lodge_event_id || undefined;
    const agenda_text: string = (body.agenda_text ?? "").toString();

    if (!transcript_text.trim()) return json({ error: "transcript_text required" }, 400);
    if (!meeting_date) return json({ error: "meeting_date required" }, 400);

    let structure = "";

    if (meeting_type === "lodge") {
      if (!lodge_event_id) return json({ error: "lodge_event_id required for a Lodge meeting" }, 400);
      const { data: summonses } = await admin
        .from("summonses")
        .select("agenda")
        .eq("lodge_event_id", lodge_event_id)
        .order("created_at", { ascending: false })
        .limit(1);
      const agenda = (summonses as { agenda?: AgendaItem[] }[] | null)?.[0]?.agenda;
      const labels = flattenAgenda(Array.isArray(agenda) ? agenda : []);
      if (labels.length === 0) {
        return json({ error: "No Summons agenda found for that meeting — create the Summons first, or use a Committee meeting." }, 400);
      }
      structure = `This is a regular Lodge meeting. Its Summons agenda is fixed — produce EXACTLY one section per agenda item below, in this order, using the agenda item text as the section heading, and record the outcome of that item in the body. If the transcript says nothing about an item, write "No business was transacted under this item." as the body.

Agenda:
${labels.map((l, i) => `${i + 1}. ${l}`).join("\n")}`;
    } else {
      // Fetch the reviewed exemplar live so it stays in sync if it is refined.
      const { data: ex } = await admin
        .from("meeting_minutes")
        .select("transcript_text,sections,action_items,apologies,previous_minutes_note")
        .eq("id", EXEMPLAR_ID)
        .maybeSingle();

      if (ex) {
        const excerpt = (ex.transcript_text ?? "").slice(0, 12000);
        structure = `This is a Lodge Committee meeting. Choose section headings that reflect the business actually discussed, following the granularity, heading style and prose tone of the worked example below (a previous committee meeting from this Lodge, reviewed and approved by the Secretary).

WORKED EXAMPLE — transcript excerpt:
"""
${excerpt}
"""

WORKED EXAMPLE — the approved minutes produced from it:
${JSON.stringify({
          apologies: ex.apologies ?? "",
          previous_minutes_note: ex.previous_minutes_note ?? "",
          sections: ex.sections ?? [],
          action_items: ex.action_items ?? [],
        }, null, 2)}

Match that style. Do not copy its content.`;
      } else {
        structure = `This is a Lodge Committee meeting. Choose section headings that reflect the business actually discussed, typically including Matters Arising, Update and Confirmation of Lodge Officers, meeting arrangements, and any other business.`;
      }

      if (agenda_text.trim()) {
        structure += `\n\nThe pre-meeting agenda for this Committee meeting (may include a proposed date for the next meeting, which should be used for next_meeting_date if the transcript doesn't state one explicitly):\n"""\n${agenda_text.trim()}\n"""`;
      }
    }

    const system = `${BASE_RULES}\n\n${structure}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        reasoning_effort: "low",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: `Meeting date: ${meeting_date}\n\nTranscript:\n"""\n${transcript_text}\n"""\n\nReturn the strict JSON object now.`,
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const detail = await aiRes.text().catch(() => "");
      return json({ error: `Generation failed (${aiRes.status})`, detail }, aiRes.status === 429 ? 429 : 502);
    }

    const payload = await aiRes.json();
    const raw: string = (payload?.choices?.[0]?.message?.content ?? "").toString().trim();

    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return json({ error: "The model did not return valid JSON.", parse_error: true, raw }, 200);
    }

    const sections = Array.isArray(parsed.sections)
      ? (parsed.sections as Record<string, unknown>[])
          .map((s) => ({ heading: String(s?.heading ?? "").trim(), body: String(s?.body ?? "").trim() }))
          .filter((s) => s.heading || s.body)
      : [];

    if (sections.length === 0) {
      return json({ error: "The model returned no sections.", parse_error: true, raw }, 200);
    }

    const action_items = Array.isArray(parsed.action_items)
      ? (parsed.action_items as Record<string, unknown>[])
          .map((a) => ({
            task: String(a?.task ?? "").trim(),
            responsible: String(a?.responsible ?? "").trim(),
            deadline: /^\d{4}-\d{2}-\d{2}$/.test(String(a?.deadline ?? "")) ? String(a.deadline) : "",
            done: a?.done === true,
          }))
          .filter((a) => a.task)
      : [];

    const nmd = String(parsed.next_meeting_date ?? "");

    return json({
      apologies: String(parsed.apologies ?? "").trim(),
      previous_minutes_note: String(parsed.previous_minutes_note ?? "").trim(),
      sections,
      action_items,
      next_meeting_date: /^\d{4}-\d{2}-\d{2}$/.test(nmd) ? nmd : null,
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});
