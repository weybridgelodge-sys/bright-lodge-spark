// send-event-invite — sends a calendar-invite email via Resend with an
// .ics attachment (and optional PDF attachment from Supabase Storage).
// Reused by three modules: Officers Night (auto), Ad-hoc Socials, Lodge Visits.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
// Resend-verified sender domain. Kept separate from email.weybridgelodge.org.uk
// (which is delegated to Lovable Emails) so both providers can coexist.
const FROM_ADDRESS = "Weybridge Lodge <notify@events.weybridgelodge.org.uk>";

type Recipient = { email: string; user_id?: string | null };
type Attachment = { filename: string; content: string; content_type?: string };
type MemberScope =
  | { kind: "none" }
  | { kind: "all_active" }
  | { kind: "working_group"; slug: string };

interface RequestBody {
  subject: string;
  html: string;
  text?: string;
  guestEmails?: string[]; // explicit extra recipients (guests / test send)
  memberScope?: MemberScope;
  ics: string;
  icsFilename: string;
  pdf?: { bucket: string; path: string; filename?: string };
  idempotencyPrefix: string;
  requireRole?: string[];
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function toBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      return json({ error: "Email provider not configured" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const body = (await req.json().catch(() => ({}))) as RequestBody;

    if (!body.subject || !body.html || !body.ics || !body.icsFilename || !body.idempotencyPrefix) {
      return json({ error: "Missing required fields" }, 400);
    }

    // Role gate — always enforced server-side. Client-supplied requireRole is
    // intersected with a fixed allowlist so it can only narrow, never widen.
    const ALLOWED_ROLES = ["admin", "secretary", "worshipful_master"] as const;
    const requested = Array.isArray(body.requireRole) && body.requireRole.length > 0
      ? body.requireRole.filter((r) => (ALLOWED_ROLES as readonly string[]).includes(r))
      : [...ALLOWED_ROLES];
    const requireRole = requested.length > 0 ? requested : [...ALLOWED_ROLES];
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const has = (roles ?? []).some((r: { role: string }) => requireRole.includes(r.role));
    if (!has) return json({ error: "Forbidden" }, 403);

    // Resolve recipients
    const map = new Map<string, Recipient>();
    const scope = body.memberScope ?? { kind: "none" };
    if (scope.kind === "all_active") {
      const { data } = await admin.from("profiles").select("id,email").eq("status", "active");
      for (const p of data ?? []) {
        if (p.email && isValidEmail(p.email)) map.set(p.email.toLowerCase(), { email: p.email, user_id: p.id });
      }
    } else if (scope.kind === "working_group") {
      const { data: grp } = await admin.from("working_groups").select("id").eq("slug", scope.slug).maybeSingle();
      if (grp) {
        const { data: members } = await admin
          .from("working_group_members")
          .select("profiles:member_id(id,email,status)")
          .eq("working_group_id", (grp as any).id);
        for (const m of members ?? []) {
          const p = (m as any).profiles;
          if (p?.email && p.status === "active" && isValidEmail(p.email)) {
            map.set(p.email.toLowerCase(), { email: p.email, user_id: p.id });
          }
        }
      }
    }
    for (const g of body.guestEmails ?? []) {
      const email = g.trim();
      if (email && isValidEmail(email) && !map.has(email.toLowerCase())) {
        map.set(email.toLowerCase(), { email, user_id: null });
      }
    }

    const recipients = [...map.values()];
    if (recipients.length === 0) return json({ error: "No recipients" }, 400);
    if (recipients.length > 500) return json({ error: "Too many recipients" }, 400);

    // Suppression check
    const emails = recipients.map((r) => r.email.toLowerCase());
    const { data: suppressed } = await admin
      .from("suppressed_emails")
      .select("email")
      .in("email", emails);
    const blocked = new Set((suppressed ?? []).map((r: any) => r.email));

    // Build attachments
    const calendarContent = body.ics.replace(/METHOD:REQUEST/g, "METHOD:PUBLISH");
    const attachments: Attachment[] = [
      {
        filename: body.icsFilename,
        content: toBase64(calendarContent),
        // Keep the calendar file as a normal attachment so mail apps show the
        // written message first, rather than inserting their own invite card
        // above the email body.
        content_type: "text/calendar; charset=UTF-8",
      },
    ];
    if (body.pdf) {
      const { data: file, error: dErr } = await admin.storage
        .from(body.pdf.bucket)
        .download(body.pdf.path);
      if (dErr || !file) return json({ error: `PDF fetch failed: ${dErr?.message ?? "unknown"}` }, 500);
      const buf = new Uint8Array(await file.arrayBuffer());
      attachments.push({
        filename: body.pdf.filename ?? "attachment.pdf",
        content: bytesToBase64(buf),
        content_type: "application/pdf",
      });
    }

    let sent = 0;
    const failures: { email: string; error: string }[] = [];

    for (const r of recipients) {
      if (blocked.has(r.email.toLowerCase())) {
        failures.push({ email: r.email, error: "suppressed" });
        continue;
      }
      try {
        const res = await fetch(`${GATEWAY_URL}/emails`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": RESEND_API_KEY,
            "Idempotency-Key": `${body.idempotencyPrefix}-${r.email}`,
          },
          body: JSON.stringify({
            from: FROM_ADDRESS,
            to: [r.email],
            subject: body.subject,
            html: body.html,
            text: body.text,
            attachments,
          }),
        });
        const out = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((out as any)?.message || `HTTP ${res.status}`);
        sent++;
      } catch (e) {
        failures.push({ email: r.email, error: (e as Error).message });
      }
    }

    return json({ ok: true, sent, recipients: recipients.length, failures });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
