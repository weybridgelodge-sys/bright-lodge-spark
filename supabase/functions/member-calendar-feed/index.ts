// Personal per-member calendar subscription feed.
// Reached at /functions/v1/member-calendar-feed?token=... (no JWT required —
// the token itself is the credential). Returns a live iCalendar document that
// merges lodge_events, festive_board_meetings, lodge_socials, and the editable
// loi_schedule_entries LOI schedule. Lodge Visits are intentionally excluded.
//
// Times are emitted as floating local times with TZID=Europe/London plus a
// VTIMEZONE block. This is deliberate — Deno runs in UTC, so anything built
// with `new Date(y,m,d)` / `setHours()` / bare "YYYY-MM-DDTHH:MM:SS" strings
// would otherwise be treated as UTC and appear one hour late during BST when
// the calendar client rewinds it to London local time.

import { createClient } from "npm:@supabase/supabase-js@2";
import { loadLodgeSettings } from "../_shared/lodgeSettings.ts";
import { londonToday } from "../_shared/publicEventCalendar.ts";
import { buildFeed, feedLodgeFrom } from "./ics.ts";
import { feedUnitFor, scopeRows } from "./unit.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") ?? "";
    if (!token) {
      return new Response("Missing token", { status: 400, headers: cors });
    }

    const backendUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!backendUrl || !serviceKey) throw new Error("Calendar configuration unavailable");
    const admin = createClient(backendUrl, serviceKey);

    const { data: tokenRow, error: tokErr } = await admin
      .from("member_calendar_tokens")
      .select("member_id")
      .eq("token", token)
      .maybeSingle();
    if (tokErr) throw tokErr;
    if (!tokenRow) return new Response("Invalid token", { status: 403, headers: cors });

    const { data: prof } = await admin
      .from("profiles")
      .select("id,status,unit_id")
      .eq("id", (tokenRow as any).member_id)
      .maybeSingle();
    if (!prof || (prof as any).status !== "active") {
      return new Response("Not an active member", { status: 403, headers: cors });
    }
    // The lodge comes from the token's member only; blank = refuse, never a default.
    const unit = feedUnitFor(prof);
    if (!unit.ok) return new Response(unit.message, { status: 403, headers: cors });
    const unitId = unit.unitId;

    admin.from("member_calendar_tokens")
      .update({ last_fetched_at: new Date().toISOString() })
      .eq("member_id", (tokenRow as any).member_id)
      .then(() => {}, () => {});

    const lodge = feedLodgeFrom(await loadLodgeSettings(unitId));
    const fromIso = new Date(Date.now() - 365 * 86400_000).toISOString();
    const toIso = new Date(Date.now() + 2 * 365 * 86400_000).toISOString();

    const [eventsRes, meetingsRes, socialsRes, officersRes, loiRes, publicRes, unitsRes] = await Promise.all([
      // All events in range; buildFeed shows unpublished/archived ones only via a linked meeting (JOB DF).
      admin.from("lodge_events")
        .select("id,slug,title,event_date,tyling_time,location,intro,unit_id,published,archived_at")
        .gte("event_date", fromIso)
        .lte("event_date", toIso),
      // Every non-cancelled meeting, any status (JOB DF).
      admin.from("festive_board_meetings")
        .select("id,event_key,meeting_date,meeting_type,notes,status,unit_id")
        .is("cancelled_at", null)
        .eq("unit_id", unitId)
        .gte("meeting_date", fromIso.slice(0, 10)),
      admin.from("lodge_socials")
        .select("id,title,starts_at,ends_at,venue,description,unit_id")
        .gte("starts_at", fromIso),
      admin.from("summonses")
        .select("id,officer_night_date,officer_night_venue,meeting_date,unit_id")
        .not("officer_night_date", "is", null)
        .gte("officer_night_date", fromIso.slice(0, 10)),
      admin.from("loi_schedule_entries")
        .select("id,title,event_date,time_from,time_to,venue,description,unit_id")
        .gte("event_date", fromIso.slice(0, 10))
        .lte("event_date", toIso.slice(0, 10)),
      admin.from("public_events")
        .select("id,slug,public_title,name,event_date,start_time,end_time,venue,intro_copy,unit_id")
        .gte("event_date", londonToday())
        .lte("event_date", toIso.slice(0, 10)),
      admin.from("units").select("id"),
    ]);
    if (eventsRes.error) throw eventsRes.error;
    if (meetingsRes.error) throw meetingsRes.error;
    if (loiRes.error) throw loiRes.error;
    if (publicRes.error) throw publicRes.error;
    if (unitsRes.error) throw unitsRes.error;

    const rows = scopeRows({
      events: eventsRes.data ?? [], meetings: meetingsRes.data ?? [], socials: socialsRes.data ?? [],
      officers: officersRes.data ?? [], loi: loiRes.data ?? [], publicRows: publicRes.data ?? [],
    }, unitId, (unitsRes.data ?? []).length === 1);
    const body = buildFeed(rows, lodge);

    return new Response(body, {
      status: 200,
      headers: {
        ...cors,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `inline; filename="${lodge.file}.ics"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("member-calendar-feed error", e);
    return new Response(`Error: ${(e as Error).message}`, { status: 500, headers: cors });
  }
});
