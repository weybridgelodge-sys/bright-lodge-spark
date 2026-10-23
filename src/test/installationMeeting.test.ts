import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { findInstallationMeeting } from "@/lib/installationMeeting";
import { vacancyIssues } from "@/lib/provincialReturn";

type Row = Record<string, any>;
/** Tiny in-memory stand-in for the query builder: applies the filters the helper uses. */
function fakeClient(tables: Record<string, Row[]>) {
  return {
    from(t: string) {
      let rows = [...(tables[t] ?? [])];
      const q: any = {
        select: () => q,
        eq: (c: string, v: any) => { rows = rows.filter((r) => r[c] === v); return q; },
        is: (c: string, v: any) => { rows = rows.filter((r) => (r[c] ?? null) === v); return q; },
        gte: (c: string, v: string) => { rows = rows.filter((r) => String(r[c]).slice(0, 10) >= v); return q; },
        lt: (c: string, v: string) => { rows = rows.filter((r) => String(r[c]).slice(0, 10) < v); return q; },
        ilike: (c: string, v: string) => { const n = v.replace(/%/g, "").toLowerCase(); rows = rows.filter((r) => String(r[c] ?? "").toLowerCase().includes(n)); return q; },
        order: (c: string) => { rows.sort((a, b) => String(a[c]).localeCompare(String(b[c]))); return q; },
        maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
        then: (res: any) => res({ data: rows, error: null }),
      };
      return q;
    },
  };
}
const reg = (meeting_date: string, extra: Row = {}) => ({ meeting_type: "installation", cancelled_at: null, status: "draft", lodge_event_id: null, meeting_date, ...extra });

describe("findInstallationMeeting", () => {
  it("uses the register meeting when no event is published (draft counts, title from linked event)", async () => {
    const c = fakeClient({
      festive_board_meetings: [reg("2026-10-21", { lodge_event_id: "e1" })],
      lodge_events: [{ id: "e1", title: "Installation Meeting", event_date: "2026-10-21 16:30:00+00", published: false }],
    });
    const r = await findInstallationMeeting(2026, c);
    expect(r.meeting).toEqual({ date: "2026-10-21", title: "Installation Meeting", source: "register" });
  });
  it("falls back to a published event when there is no register row", async () => {
    const c = fakeClient({ festive_board_meetings: [], lodge_events: [{ id: "e", title: "Installation", event_date: "2026-10-21 16:30:00+00", published: true }] });
    expect((await findInstallationMeeting(2026, c)).meeting).toEqual({ date: "2026-10-21", title: "Installation", source: "event" });
  });
  it("returns null when neither source has one", async () => {
    expect((await findInstallationMeeting(2026, fakeClient({}))).meeting).toBeNull();
  });
  it("ignores cancelled register rows", async () => {
    const c = fakeClient({ festive_board_meetings: [reg("2026-10-21", { cancelled_at: "2026-10-01" })] });
    expect((await findInstallationMeeting(2026, c)).meeting).toBeNull();
  });
  it("window edges: 1 Sep included, 31 Aug and next 1 Sep excluded", async () => {
    expect((await findInstallationMeeting(2026, fakeClient({ festive_board_meetings: [reg("2026-09-01")] }))).meeting?.date).toBe("2026-09-01");
    expect((await findInstallationMeeting(2026, fakeClient({ festive_board_meetings: [reg("2026-08-31")] }))).meeting).toBeNull();
    expect((await findInstallationMeeting(2026, fakeClient({ festive_board_meetings: [reg("2027-08-31")] }))).meeting?.date).toBe("2027-08-31");
    expect((await findInstallationMeeting(2026, fakeClient({ festive_board_meetings: [reg("2027-09-01")] }))).meeting).toBeNull();
  });
  it("several register rows: earliest used, with an issue", async () => {
    const r = await findInstallationMeeting(2026, fakeClient({ festive_board_meetings: [reg("2026-11-02"), reg("2026-10-21")] }));
    expect(r.meeting?.date).toBe("2026-10-21");
    expect(r.issues[0]).toMatch(/2 Installation meetings found in the register/);
  });
});

describe("Provincial vacancy warnings", () => {
  it("ASECY vacant gives no issue; other vacant offices still warn", () => {
    const issues = vacancyIssues([
      { key: "assistant_secretary", label: "ASECY", provenance: "vacant" },
      { key: "tyler", label: "Tyler", provenance: "vacant" },
      { key: "secretary", label: "Secretary", provenance: "vacant" },
    ]);
    expect(issues).toEqual(["Tyler: nobody resolved.", "Secretary: nobody resolved."]);
  });
});
