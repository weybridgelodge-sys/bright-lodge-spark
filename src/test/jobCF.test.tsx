import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { scrollFocusedFieldIntoView, scrollableAncestor, FIELD_FOCUSED_CLASS, RETRY_MS, kbDebug } from "@/hooks/useVisualViewport";
import KbDebug, { kbDebugEnabled } from "@/components/KbDebug";
import { readFileSync } from "node:fs";

function setup(phone = true) {
  (window as any).matchMedia = (q: string) => ({ matches: phone && q.includes("max-width"), media: q, addEventListener() {}, removeEventListener() {} });
  const listeners = new Set<() => void>();
  const vv = { height: 760, offsetTop: 0, addEventListener: (_: string, f: () => void) => listeners.add(f), removeEventListener: (_: string, f: () => void) => listeners.delete(f) };
  Object.defineProperty(window, "visualViewport", { value: vv, configurable: true });
  const dlg = document.createElement("div"); dlg.setAttribute("role", "dialog"); dlg.style.overflowY = "auto";
  const inner = document.createElement("div");
  const ta = document.createElement("textarea"); inner.appendChild(ta); dlg.appendChild(inner); document.body.appendChild(dlg);
  const siv = vi.fn(); ta.scrollIntoView = siv;
  dlg.scrollBy = vi.fn() as any;
  dlg.getBoundingClientRect = () => ({ top: 8, bottom: 752 } as DOMRect);
  ta.getBoundingClientRect = () => ({ top: 300, bottom: 360 } as DOMRect);
  return { listeners, vv, dlg, ta, siv };
}

describe("JOB CF focus → native scrollIntoView", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ""; });

  it("calls scrollIntoView({block:'center'}) at 0/150/300/600/900ms", () => {
    const { ta, siv } = setup();
    ta.focus(); scrollFocusedFieldIntoView(ta);
    expect(RETRY_MS).toEqual([0, 150, 300, 600, 900]);
    vi.advanceTimersByTime(1000);
    expect(siv).toHaveBeenCalledTimes(5);
    expect(siv).toHaveBeenCalledWith({ block: "center", behavior: "auto" });
  });

  it("re-runs on every visualViewport resize/scroll for 1.5s, then stops", () => {
    const { ta, siv, listeners } = setup();
    ta.focus(); scrollFocusedFieldIntoView(ta);
    vi.advanceTimersByTime(1000); siv.mockClear();
    listeners.forEach((f) => f()); listeners.forEach((f) => f());
    expect(siv).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(600);
    expect(listeners.size).toBe(0);
  });

  it("spare-space class goes on the scroller while focused and is removed on blur", () => {
    const { ta, dlg, listeners, siv } = setup();
    ta.focus(); scrollFocusedFieldIntoView(ta);
    expect(dlg.classList.contains(FIELD_FOCUSED_CLASS)).toBe(true);
    ta.blur(); vi.advanceTimersByTime(1);
    expect(dlg.classList.contains(FIELD_FOCUSED_CLASS)).toBe(false);
    expect(listeners.size).toBe(0);
    siv.mockClear(); vi.advanceTimersByTime(1000);
    expect(siv).not.toHaveBeenCalled();
  });

  it("falls back to scrollBy on the scroller when the field is still hidden", () => {
    const { ta, dlg } = setup();
    ta.getBoundingClientRect = () => ({ top: 620, bottom: 700 } as DOMRect);
    (window.visualViewport as any).height = 380;
    ta.focus(); scrollFocusedFieldIntoView(ta); vi.advanceTimersByTime(0);
    expect(dlg.scrollBy).toHaveBeenCalledWith({ top: 336, behavior: "auto" });
    expect(kbDebug.delta).toBe(336);
  });

  it("scrollableAncestor picks the overflow-y:auto element even before it overflows", () => {
    const { ta, dlg } = setup();
    expect(scrollableAncestor(ta, dlg)).toBe(dlg);
  });

  it("desktop width: does nothing", () => {
    const { ta, siv, dlg } = setup(false);
    ta.focus(); scrollFocusedFieldIntoView(ta); vi.advanceTimersByTime(1000);
    expect(siv).not.toHaveBeenCalled();
    expect(dlg.classList.contains(FIELD_FOCUSED_CLASS)).toBe(false);
  });

  it("CSS: spare space is half the visible height, phone-only", () => {
    const css = readFileSync("src/index.css", "utf8");
    const phone = css.slice(css.indexOf("@media (max-width: 639.98px)"));
    expect(phone).toMatch(/\.vv-field-focused\s*\{\s*padding-bottom:\s*calc\(var\(--app-vvh, 100dvh\) \* 0\.5\)/);
  });
});

describe("JOB CF ?kbdebug=1 readout", () => {
  afterEach(() => { cleanup(); sessionStorage.clear(); });
  it("off without the parameter, on with it, remembered for the tab, off with =0", () => {
    expect(kbDebugEnabled("", sessionStorage)).toBe(false);
    expect(kbDebugEnabled("?kbdebug=1", sessionStorage)).toBe(true);
    expect(kbDebugEnabled("", sessionStorage)).toBe(true);
    expect(kbDebugEnabled("?kbdebug=0", sessionStorage)).toBe(false);
    expect(kbDebugEnabled("", sessionStorage)).toBe(false);
  });
  it("renders nothing without the parameter", () => {
    render(<KbDebug />);
    expect(screen.queryByTestId("kbdebug")).toBeNull();
  });
  it("renders the readout with the parameter", () => {
    sessionStorage.setItem("kbdebug", "1");
    render(<KbDebug />);
    const el = screen.getByTestId("kbdebug");
    expect(el.className).toContain("pointer-events-none");
    expect(el.textContent).toMatch(/innerH:.*vv\.h:.*kb:.*sTop:.*delta:/s);
  });
});

describe("JOB CF Charity Steward labels match visible labels", () => {
  const src = readFileSync("src/pages/members/admin/CharitySteward.tsx", "utf8");
  it("every <Label>X</Label><Input|Textarea aria-label> pair agrees", () => {
    const pairs = [...src.matchAll(/<Label>([^<]+)<\/Label>\s*<(?:Input|Textarea) aria-label="([^"]+)"/g)];
    expect(pairs.length).toBeGreaterThan(15);
    for (const [, label, aria] of pairs) expect(aria.replace("&amp;", "&")).toBe(label.replace("&amp;", "&"));
  });
});
