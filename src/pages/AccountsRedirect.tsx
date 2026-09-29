import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import SEO from "@/components/SEO";

export default function AccountsRedirect() {
  const { year } = useParams();
  const [params] = useSearchParams();
  const key = params.get("k") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!year || !key) {
        setError("This accounts link is incomplete. Please use the link from your summons email.");
        return;
      }
      try {
        const base = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/accounts-link`;
        const res = await fetch(
          `${base}?y=${encodeURIComponent(year)}&k=${encodeURIComponent(key)}`,
        );
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !body?.url) {
          setError(body?.message ?? "We couldn't open those accounts.");
          return;
        }
        setSignedUrl(body.url as string);
        window.location.replace(body.url as string);
      } catch {
        if (!cancelled) setError("We couldn't open those accounts. Please try again in a moment.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [year, key]);

  return (
    <div className="min-h-screen bg-navy text-primary-foreground flex items-center justify-center px-6">
      <SEO
        title="Annual accounts"
        description="Download the lodge annual accounts."
      />
      <div className="max-w-md w-full text-center space-y-4">
        {error ? (
          <>
            <h1 className="font-playfair text-2xl text-gold">Accounts unavailable</h1>
            <p className="text-primary-foreground/80">{error}</p>
            <p className="text-sm text-primary-foreground/60">
              If this keeps happening, please contact the Secretary at{" "}
              <a className="text-gold underline" href="mailto:secretary@weybridgelodge.org.uk">
                secretary@weybridgelodge.org.uk
              </a>
              .
            </p>
            <Link to="/" className="inline-block text-gold underline">
              Return to the Lodge website
            </Link>
          </>
        ) : (
          <>
            <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto" />
            <p className="text-primary-foreground/80">Opening the annual accounts…</p>
            {signedUrl && (
              <a className="text-gold underline" href={signedUrl}>
                Click here if the download doesn't start
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}
