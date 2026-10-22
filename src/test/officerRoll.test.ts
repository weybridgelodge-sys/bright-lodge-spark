import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { resolveOfficeRoll, provenanceLabel } from "@/lib/officerRoll";
import { meetingPatternSentence, chooseMeetingPattern, inferSchedule } from "@/lib/meetingDiary";
import { derivedName, derivedHonorary, applyDerivedNames } from "@/lib/summonsSources";

const a = (k: string, id: string | null, y: number, proj = false) => ({ position_key: k, member_id: id, lodge_year: y, is_projection: proj });
const prof = (id: string) => ({ id, first_name: "A", middle_name: null, last_name: id.toUpperCase(), full_name: null, email: null, status: "active" });

describe("shared officer roll", () => {
  const input = (appts: any[]) => ({ year: 2026, appts, profiles: ["t", "s", "w", "x"].map(prof), statuses: [] });
  it("carries a 2025 non-progressive holder into 2026", () => {
    const [t] = resolveOfficeRoll([{ key: "treasurer", label: "Treasurer" }], input([a("treasurer", "t", 2025)]));
    expect([t.memberId, t.provenance, t.fromYear]).toEqual(["t", "carried", 2025]);
    expect(provenanceLabel(t)).toBe("Carried forward from 2025");
  });
  it("never leaves a role blank when an earlier confirmed holder exists", () => {
    const [s] = resolveOfficeRoll([{ key: "secretary", label: "Secretary" }], input([a("secretary", "s", 2020)]));
    expect(s.memberId).toBe("s");
  });
  it("keeps Almoner vacant when its latest record is empty", () => {
    const [al] = resolveOfficeRoll([{ key: "almoner", label: "Almoner" }], input([a("almoner", "x", 2024), a("almoner", null, 2025)]));
    expect(al.provenance).toBe("vacant");
  });
  it("progressive office uses the Ladder plan, not the stale earlier holder", () => {
    const [sw] = resolveOfficeRoll([{ key: "senior_warden", label: "SW" }], input([a("senior_warden", "x", 2025), a("senior_warden", "w", 2026, true)]));
    expect([sw.memberId, sw.provenance]).toEqual(["w", "planned"]);
  });
  it("confirmed this-year row wins", () => {
    const [w] = resolveOfficeRoll([{ key: "worshipful_master", label: "WM" }], input([a("worshipful_master", "w", 2026)]));
    expect(w.provenance).toBe("confirmed");
  });
});

describe("meeting pattern sentence", () => {
  const m = (d: string, t = "regular") => ({ id: d, meeting_date: d, meeting_type: t as any, cancelled_at: null });
  it("matches the lodge's four-meeting wording in calendar order", () => {
    const s = inferSchedule([m("2026-12-09"), m("2027-02-17"), m("2026-10-21", "installation"), m("2027-05-12")]);
    expect(meetingPatternSentence(s)).toBe("3rd Wednesday in February, 2nd Wednesday in May, 3rd Wednesday in October (Installation) and 2nd Wednesday in December.");
  });
  it("single month and 'last'", () => {
    expect(meetingPatternSentence([{ month: 3, ordinal: "last", weekday: 4, meeting_type: "regular" }])).toBe("Last Thursday in March.");
    expect(meetingPatternSentence([])).toBe("");
  });
  it("manual text only wins when the override is on or no schedule is saved", () => {
    expect(chooseMeetingPattern({ generated: "G.", manualText: "M", manualOverride: false })).toEqual({ text: "G.", source: "schedule" });
    expect(chooseMeetingPattern({ generated: "G.", manualText: "M", manualOverride: true }).text).toBe("M");
    expect(chooseMeetingPattern({ generated: "", manualText: " M  x ", manualOverride: false }).text).toBe("M x");
  });
});

describe("derived names", () => {
  const mem: any = { id: "m1", title: "Bro", first_name: "Steven", middle_name: null, last_name: "Bradley", full_name: null, preferred_name: null, post_nominals: null, rank: null, grand_rank: null, provincial_rank: null, is_past_master: false, is_honorary_member: false, status: "active" };
  const pm: any = { ...mem, id: "m2", first_name: "Carl", middle_name: "G", last_name: "Burgess", is_past_master: true, provincial_rank: "PPAGReg", is_honorary_member: true };
  it("a linked member with an empty typed name prints the member's name", () => {
    expect(derivedName({ name: "", member_id: "m1" }, { m1: mem })).toBe("Bro. S Bradley");
  });
  it("member record wins over typed text; typed text for non-member", () => {
    expect(derivedName({ name: "Old text", member_id: "m1" }, { m1: mem })).toBe("Bro. S Bradley");
    expect(derivedName({ name: " Bro  D Visitor " }, {})).toBe("Bro D Visitor");
  });
  it("honorary members come from member records; typed only when none flagged", () => {
    expect(derivedHonorary([mem, pm], "typed")).toBe("W Bro. CG Burgess PPAGReg");
    expect(derivedHonorary([mem], "typed")).toBe("typed");
  });
  it("applies to reps, Royal Arch and honorary together", () => {
    const t = applyDerivedNames({ lodge_representatives: [{ role: "Sports", name: "", member_id: "m1" }], royal_arch_rep: "x", royal_arch_rep_member_id: "m2", honorary_members: null }, [mem, pm]);
    expect([t.lodge_representatives[0].name, t.royal_arch_rep, t.honorary_members]).toEqual(["Bro. S Bradley", "W Bro. CG Burgess PPAGReg", "W Bro. CG Burgess PPAGReg"]);
  });
});
