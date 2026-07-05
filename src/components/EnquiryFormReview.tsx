import { useState, FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import TurnstileWidget from "@/components/TurnstileWidget";


interface FieldErrors {
  full_name?: string[];
  email?: string[];
  phone?: string[];
  reason?: string[];
}

export const EnquiryForm = () => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [turnstileToken, setTurnstileToken] = useState<string>("");


  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    if (!turnstileToken) {
      toast({ title: "Please complete the verification", description: "Tick the box to confirm you're human.", variant: "destructive" });
      return;
    }
    const fd = new FormData(e.currentTarget);
    const payload = {
      full_name: String(fd.get("full_name") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      phone: String(fd.get("phone") || "").trim(),
      reason: String(fd.get("reason") || "").trim(),
      website: String(fd.get("website") || ""), // honeypot
      source: "join-us",
      turnstileToken,
    };


    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-enquiry", {
        body: payload,
      });

      if (error) {
        // Try to parse field-level errors returned by the function
        const ctx = (error as any).context;
        let parsed: any = null;
        try {
          if (ctx && typeof ctx.json === "function") parsed = await ctx.json();
        } catch {
          /* ignore */
        }
        if (parsed?.issues) setErrors(parsed.issues);
        // Surface the first specific field error rather than the generic "Validation failed"
        const firstIssue = parsed?.issues
          ? Object.values(parsed.issues).flat().find((v) => typeof v === "string")
          : null;
        toast({
          title: "Could not send enquiry",
          description: (firstIssue as string) || parsed?.error || error.message || "Please try again or email the secretary directly.",
          variant: "destructive",
        });
        return;

      }

      if (data?.success) {
        setSubmitted(true);
        toast({
          title: "Enquiry sent",
          description: "Thank you — we'll be in touch within a few days.",
        });
        (e.target as HTMLFormElement).reset();
      }
    } catch (err: any) {
      toast({
        title: "Network error",
        description: err?.message || "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mt-8 border-t border-border pt-8">
        <h4 className="text-lg font-serif text-foreground mb-2">Thank you</h4>
        <p className="text-muted-foreground font-sans">
          Your enquiry has been received. A confirmation email is on its way to your
          inbox, and one of our members will be in touch with you personally within a
          few days.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-6 text-sm font-sans uppercase tracking-widest text-gold-dark hover:text-gold min-h-[48px]"
        >
          Send another enquiry
        </button>
      </div>
    );
  }

  // FIXED: fixed h-10 (40px) is under the 48px minimum touch target for
  // interactive elements — switched to min-h-[48px].
  const inputClass =
    "flex min-h-[48px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  return (
    <form
      onSubmit={onSubmit}
      className="mt-8 space-y-4 border-t border-border pt-8"
      noValidate
    >
      <h4 className="text-lg font-serif text-foreground mb-2">Enquiry Form</h4>

      {/* Honeypot — hidden from real users.
          CONFIRMED CORRECT: aria-hidden, off-screen absolute position,
          tabIndex={-1}, autoComplete="off" — this already meets the
          anti-spam requirement. No change made. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", height: 0, width: 0, overflow: "hidden" }}>
        <label htmlFor="website">Website (leave blank)</label>
        <input type="text" id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <label htmlFor="full_name" className="block text-sm font-sans font-medium text-foreground mb-1">
          {/* NOTE: text-destructive is used here for the required-field
              marker and below for error text. It isn't in the approved
              navy/gold/background/card/border/text-foreground/muted-foreground
              list, but the Brand Identity doc also doesn't define an
              error/validation colour at all. Removing it would hurt
              accessibility of required-field and error states, so it's left
              as-is — flagging for you to either confirm --destructive as a
              sanctioned exception, or add a proper error token to the brand
              doc. */}
          Full Name <span className="text-destructive">*</span>
        </label>
        <input type="text" id="full_name" name="full_name" required maxLength={120} className={inputClass} placeholder="Your full name" />
        {errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name[0]}</p>}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-sans font-medium text-foreground mb-1">
          Email Address <span className="text-destructive">*</span>
        </label>
        <input type="email" id="email" name="email" required maxLength={255} className={inputClass} placeholder="you@example.com" />
        {errors.email && <p className="text-xs text-destructive mt-1">{errors.email[0]}</p>}
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-sans font-medium text-foreground mb-1">
          Contact Number
        </label>
        <input type="tel" id="phone" name="phone" maxLength={40} className={inputClass} placeholder="07xxx xxx xxx" />
        {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone[0]}</p>}
      </div>

      <div>
        <label htmlFor="reason" className="block text-sm font-sans font-medium text-foreground mb-1">
          Reason for Enquiry <span className="text-destructive">*</span>
        </label>
        <textarea
          id="reason"
          name="reason"
          required
          minLength={10}
          maxLength={2000}
          rows={4}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="Tell us why you're interested in joining..."
        />
        {errors.reason && <p className="text-xs text-destructive mt-1">{errors.reason[0]}</p>}
      </div>

      <TurnstileWidget onToken={setTurnstileToken} onExpire={() => setTurnstileToken("")} />

      {/* FIXED: bg-gold-shimmer / text-accent-foreground are not approved
          project tokens — replaced with bg-gold / text-navy. Added explicit
          min-h-[48px] (py-4 already exceeds it, but making it explicit). */}
      <button
        type="submit"
        disabled={submitting || !turnstileToken}
        className="block w-full text-center bg-gold text-navy py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-60 min-h-[48px]"
      >
        {submitting ? "Sending…" : "Start Your Journey"}
      </button>


      <p className="text-xs text-muted-foreground font-sans">
        Your details are sent securely to the Lodge Secretary and stored only for the purpose of replying to your enquiry. See our privacy notice for details.
      </p>
    </form>
  );
};

export default EnquiryForm;
