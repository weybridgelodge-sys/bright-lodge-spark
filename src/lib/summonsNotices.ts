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
  if (/\binitiat/i.test(l)) return "ballot_initiate";
  if (/^\s*ballot\b/i.test(l)) return "ballot";
  if (/\bpass\b.*second degree/i.test(l)) return "pass";
  if (/\braise\b.*third degree/i.test(l)) return "raise";
  return null;
}

const HEADING: Record<AgendaAction, string> = { ballot: "Ballot", ballot_initiate: "Initiation", pass: "Passing", raise: "Raising" };
const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

/** Agenda item for a candidate: the linked line (`<id>-a`) first, else a line naming them. */
export function candidateAgendaItem(c: Candidate, agenda: AgendaItem[]): AgendaItem | null {
  const linked = agenda.find((a) => a.id === `${c.id}-a`);
  if (linked) return linked;
  const name = norm(c.name);
  if (!name) return null;
  return agenda.find((a) => norm(a.label).includes(name) && agendaAction(a)) ?? null;
}

export function candidateHeading(c: Candidate, agenda: AgendaItem[]): string {
  const item = candidateAgendaItem(c, agenda);
  const act = item ? agendaAction(item) : null;
  return act ? HEADING[act] : c.ceremony_type;
}

/** Print-time wording fixes for agenda lines (stored text is never rewritten). */
export function printAgendaLabel(label: string): string {
  return label.replace(/^(\s*)Confirm Minutes of\b/i, "$1Confirm the Minutes of");
}
