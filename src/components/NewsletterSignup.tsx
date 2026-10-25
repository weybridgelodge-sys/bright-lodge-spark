import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Mail, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Defer Turnstile widget (and the ~40KB Cloudflare Turnstile script) until the
// user actually interacts with the newsletter form. The Footer renders on every
// page, so eager-loading Turnstile costs FCP/LCP sitewide for no user benefit.
const TurnstileWidget = lazy(() => import("@/components/TurnstileWidget"));

// Call the edge function via plain fetch so this component (rendered in the
// Footer on every page) does not pull the full supabase-js SDK into the
// initial JS bundle. Reduces main-entry gzip by ~110 KiB.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;


// Turnstile "normal" renders a fixed 300x65 box. Scale it down from the left to
// the container's real width (never up) and reserve the scaled height, so the
// footer card never grows wider than its column on narrow phones.
const TURNSTILE_W = 300;
const TURNSTILE_H = 65;
const FitTurnstile = ({ children }: { children: React.ReactNode }) => {
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
    <div ref={ref} data-testid="newsletter-turnstile-fit" className="w-full max-w-full min-w-0 overflow-hidden" style={{ height: Math.ceil(TURNSTILE_H * scale) }}>
      <div style={{ width: TURNSTILE_W, transform: `scale(${scale})`, transformOrigin: "top left" }}>{children}</div>
    </div>
  );
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const NewsletterSignup = () => {
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const [showTurnstile, setShowTurnstile] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) return; // silent bot block
    setError(null);
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean) || clean.length > 255) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!turnstileToken) {
      setShowTurnstile(true);
      setError("Please complete the verification below.");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/newsletter-subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email: clean, honeypot, turnstileToken }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok || data?.error) {
        throw new Error(data?.error || "Subscription failed");
      }
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Subscription failed");
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-gold/30 bg-navy-light/40 p-5 text-left">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-gold shrink-0 mt-0.5" />
          <div>
            <p className="font-serif text-primary-foreground text-sm font-semibold">Please check your inbox</p>
            <p className="text-primary-foreground/75 text-xs mt-1 leading-relaxed">
              Thank you. If this address isn't already on our list, we've sent an email with a link to confirm your subscription.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form id="newsletter-signup" onSubmit={handleSubmit} className="w-full max-w-full min-w-0 rounded-2xl border border-gold/20 bg-navy-light/30 p-5 text-left" noValidate>
      <h2 className="font-serif text-primary-foreground text-sm mb-1">Monthly Chronicle</h2>
      <p className="text-primary-foreground/70 text-xs mb-3 leading-relaxed">
        Historic vignettes, charity updates and open social notifications, direct from the Lodge.
      </p>

      {/* Honeypot — invisible to humans */}
      <input
        type="text"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <div className="flex gap-2 min-w-0">
        <div className="relative flex-1 min-w-0">
          <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary-foreground/60" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setShowTurnstile(true)}
            placeholder="your@email.com"
            aria-label="Email address"
            className="w-full bg-navy-dark border border-gold/20 rounded-md pl-8 pr-2 py-2 min-h-[44px] text-xs text-primary-foreground placeholder:text-primary-foreground/40 focus:outline-none focus:border-gold/60 autofill-light"
          />
        </div>
        <Button
          type="submit"
          disabled={status === "loading"}
          className="bg-gold hover:bg-gold/90 text-navy text-xs font-semibold px-3 h-auto min-h-[44px] shrink-0"
        >
          {status === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <>Join <ArrowRight className="ml-1 h-3 w-3" /></>}
        </Button>
      </div>
      {showTurnstile && (
        <div className="mt-3 min-w-0">
          <FitTurnstile>
            <Suspense fallback={<div className="text-xs text-primary-foreground/50">Loading verification…</div>}>
              <TurnstileWidget theme="dark" onToken={setTurnstileToken} onExpire={() => setTurnstileToken("")} />
            </Suspense>
          </FitTurnstile>
        </div>
      )}
      {error && <p className="text-xs text-red-300 mt-2">{error}</p>}

      <p className="text-[10px] text-primary-foreground/60 mt-3 leading-relaxed">
        No spam. Unsubscribe with one click. Handled in line with our Data Protection Policy.
      </p>
    </form>
  );
};

export default NewsletterSignup;
