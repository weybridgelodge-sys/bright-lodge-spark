import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MembersLayout from "@/components/members/MembersLayout";
import ProtectedRoute from "@/components/members/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ChevronRight, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { lastTouchpoint, daysSince } from "@/lib/development/engagement";

type Row = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  degree: string;
  assigned_mentor_id: string | null;
  total: number;
  completed: number;
  overdue: number;
  lastCheckIn: string | null;
  lastTouchpoint: string | null;
};

const displayName = (p: { first_name?: string | null; last_name?: string | null; full_name?: string | null; preferred_name?: string | null }) => {
  const f = p.preferred_name?.trim() || p.first_name?.trim() || "";
  return [f, p.last_name?.trim() || ""].filter(Boolean).join(" ") || p.full_name || "Unnamed";
};
const fmt = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const DEGREE_LABEL: Record<string, string> = {
  entered_apprentice: "EA", fellow_craft: "FC", master_mason: "MM", installed_master: "IM",
};

function Inner() {
  const { user, isAdmin, isWorshipfulMaster } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const seesAll = isAdmin || isWorshipfulMaster;

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      let recQuery = supabase.from("member_development_records").select("member_id, assigned_mentor_id");
      if (!seesAll) recQuery = recQuery.eq("assigned_mentor_id", user.id);
      const { data: records } = await recQuery;
      const memberIds = (records ?? []).map((r) => r.member_id);
      if (memberIds.length === 0) { setRows([]); setLoading(false); return; }
      const [{ data: profs }, { data: items }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, first_name, last_name, preferred_name, degree").in("id", memberIds),
        supabase.from("member_checklist_items").select("member_id, status, target_date, completed_date").in("member_id", memberIds),
      ]);
      const byMember = new Map<string, { total: number; completed: number; overdue: number; lastCheckIn: string | null }>();
      const today = new Date().toISOString().slice(0, 10);
      for (const it of items ?? []) {
        const cur = byMember.get(it.member_id) ?? { total: 0, completed: 0, overdue: 0, lastCheckIn: null };
        cur.total += 1;
        if (it.status === "complete") cur.completed += 1;
        if (it.target_date && it.status !== "complete" && it.target_date < today) cur.overdue += 1;
        if (it.completed_date && (!cur.lastCheckIn || it.completed_date > cur.lastCheckIn)) cur.lastCheckIn = it.completed_date;
        byMember.set(it.member_id, cur);
      }
      const recordMap = new Map((records ?? []).map((r) => [r.member_id, r.assigned_mentor_id]));
      const touchpoints = await Promise.all((profs ?? []).map(async (p: any) => [p.id, await lastTouchpoint(p.id)] as const));
      const tMap = new Map(touchpoints);
      const next: Row[] = (profs ?? []).map((p: any) => ({
        id: p.id,
        full_name: p.full_name, first_name: p.first_name, last_name: p.last_name, preferred_name: p.preferred_name,
        degree: p.degree,
        assigned_mentor_id: recordMap.get(p.id) ?? null,
        lastTouchpoint: tMap.get(p.id) ?? null,
        ...(byMember.get(p.id) ?? { total: 0, completed: 0, overdue: 0, lastCheckIn: null }),
      }));
      next.sort((a, b) => displayName(a).localeCompare(displayName(b)));
      setRows(next);
      setLoading(false);
    })();
  }, [user, seesAll]);

  const filtered = rows.filter((r) => displayName(r).toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl text-primary-foreground">Member Development</h1>
          <p className="text-xs text-primary-foreground/60 mt-1">
            {seesAll ? "All members with development records." : "Members assigned to you as Mentor."}
          </p>
        </div>
        <Link
          to="/members/development/summary-report"
          className="inline-flex items-center gap-2 rounded-sm border border-gold/40 bg-gold/10 px-3 py-2 text-xs text-gold hover:bg-gold/20"
        >
          Lodge Development Summary Report <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <Input placeholder="Filter by name" value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-sm bg-navy-dark text-primary-foreground" />
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-gold animate-spin" /></div>
      ) : (
        <div className="rounded-sm border border-gold/20 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-navy-light/40 text-gold/80 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="text-left p-3">Member</th>
                <th className="text-left p-3">Degree</th>
                <th className="text-left p-3 w-44">Checklist</th>
                <th className="text-left p-3">Last check-in</th>
                <th className="text-left p-3">Last touchpoint</th>
                <th className="text-left p-3">Overdue</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const pct = Math.round((r.completed / Math.max(r.total, 1)) * 100);
                const days = daysSince(r.lastTouchpoint);
                const stale = days !== null && days > 42;
                return (
                  <tr key={r.id} className="border-t border-gold/10 hover:bg-navy-light/20">
                    <td className="p-3 text-primary-foreground">{displayName(r)}</td>
                    <td className="p-3 text-primary-foreground/80">{DEGREE_LABEL[r.degree] ?? r.degree}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-navy-light rounded-full overflow-hidden">
                          <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] tabular-nums text-primary-foreground/70">{pct}%</span>
                      </div>
                    </td>
                    <td className="p-3 text-primary-foreground/80">{fmt(r.lastCheckIn)}</td>
                    <td className="p-3">
                      {r.lastTouchpoint ? (
                        <span className={`text-xs inline-flex items-center gap-1 ${stale ? "text-amber-400" : "text-primary-foreground/80"}`}>
                          {stale && <AlertTriangle className="w-3 h-3" />}
                          {fmt(r.lastTouchpoint)}
                          {days !== null && <span className="text-primary-foreground/50">· {days}d</span>}
                        </span>
                      ) : (
                        <span className="text-primary-foreground/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      {r.overdue > 0 ? (
                        <span className="inline-flex items-center gap-1 text-amber-400 text-xs"><AlertTriangle className="w-3 h-3" /> {r.overdue}</span>
                      ) : (
                        <span className="text-primary-foreground/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <Link to={`/members/development/${r.id}`} className="inline-flex items-center text-gold text-xs hover:underline">
                        Open <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-primary-foreground/60 italic">No members to show.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function MentorDashboardPage() {
  return (
    <ProtectedRoute>
      <MembersLayout>
        <Inner />
      </MembersLayout>
    </ProtectedRoute>
  );
}
