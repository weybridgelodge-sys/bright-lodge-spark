// Bulk member import (admin or current Secretary). Safe to re-run:
// - matches existing members by email, then Grand Lodge number
// - creates new members (sign-in + profile) like "Pre-create a member"
// - for existing members only fills blank fields; never overwrites,
//   never touches roles, sign-in email or status
// - dry_run: true returns the per-row plan without writing anything
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { composeFullName, fillBlanks, normaliseHeader, validateRow } from "../_shared/memberImport.ts";

const MAX_ROWS = 250;
const Body = z.object({
  dry_run: z.boolean().default(true),
  rows: z.array(z.record(z.string(), z.string().max(1000))).min(1).max(MAX_ROWS),
});

type Result = { row: number; email: string; action: "create" | "fill" | "unchanged" | "error"; fields?: string[]; message?: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userRes, error: uerr } = await userClient.auth.getUser();
    if (uerr || !userRes.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(url, service);
    const { data: isAdmin, error: rerr } = await admin.rpc("has_role", { _user_id: userRes.user.id, _role: "admin" });
    if (rerr) return json({ error: rerr.message }, 500);
    let allowed = isAdmin === true;
    if (!allowed) {
      const { data: sec, error: serr } = await admin.rpc("is_lodge_secretary", { _user: userRes.user.id });
      if (serr) return json({ error: serr.message }, 500);
      allowed = sec === true;
    }
    if (!allowed) return json({ error: "Forbidden — admin or Secretary only" }, 403);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: `Invalid import — ${parsed.error.issues[0]?.message ?? "check the file"} (max ${MAX_ROWS} rows)` }, 400);
    const { dry_run, rows } = parsed.data;

    // Load existing members once (service role; never returned to the caller beyond field names).
    const { data: existing, error: eerr } = await admin.from("profiles").select("*");
    if (eerr) return json({ error: eerr.message }, 500);
    const byEmail = new Map<string, Record<string, unknown>>();
    const byUgle = new Map<string, Record<string, unknown>>();
    for (const p of existing ?? []) {
      if (p.email) byEmail.set(String(p.email).toLowerCase(), p);
      if (p.ugle_reg_number) byUgle.set(String(p.ugle_reg_number).trim(), p);
    }

    const results: Result[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < rows.length; i++) {
      const raw: Record<string, string> = {};
      for (const [k, v] of Object.entries(rows[i])) raw[normaliseHeader(k)] = v;
      const { record, errors } = validateRow(raw);
      const rowNo = i + 2; // header is row 1
      if (!record) { results.push({ row: rowNo, email: raw.email ?? "", action: "error", message: errors.join("; ") }); continue; }
      if (seen.has(record.email)) { results.push({ row: rowNo, email: record.email, action: "error", message: "duplicate email in this file" }); continue; }
      seen.add(record.email);

      const match = byEmail.get(record.email) ?? (record.ugle_reg_number ? byUgle.get(String(record.ugle_reg_number)) : undefined);
      if (match) {
        const patch = fillBlanks(match, record);
        const fields = Object.keys(patch);
        if (!fields.length) { results.push({ row: rowNo, email: record.email, action: "unchanged" }); continue; }
        if (patch.title || patch.first_name || patch.last_name) {
          patch.full_name = composeFullName(patch.title ?? match.title, patch.first_name ?? match.first_name, patch.last_name ?? match.last_name);
        }
        if (!dry_run) {
          const { error } = await admin.from("profiles").update(patch).eq("id", match.id as string);
          if (error) { results.push({ row: rowNo, email: record.email, action: "error", message: error.message }); continue; }
          Object.assign(match, patch);
        }
        results.push({ row: rowNo, email: record.email, action: "fill", fields });
        continue;
      }

      // New member
      const fields = Object.entries(record).filter(([k, v]) => k !== "email" && v !== null && v !== false).map(([k]) => k);
      if (!dry_run) {
        const full_name = composeFullName(record.title, record.first_name, record.last_name);
        const { data: created, error: cerr } = await admin.auth.admin.createUser({
          email: record.email, email_confirm: true, user_metadata: { full_name },
        });
        if (cerr || !created.user) { results.push({ row: rowNo, email: record.email, action: "error", message: cerr?.message ?? "Could not create sign-in" }); continue; }
        const profile: Record<string, unknown> = { full_name, email: record.email };
        for (const [k, v] of Object.entries(record)) if (k !== "email" && v !== null) profile[k] = v;
        profile.degree = record.degree ?? "master_mason";
        profile.status = record.status ?? "active";
        const { error: perr } = await admin.from("profiles").update(profile).eq("id", created.user.id);
        if (perr) { results.push({ row: rowNo, email: record.email, action: "error", message: `Sign-in created but details not saved: ${perr.message}` }); continue; }
        byEmail.set(record.email, { ...profile, id: created.user.id });
        if (record.ugle_reg_number) byUgle.set(String(record.ugle_reg_number), { ...profile, id: created.user.id });
      }
      results.push({ row: rowNo, email: record.email, action: "create", fields });
    }

    const count = (a: Result["action"]) => results.filter((r) => r.action === a).length;
    return json({ ok: true, dry_run, summary: { create: count("create"), fill: count("fill"), unchanged: count("unchanged"), error: count("error") }, results });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
