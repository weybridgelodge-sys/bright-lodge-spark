import React, { useState } from "react";
import { Mail, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import TurnstileWidget from "@/components/TurnstileWidget";


const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const NewsletterSignup = () => {
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>("");

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
      setError("Please complete the verification below.");
      return;
    }
    setStatus("loading");
    try {
      const { data, error } = await supabase.functions.invoke("newsletter-subscribe", {
        body: { email: clean, honeypot, turnstileToken },
      });

      if (error || (data && (data as { error?: string }).error)) {
        throw new Error((data as { error?: string })?.error || error?.message || "Subscription failed");
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
            <p className="font-serif text-primary-foreground text-sm font-semibold">Subscription confirmed</p>
            <p className="text-primary-foreground/75 text-xs mt-1 leading-relaxed">
              Thank you — look out for the next Monthly Chronicle from Weybridge Lodge.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-gold/20 bg-navy-light/30 p-5 text-left" noValidate>
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

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary-foreground/60" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            aria-label="Email address"
            className="w-full bg-navy-dark border border-gold/20 rounded-md pl-8 pr-2 py-2 text-xs text-primary-foreground placeholder:text-primary-foreground/40 focus:outline-none focus:border-gold/60"
          />
        </div>
        <Button
          type="submit"
          disabled={status === "loading"}
          className="bg-gold hover:bg-gold/90 text-navy text-xs font-semibold px-3 h-auto"
        >
          {status === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <>Join <ArrowRight className="ml-1 h-3 w-3" /></>}
        </Button>
      </div>
      <div className="mt-3 flex justify-start"><TurnstileWidget theme="dark" onToken={setTurnstileToken} onExpire={() => setTurnstileToken("")} /></div>
      {error && <p className="text-xs text-red-300 mt-2">{error}</p>}

      <p className="text-[10px] text-primary-foreground/60 mt-3 leading-relaxed">
        No spam. Unsubscribe with one click. Handled in line with our Data Protection Policy.
      </p>
    </form>
  );
};

export default NewsletterSignup;
