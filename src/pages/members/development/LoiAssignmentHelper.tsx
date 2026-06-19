import { useEffect, useMemo, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import ProtectedRoute from "@/components/members/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { loadSkillsMatrix, type SkillsMatrix, pieceKey, displayMember, piecePeople } from "@/lib/development/skillsMatrix";
import { RITUAL_CATALOGUE, RITUAL_GROUPS } from "@/lib/development/catalogues";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

type Session = { id: string; session_date: string; focus: string };

function Inner() {
  const { user, isAdmin, isWorshipfulMaster, isDirectorOfCeremonies, isSecretary } = useAuth();
  const canManage = isAdmin || isWorshipfulMaster || isDirectorOfCeremonies || isSecretary;

  const [matrix, setMatrix] = useState<SkillsMatrix | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [selectedPieces, setSelectedPieces] = useState<Set<string>>(new Set());
  const [groupFilter, setGroupFilter] = useState<string>(RITUAL_GROUPS[0]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const m = await loadSkillsMatrix();
        setMatrix(m);
        const { data } = await supabase
          .from("loi_sessions")
          .select("id, session_date, focus")
          .order("session_date", { ascending: false })
          .limit(50);
        setSessions((data as Session[]) ?? []);
      } finally { setLoading(false); }
    })();
  }, []);

  // load existing assignments when session changes
  useEffect(() => {
    if (!sessionId) { setAssignments({}); setSelectedPieces(new Set()); return; }
    (async () => {
      const { data } = await supabase
        .from("loi_part_assignments")
        .select("ritual_group, piece, member_id")
        .eq("loi_session_id", sessionId);
      const map: Record<string, string> = {};
      const sel = new Set<string>();
      for (const r of (data as any[]) ?? []) {
        const k = pieceKey(r.ritual_group, r.piece);
        sel.add(k);
        if (r.member_id) map[k] = r.member_id;
      }
      setAssignments(map);
      setSelectedPieces(sel);
    })();
  }, [sessionId]);

  const groupedPieces = useMemo(
    () => RITUAL_CATALOGUE.filter((p) => p.ritual_group === groupFilter),
    [groupFilter],
  );

  const suggest = (group: string, piece: string): string | null => {
    if (!matrix) return null;
    const { candidates, delivered } = piecePeople(matrix, group, piece);
    if (candidates.length > 0) return candidates[0].id; // prioritize those who need experience
    if (delivered.length > 0) return delivered[0].id;
    return null;
  };

  const togglePiece = (k: string, group: string, piece: string) => {
    const next = new Set(selectedPieces);
    if (next.has(k)) { next.delete(k); }
    else {
      next.add(k);
      if (!assignments[k]) {
        const s = suggest(group, piece);
        if (s) setAssignments((a) => ({ ...a, [k]: s }));
      }
    }
    setSelectedPieces(next);
  };

  const save = async () => {
    if (!sessionId) { toast.error("Pick an LoI session first"); return; }
    setSaving(true);
    // wipe & rewrite for this session
    await supabase.from("loi_part_assignments").delete().eq("loi_session_id", sessionId);
    const rows = [...selectedPieces].map((k) => {
      const [ritual_group, piece] = k.split("::");
      return {
        loi_session_id: sessionId,
        ritual_group, piece,
        member_id: assignments[k] || null,
        assigned_by: user?.id ?? null,
      };
    });
    if (rows.length > 0) {
      const { error } = await supabase.from("loi_part_assignments").insert(rows);
      if (error) { toast.error(error.message); setSaving(false); return; }
    }
    toast.success("Assignments saved");
    setSaving(false);
  };

  if (!canManage) return <p className="text-primary-foreground/80">Restricted to DC, WM, Secretary and Admin.</p>;
  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-gold animate-spin" /></div>;
  if (!matrix) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-primary-foreground">LoI Part Assignment Helper</h1>
        <p className="text-xs text-primary-foreground/60 mt-1">
          Pick an LoI session, tick the pieces you'll rehearse, accept the suggested member or override.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gold/80 mb-1">LoI Session</p>
          <Select value={sessionId} onValueChange={setSessionId}>
            <SelectTrigger className="bg-navy-dark text-primary-foreground w-72"><SelectValue placeholder="Select session" /></SelectTrigger>
            <SelectContent>
              {sessions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {new Date(s.session_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} · {s.focus.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gold/80 mb-1">Ritual group</p>
          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="bg-navy-dark text-primary-foreground w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RITUAL_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={save} disabled={saving || !sessionId} className="bg-gold text-navy hover:bg-gold/90 ml-auto">
          <Save className="w-4 h-4 mr-2" /> {saving ? "Saving…" : "Save assignments"}
        </Button>
      </div>

      <div className="rounded-sm border border-gold/20 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-navy-light/40 text-gold/80 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="p-2 text-left w-10"></th>
              <th className="p-2 text-left">Piece</th>
              <th className="p-2 text-left w-72">Assigned member</th>
              <th className="p-2 text-left">Candidates · Delivered</th>
            </tr>
          </thead>
          <tbody>
            {groupedPieces.map((p) => {
              const k = pieceKey(p.ritual_group, p.piece);
              const { delivered, candidates } = piecePeople(matrix, p.ritual_group, p.piece);
              const all = [...candidates, ...delivered];
              const checked = selectedPieces.has(k);
              return (
                <tr key={k} className="border-t border-gold/10">
                  <td className="p-2">
                    <Checkbox checked={checked} onCheckedChange={() => togglePiece(k, p.ritual_group, p.piece)} />
                  </td>
                  <td className="p-2 text-primary-foreground">{p.piece}</td>
                  <td className="p-2">
                    <Select
                      value={assignments[k] ?? "none"}
                      onValueChange={(v) => setAssignments((a) => ({ ...a, [k]: v === "none" ? "" : v }))}
                      disabled={!checked}
                    >
                      <SelectTrigger className="bg-navy-dark text-primary-foreground h-8 text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Unassigned —</SelectItem>
                        {all.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{displayMember(m)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2 text-[11px] text-primary-foreground/70">
                    {candidates.length} candidate{candidates.length === 1 ? "" : "s"} · {delivered.length} delivered
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function LoiAssignmentHelperPage() {
  return <ProtectedRoute><MembersLayout><Inner /></MembersLayout></ProtectedRoute>;
}
