import { useEffect } from "react";

/**
 * Injects <meta name="robots" content="noindex, nofollow"> on every hostname
 * that is NOT the production domain. Purely additive: the production domain
 * (weybridgelodge.org.uk / www.weybridgelodge.org.uk) is never touched.
 */
const PRODUCTION_HOSTS = ["weybridgelodge.org.uk", "www.weybridgelodge.org.uk"];
const MARKER = "data-noindex-guard";

const NoindexGuard = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = window.location.hostname.toLowerCase();

    // Safety check: never alter indexability on the real domain.
    if (PRODUCTION_HOSTS.includes(host)) return;
    // Local development doesn't need it either (not publicly reachable),
    // but harmless — keep it for parity with preview hosts.

    if (document.querySelector(`meta[${MARKER}]`)) return;

    const meta = document.createElement("meta");
    meta.setAttribute("name", "robots");
    meta.setAttribute("content", "noindex, nofollow");
    meta.setAttribute(MARKER, "true");
    document.head.appendChild(meta);
  }, []);

  return null;
};

export default NoindexGuard;
