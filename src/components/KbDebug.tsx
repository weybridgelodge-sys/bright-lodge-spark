import * as React from "react";
import { createPortal } from "react-dom";
import { kbDebug, KB_VAR, scrollableAncestor } from "@/hooks/useVisualViewport";

// TEMPORARY phone-keyboard diagnostic. Shown only after opening a page with ?kbdebug=1
// (remembered for this tab so portal redirects keep it; ?kbdebug=0 turns it off).
// Reads numbers on screen only: no logging, no network, no tracking.
const KEY = "kbdebug";

export function kbDebugEnabled(search: string, store: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null): boolean {
  const v = new URLSearchParams(search).get(KEY);
  try {
    if (v === "1") store?.setItem(KEY, "1");
    else if (v === "0") store?.removeItem(KEY);
    return v === "1" || (v !== "0" && store?.getItem(KEY) === "1");
  } catch { return v === "1"; }
}

type Row = [string, string];
export function readKbNumbers(): Row[] {
  const vv = window.visualViewport;
  const a = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const box = a?.closest<HTMLElement>(".vv-dialog, .vv-sheet-side, [role='dialog'], [role='alertdialog']") ?? null;
  const sc = a && box ? scrollableAncestor(a, box) : null;
  const r = a?.getBoundingClientRect();
  const kb = getComputedStyle(document.documentElement).getPropertyValue(KB_VAR).trim() || "unset";
  const n = (x: number | undefined) => (x === undefined ? "-" : String(Math.round(x)));
  return [
    ["innerH", n(window.innerHeight)],
    ["vv.h", vv ? n(vv.height) : "none"],
    ["vv.top", vv ? n(vv.offsetTop) : "none"],
    ["kb", kb],
    ["sc", sc ? `${sc.tagName.toLowerCase()}${sc === box ? "=box" : ""}` : "-"],
    ["sTop", n(sc?.scrollTop)], ["sH", n(sc?.scrollHeight)], ["cH", n(sc?.clientHeight)],
    ["field", a ? `${a.tagName.toLowerCase()} ${n(r?.top)}–${n(r?.bottom)}` : "-"],
    ["delta", kbDebug.delta === null ? "-" : String(Math.round(kbDebug.delta))],
  ];
}

export default function KbDebug() {
  const [on] = React.useState(() => typeof window !== "undefined" && kbDebugEnabled(window.location.search, window.sessionStorage ?? null));
  const [rows, setRows] = React.useState<Row[]>([]);
  React.useEffect(() => {
    if (!on) return;
    const upd = () => setRows(readKbNumbers());
    const vv = window.visualViewport;
    upd();
    kbDebug.listeners.add(upd);
    vv?.addEventListener("resize", upd); vv?.addEventListener("scroll", upd);
    window.addEventListener("resize", upd);
    document.addEventListener("focusin", upd); document.addEventListener("scroll", upd, true);
    const t = window.setInterval(upd, 500);
    return () => {
      kbDebug.listeners.delete(upd);
      vv?.removeEventListener("resize", upd); vv?.removeEventListener("scroll", upd);
      window.removeEventListener("resize", upd);
      document.removeEventListener("focusin", upd); document.removeEventListener("scroll", upd, true);
      window.clearInterval(t);
    };
  }, [on]);
  if (!on) return null;
  return createPortal(
    <div
      aria-hidden="true"
      data-testid="kbdebug"
      className="pointer-events-none fixed right-1 z-[2147483647] rounded border border-border bg-background px-1.5 py-1 font-mono text-[10px] leading-tight text-foreground shadow"
      style={{ top: "calc(var(--app-vvtop, 0px) + 4px)" }}
    >
      {rows.map(([k, v]) => <div key={k}>{k}: {v}</div>)}
    </div>,
    document.body,
  );
}
