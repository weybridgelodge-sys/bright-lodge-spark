// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { useVisualViewportVars, fieldScrollDelta, VVH_VAR, VVTOP_VAR } from "@/hooks/useVisualViewport";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

function Probe({ active = true }: { active?: boolean }) { useVisualViewportVars(active); return null; }
const root = () => document.documentElement.style;

function fakeVV(height: number, offsetTop = 0) {
  const listeners: Record<string, Set<() => void>> = { resize: new Set(), scroll: new Set() };
  const vv = {
    height, offsetTop,
    addEventListener: (t: string, f: () => void) => listeners[t].add(f),
    removeEventListener: (t: string, f: () => void) => listeners[t].delete(f),
    fire(t: string) { listeners[t].forEach((f) => f()); },
    listeners,
  };
  Object.defineProperty(window, "visualViewport", { value: vv, configurable: true });
  return vv;
}
afterEach(() => { cleanup(); Object.defineProperty(window, "visualViewport", { value: undefined, configurable: true }); });

describe("JOB CD: visual viewport variables", () => {
  it("sets height and top from visualViewport", () => {
    fakeVV(412.4, 7);
    render(<Probe />);
    expect(root().getPropertyValue(VVH_VAR)).toBe("412px");
    expect(root().getPropertyValue(VVTOP_VAR)).toBe("7px");
  });
  it("updates on resize (keyboard opens) and scroll", () => {
    const vv = fakeVV(800);
    render(<Probe />);
    act(() => { vv.height = 380; vv.fire("resize"); });
    expect(root().getPropertyValue(VVH_VAR)).toBe("380px");
    act(() => { vv.offsetTop = 50; vv.fire("scroll"); });
    expect(root().getPropertyValue(VVTOP_VAR)).toBe("50px");
  });
  it("leaves the variables unset without visualViewport (CSS falls back to 100dvh/100vh)", () => {
    render(<Probe />);
    expect(root().getPropertyValue(VVH_VAR)).toBe("");
  });
  it("removes listeners and variables on unmount, only after the last user", () => {
    const vv = fakeVV(500);
    const a = render(<Probe />); const b = render(<Probe />);
    a.unmount();
    expect(root().getPropertyValue(VVH_VAR)).toBe("500px");
    b.unmount();
    expect(root().getPropertyValue(VVH_VAR)).toBe("");
    expect(vv.listeners.resize.size).toBe(0);
    expect(vv.listeners.scroll.size).toBe(0);
  });
});

describe("JOB CD: focused field scroll amount", () => {
  const box = { top: 8, bottom: 792 };
  it("no scroll when the field is visible above the keyboard", () => {
    expect(fieldScrollDelta({ top: 100, bottom: 140 }, box, { height: 400, offsetTop: 0 })).toBe(0);
  });
  it("scrolls up past the keyboard edge for a field hidden under it", () => {
    expect(fieldScrollDelta({ top: 500, bottom: 540 }, box, { height: 400, offsetTop: 0 })).toBe(156);
  });
  it("scrolls back for a field above the visible top", () => {
    expect(fieldScrollDelta({ top: -20, bottom: 20 }, box, null)).toBe(-44);
  });
});

describe("JOB CD: DialogContent keeps its classes", () => {
  it("keeps the original desktop classes, the page class and adds vv-dialog", () => {
    fakeVV(600);
    render(<Dialog open><DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto"><DialogTitle>T</DialogTitle></DialogContent></Dialog>);
    const el = document.querySelector("[role='dialog']")!;
    for (const c of ["fixed", "left-[50%]", "top-[50%]", "translate-y-[-50%]", "sm:rounded-lg", "max-h-[90vh]", "overflow-y-auto", "max-w-xl", "vv-dialog"]) expect(el.classList).toContain(c);
    expect(root().getPropertyValue(VVH_VAR)).toBe("600px");
  });
  it("CSS uses the variable with dvh/vh fallbacks only below sm", () => {
    const css = readFileSync("src/index.css", "utf8");
    const block = css.slice(css.indexOf("@media (max-width: 639.98px)"));
    expect(block).toContain("max-height: calc(var(--app-vvh, 100dvh) - 1rem) !important;");
    expect(block).toContain("max-height: calc(100vh - 1rem) !important;");
    expect(block).toContain("top: calc(var(--app-vvtop, 0px) + 0.5rem) !important;");
  });
});
