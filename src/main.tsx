import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

// Auto-recover from stale lazy-chunk hashes after a redeploy. If the browser
// still holds an old index.html referencing a chunk filename that no longer
// exists on the CDN, force a one-time hard reload to pick up the new manifest.
// Retries are allowed again after 60s, and each reload adds a cache-busting
// query so a stale edge-cached index.html isn't served a second time. If it
// still fails, AppErrorBoundary shows a Reload button.
const CHUNK_RELOAD_KEY = "chunk-reload-attempted-at";
const isChunkLoadError = (msg: unknown) =>
  typeof msg === "string" &&
  (msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes("Importing a module script failed"));

const handleChunkError = (message: unknown) => {
  if (!isChunkLoadError(message)) return;
  const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
  if (Date.now() - last < 60_000) return;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  const url = new URL(window.location.href);
  url.searchParams.set("_r", Date.now().toString(36));
  window.location.replace(url.toString());
};

window.addEventListener("error", (e) => handleChunkError(e.message));
window.addEventListener("unhandledrejection", (e) =>
  handleChunkError(e.reason?.message ?? String(e.reason)),
);

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

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
