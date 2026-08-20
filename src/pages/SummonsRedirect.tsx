import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import SEO from "@/components/SEO";

export default function SummonsRedirect() {
  const { meetingNumber } = useParams();
  const [params] = useSearchParams();
  const key = params.get("k") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!meetingNumber || !key) {
        setError("This summons link is incomplete. Please use the link from your summons email.");
        return;
      }
      try {
        const base = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/summons-link`;
        const res = await fetch(
          `${base}?n=${encodeURIComponent(meetingNumber)}&k=${encodeURIComponent(key)}`,
        );
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !body?.url) {
          setError(body?.message ?? "We couldn't open that summons.");
          return;
        }
        setSignedUrl(body.url as string);
        window.location.replace(body.url as string);
      } catch {
        if (!cancelled) setError("We couldn't open that summons. Please try again in a moment.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [meetingNumber, key]);

  return (
    <div className="min-h-screen bg-navy text-primary-foreground flex items-center justify-center px-6">
      <SEO
        title={`Summons ${meetingNumber ?? ""}`}
        description="Download your lodge summons."
      />
      <div className="max-w-md w-full text-center space-y-4">
        {error ? (
          <>
            <h1 className="font-playfair text-2xl text-gold">Summons unavailable</h1>
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
            <p className="text-primary-foreground/80">Opening your summons…</p>
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
