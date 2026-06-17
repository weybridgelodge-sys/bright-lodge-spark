// Summons Builder helpers — standing agenda template, preset variable items,
// member-list balancing, overflow priority logic.

export type AgendaKind = "standing" | "variable" | "candidate";
export type AgendaItem = { id: string; label: string; kind: AgendaKind };

export type Candidate = {
  id: string;
  name: string;
  dob: string;
  occupation: string;
  address: string;
  proposer: string;
  seconder: string;
  date_proposed: string;
  ceremony_type: "Initiation" | "Passing" | "Raising";
};

export const CEREMONY_TYPES: Candidate["ceremony_type"][] = [
  "Initiation",
  "Passing",
  "Raising",
];

const uid = () => Math.random().toString(36).slice(2, 10);

export const STANDING_AGENDA: AgendaItem[] = [
  { id: uid(), label: "Open the Lodge", kind: "standing" },
  { id: uid(), label: "Welcome visiting Brethren", kind: "standing" },
  {
    id: uid(),
    label:
      "Receive reports from Almoner, Charity Steward, Mentor, Membership Officer & HRA Rep",
    kind: "standing",
  },
  { id: uid(), label: "Circulate the Charity Column", kind: "standing" },
  { id: uid(), label: "Risings", kind: "standing" },
  { id: uid(), label: "Close the Lodge", kind: "standing" },
];

export const defaultAgenda = (): AgendaItem[] =>
  STANDING_AGENDA.map((s) => ({ ...s, id: uid() }));

export const AGENDA_PRESETS: string[] = [
  "Confirm Minutes of [date]",
  "Ballot for and Initiate [name]",
  "Pass to the Second Degree",
  "Raise to the Third Degree",
  "Declare nominations for Worshipful Master",
  "Declare nominations for Treasurer",
  "Declare nominations for Tyler",
  "Elect Auditors",
  "Read correspondence",
  "Present Grand Lodge / Provincial certificates",
];

export const newAgendaItem = (label: string, kind: AgendaKind = "variable"): AgendaItem => ({
  id: uid(),
  label,
  kind,
});

export const newCandidate = (): Candidate => ({
  id: uid(),
  name: "",
  dob: "",
  occupation: "",
  address: "",
  proposer: "",
  seconder: "",
  date_proposed: "",
  ceremony_type: "Initiation",
});

export const candidateAgendaLabel = (c: Candidate): string => {
  const who = c.name || "candidate";
  switch (c.ceremony_type) {
    case "Initiation":
      return `Ballot for and Initiate Mr ${who}`;
    case "Passing":
      return `Pass Bro ${who} to the Second Degree`;
    case "Raising":
      return `Raise Bro ${who} to the Third Degree`;
  }
};

// Balance a list: ceil(n/2) on the left, floor(n/2) on the right.
export function splitTwoColumns<T>(items: T[]): { left: T[]; right: T[] } {
  const leftCount = Math.ceil(items.length / 2);
  return { left: items.slice(0, leftCount), right: items.slice(leftCount) };
}

// Member ordering: oldest initiation/joined date first.
export type MemberRow = {
  id: string;
  title: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  rank: string | null;
  grand_rank: string | null;
  provincial_rank: string | null;
  initiation_date: string | null;
  joined_lodge_date: string | null;
  joined_year: number | null;
  is_past_master: boolean | null;
  is_royal_arch: boolean | null;
  status: string;
};

export function memberEffectiveDate(m: MemberRow): string {
  return (
    m.initiation_date ||
    m.joined_lodge_date ||
    (m.joined_year ? `${m.joined_year}-01-01` : "9999-12-31")
  );
}

export function sortMembersBySeniority(members: MemberRow[]): MemberRow[] {
  return [...members].sort((a, b) =>
    memberEffectiveDate(a).localeCompare(memberEffectiveDate(b)),
  );
}

// Strip any masonic rank prefix that may have been saved into the name field
// itself, so we never render "W Bro. W Bro Julien Tidmarsh".
const RANK_PREFIX_RE =
  /^(RW Bro\.?|W Bro\.?|V\.?W\.? Bro\.?|Bro\.?|RW|VW|W)\s+/i;

export function stripRankPrefix(name: string): string {
  let out = name.trim();
  // Loop in case multiple prefixes were concatenated.
  while (RANK_PREFIX_RE.test(out)) out = out.replace(RANK_PREFIX_RE, "").trim();
  return out;
}

export function formatMemberLine(m: MemberRow): string {
  const rank = (m.grand_rank || m.provincial_rank || m.rank || "").trim();
  const title = m.is_past_master ? "W Bro." : m.title ? `${m.title}.` : "Bro.";
  const rawName =
    m.full_name?.trim() ||
    [m.first_name, m.last_name].filter(Boolean).join(" ").trim() ||
    "—";
  const name = stripRankPrefix(rawName);
  return rank ? `${title} ${name}, ${rank}` : `${title} ${name}`;
}

export function memberSymbols(m: MemberRow): {
  pastMaster: boolean;
  pastMasterInLodge: boolean;
  royalArch: boolean;
} {
  return {
    pastMaster: !!m.is_past_master,
    pastMasterInLodge: !!m.is_past_master, // Same data point for now; can split when distinct field exists.
    royalArch: !!m.is_royal_arch,
  };
}

export function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// Overflow plan: capacity-aware degrade order.
export type NoticeKey =
  | "overseas"
  | "data_protection"
  | "provincial_mcf"
  | "royal_arch"
  | "regular_meetings"
  | "loi";

export type OverflowPlan = {
  fontSize: number; // pt
  hidden: NoticeKey[]; // notices to drop
  shortened: NoticeKey[]; // notices to render in shortened form
  warn: boolean;
};

export function planOverflow(memberCount: number): OverflowPlan {
  // Capacities tuned for a single A4 booklet page.
  // Step 1: normal font.
  if (memberCount <= 32) {
    return { fontSize: 9, hidden: [], shortened: [], warn: false };
  }
  // Step 2: smaller font.
  if (memberCount <= 38) {
    return { fontSize: 8.5, hidden: [], shortened: [], warn: false };
  }
  if (memberCount <= 44) {
    return { fontSize: 8, hidden: [], shortened: [], warn: true };
  }
  // Step 3: trim notices in priority order.
  if (memberCount <= 50) {
    return { fontSize: 8, hidden: ["overseas"], shortened: [], warn: true };
  }
  if (memberCount <= 56) {
    return {
      fontSize: 8,
      hidden: ["overseas"],
      shortened: ["data_protection"],
      warn: true,
    };
  }
  return {
    fontSize: 8,
    hidden: ["overseas"],
    shortened: ["data_protection", "provincial_mcf"],
    warn: true,
  };
}
