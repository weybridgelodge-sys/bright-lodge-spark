import { useEffect, useMemo, useState } from "react";
import { Users, BarChart3, TrendingUp, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LOI_KPI_CATEGORIES, autoKpiCategory } from "@/lib/loi";
import { computeHeadcount, shortMonthLabel } from "@/lib/festiveBoard";

// Fallback mock data — used only when no live records exist yet
const regularMeetingsFallback = [
  { month: "Oct 23 (Inst.)", subscribing: 18, visitors: 14, total: 32 },
  { month: "Dec 23", subscribing: 15, visitors: 6, total: 21 },
  { month: "Feb 24", subscribing: 16, visitors: 8, total: 24 },
  { month: "May 24", subscribing: 14, visitors: 5, total: 19 },
  { month: "Oct 24 (Inst.)", subscribing: 20, visitors: 16, total: 36 },
  { month: "Dec 24", subscribing: 17, visitors: 4, total: 21 },
  { month: "Feb 25", subscribing: 19, visitors: 11, total: 30 },
  { month: "May 25", subscribing: 15, visitors: 7, total: 22 },
];

const loiRehearsalFallback = [
  { block: "Oct Inst. Prep", sessionsCount: 4, engagementRate: 92 },
  { block: "Dec Degree Prep", sessionsCount: 3, engagementRate: 78 },
  { block: "Feb Degree Prep", sessionsCount: 4, engagementRate: 86 },
  { block: "May Degree Prep", sessionsCount: 3, engagementRate: 71 },
];

type LiveLoi = {
  data: { block: string; sessionsCount: number; engagementRate: number }[];
  avgTurnout: number;
  overallEngagement: number;
  totalSessions: number;
};

function useLiveLoi(): LiveLoi | null {
  const [state, setState] = useState<LiveLoi | null>(null);
  useEffect(() => {
    (async () => {
      const [s, a, m] = await Promise.all([
        supabase.from("loi_sessions").select("id,session_date,kpi_category"),
        supabase.from("loi_attendance").select("session_id"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "active").eq("is_honorary_member", false),
      ]);
      const sessions = (s.data as { id: string; session_date: string; kpi_category: string | null }[]) ?? [];
      const attendance = (a.data as { session_id: string }[]) ?? [];
      const activeCount = m.count ?? 0;
      if (sessions.length === 0 || activeCount === 0) {
        setState(null);
        return;
      }
      const countBySession: Record<string, number> = {};
      for (const r of attendance) countBySession[r.session_id] = (countBySession[r.session_id] ?? 0) + 1;
      const grouped: Record<string, { sessions: number; attendees: number }> = {};
      for (const sess of sessions) {
        const cat = sess.kpi_category || autoKpiCategory(sess.session_date);
        const g = (grouped[cat] ??= { sessions: 0, attendees: 0 });
        g.sessions += 1;
        g.attendees += countBySession[sess.id] ?? 0;
      }
      const data = LOI_KPI_CATEGORIES.filter((c) => grouped[c.value])
        .map((c) => {
          const g = grouped[c.value];
          return {
            block: c.label,
            sessionsCount: g.sessions,
            engagementRate: Math.round((g.attendees / (g.sessions * activeCount)) * 100),
          };
        });
      const totalSessions = sessions.length;
      const totalAtt = attendance.length;
      setState({
        data,
        avgTurnout: Math.round(totalAtt / totalSessions),
        overallEngagement: Math.round((totalAtt / (totalSessions * activeCount)) * 100),
        totalSessions,
      });
    })();
  }, []);
  return state;
}

type LiveFestive = {
  data: { month: string; subscribing: number; visitors: number; total: number }[];
  recordCount: number;
};

function useLiveFestive(): LiveFestive | null {
  const [state, setState] = useState<LiveFestive | null>(null);
  useEffect(() => {
    (async () => {
      const [mt, at] = await Promise.all([
        supabase
          .from("festive_board_meetings")
          .select("id,meeting_date,meeting_type,headcount_override")
          .order("meeting_date", { ascending: true }),
        supabase
          .from("festive_board_attendance")
          .select("meeting_id,member_id,attendance_status"),
      ]);
      const meetings =
        (mt.data as {
          id: string;
          meeting_date: string;
          meeting_type: string;
          headcount_override: number | null;
        }[]) ?? [];
      const att = (at.data as { meeting_id: string; member_id: string | null; attendance_status: string }[]) ?? [];
      if (meetings.length === 0) {
        setState(null);
        return;
      }
      const byMeeting: Record<string, typeof att> = {};
      for (const r of att) (byMeeting[r.meeting_id] ??= []).push(r);
      const data = meetings.map((m) => {
        const hc = computeHeadcount(byMeeting[m.id] ?? [], m.headcount_override);
        return {
          month: shortMonthLabel(m.meeting_date, m.meeting_type),
          subscribing: hc.members,
          visitors: hc.visitors,
          total: hc.total,
        };
      });
      setState({ data, recordCount: meetings.length });
    })();
  }, []);
  return state;
}

export default function AttendanceCharts() {
  const [activeTab, setActiveTab] = useState<"festive" | "loi">("festive");
  const liveLoi = useLiveLoi();
  const loiRehearsalData = liveLoi?.data.length ? liveLoi.data : loiRehearsalFallback;
  const loiAvgTurnout = liveLoi ? `${liveLoi.avgTurnout} / night` : "12 / night";
  const loiEngagementLabel = liveLoi ? `${liveLoi.overallEngagement}% overall` : "81.7% overall";

  const visibleMeetings = regularMeetingsData.slice(-6);

  const maxAttendance = Math.max(...visibleMeetings.map((d) => d.total));
  const totalVisitors = visibleMeetings.reduce((a, c) => a + c.visitors, 0);
  const averageSubscribing = Math.round(
    visibleMeetings.reduce((a, c) => a + c.subscribing, 0) / visibleMeetings.length
  );

  return (
    <div className="space-y-5">
      {/* Tab toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-primary-foreground/60">
          Mock data — visual placeholder pending live booking aggregation.
        </p>
        <div className="flex bg-navy p-1 rounded-sm border border-gold/15">
          <button
            onClick={() => setActiveTab("festive")}
            className={`px-3 py-1.5 text-[11px] uppercase tracking-wider rounded-sm transition-all ${
              activeTab === "festive"
                ? "bg-gold-shimmer text-accent-foreground font-semibold"
                : "text-primary-foreground/70 hover:text-gold"
            }`}
          >
            Festive Board
          </button>
          <button
            onClick={() => setActiveTab("loi")}
            className={`px-3 py-1.5 text-[11px] uppercase tracking-wider rounded-sm transition-all ${
              activeTab === "loi"
                ? "bg-gold-shimmer text-accent-foreground font-semibold"
                : "text-primary-foreground/70 hover:text-gold"
            }`}
          >
            Lodge of Instruction
          </button>
        </div>
      </div>

      {/* Stat banners */}
      {activeTab === "festive" ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatBanner icon={<Users className="w-4 h-4" />} label="Avg. member dining" value={`${averageSubscribing} Brethren`} />
          <StatBanner icon={<TrendingUp className="w-4 h-4" />} label="Total guest diners" value={`${totalVisitors} Visitors`} />
          <StatBanner icon={<BarChart3 className="w-4 h-4" />} label="Peak seat booking" value={`${maxAttendance} Covers`} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <StatBanner icon={<Calendar className="w-4 h-4" />} label="Avg. LOI turnout" value={loiAvgTurnout} />
          <StatBanner icon={<TrendingUp className="w-4 h-4" />} label="Floorwork engagement" value={loiEngagementLabel} />
        </div>
      )}

      {/* Chart */}
      <div className="bg-navy/60 border border-gold/10 rounded-sm p-4 sm:p-5">
        <h3 className="font-serif text-base text-gold mb-4">
          {activeTab === "festive"
            ? "Historical covers & dining demographics"
            : "LOI attendance & engagement curves"}
        </h3>

        {activeTab === "festive" ? (
          <div className="space-y-4">
            <div className="h-56 flex items-end gap-2 pt-4 border-b border-gold/10 px-1">
              {visibleMeetings.map((data, idx) => {
                const subPct = (data.subscribing / maxAttendance) * 100;
                const visPct = (data.visitors / maxAttendance) * 100;
                return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                  {/* 🔥 Fixed floating tooltip box */}
                  <div className="absolute bottom-full mb-2 bg-navy-dark text-primary-foreground text-[11px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 shadow-xl min-w-[130px] text-left border border-gold/15 left-1/2 -translate-x-1/2">
                    <p className="font-bold border-b border-gold/15 pb-1 mb-1 text-gold whitespace-nowrap">{data.month}</p>
                    <p className="flex justify-between gap-4"><span>Members</span><span>{data.subscribing}</span></p>
                    <p className="flex justify-between gap-4"><span>Visitors</span><span>{data.visitors}</span></p>
                    <p className="flex justify-between gap-4 text-gold mt-1 font-bold"><span>Total</span><span>{data.total}</span></p>
                  </div>

                  {/* Visual data column stack */}
                  <div className="w-full sm:w-8 flex flex-col justify-end h-full rounded-t-sm overflow-hidden">
                    <div style={{ height: `${visPct}%` }} className="bg-gold/40 group-hover:bg-gold/60 transition-colors w-full" />
                    <div style={{ height: `${subPct}%` }} className="bg-gold group-hover:bg-gold/90 transition-colors w-full border-t border-background/20" />
                  </div>
                  <span className="text-[9px] text-primary-foreground/60 mt-2 text-center whitespace-nowrap">
                    {data.month.split(" ")[0]} {data.month.split(" ")[1]}
                  </span>
                </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-6 text-[11px] text-primary-foreground/70 pt-1">
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 bg-gold rounded-sm" /> Subscribing</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 bg-gold/40 rounded-sm" /> Visiting</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {loiRehearsalData.map((block, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-primary-foreground">
                    {block.block}{" "}
                    <span className="text-primary-foreground/60 font-normal">
                      ({block.sessionsCount} sessions)
                    </span>
                  </span>
                  <span className="text-gold font-semibold">{block.engagementRate}%</span>
                </div>
                <div className="w-full bg-navy h-3 rounded-sm overflow-hidden border border-gold/10">
                  <div
                    style={{ width: `${block.engagementRate}%` }}
                    className="bg-gold-shimmer h-full transition-all duration-500"
                  />
                </div>
              </div>
            ))}
            <p className="text-[11px] text-primary-foreground/60 pt-2 italic">
              {liveLoi
                ? `Live from the LOI Register — ${liveLoi.totalSessions} session${liveLoi.totalSessions === 1 ? "" : "s"} recorded.`
                : "Insight: rehearsal turnout dips mid-season. Targeted reminders to Junior Officers help maintain ritual accuracy ahead of degree workings."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatBanner({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-navy/60 border border-gold/10 rounded-sm p-3 flex items-center gap-3">
      <div className="p-2 bg-gold/10 rounded-sm text-gold">{icon}</div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-primary-foreground/60">{label}</p>
        <p className="font-serif text-lg text-gold mt-0.5">{value}</p>
      </div>
    </div>
  );
}
