/** Resolves once the non-blocking app stylesheet has applied; 3s cap so a failed load never leaves a blank page. */
export function appCssReady(timeoutMs = 3000): Promise<void> {
  return new Promise((resolve) => {
    const w = window as Window & { __appCssReady?: number };
    const link = document.querySelector<HTMLLinkElement>("link[data-app-css]");
    if (!link || w.__appCssReady || link.rel === "stylesheet") return resolve();
    const done = () => resolve();
    link.addEventListener("load", done, { once: true });
    link.addEventListener("error", done, { once: true });
    setTimeout(done, timeoutMs);
  });
}
