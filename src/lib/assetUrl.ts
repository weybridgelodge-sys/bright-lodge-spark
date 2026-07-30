import { Capacitor } from "@capacitor/core";

// Production origin used by the native Capacitor app to resolve
// Lovable CDN asset URLs (which are absolute paths like `/__l5e/...`).
// On the web, we keep URLs relative so they resolve against the current origin.
const PROD_ORIGIN = "https://weybridgelodge.org.uk";

/**
 * Resolve a Lovable `.asset.json` pointer (or a raw URL string) to a URL that
 * works on every host the app runs on.
 *
 * Lovable CDN pointers are root-relative paths (`/__l5e/assets-v1/...`) that
 * are only served by Lovable's hosting layer. On the canonical production
 * domain we keep them relative (same-origin, best caching). Everywhere else —
 * the native Capacitor shell (`capacitor://localhost`), the dev server and the
 * preview sandbox, which return `index.html` for unknown paths instead of the
 * binary — we point at the production origin so the real file is fetched.
 */
export function assetUrl(input: { url?: string } | string | null | undefined): string {
  const raw = typeof input === "string" ? input : input?.url ?? "";
  if (!raw) return "";
  if (!raw.startsWith("/")) return raw;

  try {
    if (!Capacitor.isNativePlatform() && typeof window !== "undefined") {
      const host = window.location.hostname;
      // Canonical production host serves the CDN paths itself.
      if (host === "weybridgelodge.org.uk" || host.endsWith(".weybridgelodge.org.uk")) {
        return raw;
      }
    }
  } catch {
    // Capacitor/window not available (SSR/tests) — fall through to absolute.
  }
  return PROD_ORIGIN + raw;
}

