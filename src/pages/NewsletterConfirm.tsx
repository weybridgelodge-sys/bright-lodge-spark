import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State = "loading" | "confirmed" | "expired" | "invalid" | "error";

/** Calls newsletter-confirm once per token. Exported for tests. */
export async function confirmNewsletterToken(token: string): Promise<State> {
  if (!token) return "invalid";
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/newsletter-confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ token }),
    });
    const data = (await res.json().catch(() => ({}))) as { status?: string };
    if (data.status === "confirmed" || data.status === "expired" || data.status === "invalid") return data.status;
    return "error";
  } catch {
    return "error";
  }
}

const NextStep = () => (
  <div className="flex flex-col items-center gap-3">
    <Button asChild className="min-h-[44px] h-auto whitespace-normal py-3 px-5 font-sans">
      <Link to="/events">See what's coming up</Link>
    </Button>
    <Link to="/" className="inline-flex items-center min-h-[44px] px-2 font-sans text-sm text-foreground underline underline-offset-4">
      Back to the home page
    </Link>
  </div>
);

const SubscribeAgain = () => (
  <Button asChild variant="outline" className="min-h-[44px] h-auto whitespace-normal py-3 px-5 font-sans">
    <a href="#newsletter-signup">Subscribe again</a>
  </Button>
);

const NewsletterConfirm = () => {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<State>("loading");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    // Remove the token from the address bar so it isn't kept in history or shared.
    if (token) window.history.replaceState(null, "", "/newsletter/confirm");
    confirmNewsletterToken(token).then(setState);
  }, [token]);

  return (
    <div className="min-h-screen">
      <SEO title="Confirm your subscription" description="Confirm your subscription to news from Weybridge Lodge." canonical="/newsletter/confirm" noindex />
      <Header />
      <main id="main-content">
        <PageHeader title="Newsletter" subtitle="Confirm your subscription" />
        <section className="py-16 sm:py-20">
          <div className="container mx-auto px-4 sm:px-6 max-w-xl">
            <div className="bg-card border border-border rounded-sm p-6 sm:p-8 text-center" role="status" aria-live="polite">
              {state === "loading" && <p className="font-sans text-muted-foreground">Confirming your subscription…</p>}
              {state === "confirmed" && (
                <>
                  <h2 className="text-2xl font-serif text-foreground mb-3">You're subscribed</h2>
                  <p className="font-sans text-muted-foreground mb-6">
                    Thank you for confirming. A short welcome note from our Worshipful Master is on its way to your inbox.
                  </p>
                  <NextStep />
                </>
              )}
              {state === "expired" && (
                <>
                  <h2 className="text-2xl font-serif text-foreground mb-3">This link has expired</h2>
                  <p className="font-sans text-muted-foreground mb-6">
                    Confirmation links last 14 days. Please sign up again using the form at the bottom of this page and we'll send a fresh one.
                  </p>
                  <SubscribeAgain />
                </>
              )}
              {(state === "invalid" || state === "error") && (
                <>
                  <h2 className="text-2xl font-serif text-foreground mb-3">
                    {state === "invalid" ? "This link isn't valid" : "We couldn't confirm just now"}
                  </h2>
                  <p className="font-sans text-muted-foreground mb-6">
                    {state === "invalid"
                      ? "It may already have been used, or it may have been copied incompletely. If you're not yet subscribed, please sign up again using the form at the bottom of this page."
                      : "Please try the link again in a few minutes, or sign up again using the form at the bottom of this page."}
                  </p>
                  <SubscribeAgain />
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

export default NewsletterConfirm;
