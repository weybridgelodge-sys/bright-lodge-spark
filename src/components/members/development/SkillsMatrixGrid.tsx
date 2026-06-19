import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  type SkillsMatrix,
  type MatrixPiece,
  LEVEL_LABEL,
  pieceKey,
  pieceRisk,
  memberInitials,
  displayMember,
} from "@/lib/development/skillsMatrix";
import { RITUAL_GROUPS } from "@/lib/development/catalogues";
import PiecePeopleDrawer from "./PiecePeopleDrawer";

const GROUPS = [...RITUAL_GROUPS] as string[];

export default function SkillsMatrixGrid({ matrix }: { matrix: SkillsMatrix }) {
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [gapFilter, setGapFilter] = useState<"all" | "red" | "amber">("all");
  const [openPiece, setOpenPiece] = useState<MatrixPiece | null>(null);

  const rows = useMemo(() => {
    return matrix.pieces
      .filter((p) => groupFilter === "all" || p.ritual_group === groupFilter)
      .map((p) => ({ ...p, risk: pieceRisk(matrix, p.ritual_group, p.piece) }))
      .filter((p) => gapFilter === "all" || p.risk === gapFilter);
  }, [matrix, groupFilter, gapFilter]);

  const summary = useMemo(() => {
    let red = 0, amber = 0, green = 0;
    for (const p of matrix.pieces) {
      const r = pieceRisk(matrix, p.ritual_group, p.piece);
      if (r === "red") red++; else if (r === "amber") amber++; else green++;
    }
    return { red, amber, green };
  }, [matrix]);

  const riskTint = (r: "red" | "amber" | "green") =>
    r === "red" ? "text-red-300 bg-red-500/10 border-red-500/30"
    : r === "amber" ? "text-amber-300 bg-amber-500/10 border-amber-500/30"
    : "text-emerald-300 bg-emerald-500/10 border-emerald-500/30";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 text-xs">
          <span className="text-gold/80 uppercase tracking-wider text-[10px]">Group</span>
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="bg-navy-dark border border-gold/30 text-primary-foreground rounded-sm px-2 py-1 text-xs"
          >
            <option value="all">All</option>
            {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span className="text-gold/80 uppercase tracking-wider text-[10px]">Gap</span>
          {(["all", "red", "amber"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGapFilter(g)}
              className={`px-2 py-1 rounded-sm border text-[11px] capitalize ${
                gapFilter === g
                  ? "border-gold text-gold bg-gold/10"
                  : "border-gold/20 text-primary-foreground/70 hover:border-gold/40"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3 text-[11px]">
          <span className="text-red-300">● {summary.red} red</span>
          <span className="text-amber-300">● {summary.amber} amber</span>
          <span className="text-emerald-300">● {summary.green} green</span>
        </div>
      </div>

      <div className="rounded-sm border border-gold/20 overflow-auto max-h-[70vh]">
        <table className="text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-navy-dark">
            <tr>
              <th className="sticky left-0 z-20 bg-navy-dark text-left p-2 font-serif text-gold border-b border-gold/20 min-w-[260px]">
                Ritual Piece
              </th>
              {matrix.members.map((m) => (
                <th
                  key={m.id}
                  className="p-1 border-b border-gold/20 text-[10px] text-gold/80 font-sans uppercase tracking-wider"
                  title={displayMember(m)}
                >
                  <Link to={`/members/development/${m.id}`} className="hover:text-gold inline-block px-1">
                    {memberInitials(m)}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const k = pieceKey(p.ritual_group, p.piece);
              return (
                <tr key={k} className="border-b border-gold/10">
                  <td className="sticky left-0 z-10 bg-navy text-primary-foreground p-2 align-top">
                    <button
                      onClick={() => setOpenPiece(p)}
                      className={`text-left text-xs border px-2 py-1 rounded-sm w-full ${riskTint(p.risk)}`}
                    >
                      <span className="block font-medium">{p.piece}</span>
                      <span className="block text-[10px] opacity-70">{p.ritual_group}</span>
                    </button>
                  </td>
                  {matrix.members.map((m) => {
                    const lvl = matrix.cells.get(m.id)?.get(k);
                    const bg =
                      lvl === "lodge" ? "bg-emerald-600/40 text-emerald-100"
                      : lvl === "loi" ? "bg-emerald-700/30 text-emerald-200"
                      : lvl === "assessed" ? "bg-gold/20 text-gold"
                      : lvl === "learned" ? "bg-navy-light/60 text-primary-foreground/80"
                      : "";
                    return (
                      <td key={m.id} className="p-0">
                        <Link
                          to={`/members/development/${m.id}`}
                          title={`${displayMember(m)} — ${p.piece}: ${lvl ? LEVEL_LABEL[lvl] : "not started"}`}
                          className={`block text-center text-[10px] font-medium px-1 py-1 hover:ring-1 hover:ring-gold/60 ${bg}`}
                        >
                          {lvl ? LEVEL_LABEL[lvl] : ""}
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-primary-foreground/60">
        L = Learned · A = Assessed · I = Delivered at LoI · Lodge = Delivered in Lodge.
        Click a piece for a member breakdown; click a member's initials or a cell to open their record.
      </p>

      {openPiece && (
        <PiecePeopleDrawer
          matrix={matrix}
          piece={openPiece}
          onClose={() => setOpenPiece(null)}
        />
      )}
    </div>
  );
}
