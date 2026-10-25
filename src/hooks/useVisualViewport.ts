import * as React from "react";

// Phone keyboards shrink only the VISUAL viewport, so vh/dvh can be taller than what
// is actually visible. While any overlay that uses this hook is mounted, we publish
// the visual viewport's height and top offset as CSS variables on <html>:
//   --app-vvh   = visualViewport.height (px)
//   --app-vvtop = visualViewport.offsetTop (px)
// With no visualViewport (old browsers, SSR) the variables are not set and CSS falls
// back to 100dvh / 100vh and 0px.

export const VVH_VAR = "--app-vvh";
export const VVTOP_VAR = "--app-vvtop";

let users = 0;
let detach: (() => void) | null = null;

function attach(): (() => void) | null {
  if (typeof window === "undefined") return null;
  const vv = window.visualViewport;
  if (!vv) return null;
  const root = document.documentElement;
  const apply = () => {
    root.style.setProperty(VVH_VAR, `${Math.round(vv.height)}px`);
    root.style.setProperty(VVTOP_VAR, `${Math.round(vv.offsetTop)}px`);
  };
  apply();
  vv.addEventListener("resize", apply);
  vv.addEventListener("scroll", apply);
  return () => {
    vv.removeEventListener("resize", apply);
    vv.removeEventListener("scroll", apply);
    root.style.removeProperty(VVH_VAR);
    root.style.removeProperty(VVTOP_VAR);
  };
}

/** Keeps --app-vvh / --app-vvtop current while mounted (shared, ref-counted). */
export function useVisualViewportVars(active = true) {
  React.useEffect(() => {
    if (!active) return;
    if (users++ === 0) detach = attach();
    return () => {
      if (--users === 0) { detach?.(); detach = null; }
    };
  }, [active]);
}

const FIELD = "input, textarea, select, [contenteditable='true'], [role='combobox']";

/**
 * Focus handler for an overlay: after the keyboard opens (short delay, and again on the
 * next visual-viewport resize) scroll the focused field into view. Never moves focus or caret.
 */
export function scrollFocusedFieldIntoView(target: EventTarget | null, delayMs = 300): () => void {
  if (typeof window === "undefined" || !(target instanceof HTMLElement) || !target.matches(FIELD)) return () => {};
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  const run = () => {
    if (document.activeElement !== target) return;
    target.scrollIntoView({ block: "center", inline: "nearest", behavior: reduce ? "auto" : "smooth" });
  };
  const t = window.setTimeout(run, delayMs);
  const vv = window.visualViewport;
  const onResize = () => { run(); vv?.removeEventListener("resize", onResize); };
  vv?.addEventListener("resize", onResize);
  const stop = window.setTimeout(() => vv?.removeEventListener("resize", onResize), 1500);
  return () => { window.clearTimeout(t); window.clearTimeout(stop); vv?.removeEventListener("resize", onResize); };
}
