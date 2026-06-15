import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import logo from "@/assets/weybridge-logo.svg";

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
});

const signUpSchema = signInSchema.extend({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
});

export default function MembersLogin() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) navigate("/members", { replace: true });
  }, [session, navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const parsed = signInSchema.safeParse({ email, password });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0].message);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
        navigate("/members");
      } else {
        const parsed = signUpSchema.safeParse({ email, password, fullName });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0].message);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/members`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Account created — awaiting admin approval");
        setMode("signin");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
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

  return (
    <div className="min-h-screen bg-navy text-primary-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-3 mb-8">
          <img src={logo} alt="Weybridge Lodge crest" className="h-12 w-12 bg-primary-foreground/80 rounded-full p-0.5" />
          <div className="text-center">
            <p className="font-serif text-lg font-semibold">Weybridge Lodge</p>
            <p className="text-gold text-xs uppercase tracking-wider">Members Portal</p>
          </div>
        </Link>

        <div className="bg-navy-dark/70 border border-gold/20 rounded-sm p-6 sm:p-8 backdrop-blur">
          <div className="flex gap-2 mb-6 border-b border-gold/10">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-2 text-sm font-sans uppercase tracking-wide transition-colors border-b-2 -mb-px ${
                  mode === m ? "border-gold text-gold" : "border-transparent text-primary-foreground/60 hover:text-gold"
                }`}
              >
                {m === "signin" ? "Sign in" : "Request access"}
              </button>
            ))}
          </div>

          <form onSubmit={handleEmail} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-xs uppercase tracking-wider text-primary-foreground/60 mb-1">Full name</label>
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-navy border border-gold/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-gold"
                  placeholder="Bro. John Smith"
                />
              </div>
            )}
            <div>
              <label className="block text-xs uppercase tracking-wider text-primary-foreground/60 mb-1">Email</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-navy border border-gold/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-gold"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-primary-foreground/60 mb-1">Password</label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-navy border border-gold/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-gold"
                placeholder="Minimum 6 characters"
              />
            </div>
            <button
              disabled={busy}
              type="submit"
              className="w-full bg-gold-shimmer text-accent-foreground px-4 py-2.5 rounded-sm text-sm font-semibold font-sans hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Request access"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-primary-foreground/40">
            <div className="flex-1 h-px bg-gold/10" /> OR <div className="flex-1 h-px bg-gold/10" />
          </div>

          <button
            onClick={handleGoogle}
            disabled={busy}
            className="w-full border border-gold/30 text-primary-foreground px-4 py-2.5 rounded-sm text-sm font-sans hover:bg-gold/5 disabled:opacity-50"
          >
            Continue with Google
          </button>

          <p className="text-xs text-primary-foreground/50 mt-6 text-center">
            New accounts must be approved by the Lodge Secretary before access is granted.
          </p>
        </div>

        <Link to="/" className="block text-center mt-6 text-xs text-primary-foreground/50 hover:text-gold">
          ← Back to public site
        </Link>
      </div>
    </div>
  );
}
