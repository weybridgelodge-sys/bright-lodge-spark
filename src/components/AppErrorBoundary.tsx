import { Component, type ReactNode } from "react";

/** Hard reload that bypasses cached HTML (the apex domain's edge cache keys on the query string). */
export function hardReload() {
  const url = new URL(window.location.href);
  url.searchParams.set("_r", Date.now().toString(36));
  window.location.replace(url.toString());
}

type State = { error: Error | null };

/**
 * Last-resort safety net: any render error or failed page-code download shows a
 * clear message with a Reload button instead of a blank navy screen.
 */
export default class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[AppErrorBoundary]", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="min-h-screen flex items-center justify-center bg-navy px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-serif text-2xl text-gold">Something went wrong</h1>
          <p className="text-cream/80">
            This page didn't load properly. This usually fixes itself with a reload — if you were
            signing in, you'll still be signed in.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={hardReload}
              className="px-5 py-2 rounded-md bg-gold text-navy font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
            >
              Reload
            </button>
            <a href="/" className="px-5 py-2 rounded-md border border-gold/60 text-gold">
              Home page
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy" aria-busy="true" aria-label="Loading">
      <div className="w-8 h-8 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
    </div>
  );
}
