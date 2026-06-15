import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Mail, ArrowRight, CheckCircle2, UserPlus, Clock, ArrowLeft } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/weybridge-logo.svg";

type View = "login" | "register" | "request-sent";

const emailSchema = z.string().trim().email("Enter a valid email").max(255);

const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  ugleRegNumber: z.string().trim().min(2, "UGLE registration number is required").max(40),
  motherLodge: z.string().trim().min(2, "Mother Lodge name and number is required").max(160),
  email: emailSchema,
});

export default function MembersLogin() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [view, setView] = useState<View>("login");
  const [busy, setBusy] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // login
  const [loginEmail, setLoginEmail] = useState("");

  // register
  const [fullName, setFullName] = useState("");
  const [ugleReg, setUgleReg] = useState("");
  const [motherLodge, setMotherLodge] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [gdpr, setGdpr] = useState(false);

  // honeypot (bots fill hidden fields)
  const [honeypot, setHoneypot] = useState("");

  useEffect(() => {
    if (session) navigate("/members", { replace: true });
  }, [session, navigate]);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) return; // silent discard
    const parsed = emailSchema.safeParse(loginEmail);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: loginEmail.trim(),
      options: { emailRedirectTo: `${window.location.origin}/members` },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEmailSent(true);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) return;
    if (!gdpr) {
      toast.error("Please confirm the Data Protection notice");
      return;
    }
    const parsed = registerSchema.safeParse({
      fullName,
      ugleRegNumber: ugleReg,
      motherLodge,
      email: regEmail,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    // Sign up with a strong random password — users only ever use magic links.
    const tempPassword = crypto.randomUUID() + crypto.randomUUID().slice(0, 8) + "Aa1!";
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: tempPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/members`,
        data: {
          full_name: parsed.data.fullName,
          ugle_reg_number: parsed.data.ugleRegNumber,
          mother_lodge: parsed.data.motherLodge,
        },
      },
    });
    // Immediately sign out — they must wait for approval and confirm email
    await supabase.auth.signOut();
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setView("request-sent");
  };

  const handleGoogle = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/members`,
      });
      if (result.error) {
        toast.error("Google sign-in failed");
        setBusy(false);
        return;
      }
      if (result.redirected) return;
      navigate("/members");
    } catch {
      toast.error("Google sign-in failed");
      setBusy(false);
    }
  };

  const headerArt = (
    <div aria-hidden className="pointer-events-none absolute -top-32 -right-32 w-72 h-72 rounded-full bg-gold/10 blur-3xl" />
  );

  return (
    <div className="min-h-screen bg-navy text-primary-foreground relative overflow-hidden flex items-center justify-center p-4">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--gold)/0.08),transparent_55%)]" />

      <div className="w-full max-w-md relative">
        <Link to="/" className="flex items-center justify-center gap-3 mb-8">
          <img src={logo} alt="Weybridge Lodge crest" width={48} height={48} decoding="async" className="h-12 w-12 bg-primary-foreground/80 rounded-full p-0.5" />
          <div className="text-center">
            <p className="font-serif text-lg font-semibold">Weybridge Lodge</p>
            <p className="text-gold text-xs uppercase tracking-[0.18em]">No. 6787 · Members Portal</p>
          </div>
        </Link>

        <div className="relative bg-navy-dark/80 border border-gold/20 rounded-sm p-7 sm:p-9 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden">
          {headerArt}

          <AnimatePresence mode="wait">
            {/* ------------ LOGIN (magic link) ------------ */}
            {view === "login" && (
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                {!emailSent ? (
                  <>
                    <div className="mb-6">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-gold/70 flex items-center gap-1.5">
                        <Shield className="w-3 h-3" /> Antechamber Access
                      </p>
                      <h1 className="font-serif text-2xl text-primary-foreground mt-2">Member Portal Sign-In</h1>
                      <p className="text-xs text-primary-foreground/60 mt-2 leading-relaxed">
                        Enter your registered email to receive a secure, passwordless Magic Link. No passwords to remember.
                      </p>
                    </div>

                    <form onSubmit={handleMagicLink} className="space-y-4">
                      {/* Honeypot */}
                      <input
                        type="text"
                        name="website"
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                        className="hidden"
                        tabIndex={-1}
                        autoComplete="off"
                        aria-hidden="true"
                      />

                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-primary-foreground/60 mb-1.5">
                          Registered Email Address
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary-foreground/40" />
                          <input
                            required
                            type="email"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            placeholder="brother@example.com"
                            className="w-full bg-navy border border-gold/20 rounded-sm pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-gold transition-colors"
                          />
                        </div>
                      </div>

                      <button
                        disabled={busy}
                        type="submit"
                        className="w-full bg-gold-shimmer text-accent-foreground px-4 py-2.5 rounded-sm text-sm font-semibold font-sans hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity"
                      >
                        Send Magic Link <ArrowRight className="w-4 h-4" />
                      </button>
                    </form>

                    <div className="my-5 flex items-center gap-3 text-[10px] text-primary-foreground/40 uppercase tracking-wider">
                      <div className="flex-1 h-px bg-gold/10" /> or <div className="flex-1 h-px bg-gold/10" />
                    </div>

                    <button
                      onClick={handleGoogle}
                      disabled={busy}
                      className="w-full border border-gold/30 text-primary-foreground px-4 py-2.5 rounded-sm text-sm font-sans hover:bg-gold/5 disabled:opacity-50"
                    >
                      Continue with Google
                    </button>

                    <div className="mt-6 pt-5 border-t border-gold/10 text-center">
                      <button
                        onClick={() => setView("register")}
                        className="text-xs font-medium text-gold hover:underline inline-flex items-center gap-1.5"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Requesting access for the first time?
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <div className="w-14 h-14 rounded-full bg-gold/15 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-7 h-7 text-gold" />
                    </div>
                    <h2 className="font-serif text-xl text-gold mb-2">Check Your Inbox</h2>
                    <p className="text-sm text-primary-foreground/70 leading-relaxed max-w-xs mx-auto">
                      We have emailed a secure authentication link to{" "}
                      <span className="text-gold">{loginEmail}</span>. Click the link inside that message to instantly
                      unlock the portal.
                    </p>
                    <button
                      onClick={() => {
                        setEmailSent(false);
                      }}
                      className="text-[11px] font-semibold text-primary-foreground/60 hover:text-gold uppercase tracking-wider mt-6 inline-flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3 h-3" /> Back to Sign In
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* ------------ REGISTER ------------ */}
            {view === "register" && (
              <motion.div
                key="register"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                <div className="mb-6">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-gold/70 flex items-center gap-1.5">
                    <UserPlus className="w-3 h-3" /> Credentials Registration
                  </p>
                  <h1 className="font-serif text-2xl text-primary-foreground mt-2">Request Portal Access</h1>
                  <p className="text-xs text-primary-foreground/60 mt-2 leading-relaxed">
                    Accounts require manual validation by the Lodge Secretary to safeguard sensitive ritual archives.
                  </p>
                </div>

                <form onSubmit={handleRegister} className="space-y-3">
                  <input
                    type="text"
                    name="company"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    className="hidden"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Full Name" value={fullName} onChange={setFullName} required placeholder="Bro. John Smith" />
                    <Field label="UGLE Reg Number" value={ugleReg} onChange={setUgleReg} required placeholder="e.g. 1234567" />
                  </div>

                  <Field
                    label="Mother Lodge Name & Number"
                    value={motherLodge}
                    onChange={setMotherLodge}
                    required
                    placeholder="e.g. Weybridge Lodge No. 6787"
                  />

                  <Field
                    label="Preferred Email Address"
                    value={regEmail}
                    onChange={setRegEmail}
                    required
                    type="email"
                    placeholder="you@example.com"
                  />

                  <label className="flex items-start gap-3 bg-navy/60 border border-gold/15 rounded-sm p-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gdpr}
                      onChange={(e) => setGdpr(e.target.checked)}
                      required
                      className="mt-0.5 h-4 w-4 rounded border-gold/40 text-gold focus:ring-gold accent-gold shrink-0"
                    />
                    <span className="text-[11px] text-primary-foreground/70 leading-relaxed">
                      I consent to Weybridge Lodge processing my data to verify my Masonic standing. Data is processed
                      strictly in accordance with our{" "}
                      <Link to="/data-protection" target="_blank" rel="noopener" className="text-gold hover:underline">
                        Data Protection Policy
                      </Link>
                      .
                    </span>
                  </label>

                  <button
                    disabled={busy}
                    type="submit"
                    className="w-full bg-gold-shimmer text-accent-foreground px-4 py-2.5 rounded-sm text-sm font-semibold font-sans hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity"
                  >
                    Submit Access Request <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                <div className="mt-6 pt-5 border-t border-gold/10 text-center">
                  <button
                    onClick={() => setView("login")}
                    className="text-xs font-medium text-gold hover:underline inline-flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Return to Account Sign-In
                  </button>
                </div>
              </motion.div>
            )}

            {/* ------------ REQUEST SENT ------------ */}
            {view === "request-sent" && (
              <motion.div
                key="sent"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="relative text-center py-4"
              >
                <div className="w-14 h-14 rounded-full bg-gold/15 flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-7 h-7 text-gold" />
                </div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-gold/70">Application Lodged</p>
                <h2 className="font-serif text-xl text-primary-foreground mt-2 mb-3">Awaiting Secretary's Sign-Off</h2>
                <p className="text-sm text-primary-foreground/70 leading-relaxed max-w-xs mx-auto">
                  Your access request has been received. The Lodge Secretary will verify your Masonic standing and
                  activate your account. You'll receive an email once approved.
                </p>
                <button
                  onClick={() => {
                    setView("login");
                    setFullName("");
                    setUgleReg("");
                    setMotherLodge("");
                    setRegEmail("");
                    setGdpr(false);
                  }}
                  className="text-[11px] font-semibold text-primary-foreground/60 hover:text-gold uppercase tracking-wider mt-6 inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" /> Back to Sign In
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Link to="/" className="block text-center mt-6 text-xs text-primary-foreground/50 hover:text-gold">
          ← Back to public site
        </Link>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-primary-foreground/60 mb-1.5">{label}</label>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-navy border border-gold/20 rounded-sm px-3 py-2.5 text-sm focus:outline-none focus:border-gold transition-colors"
      />
    </div>
  );
}
