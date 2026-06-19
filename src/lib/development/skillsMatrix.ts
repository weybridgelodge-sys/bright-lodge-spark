import { supabase } from "@/integrations/supabase/client";
import { RITUAL_CATALOGUE, RITUAL_GROUPS } from "./catalogues";

export type RitualLevel = "learned" | "assessed" | "loi" | "lodge";

export const LEVEL_RANK: Record<RitualLevel, number> = {
  learned: 1,
  assessed: 2,
  loi: 3,
  lodge: 4,
};

export const LEVEL_LABEL: Record<RitualLevel, string> = {
  learned: "L",
  assessed: "A",
  loi: "I",
  lodge: "Lodge",
};

export type MatrixMember = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  degree: string;
};

export type MatrixCell = { level: RitualLevel | null };

export type MatrixPiece = { ritual_group: string; piece: string };

export type SkillsMatrix = {
  members: MatrixMember[];
  pieces: MatrixPiece[];
  // cell[memberId][`${group}::${piece}`] = level | null
  cells: Map<string, Map<string, RitualLevel>>;
};

export const pieceKey = (g: string, p: string) => `${g}::${p}`;

export async function loadSkillsMatrix(): Promise<SkillsMatrix> {
  const [{ data: rpcRows, error }, { data: members }] = await Promise.all([
    supabase.rpc("lodge_skills_matrix"),
    supabase
      .from("profiles")
      .select("id, full_name, first_name, last_name, preferred_name, degree")
      .eq("status", "active")
      .order("last_name", { ascending: true }),
  ]);
  if (error) throw error;
  const cells = new Map<string, Map<string, RitualLevel>>();
  for (const r of (rpcRows as any[]) ?? []) {
    if (!r.level) continue;
    let m = cells.get(r.member_id);
    if (!m) { m = new Map(); cells.set(r.member_id, m); }
    const k = pieceKey(r.ritual_group, r.piece);
    const prev = m.get(k);
    if (!prev || LEVEL_RANK[r.level as RitualLevel] > LEVEL_RANK[prev]) {
      m.set(k, r.level as RitualLevel);
    }
  }
  return {
    members: (members as MatrixMember[]) ?? [],
    pieces: RITUAL_CATALOGUE.map(({ ritual_group, piece }) => ({ ritual_group, piece })),
    cells,
  };
}

export type Risk = "red" | "amber" | "green";

export function pieceRisk(matrix: SkillsMatrix, group: string, piece: string): Risk {
  const k = pieceKey(group, piece);
  let qualified = 0;
  for (const m of matrix.members) {
    const lvl = matrix.cells.get(m.id)?.get(k);
    if (lvl === "loi" || lvl === "lodge") qualified += 1;
    if (qualified >= 2) return "green";
  }
  if (qualified === 1) return "amber";
  return "red";
}

export function piecePeople(matrix: SkillsMatrix, group: string, piece: string) {
  const k = pieceKey(group, piece);
  const delivered: MatrixMember[] = [];
  const candidates: MatrixMember[] = [];
  const notStarted: MatrixMember[] = [];
  for (const m of matrix.members) {
    const lvl = matrix.cells.get(m.id)?.get(k);
    if (lvl === "loi" || lvl === "lodge") delivered.push(m);
    else if (lvl === "learned" || lvl === "assessed") candidates.push(m);
    else notStarted.push(m);
  }
  return { delivered, candidates, notStarted };
}

export const RITUAL_GROUP_LIST = [...RITUAL_GROUPS];

export function displayMember(p: MatrixMember) {
  const f = p.preferred_name?.trim() || p.first_name?.trim() || "";
  return [f, p.last_name?.trim() || ""].filter(Boolean).join(" ") || p.full_name || "Unnamed";
}

export function memberInitials(p: MatrixMember) {
  const first = (p.preferred_name?.[0] || p.first_name?.[0] || "").toUpperCase();
  const last = (p.last_name?.[0] || "").toUpperCase();
  return `${first}${last}` || "?";
}
