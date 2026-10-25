import { describe, it, expect, vi } from "vitest";
import {
  decideSignup, tokenState, handleSignup, handleConfirm, hashToken, welcomeSignOff,
  type SubscriberRow, type SignupDeps, type ConfirmDeps,
} from "../../supabase/functions/_shared/newsletterOptIn";

const NOW = new Date("2026-10-18T12:00:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
const H = 3600_000, D = 24 * H;
const row = (o: Partial<SubscriberRow> = {}): SubscriberRow => ({
  id: "r1", email: "a@b.co", confirmed: false, unsubscribed_at: null, confirm_token_hash: "h", confirm_sent_at: ago(2 * H), ...o,
});

function signupDeps(existing: SubscriberRow | null, sendFails = false) {
  const d = {
    cleanupPending: vi.fn(async () => {}),
    findByEmail: vi.fn(async () => existing),
    insertPending: vi.fn(async (email: string, _h: string, _s: string) => row({ id: "new", email })),
    refreshPending: vi.fn(async () => {}),
    clearSentAt: vi.fn(async () => {}),
    sendConfirm: vi.fn(async (_e: string, _u: string, _k: string) => { if (sendFails) throw new Error("down"); }),
    log: vi.fn(),
  } satisfies SignupDeps;
  return d;
}

describe("newsletter signup", () => {
  it("new address is stored unconfirmed and gets one confirm email", async () => {
    const d = signupDeps(null);
    expect(await handleSignup(d, "a@b.co", "https://weybridgelodge.org.uk", NOW)).toBe("insert_and_send");
    expect(d.insertPending).toHaveBeenCalledOnce();
    expect(d.sendConfirm).toHaveBeenCalledOnce();
    const url = d.sendConfirm.mock.calls[0][1] as string;
    expect(url).toMatch(/^https:\/\/weybridgelodge\.org\.uk\/newsletter\/confirm\?token=[0-9a-f]{64}$/);
    // Only the hash is stored, never the token itself.
    const token = url.split("token=")[1];
    expect(d.insertPending.mock.calls[0][1]).toBe(await hashToken(token));
    expect(d.insertPending.mock.calls[0][1]).not.toBe(token);
  });
  it("already confirmed address gets no email", async () => {
    const d = signupDeps(row({ confirmed: true }));
    expect(await handleSignup(d, "a@b.co", "https://x", NOW)).toBe("silent_already_subscribed");
    expect(d.sendConfirm).not.toHaveBeenCalled();
    expect(d.refreshPending).not.toHaveBeenCalled();
  });
  it("unconfirmed address: at most one confirm email per hour", async () => {
    expect(decideSignup(row({ confirm_sent_at: ago(59 * 60_000) }), NOW)).toBe("throttled");
    expect(decideSignup(row({ confirm_sent_at: ago(61 * 60_000) }), NOW)).toBe("refresh_and_send");
    const d = signupDeps(row({ confirm_sent_at: ago(10 * 60_000) }));
    await handleSignup(d, "a@b.co", "https://x", NOW);
    expect(d.sendConfirm).not.toHaveBeenCalled();
  });
  it("unsubscribed address must confirm again", () => {
    expect(decideSignup(row({ confirmed: true, unsubscribed_at: ago(D), confirm_sent_at: null }), NOW)).toBe("refresh_and_send");
  });
  it("cleanup removes unconfirmed rows older than 30 days", async () => {
    const d = signupDeps(null);
    await handleSignup(d, "a@b.co", "https://x", NOW);
    expect(d.cleanupPending).toHaveBeenCalledWith(ago(30 * D));
  });
  it("a failed send resets the hourly limit and still resolves", async () => {
    const d = signupDeps(null, true);
    await expect(handleSignup(d, "a@b.co", "https://x", NOW)).resolves.toBe("insert_and_send");
    expect(d.clearSentAt).toHaveBeenCalledWith("new");
  });
});

describe("newsletter confirm", () => {
  it("token expires after 14 days", () => {
    expect(tokenState(row({ confirm_sent_at: ago(14 * D - H) }), NOW)).toBe("valid");
    expect(tokenState(row({ confirm_sent_at: ago(14 * D + H) }), NOW)).toBe("expired");
    expect(tokenState(row({ confirm_token_hash: null }), NOW)).toBe("invalid");
  });
  const tok = "a".repeat(64);
  const deps = (found: SubscriberRow | null, confirmed: { id: string; email: string } | null) => ({
    findByTokenHash: vi.fn(async () => found),
    confirm: vi.fn(async () => confirmed),
    sendWelcome: vi.fn(async (_e: string, _k: string, _u: string | null) => {}),
    defer: vi.fn((_l: string, task: () => Promise<unknown>) => { void task(); }),
    log: vi.fn(),
  } satisfies ConfirmDeps);
  it("valid token confirms, burns and sends welcome once", async () => {
    const d = deps(row({ confirm_sent_at: ago(D) }), { id: "r1", email: "a@b.co" });
    expect(await handleConfirm(d, tok, NOW)).toBe("confirmed");
    expect(d.findByTokenHash).toHaveBeenCalledWith(await hashToken(tok));
    expect(d.sendWelcome).toHaveBeenCalledOnce();
  });
  it("used or unknown token: no welcome", async () => {
    const used = deps(null, null);
    expect(await handleConfirm(used, tok, NOW)).toBe("invalid");
    const raced = deps(row(), null);
    expect(await handleConfirm(raced, tok, NOW)).toBe("invalid");
    expect(raced.sendWelcome).not.toHaveBeenCalled();
  });
  it("expired token: no confirm, no welcome", async () => {
    const d = deps(row({ confirm_sent_at: ago(15 * D) }), { id: "r1", email: "a@b.co" });
    expect(await handleConfirm(d, tok, NOW)).toBe("expired");
    expect(d.confirm).not.toHaveBeenCalled();
  });
  it("malformed token never reaches the database", async () => {
    const d = deps(null, null);
    expect(await handleConfirm(d, "abc", NOW)).toBe("invalid");
    expect(d.findByTokenHash).not.toHaveBeenCalled();
  });
});

describe("newsletter confirm replies first (Job BS)", () => {
  const tok = "c".repeat(64);
  const base = (send: () => Promise<void>) => {
    const tasks: Promise<unknown>[] = [];
    const d = {
      findByTokenHash: vi.fn(async () => row({ confirm_sent_at: ago(D), unit_id: "unit-b" })),
      confirm: vi.fn(async () => ({ id: "r1", email: "a@b.co", unit_id: "unit-b" })),
      sendWelcome: vi.fn(async (_e: string, _k: string, _u: string | null) => send()),
      defer: vi.fn((_l: string, t: () => Promise<unknown>) => { tasks.push(t()); }),
      log: vi.fn(),
    } satisfies ConfirmDeps;
    return { d, tasks };
  };
  it("replies confirmed when the welcome send throws, and logs it", async () => {
    const { d, tasks } = base(async () => { throw new Error("down"); });
    expect(await handleConfirm(d, tok, NOW)).toBe("confirmed");
    await Promise.all(tasks);
    expect(d.log).toHaveBeenCalledWith("welcome email send failed", expect.any(Error));
  });
  it("replies confirmed when the welcome send never resolves; times out at 15s", async () => {
    vi.useFakeTimers();
    try {
      const { d, tasks } = base(() => new Promise<void>(() => {}));
      expect(await handleConfirm(d, tok, NOW)).toBe("confirmed");
      expect(d.log).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(15_000);
      await Promise.all(tasks);
      expect(d.log).toHaveBeenCalledWith("welcome email send failed", expect.objectContaining({ message: expect.stringMatching(/timed out/) }));
    } finally { vi.useRealTimers(); }
  });
  it("welcome uses the subscriber row's unit (two units)", async () => {
    const { d, tasks } = base(async () => {});
    await handleConfirm(d, tok, NOW);
    await Promise.all(tasks);
    expect(d.sendWelcome.mock.calls[0][2]).toBe("unit-b");
  });
  it("second click after confirm is still 'invalid' with no welcome", async () => {
    const { d } = base(async () => {});
    d.confirm.mockResolvedValueOnce(null as never);
    expect(await handleConfirm(d, tok, NOW)).toBe("invalid");
    expect(d.defer).not.toHaveBeenCalled();
  });
});

describe("welcome sign-off", () => {
  it("uses the WM name from the database, else the lodge name", () => {
    expect(welcomeSignOff("W Bro. Jane Smith", "Weybridge Lodge No. 6787")).toEqual({ name: "W Bro. Jane Smith", role: "Worshipful Master, Weybridge Lodge No. 6787" });
    expect(welcomeSignOff(null, "Weybridge Lodge No. 6787")).toEqual({ name: "Weybridge Lodge No. 6787", role: null });
    expect(welcomeSignOff("  ", "Weybridge Lodge No. 6787").name).toBe("Weybridge Lodge No. 6787");
  });
});
