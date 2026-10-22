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
