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
 * The element that actually scrolls the field: nearest ancestor inside the overlay whose
 * overflow-y is auto/scroll (it may not overflow YET — spare space is added once focused);
 * falls back to the overlay box itself.
 */
export function scrollableAncestor(el: HTMLElement, box: HTMLElement): HTMLElement {
  for (let n = el.parentElement; n; n = n.parentElement) {
    const oy = getComputedStyle(n).overflowY;
    if (oy === "auto" || oy === "scroll") return n;
    if (n === box) break;
  }
  return box;
}

/** Class put on the overlay's scroller while a field inside it is focused (phones: adds spare space below the last field). */
export const FIELD_FOCUSED_CLASS = "vv-field-focused";
export const RETRY_MS = [0, 150, 300, 600, 900];
export const WINDOW_MS = 1500;
const PHONE = "(max-width: 639.98px)";


/**
 * Focus handler for an overlay (phones only; desktop untouched). Primary path: the
 * browser's own target.scrollIntoView({block:"center"}) at 0/150/300/600/900ms and on
 * every visualViewport resize/scroll for 1.5s, stopping on blur. While focused the
 * scroller gets FIELD_FOCUSED_CLASS, which adds half a screen of spare space below the
 * last field, so centring works without knowing the keyboard height. Fallback: measured
 * delta + scrollBy on the scroller. Never moves focus or caret.
 */
export function scrollFocusedFieldIntoView(target: EventTarget | null, _delayMs = 300): () => void {
  if (typeof window === "undefined" || !(target instanceof HTMLElement) || !target.matches(FIELD)) return () => {};
  if (window.matchMedia && !window.matchMedia(PHONE).matches) return () => {};
  const box = target.closest<HTMLElement>(".vv-dialog, .vv-sheet-side, [role='dialog'], [role='alertdialog']");
  if (!box) return () => {};
  const scroller = scrollableAncestor(target, box);
  scroller.classList.add(FIELD_FOCUSED_CLASS);
  const vv = window.visualViewport;
  const run = () => {
    if (document.activeElement !== target) return;
    if (typeof target.scrollIntoView === "function") target.scrollIntoView({ block: "center", behavior: "auto" });
    const delta = fieldScrollDelta(target.getBoundingClientRect(), scroller.getBoundingClientRect(), vv, window.innerHeight);
    if (delta !== 0 && typeof scroller.scrollBy === "function") scroller.scrollBy({ top: delta, behavior: "auto" });
  };
  const timers = RETRY_MS.map((ms) => window.setTimeout(run, ms));
  let done = false;
  const stopRetries = () => {
    timers.forEach((t) => window.clearTimeout(t));
    window.clearTimeout(end);
    vv?.removeEventListener("resize", run);
    vv?.removeEventListener("scroll", run);
  };
  const onBlur = () => {
    if (done) return; done = true;
    stopRetries();
    target.removeEventListener("blur", onBlur);
    // Keep the spare space if focus just moved to another field in the same scroller.
    window.setTimeout(() => {
      const a = document.activeElement;
      if (!(a instanceof HTMLElement && a.matches(FIELD) && scroller.contains(a))) scroller.classList.remove(FIELD_FOCUSED_CLASS);
    }, 0);
  };
  vv?.addEventListener("resize", run);
  vv?.addEventListener("scroll", run);
  target.addEventListener("blur", onBlur);
  const end = window.setTimeout(stopRetries, WINDOW_MS);
  return onBlur;
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
