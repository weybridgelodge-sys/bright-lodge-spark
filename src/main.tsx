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


createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
