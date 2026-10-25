import { useState, FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import TurnstileWidget from "@/components/TurnstileWidget";
import { FitTurnstile } from "@/components/FitTurnstile";
import { InlineFieldError } from "@/components/bookings/InlineFieldError";
import { focusFirstError, invalidProps, validateEnquiryForm, type FieldError } from "@/lib/formErrors";


export const EnquiryForm = () => {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const [firstName, setFirstName] = useState("");


  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors([]);
    setFormError(null);
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
    const fieldErrs = validateEnquiryForm(payload);
    if (fieldErrs.length) { setErrors(fieldErrs); focusFirstError(fieldErrs); return; }
    if (!turnstileToken) {
      setFormError("Please complete the verification: tick the box to confirm you're human.");
      return;
    }


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
        // Server field issues go under their fields; anything else in the one summary message.
        const known = ["full_name", "email", "phone", "reason"];
        const serverErrs: FieldError[] = parsed?.issues
          ? known.flatMap((id) => {
              const m = (parsed.issues as Record<string, unknown>)[id];
              const msg = Array.isArray(m) ? m.find((v) => typeof v === "string") : null;
              return msg ? [{ id, message: msg as string }] : [];
            })
          : [];
        if (serverErrs.length) { setErrors(serverErrs); focusFirstError(serverErrs); }
        else setFormError(parsed?.error || error.message || "Please try again or email the secretary directly.");
        return;

      }

      if (data?.success) {
        setFirstName(payload.full_name.split(/\s+/)[0] || "");
        setSubmitted(true);
        (e.target as HTMLFormElement).reset();
      }
    } catch (err: any) {
      setFormError(err?.message || "Network error. Please try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mt-8 border-t border-border pt-8">
        <h3 className="text-lg font-serif text-foreground mb-2">Thank you{firstName ? `, ${firstName}` : ""}</h3>
        <p className="text-muted-foreground font-sans">
          Thanks so much{firstName ? `, ${firstName}` : ""} — we're really glad you got in
          touch. Check your inbox for a short guide with more about us, and expect a
          friendly call from our Membership Secretary in the next day or two to have a
          proper chat.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-6 text-sm font-sans uppercase tracking-widest text-gold-dark hover:text-navy min-h-[48px]"
        >
          Send another enquiry
        </button>
      </div>
    );
  }

  // FIXED: fixed h-10 (40px) is under the 48px minimum touch target for
  // interactive elements — switched to min-h-[48px].
  const inputClass =
    "flex min-h-[48px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 autofill-light";

  return (
    <form
      onSubmit={onSubmit}
      className="mt-8 space-y-4 border-t border-border pt-8"
      noValidate
    >
      <h3 className="text-lg font-serif text-foreground mb-2">Enquiry Form</h3>

      {/* Honeypot — hidden from real users. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", height: 0, width: 0, overflow: "hidden" }}>
        <label htmlFor="website">Website (leave blank)</label>
        <input type="text" id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <label htmlFor="full_name" className="block text-sm font-sans font-medium text-foreground mb-1">
          Full Name <span className="text-destructive">*</span>
        </label>
        <input type="text" id="full_name" name="full_name" {...invalidProps(errors, "full_name")} required maxLength={120} className={inputClass} placeholder="Your full name" />
        <InlineFieldError errors={errors} id="full_name" />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-sans font-medium text-foreground mb-1">
          Email Address <span className="text-destructive">*</span>
        </label>
        <input type="email" id="email" name="email" {...invalidProps(errors, "email")} required maxLength={255} className={inputClass} placeholder="you@example.com" />
        <InlineFieldError errors={errors} id="email" />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-sans font-medium text-foreground mb-1">
          Contact Number
        </label>
        <input type="tel" id="phone" name="phone" {...invalidProps(errors, "phone")} maxLength={40} className={inputClass} placeholder="07xxx xxx xxx" />
        <InlineFieldError errors={errors} id="phone" />
      </div>

      <div>
        <label htmlFor="reason" className="block text-sm font-sans font-medium text-foreground mb-1">
          Reason for Enquiry <span className="text-destructive">*</span>
        </label>
        <textarea
          id="reason"
          name="reason" {...invalidProps(errors, "reason")}
          required
          minLength={10}
          maxLength={2000}
          rows={4}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="Tell us why you're interested in joining..."
        />
        <InlineFieldError errors={errors} id="reason" />
      </div>

      <FitTurnstile testId="enquiry-turnstile-fit">
        <TurnstileWidget onToken={setTurnstileToken} onExpire={() => setTurnstileToken("")} />
      </FitTurnstile>

      {formError && <p role="alert" className="text-sm font-sans font-semibold text-destructive">{formError}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="block w-full text-center bg-gold-shimmer text-accent-foreground py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-60 min-h-[48px]"
      >
        {submitting ? "Sending…" : "Start Your Journey"}
      </button>


      <p className="text-sm text-muted-foreground font-sans">
        Your details are sent securely to the Lodge Secretary and stored only for the purpose of replying to your enquiry. See our privacy notice for details.
      </p>
    </form>
  );
};

export default EnquiryForm;
