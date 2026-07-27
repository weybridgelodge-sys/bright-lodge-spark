import { Capacitor } from "@capacitor/core";

// Production origin used by the native Capacitor app to resolve
// Lovable CDN asset URLs (which are absolute paths like `/__l5e/...`).
// On the web, we keep URLs relative so they resolve against the current origin.
const PROD_ORIGIN = "https://weybridgelodge.org.uk";

/**
 * Resolve a Lovable `.asset.json` pointer (or a raw URL string) to a URL that
 * works both on the web and inside the native Capacitor app.
 *
 * On the web: returns the raw relative URL (unchanged behaviour).
 * On native:  prefixes relative `/...` paths with the production origin so
 *             the image loads from the real CDN rather than Capacitor's
 *             internal `capacitor://localhost` / `https://localhost` scheme.
 */
export function assetUrl(input: { url?: string } | string | null | undefined): string {
  const raw = typeof input === "string" ? input : input?.url ?? "";
  if (!raw) return "";
  try {
    if (Capacitor.isNativePlatform() && raw.startsWith("/")) {
      return PROD_ORIGIN + raw;
    }
  } catch {
    // Capacitor not available (SSR/tests) — fall through.
  }
  return raw;
}
