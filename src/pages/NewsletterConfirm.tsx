import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO from "@/components/SEO";
import { useUnitProfile } from "@/lib/unitProfile";
import { Button } from "@/components/ui/button";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State = "loading" | "confirmed" | "expired" | "invalid" | "error" | "timeout";

export const CONFIRM_TIMEOUT_MS = 20_000;

/** Calls newsletter-confirm once per token. Exported for tests. */
export async function confirmNewsletterToken(token: string, timeoutMs = CONFIRM_TIMEOUT_MS): Promise<State> {
  if (!token) return "invalid";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/newsletter-confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ token }),
      signal: ctrl.signal,
    });
    const data = (await res.json().catch(() => ({}))) as { status?: string };
    if (data.status === "confirmed" || data.status === "expired" || data.status === "invalid") return data.status;
    return "error";
  } catch {
    return ctrl.signal.aborted ? "timeout" : "error";
  } finally {
    clearTimeout(timer);
  }
}

const HomeLink = () => (
  <Link to="/" className="inline-flex items-center min-h-[44px] px-2 font-sans text-sm text-foreground underline underline-offset-4">
    Back to the home page
  </Link>
);

const SubscribeAgain = () => (
  <Button asChild variant="outline" className="min-h-[44px] h-auto whitespace-normal py-3 px-5 font-sans">
    <a href="#newsletter-signup">Subscribe again</a>
  </Button>
);

const NewsletterConfirm = () => {
  const { lodgeName } = useUnitProfile();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<State>("loading");
  const ran = useRef(false);
  const tokenRef = useRef(token);
  const retry = () => { setState("loading"); confirmNewsletterToken(tokenRef.current).then(setState); };

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    // Remove the token from the address bar so it isn't kept in history or shared.
    if (token) window.history.replaceState(null, "", "/newsletter/confirm");
    confirmNewsletterToken(token).then(setState);
  }, [token]);

  return (
    <div className="min-h-screen">
      <SEO title="Confirm your subscription" description={`Confirm your subscription to news from ${lodgeName || "the Lodge"}.`} canonical="/newsletter/confirm" noindex />
      <Header />
      <main id="main-content">
        <PageHeader title="Newsletter" subtitle="Confirm your subscription" />
        <section className="py-16 sm:py-20">
          <div className="container mx-auto px-4 sm:px-6 max-w-xl">
            <div className="bg-card border border-border rounded-sm p-6 sm:p-8 text-center" role="status" aria-live="polite">
              {state === "loading" && <p className="font-sans text-muted-foreground">Confirming your subscription…</p>}
              {state === "confirmed" && (
                <>
                  <h2 className="text-2xl font-serif text-foreground mb-3">You're confirmed. Thank you.</h2>
                  <p className="font-sans text-muted-foreground mb-6">
                    A note from our Worshipful Master is on its way to your inbox.
                  </p>
                  <HomeLink />
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
              {state === "timeout" && (
                <>
                  <h2 className="text-2xl font-serif text-foreground mb-3">We could not confirm that just now</h2>
                  <p className="font-sans text-muted-foreground mb-3">
                    Your link may already have worked. Please try the link again, or contact us.
                  </p>
                  <p className="font-sans text-muted-foreground mb-6">
                    Each link can only be used once, so if trying again says the link is already used, your subscription has probably been confirmed.
                  </p>
                  <div className="flex flex-col items-center gap-3">
                    <Button type="button" onClick={retry} className="min-h-[44px] h-auto whitespace-normal py-3 px-5 font-sans">Retry</Button>
                    <Link to="/contact" className="inline-flex items-center min-h-[44px] px-2 font-sans text-sm text-foreground underline underline-offset-4">Contact us</Link>
                    <HomeLink />
                  </div>
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
