import React, { useEffect, useRef, useState } from "react";

// Turnstile "normal" renders a fixed 300x65 box. Scale it down from the left to
// the container's real width (never up) and reserve the scaled height, so the
// card/form never grows wider than its column on narrow phones.
const TURNSTILE_W = 300;
const TURNSTILE_H = 65;

export const FitTurnstile = ({ children, testId = "turnstile-fit" }: { children: React.ReactNode; testId?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / TURNSTILE_W)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} data-testid={testId} className="w-full max-w-full min-w-0 overflow-hidden" style={{ height: Math.ceil(TURNSTILE_H * scale) }}>
      <div style={{ width: TURNSTILE_W, transform: `scale(${scale})`, transformOrigin: "top left" }}>{children}</div>
    </div>
  );
};

export default FitTurnstile;
