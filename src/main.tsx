import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

// Auto-recover from stale lazy-chunk hashes after a redeploy. If the browser
// still holds an old index.html referencing a chunk filename that no longer
// exists on the CDN, force a one-time hard reload to pick up the new manifest.
const CHUNK_RELOAD_KEY = "chunk-reload-attempted";
const isChunkLoadError = (msg: unknown) =>
  typeof msg === "string" &&
  (msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes("Importing a module script failed"));

const handleChunkError = (message: unknown) => {
  if (!isChunkLoadError(message)) return;
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
  window.location.reload();
};

window.addEventListener("error", (e) => handleChunkError(e.message));
window.addEventListener("unhandledrejection", (e) =>
  handleChunkError(e.reason?.message ?? String(e.reason)),
);


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
