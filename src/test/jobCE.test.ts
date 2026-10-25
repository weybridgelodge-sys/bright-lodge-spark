import { describe, it, expect, vi, afterEach } from "vitest";
import { fieldScrollDelta, keyboardInset, scrollFocusedFieldIntoView } from "@/hooks/useVisualViewport";

describe("JOB CE fieldScrollDelta", () => {
  const box = { top: 8, bottom: 752 };
  it("layout viewport shrinks (resizes-content): visual viewport unchanged, innerHeight halves", () => {
    expect(fieldScrollDelta({ top: 600, bottom: 680 }, box, { height: 760, offsetTop: 0 }, 380)).toBe(316);
  });
  it("last field (Notes) behind a half-height keyboard is lifted above it", () => {
    expect(fieldScrollDelta({ top: 620, bottom: 700 }, box, { height: 380, offsetTop: 0 }, 760)).toBe(336);
  });
  it("no keyboard: visible field needs no scroll", () => {
    expect(fieldScrollDelta({ top: 620, bottom: 700 }, box, { height: 760, offsetTop: 0 }, 760)).toBe(0);
  });
  it("keyboardInset is layout minus visual, never negative", () => {
    expect(keyboardInset(760, { height: 380, offsetTop: 0 })).toBe(380);
    expect(keyboardInset(380, { height: 380, offsetTop: 0 })).toBe(0);
    expect(keyboardInset(300, { height: 380, offsetTop: 0 })).toBe(0);
  });
});

describe("JOB CE repeated keyboard resizes", () => {
  afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ""; });
  it("re-runs on every resize within the window, then stops; stops on blur", () => {
    vi.useFakeTimers();
    const listeners = new Set<() => void>();
    const vv = { height: 760, offsetTop: 0, addEventListener: (_: string, f: () => void) => listeners.add(f), removeEventListener: (_: string, f: () => void) => listeners.delete(f) };
    Object.defineProperty(window, "visualViewport", { value: vv, configurable: true });
    const dlg = document.createElement("div"); dlg.setAttribute("role", "dialog");
    const ta = document.createElement("textarea"); dlg.appendChild(ta); document.body.appendChild(dlg);
    const calls: number[] = [];
    dlg.scrollBy = ((o: ScrollToOptions) => calls.push(o.top!)) as any;
    dlg.getBoundingClientRect = () => ({ top: 8, bottom: 752 } as DOMRect);
    ta.getBoundingClientRect = () => ({ top: 620, bottom: 700 } as DOMRect);
    ta.focus();
    scrollFocusedFieldIntoView(ta);
    vi.advanceTimersByTime(0);
    expect(calls).toEqual([]); // keyboard not open yet
    vv.height = 600; listeners.forEach((f) => f());   // mid-animation
    vv.height = 380; listeners.forEach((f) => f());   // fully open
    expect(calls).toEqual([116, 336]);
    vi.advanceTimersByTime(1600);
    expect(listeners.size).toBe(0);
    // blur ends early
    scrollFocusedFieldIntoView(ta);
    expect(listeners.size).toBe(2);
    ta.blur();
    expect(listeners.size).toBe(0);
  });
});
