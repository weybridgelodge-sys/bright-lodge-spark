import { describe, expect, it } from "vitest";
import { nextMeetingNotice, candidateHeading, printAgendaLabel } from "@/lib/summonsNotices";
import { AGENDA_PRESETS, candidateAgendaLabel, type Candidate } from "@/lib/summons";

const register = [
  { meeting_date: "2026-12-09", meeting_type: "regular" },
  { meeting_date: "2027-01-07", meeting_type: "dispensation" },
  { meeting_date: "2027-02-17", meeting_type: "regular" },
  { meeting_date: "2027-05-12", meeting_type: "regular" },
];
const cand = (id: string, name: string): Candidate => ({ id, name, dob: "", occupation: "", address: "", proposer: "", seconder: "", date_proposed: "", ceremony_type: "Initiation" });

describe("summons next meeting", () => {
  it("names the next regular meeting, not the next dispensation", () => {
    const n = nextMeetingNotice(register, "2026-12-09");
    expect(n.nextRegular).toBe("2027-02-17");
    expect(n.interimNote).toBe("A meeting by dispensation will be held on Thursday, 7 January 2027.");
  });
  it("ignores cancelled meetings and adds no sentence when none falls before", () => {
    const n = nextMeetingNotice([...register.slice(2), { meeting_date: "2027-01-07", meeting_type: "dispensation", cancelled_at: "x" }], "2026-12-09");
    expect(n.nextRegular).toBe("2027-02-17");
    expect(n.interimNote).toBeNull();
  });
});

describe("candidate heading from agenda item type", () => {
  const agenda = [
    { id: "a-a", kind: "candidate" as const, label: "Ballot for, and if successful, Initiate Mr A" },
    { id: "x", kind: "variable" as const, label: "Ballot for Mr Benigno Garcia " },
  ];
  it("ballot-and-initiate prints Initiation", () => expect(candidateHeading(cand("a", "A"), agenda)).toBe("Initiation"));
  it("ballot-only prints Ballot", () => expect(candidateHeading(cand("g", "Benigno Garcia"), agenda)).toBe("Ballot"));
  it("explicit action wins", () => expect(candidateHeading(cand("a", "A"), [{ ...agenda[0], action: "ballot" }])).toBe("Ballot"));
  it("ballot-only builder line", () => expect(candidateAgendaLabel(cand("g", "B G"), true)).toBe("Ballot for Mr B G"));
});

describe("confirm minutes wording", () => {
  it("fixes the missing word at print", () =>
    expect(printAgendaLabel("Confirm Minutes of the Installation meeting of 21st October 2026")).toBe("Confirm the Minutes of the Installation meeting of 21st October 2026"));
  it("preset uses the correct wording", () => expect(AGENDA_PRESETS[0].label).toBe("Confirm the Minutes of [date]"));
});

import { applyBallotOnly, isBallotOnlyTicked } from "@/lib/summonsNotices";
import type { AgendaItem } from "@/lib/summons";

// Real December summons agenda shape (0d8a7394), synthetic copy.
const dec = (): AgendaItem[] => [
  { id: "o", kind: "standing", label: "Open the Lodge" },
  { id: "w", kind: "variable", label: "Welcome the representative of the RW Provincial Grand Master" },
  { id: "m", kind: "variable", label: "Confirm Minutes of the Installation meeting of 21st October 2026" },
  { id: "i", kind: "variable", label: "Invest those officers not present at the Installation meeting" },
  { id: "v-a", kind: "candidate", label: "Ballot for, and if successful, Initiate Mr Gianluca Godley-Fiorucci" },
  { id: "j-a", kind: "candidate", label: "Ballot for and Initiate Mr Allan Anthony Fiorucci" },
  { id: "au", kind: "variable", label: "Receive the auditors' report on the Lodge Accounts and Charity Accounts" },
  { id: "r", kind: "standing", label: "Receive reports from Almoner, Charity Steward, Mentor, Membership Officer & HRA Rep" },
  { id: "g9", kind: "variable", label: "Ballot for Mr Benigno Garcia in readiness for initiation on 7th January 2027" },
  { id: "c", kind: "standing", label: "Circulate the Charity Column" },
  { id: "ri", kind: "standing", label: "Risings" },
  { id: "cl", kind: "standing", label: "Close the Lodge" },
];
const garcia = cand("6pug", "Benigno Garcia");
const others = ["v", "j"];
const lbl = (b: boolean) => candidateAgendaLabel(garcia, b);
const printed = (a: AgendaItem[]) => a.map((x, i) => `${i + 1}. ${printAgendaLabel(x.label)}`);

describe("ballot-only tick box (JOB L)", () => {
  it("before: hand-typed 'initiation' line no longer classifies as Initiation", () => {
    expect(candidateHeading(garcia, dec(), others)).toBe("Ballot");
  });
  it("ticking with a hand-typed ballot line adds no line, heading Ballot, item 9 kept", () => {
    const before = printed(dec());
    const after = applyBallotOnly(garcia, dec(), true, lbl, others);
    expect(after).toHaveLength(12);
    expect(printed(after)).toEqual(before);
    expect(printed(after)[8]).toBe("9. Ballot for Mr Benigno Garcia in readiness for initiation on 7th January 2027");
    expect(after.filter((x) => /Garcia/.test(x.label))).toHaveLength(1);
    expect(isBallotOnlyTicked(garcia, after, others)).toBe(true);
    expect(candidateHeading(garcia, after, others)).toBe("Ballot");
  });
  it("matches ignoring case and titles", () => {
    const a = dec().map((x) => x.id === "g9" ? { ...x, label: "BALLOT for Bro. garcia" } : x);
    expect(applyBallotOnly(garcia, a, true, lbl, others)).toHaveLength(12);
  });
  it("surname of another candidate's hyphenated name is not a match", () => {
    const allan = cand("j", "Allan Anthony Fiorucci");
    const a = dec().filter((x) => x.id !== "j-a");
    const out = applyBallotOnly(allan, a, true, (b) => candidateAgendaLabel(allan, b), ["v", "6pug"]);
    expect(out).toHaveLength(12);
    expect(out.find((x) => x.id === "v-a")!.action).toBeUndefined();
  });
  it("adds a needed line before the reports/closing items, never after Close the Lodge", () => {
    const a = dec().filter((x) => x.id !== "g9");
    const out = applyBallotOnly(garcia, a, true, lbl, others);
    const idx = out.findIndex((x) => x.id === "6pug-a");
    expect(out[idx].label).toBe("Ballot for Mr Benigno Garcia");
    expect(out[idx + 1].label).toMatch(/^Receive reports/);
    expect(out[out.length - 1].label).toBe("Close the Lodge");
    const noReports = a.filter((x) => x.id !== "r");
    const out2 = applyBallotOnly(garcia, noReports, true, lbl, others);
    expect(out2[out2.findIndex((x) => x.id === "6pug-a") + 1].label).toBe("Circulate the Charity Column");
  });
  it("ticked box wins over an 'Initiate' wording", () => {
    const a = dec().map((x) => x.id === "g9" ? { ...x, label: "Ballot for Mr Benigno Garcia and initiate later" } : x);
    expect(candidateHeading(garcia, a, others)).toBe("Initiation");
    expect(candidateHeading(garcia, applyBallotOnly(garcia, a, true, lbl, others), others)).toBe("Ballot");
  });
  it("unticking removes only the builder's added line", () => {
    const a = dec().filter((x) => x.id !== "g9");
    const added = applyBallotOnly(garcia, a, true, lbl, others);
    expect(applyBallotOnly(garcia, added, false, lbl, others)).toEqual(a);
    const ticked = applyBallotOnly(garcia, dec(), true, lbl, others);
    const unticked = applyBallotOnly(garcia, ticked, false, lbl, others);
    expect(unticked.find((x) => x.id === "g9")!.label).toBe(dec()[8].label);
    expect(unticked).toHaveLength(12);
  });
});
