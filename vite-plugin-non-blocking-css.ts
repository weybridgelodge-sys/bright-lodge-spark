// Make Vite's built entry stylesheet non-blocking (preload + onload swap, noscript fallback).
export function nonBlockingCss() {
  return {
    name: "non-blocking-css", apply: "build" as const, enforce: "post" as const,
    transformIndexHtml: { order: "post" as const, handler(html: string) {
      return html.replace(/<link rel="stylesheet" crossorigin href="(\/assets\/index-[^"]+\.css)">/, (_m, href) =>
        `<link rel="preload" as="style" crossorigin href="${href}" data-app-css onload="this.onload=null;this.rel='stylesheet';window.__appCssReady=1">` +
        `<noscript><link rel="stylesheet" crossorigin href="${href}"></noscript>`);
    } },
  };
}
