import { fetchUnitProfileRow } from "./lib/unitProfileFetch";
// Start the public lodge-details request before React mounts (shared by useUnitProfile).
void fetchUnitProfileRow();
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

import { stripCacheBust, tryChunkReload } from "./lib/chunkReload";

// Auto-recover from stale lazy-chunk hashes after a redeploy: reload once per
// 60s with a cache-busting query (lib/chunkReload). If it still fails,
// AppErrorBoundary shows the error with a Reload button.
window.addEventListener("vite:preloadError", (e) => {
  if (tryChunkReload((e as Event & { payload?: unknown }).payload ?? "Failed to fetch dynamically imported module")) e.preventDefault();
});
window.addEventListener("error", (e) => void tryChunkReload(e.error ?? e.message));
window.addEventListener("unhandledrejection", (e) => void tryChunkReload(e.reason));

// Remove only the cache-bust param after load; path, other query and hash (auth tokens) untouched.
try {
  const clean = stripCacheBust(window.location.href);
  if (clean) window.history.replaceState(window.history.state, "", clean);
} catch {
  /* ignore */
}

// Magic-link failures come back as #error=...&error_code=otp_expired (or in the
// query string). Remember it so the sign-in page can explain what happened.
try {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  const code =
    params.get("error_code") || params.get("error") || query.get("error_code") || query.get("error");
  if (code) {
    const desc = params.get("error_description") || query.get("error_description") || "";
    sessionStorage.setItem("auth-link-error", `${code} ${desc}`.trim());
  }
} catch {
  /* ignore */
}


// Detect Chrome/Safari autofill via the CSS animation-name trick in index.css
// and apply a hard-override class so autofilled inputs stay readable on our
// dark theme even on Chrome builds that ignore -webkit-autofill styling.
document.addEventListener(
  "animationstart",
  (e) => {
    const target = e.target as HTMLElement | null;
    if (!(target instanceof HTMLElement)) return;
    if (e.animationName === "onAutoFillStart") {
      target.classList.add("autofilled-dark");
    } else if (e.animationName === "onAutoFillCancel") {
      target.classList.remove("autofilled-dark");
    }
  },
  true,
);

import { appCssReady } from "./lib/appCssReady";
void appCssReady().then(() => createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
));
