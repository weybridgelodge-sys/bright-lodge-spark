/**
 * supabase.functions.invoke() does not parse the response body on a non-2xx
 * status — it just yields "Edge Function returned a non-2xx status code".
 * The real, user-facing message lives on the FunctionsHttpError context.
 */
export async function readFunctionError(
  error: unknown,
  data: unknown,
  fallback: string,
): Promise<string> {
  const fromData = (data as { error?: string } | null)?.error;
  if (typeof fromData === "string" && fromData) return fromData;

  const ctx = (error as { context?: Response } | null)?.context;
  if (ctx && typeof ctx.text === "function") {
    try {
      const body = await ctx.clone().text();
      const parsed = JSON.parse(body) as { error?: string };
      if (parsed?.error) return parsed.error;
      if (body) return body;
    } catch {
      /* fall through */
    }
  }

  const msg = (error as { message?: string } | null)?.message;
  if (msg && !msg.includes("non-2xx")) return msg;
  return fallback;
}
