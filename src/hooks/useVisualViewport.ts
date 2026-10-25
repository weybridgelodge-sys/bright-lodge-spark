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
/** Keyboard height covering the layout viewport (0 when the browser shrinks the layout viewport instead). */
export const KB_VAR = "--app-kb";

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
    root.style.setProperty(KB_VAR, `${keyboardInset(window.innerHeight, vv)}px`);
  };
  apply();
  vv.addEventListener("resize", apply);
  vv.addEventListener("scroll", apply);
  return () => {
    vv.removeEventListener("resize", apply);
    vv.removeEventListener("scroll", apply);
    root.style.removeProperty(VVH_VAR);
    root.style.removeProperty(VVTOP_VAR);
    root.style.removeProperty(KB_VAR);
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

/** Height of the layout viewport hidden below the visual viewport (the keyboard), never negative. */
export function keyboardInset(layoutHeight: number, vv: { height: number; offsetTop: number }): number {
  return Math.max(0, Math.round(layoutHeight - vv.height - vv.offsetTop));
}

/** Nearest ancestor (inside the overlay) that actually scrolls; falls back to the overlay box. */
export function scrollableAncestor(el: HTMLElement, box: HTMLElement): HTMLElement {
  for (let n = el.parentElement; n && n !== box.parentElement; n = n.parentElement) {
    const oy = getComputedStyle(n).overflowY;
    if ((oy === "auto" || oy === "scroll") && n.scrollHeight > n.clientHeight) return n;
    if (n === box) break;
  }
  return box;
}

const RETRY_MS = [0, 300, 600];
const WINDOW_MS = 1500;

/**
 * Focus handler for an overlay. Keyboards animate and fire several visualViewport
 * resize/scroll events, so we re-check on focus, at 300ms and 600ms, and on EVERY
 * resize/scroll for 1.5s (stopping early on blur). Scrolls only the overlay's own
 * scroll area (never the locked page). Never moves focus or caret.
 */
export function scrollFocusedFieldIntoView(target: EventTarget | null, _delayMs = 300): () => void {
  if (typeof window === "undefined" || !(target instanceof HTMLElement) || !target.matches(FIELD)) return () => {};
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  const vv = window.visualViewport;
  const run = () => {
    if (document.activeElement !== target) return;
    const box = target.closest<HTMLElement>(".vv-dialog, .vv-sheet-side, [role='dialog'], [role='alertdialog']");
    if (!box) return;
    const scroller = scrollableAncestor(target, box);
    const delta = fieldScrollDelta(target.getBoundingClientRect(), scroller.getBoundingClientRect(), vv, window.innerHeight);
    if (delta === 0) return;
    if (typeof scroller.scrollBy === "function") {
      const before = scroller.scrollTop;
      scroller.scrollBy({ top: delta, behavior: reduce ? "auto" : "smooth" });
      // If the scroller could not move at all (smooth scrolling still pending is fine), fall back.
      if (reduce && scroller.scrollTop === before) target.scrollIntoView?.({ block: "nearest" });
    } else target.scrollIntoView?.({ block: "nearest" });
  };
  const timers = RETRY_MS.map((ms) => window.setTimeout(run, ms));
  let done = false;
  const stop = () => {
    if (done) return; done = true;
    timers.forEach((t) => window.clearTimeout(t));
    window.clearTimeout(end);
    vv?.removeEventListener("resize", run);
    vv?.removeEventListener("scroll", run);
    target.removeEventListener("blur", stop);
  };
  vv?.addEventListener("resize", run);
  vv?.addEventListener("scroll", run);
  target.addEventListener("blur", stop);
  const end = window.setTimeout(stop, WINDOW_MS);
  return stop;
}

const GAP = 16;
/**
 * How far the scroller must scroll so the field sits inside the visible part (nearest edge).
 * Visible bottom = smallest of the scroller bottom, the visual viewport bottom and the
 * layout viewport (innerHeight) — covers browsers that shrink either. 0 = already visible.
 */
export function fieldScrollDelta(
  field: { top: number; bottom: number },
  box: { top: number; bottom: number },
  vv?: { height: number; offsetTop: number } | null,
  layoutHeight?: number,
): number {
  const visTop = Math.max(box.top, vv ? vv.offsetTop : -Infinity);
  const visBottom = Math.min(box.bottom, vv ? vv.offsetTop + vv.height : Infinity, layoutHeight ?? Infinity);
  if (field.top < visTop + GAP) return field.top - visTop - GAP;
  if (field.bottom > visBottom - GAP) return field.bottom - visBottom + GAP;
  return 0;
}
