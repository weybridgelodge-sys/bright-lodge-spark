// send-push-notification — generic push sender for iOS (APNs HTTP/2) and
// Android (FCM HTTP v1). Fails gracefully when credentials are absent so the
// backend can be deployed and exercised before the native app ships.
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

function maskToken(t: string): string {
  if (!t) return "";
  if (t.length <= 10) return "***";
  return `${t.slice(0, 6)}…${t.slice(-4)}`;
}

// ---- APNs (JWT provider auth) --------------------------------------------
async function makeApnsJwt(authKeyPem: string, keyId: string, teamId: string): Promise<string> {
  // Import ES256 private key from PEM (PKCS#8).
  const b64 = authKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const header = { alg: "ES256", kid: keyId, typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: teamId, iat: now };
  const enc = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const signingInput = `${enc(header)}.${enc(payload)}`;
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(signingInput)),
  );
  const sigB64 = btoa(String.fromCharCode(...sig))
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${signingInput}.${sigB64}`;
}

async function sendApns(
  tokens: { id: string; token: string }[],
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<{ attempted: number; sent: number; failures: { id: string; token: string; error: string }[] }> {
  const authKey = Deno.env.get("APNS_AUTH_KEY");
  const keyId = Deno.env.get("APNS_KEY_ID");
  const teamId = Deno.env.get("APNS_TEAM_ID");
  const bundleId = Deno.env.get("APNS_BUNDLE_ID");
  if (!authKey || !keyId || !teamId || !bundleId) {
    console.log(`APNs not configured — skipping ${tokens.length} iOS device(s)`);
    return { attempted: 0, sent: 0, failures: [] };
  }
  const failures: { id: string; token: string; error: string }[] = [];
  let sent = 0;
  let jwt: string;
  try {
    jwt = await makeApnsJwt(authKey, keyId, teamId);
  } catch (e) {
    console.error("APNs JWT signing failed", (e as Error).message);
    return { attempted: tokens.length, sent: 0, failures: tokens.map((t) => ({ id: t.id, token: maskToken(t.token), error: "jwt_signing_failed" })) };
  }
  const host = "https://api.push.apple.com";
  const payload = JSON.stringify({ aps: { alert: { title, body }, sound: "default" }, data });
  for (const t of tokens) {
    try {
      const res = await fetch(`${host}/3/device/${t.token}`, {
        method: "POST",
        headers: {
          authorization: `bearer ${jwt}`,
          "apns-topic": bundleId,
          "apns-push-type": "alert",
          "content-type": "application/json",
        },
        body: payload,
      });
      if (res.status === 200) {
        sent++;
      } else {
        const text = await res.text().catch(() => "");
        failures.push({ id: t.id, token: maskToken(t.token), error: `HTTP ${res.status} ${text.slice(0, 200)}` });
      }
    } catch (e) {
      failures.push({ id: t.id, token: maskToken(t.token), error: (e as Error).message });
    }
  }
  return { attempted: tokens.length, sent, failures };
}

// ---- FCM HTTP v1 ---------------------------------------------------------
async function makeFcmAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
  token_uri?: string;
}): Promise<string> {
  const pem = serviceAccount.private_key.replace(/\\n/g, "\n");
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: serviceAccount.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const enc = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const input = `${enc(header)}.${enc(claim)}`;
  const sig = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(input)),
  );
  const sigB64 = btoa(String.fromCharCode(...sig))
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const assertion = `${input}.${sigB64}`;
  const res = await fetch(claim.aud, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${assertion}`,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`FCM token exchange failed: ${JSON.stringify(json)}`);
  return json.access_token as string;
}

async function sendFcm(
  tokens: { id: string; token: string }[],
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<{ attempted: number; sent: number; failures: { id: string; token: string; error: string }[] }> {
  const raw = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
  if (!raw) {
    console.log(`FCM not configured — skipping ${tokens.length} Android device(s)`);
    return { attempted: 0, sent: 0, failures: [] };
  }
  let sa: { project_id: string; client_email: string; private_key: string; token_uri?: string };
  try {
    sa = JSON.parse(raw);
  } catch {
    console.error("FCM_SERVICE_ACCOUNT_JSON is not valid JSON");
    return { attempted: tokens.length, sent: 0, failures: tokens.map((t) => ({ id: t.id, token: maskToken(t.token), error: "invalid_service_account_json" })) };
  }
  let access: string;
  try {
    access = await makeFcmAccessToken(sa);
  } catch (e) {
    console.error("FCM access-token failure", (e as Error).message);
    return { attempted: tokens.length, sent: 0, failures: tokens.map((t) => ({ id: t.id, token: maskToken(t.token), error: "access_token_failed" })) };
  }
  const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
  // FCM requires string values in the data map.
  const stringData: Record<string, string> = {};
  for (const [k, v] of Object.entries(data ?? {})) stringData[k] = typeof v === "string" ? v : JSON.stringify(v);
  const failures: { id: string; token: string; error: string }[] = [];
  let sent = 0;
  for (const t of tokens) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { authorization: `Bearer ${access}`, "content-type": "application/json" },
        body: JSON.stringify({ message: { token: t.token, notification: { title, body }, data: stringData } }),
      });
      if (res.ok) {
        sent++;
      } else {
        const text = await res.text().catch(() => "");
        failures.push({ id: t.id, token: maskToken(t.token), error: `HTTP ${res.status} ${text.slice(0, 200)}` });
      }
    } catch (e) {
      failures.push({ id: t.id, token: maskToken(t.token), error: (e as Error).message });
    }
  }
  return { attempted: tokens.length, sent, failures };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Auth gate: allow service-role callers (internal server-to-server) or
    // an authenticated user holding an admin/officer role. Reject all others.
    const authHeader = req.headers.get("Authorization") ?? "";
    const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!bearer) return json({ error: "Unauthorized" }, 401);

    let authorized = false;
    if (bearer === SERVICE_ROLE) {
      authorized = true;
    } else {
      const userClient = createClient(SUPABASE_URL, ANON, {
        global: { headers: { Authorization: `Bearer ${bearer}` } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
        const allowed = ["admin", "secretary", "worshipful_master", "assistant_secretary", "director_of_ceremonies"];
        authorized = (roles ?? []).some((r: { role: string }) => allowed.includes(r.role));
      }
    }
    if (!authorized) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));



    const title = (body.title ?? "").toString();
    const bodyText = (body.body ?? "").toString();
    const data = (body.data ?? {}) as Record<string, unknown>;
    if (!title || !bodyText) return json({ error: "title and body are required" }, 400);

    let memberIds: string[] = [];
    if (body.all_active === true) {
      const { data: actives, error } = await admin
        .from("profiles")
        .select("id")
        .eq("status", "active");
      if (error) throw error;
      memberIds = (actives ?? []).map((r: { id: string }) => r.id);
    } else if (Array.isArray(body.member_ids)) {
      memberIds = body.member_ids.filter((x: unknown) => typeof x === "string");
    } else {
      return json({ error: "member_ids[] or all_active=true required" }, 400);
    }

    if (memberIds.length === 0) {
      return json({ ok: true, ios_attempted: 0, ios_sent: 0, android_attempted: 0, android_sent: 0, skipped_reason: "no_recipients" });
    }

    const { data: rows, error: tokErr } = await admin
      .from("push_device_tokens")
      .select("id, platform, token")
      .in("member_id", memberIds);
    if (tokErr) throw tokErr;

    const ios: { id: string; token: string }[] = [];
    const android: { id: string; token: string }[] = [];
    for (const r of (rows ?? []) as { id: string; platform: string; token: string }[]) {
      if (r.platform === "ios") ios.push({ id: r.id, token: r.token });
      else if (r.platform === "android") android.push({ id: r.id, token: r.token });
    }

    const [iosRes, andRes] = await Promise.all([
      sendApns(ios, title, bodyText, data),
      sendFcm(android, title, bodyText, data),
    ]);

    if (iosRes.failures.length) console.log("APNs failures", iosRes.failures);
    if (andRes.failures.length) console.log("FCM failures", andRes.failures);

    const skipped: string[] = [];
    if (ios.length && iosRes.attempted === 0) skipped.push(`ios(${ios.length})`);
    if (android.length && andRes.attempted === 0) skipped.push(`android(${android.length})`);

    return json({
      ok: true,
      ios_attempted: iosRes.attempted,
      ios_sent: iosRes.sent,
      android_attempted: andRes.attempted,
      android_sent: andRes.sent,
      ...(skipped.length ? { skipped_reason: `credentials_missing:${skipped.join(",")}` } : {}),
    });
  } catch (e) {
    console.error("send-push-notification error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
