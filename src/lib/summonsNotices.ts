// Summons wording derived from records rather than typed text:
// - next REGULAR meeting + any dispensation/emergency meeting before it (from the register)
// - candidate heading ("Ballot:" vs "Initiation:") from the agenda item type
// - agenda label wording fixes applied at print time (stored rows untouched)
import type { AgendaItem, Candidate } from "@/lib/summons";

export type RegisterMeeting = { meeting_date: string; meeting_type: string | null; cancelled_at?: string | null };

const REGULAR = new Set(["regular", "installation"]);
const IRREGULAR_LABEL: Record<string, string> = { dispensation: "A meeting by dispensation", emergency: "An emergency meeting" };

export function formatLongDate(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** Next regular/installation meeting after `afterIso`, plus irregular meetings that fall before it. */
export function nextMeetingNotice(register: RegisterMeeting[], afterIso: string | null) {
  if (!afterIso) return { nextRegular: null as string | null, interim: [] as RegisterMeeting[], interimNote: null as string | null };
  const after = [...register]
    .filter((m) => !m.cancelled_at && m.meeting_date.slice(0, 10) > afterIso.slice(0, 10))
    .sort((a, b) => a.meeting_date.localeCompare(b.meeting_date));
  const reg = after.find((m) => REGULAR.has(String(m.meeting_type)));
  const nextRegular = reg ? reg.meeting_date.slice(0, 10) : null;
  const interim = after.filter((m) => IRREGULAR_LABEL[String(m.meeting_type)] && (!nextRegular || m.meeting_date.slice(0, 10) < nextRegular));
  const interimNote = interim.length
    ? interim.map((m) => `${IRREGULAR_LABEL[String(m.meeting_type)]} will be held on ${formatLongDate(m.meeting_date)}.`).join(" ")
    : null;
  return { nextRegular, interim, interimNote };
}

export type AgendaAction = "ballot" | "ballot_initiate" | "pass" | "raise";

/** Agenda item type: explicit `action`, else inferred from the line for summonses saved before the field existed. */
export function agendaAction(item: Pick<AgendaItem, "label"> & { action?: AgendaAction }): AgendaAction | null {
  if (item.action) return item.action;
  const l = item.label ?? "";
  // The verb "Initiate" marks ballot-and-initiate; the noun "initiation" alone
  // (e.g. "in readiness for initiation on …") does not.
  if (/\binitiate\b/i.test(l)) return "ballot_initiate";
  if (/^\s*ballot\b/i.test(l)) return "ballot";
  if (/\bpass\b.*second degree/i.test(l)) return "pass";
  if (/\braise\b.*third degree/i.test(l)) return "raise";
  return null;
}

const HEADING: Record<AgendaAction, string> = { ballot: "Ballot", ballot_initiate: "Initiation", pass: "Passing", raise: "Raising" };
const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

const TITLE_RE = /^(mr|mrs|ms|dr|rev|bro|w|rw|vw)\.?$/i;
const tokens = (s: string) => norm(s).replace(/[.,;:()]/g, " ").split(" ").filter((t) => t && !TITLE_RE.test(t));
const isBallotLine = (a: AgendaItem) => /\bballot\b/i.test(a.label ?? "");

/** True when the line names the candidate: full name (titles ignored) or surname as a whole word. */
export function namesCandidate(label: string, c: Candidate): boolean {
  const name = tokens(c.name);
  if (!name.length) return false;
  const line = tokens(label);
  const full = name.join(" ");
  if (` ${line.join(" ")} `.includes(` ${full} `)) return true;
  return line.includes(name[name.length - 1]);
}

const linkedTo = (a: AgendaItem, ids: string[]) => ids.some((id) => a.id === `${id}-a`);

/** Agenda item for a candidate: the linked line (`<id>-a`) first, else a line naming them (not another candidate's linked line). */
export function candidateAgendaItem(c: Candidate, agenda: AgendaItem[], otherIds: string[] = []): AgendaItem | null {
  const linked = agenda.find((a) => a.id === `${c.id}-a`);
  if (linked) return linked;
  const named = agenda.filter((a) => !linkedTo(a, otherIds) && namesCandidate(a.label ?? "", c) && agendaAction(a));
  return named.find((a) => a.action) ?? named.find((a) => norm(a.label).includes(norm(c.name))) ?? named[0] ?? null;
}

/** The "Ballot only" tick: an explicit ballot action, or the builder's own line already worded as ballot-only. */
export function isBallotOnlyTicked(c: Candidate, agenda: AgendaItem[], otherIds: string[] = []): boolean {
  const it = candidateAgendaItem(c, agenda, otherIds);
  return !!it && (it.action === "ballot" || (it.id === `${c.id}-a` && agendaAction(it) === "ballot"));
}

/** Where builder ballot lines go: the same slot ready-made lines use, never after the closing items. */
export function ballotInsertIndex(agenda: AgendaItem[]): number {
  const find = (re: RegExp) => agenda.findIndex((x) => re.test(x.label ?? ""));
  for (const re of [/Receive reports/i, /Circulate the Charity Column/i, /^\s*Risings\b/i, /Close the Lodge/i]) {
    const i = find(re);
    if (i !== -1) return i;
  }
  return agenda.length;
}

/**
 * Apply the "Ballot only at this meeting" tick box. Hand-typed lines keep their wording;
 * only the builder's own added line is ever removed. `label` is the builder's wording.
 */
export function applyBallotOnly(c: Candidate, agenda: AgendaItem[], on: boolean, label: (ballotOnly: boolean) => string, otherIds: string[] = []): AgendaItem[] {
  const id = `${c.id}-a`;
  const linked = agenda.find((a) => a.id === id);
  if (linked) {
    if (!on && linked.builder_added) return agenda.filter((a) => a.id !== id);
    return agenda.map((a) => a.id === id ? { ...a, action: on ? "ballot" : "ballot_initiate", label: label(on) } : a);
  }
  const hand = agenda.find((a) => !linkedTo(a, otherIds) && isBallotLine(a) && namesCandidate(a.label ?? "", c));
  if (hand) return agenda.map((a) => a.id === hand.id ? { ...a, action: on ? "ballot" : undefined } : a);
  if (!on) return agenda;
  const out = [...agenda];
  out.splice(ballotInsertIndex(agenda), 0, { id, label: label(true), kind: "candidate", action: "ballot", builder_added: true });
  return out;
}

export function candidateHeading(c: Candidate, agenda: AgendaItem[], otherIds: string[] = []): string {
  const item = candidateAgendaItem(c, agenda, otherIds);
  const act = item ? agendaAction(item) : null;
  return act ? HEADING[act] : c.ceremony_type;
}

/** Print-time wording fixes for agenda lines (stored text is never rewritten). */
export function printAgendaLabel(label: string): string {
  return label.replace(/^(\s*)Confirm Minutes of\b/i, "$1Confirm the Minutes of");
}
