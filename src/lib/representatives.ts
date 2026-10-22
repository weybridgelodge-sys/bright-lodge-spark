// Lodge representatives (Royal Arch, Petitions, Sports, Halls...) come from
// officer_appointments on officer_positions with category 'representative'.
// The old Summons-template text is a fallback ONLY for a non-member name
// (a template entry with no linked member) when no appointment exists.
import { positionsFor, type PositionConsumer, type PositionRow } from "@/lib/officerPositions";

/** Keyword that identifies each shared representative position in the legacy template. */
export const REP_TEMPLATE_WORD: Record<string, string> = {
  rep_royal_arch: "royal_arch",
  rep_petitions: "petition",
  rep_sports: "sport",
  rep_halls: "hall",
};

export type RepAppt = { position_key: string; member_id: string | null; lodge_year: number; is_projection?: boolean | null; display_name?: string | null };
export type RepTemplate = {
  lodge_representatives?: { role?: string | null; name?: string | null; member_id?: string | null }[] | null;
  royal_arch_rep?: string | null;
  royal_arch_rep_member_id?: string | null;
};
export type ResolvedRep = {
  key: string;
  label: string;
  printLabel: string | null;
  /** Role wording: the template's own wording when it had one, else the position label. */
  role: string;
  member_id: string | null;
  name: string;
  source: "appointment" | "carried" | "template" | "none";
  fromYear: number | null;
  hadTemplateEntry: boolean;
};

const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

function templateEntry(key: string, tpl: RepTemplate | null | undefined) {
  if (!tpl) return null;
  const word = REP_TEMPLATE_WORD[key];
  if (!word) return null;
  if (word === "royal_arch") {
    if (!clean(tpl.royal_arch_rep) && !tpl.royal_arch_rep_member_id) return null;
    return { role: null, name: tpl.royal_arch_rep ?? "", member_id: tpl.royal_arch_rep_member_id ?? null };
  }
  return (tpl.lodge_representatives ?? []).find((x) => (x.role ?? "").toLowerCase().includes(word)) ?? null;
}

export function resolveRepresentatives(opts: {
  year: number;
  consumer: PositionConsumer;
  positions: PositionRow[];
  appts: RepAppt[];
  template?: RepTemplate | null;
  unitId?: string | null;
}): ResolvedRep[] {
  const reps = positionsFor(opts.positions, opts.consumer, opts.unitId).filter((p) => p.category === "representative");
  return reps.map((p) => {
    const tplE = templateEntry(p.key, opts.template);
    const base = { key: p.key, label: p.label, printLabel: p.print_label ?? null, role: clean(tplE?.role) || p.label, hadTemplateEntry: !!tplE };
    const appt = opts.appts
      .filter((a) => a.position_key === p.key && !a.is_projection && a.lodge_year <= opts.year && (a.member_id || clean(a.display_name)))
      .sort((a, b) => b.lodge_year - a.lodge_year)[0];
    if (appt) {
      return { ...base, member_id: appt.member_id, name: appt.member_id ? "" : clean(appt.display_name), source: appt.lodge_year === opts.year ? "appointment" : "carried", fromYear: appt.lodge_year } as ResolvedRep;
    }
    // Template fallback: non-member typed name only.
    if (tplE && !tplE.member_id && clean(tplE.name)) {
      return { ...base, member_id: null, name: clean(tplE.name), source: "template", fromYear: null } as ResolvedRep;
    }
    return { ...base, member_id: null, name: "", source: "none", fromYear: null } as ResolvedRep;
  });
}

export const repForWord = (reps: ResolvedRep[], word: string) => {
  const key = Object.entries(REP_TEMPLATE_WORD).find(([, w]) => w === word)?.[0];
  return reps.find((r) => r.key === key) ?? null;
};
