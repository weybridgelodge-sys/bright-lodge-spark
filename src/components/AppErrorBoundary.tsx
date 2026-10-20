import { Component, type ReactNode } from "react";
import { cacheBustUrl, shortErrorLabel, tryChunkReload } from "@/lib/chunkReload";

/** Hard reload that bypasses cached HTML (the apex domain's edge cache keys on the query string). */
export function hardReload() {
  window.location.replace(cacheBustUrl(window.location.href, Date.now()));
}

type State = { error: Error | null; reloading: boolean };

/**
 * Last-resort safety net: a failed page-code download reloads once (cache-busted);
 * any other error shows a message with a Reload button instead of a blank screen.
 */
export default class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, reloading: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[AppErrorBoundary]", error);
    if (tryChunkReload(error)) this.setState({ reloading: true });
  }

  render() {
    if (!this.state.error) return this.props.children;
    if (this.state.reloading) return <PageLoader />;
    const label = shortErrorLabel(this.state.error);
    return (
      <div role="alert" className="min-h-screen flex items-center justify-center bg-navy px-6 font-sans">
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-serif text-2xl text-gold">Something went wrong</h1>
          <p className="text-cream/80">
            This page didn't load properly. This usually fixes itself with a reload — if you were
            signing in, you'll still be signed in.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              type="button"
              onClick={hardReload}
              className="min-h-11 min-w-11 px-5 py-2 rounded-md bg-gold text-navy font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
            >
              Reload
            </button>
            <a href="/" className="inline-flex items-center min-h-11 min-w-11 px-5 py-2 rounded-md border border-gold/60 text-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy">
              Home page
            </a>
          </div>
          {label && (
            <p className="text-xs text-cream/70 break-words" data-testid="error-detail">
              Error: {label}
            </p>
          )}
        </div>
      </div>
    );
  }
}

export function PageLoader() {
  return (
    <main id="main-content" className="min-h-screen flex items-center justify-center bg-navy" aria-busy="true" aria-label="Loading">
      <div className="w-8 h-8 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
    </main>
  );
}
