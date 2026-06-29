// Server-side Cloudflare Turnstile verification.
// Returns true when the token validates. In development (no secret set) it returns true
// so previews continue to work without configuration.

export async function verifyTurnstile(token: string | undefined | null, remoteIp?: string | null): Promise<boolean> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) {
    console.warn("TURNSTILE_SECRET_KEY not set — skipping verification");
    return true;
  }
  if (!token || typeof token !== "string") return false;

  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (remoteIp) form.append("remoteip", remoteIp);

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
    });
    const data = await res.json() as { success?: boolean; "error-codes"?: string[] };
    if (!data.success) console.warn("Turnstile verification failed:", data["error-codes"]);
    return !!data.success;
  } catch (err) {
    console.error("Turnstile siteverify error:", err);
    return false;
  }
}
