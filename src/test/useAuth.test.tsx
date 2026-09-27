import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mocks.getSession(...args),
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        mocks.onAuthStateChange(cb);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      signOut: vi.fn(),
    },
    from: (...args: unknown[]) => mocks.from(...args),
    rpc: (...args: unknown[]) => mocks.rpc(...args),
  },
}));

import { AuthProvider, useAuth } from "@/hooks/useAuth";

/** Mirrors ProtectedRoute: it renders a full-screen loader while `loading` is true. */
function Probe() {
  const { loading, session } = useAuth();
  if (loading) return <div data-testid="loading">loading</div>;
  return <div data-testid="done">{session ? "signed-in" : "anonymous"}</div>;
}

const session = {
  access_token: "token",
  user: { id: "user-1", email: "test@example.com" },
} as never;

/** supabase.from(table).select().eq() -> maybeSingle()/single() chaining used by loadProfileAndRole. */
function tableReturning(result: { data?: unknown; error?: unknown }, settle: "now" | "never" = "now") {
  const terminal = () =>
    settle === "never" ? new Promise(() => {}) : Promise.resolve(result);
  const chainable: Record<string, unknown> = {
    select: () => chainable,
    eq: () => chainable,
    maybeSingle: terminal,
    single: terminal,
  };
  return chainable;
}

function defaultQueries() {
  mocks.from.mockImplementation((table: string) => {
    if (table === "profiles") return tableReturning({ data: { id: "user-1", status: "active", email: "test@example.com" } });
    return tableReturning({ data: [{ role: "member" }] });
  });
  mocks.rpc.mockResolvedValue({ data: null, error: null });
}

beforeEach(() => {
  vi.clearAllMocks();
  defaultQueries();
  mocks.onAuthStateChange.mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("AuthProvider bootstrapping", () => {
  it("resolves to signed-out when getSession() rejects", async () => {
    mocks.getSession.mockRejectedValue(new Error("storage backend exploded"));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId("done")).toHaveTextContent("anonymous"), {
      timeout: 3000,
    });
  });

  it("resolves to signed-out when getSession() never settles (guard timeout)", async () => {
    vi.useFakeTimers();
    mocks.getSession.mockReturnValue(new Promise(() => {}));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    expect(screen.getByTestId("loading")).toBeInTheDocument();
    // Still spinning just before the backstop...
    await vi.advanceTimersByTimeAsync(7000);
    expect(screen.getByTestId("loading")).toBeInTheDocument();
    // ...and released by it.
    await vi.advanceTimersByTimeAsync(1500);
    expect(screen.getByTestId("done")).toHaveTextContent("anonymous");
  });

  it("releases the loader when the profile load hangs for a signed-in user", async () => {
    vi.useFakeTimers();
    mocks.getSession.mockResolvedValue({ data: { session } });
    mocks.from.mockImplementation((table: string) =>
      table === "profiles" ? tableReturning({}, "never") : tableReturning({ data: [] })
    );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    expect(screen.getByTestId("loading")).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(9000);
    expect(screen.getByTestId("done")).toBeInTheDocument();
  });

  it("releases the loader when the profile load rejects", async () => {
    mocks.getSession.mockResolvedValue({ data: { session } });
    mocks.from.mockImplementation((table: string) =>
      table === "profiles"
        ? tableReturning({ error: { message: "permission denied" } })
        : tableReturning({ data: [] })
    );
    // make the profiles read actually reject rather than return an error object
    mocks.from.mockImplementation((table: string) => {
      const chainable: Record<string, unknown> = {
        select: () => chainable,
        eq: () => chainable,
        maybeSingle: () => Promise.reject(new Error("network down")),
        single: () => Promise.reject(new Error("network down")),
      };
      return table === "profiles" ? chainable : tableReturning({ data: [] });
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId("done")).toHaveTextContent("signed-in"), {
      timeout: 3000,
    });
  });

  it("still reports a valid session as signed-in (no regression)", async () => {
    mocks.getSession.mockResolvedValue({ data: { session } });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId("done")).toHaveTextContent("signed-in"), {
      timeout: 3000,
    });
  });

  it("settles immediately for a genuinely signed-out visitor", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId("done")).toHaveTextContent("anonymous"), {
      timeout: 3000,
    });
  });
});
