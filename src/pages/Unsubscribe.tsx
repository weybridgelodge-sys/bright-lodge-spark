import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO from "@/components/SEO";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State = "loading" | "valid" | "invalid" | "used" | "confirming" | "success" | "error";

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      setMessage("This unsubscribe link is missing its token.");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setState("invalid");
          setMessage(data?.error || "This unsubscribe link is invalid.");
          return;
        }
        if (data?.already_used) {
          setState("used");
          setEmail(data?.email || "");
          return;
        }
        setEmail(data?.email || "");
        setState("valid");
      } catch {
        setState("error");
        setMessage("We could not verify your unsubscribe link. Please try again later.");
      }
    })();
  }, [token]);

  const confirm = async () => {
    setState("confirming");
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState("error");
        setMessage(data?.error || "We could not complete your unsubscribe request.");
        return;
      }
      setState("success");
    } catch {
      setState("error");
      setMessage("Network error. Please try again later.");
    }
  };

  return (
    <div className="min-h-screen">
      <SEO title="Unsubscribe" description="Manage your email subscription for Weybridge Lodge." canonical="/unsubscribe" />
      <Header />
      <main>
        <PageHeader title="Unsubscribe" subtitle="Manage your email preferences" />
        <section className="py-16 sm:py-20">
          <div className="container mx-auto px-4 sm:px-6 max-w-xl">
            <div className="bg-card border border-border rounded-sm p-8 text-center">
              {state === "loading" && <p className="font-sans text-muted-foreground">Checking your link…</p>}

              {state === "valid" && (
                <>
                  <h2 className="text-2xl font-serif text-foreground mb-3">Confirm unsubscribe</h2>
                  <p className="font-sans text-muted-foreground mb-6">
                    {email
                      ? <>We will stop sending email to <strong className="text-foreground">{email}</strong>.</>
                      : "We will stop sending email to this address."}
                  </p>
                  <button
                    onClick={confirm}
                    className="bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
                  >
                    Confirm Unsubscribe
                  </button>
                </>
              )}

              {state === "confirming" && <p className="font-sans text-muted-foreground">Unsubscribing…</p>}

              {state === "success" && (
                <>
                  <h2 className="text-2xl font-serif text-foreground mb-3">You're unsubscribed</h2>
                  <p className="font-sans text-muted-foreground">
                    {email ? <>We won't send any more email to <strong className="text-foreground">{email}</strong>.</> : "We won't send any more email to this address."}
                  </p>
                </>
              )}

              {state === "used" && (
                <>
                  <h2 className="text-2xl font-serif text-foreground mb-3">Already unsubscribed</h2>
                  <p className="font-sans text-muted-foreground">
                    {email ? <><strong className="text-foreground">{email}</strong> is already unsubscribed.</> : "This address is already unsubscribed."}
                  </p>
                </>
              )}

              {(state === "invalid" || state === "error") && (
                <>
                  <h2 className="text-2xl font-serif text-foreground mb-3">Link not valid</h2>
                  <p className="font-sans text-muted-foreground">{message}</p>
                </>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Unsubscribe;
