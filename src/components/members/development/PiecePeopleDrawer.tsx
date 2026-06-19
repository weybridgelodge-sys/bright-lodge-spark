import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { displayMember, piecePeople, type MatrixPiece, type SkillsMatrix } from "@/lib/development/skillsMatrix";

export default function PiecePeopleDrawer({
  matrix,
  piece,
  onClose,
}: {
  matrix: SkillsMatrix;
  piece: MatrixPiece;
  onClose: () => void;
}) {
  const { delivered, candidates, notStarted } = piecePeople(matrix, piece.ritual_group, piece.piece);

  const Section = ({ title, list, tone }: { title: string; list: ReturnType<typeof piecePeople>["delivered"]; tone: string }) => (
    <div>
      <h3 className={`text-xs uppercase tracking-wider mb-2 ${tone}`}>{title} ({list.length})</h3>
      {list.length === 0 ? (
        <p className="text-xs text-primary-foreground/50 italic">None.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {list.map((m) => (
            <li key={m.id}>
              <Link
                to={`/members/development/${m.id}`}
                className="text-[11px] px-2 py-1 rounded-sm border border-gold/30 text-primary-foreground hover:bg-gold/10"
              >
                {displayMember(m)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <aside
        className="w-full max-w-md h-full bg-navy-dark border-l border-gold/30 p-5 overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gold/70">{piece.ritual_group}</p>
            <h2 className="font-serif text-lg text-primary-foreground">{piece.piece}</h2>
          </div>
          <button onClick={onClose} className="text-gold/70 hover:text-gold p-1" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-5">
          <Section title="Available now (LoI / Lodge)" list={delivered} tone="text-emerald-300" />
          <Section title="Candidates (Learned / Assessed)" list={candidates} tone="text-gold" />
          <Section title="Not started" list={notStarted} tone="text-primary-foreground/60" />
        </div>
      </aside>
    </div>
  );
}
