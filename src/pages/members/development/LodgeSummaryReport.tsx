import { useEffect, useMemo, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import ProtectedRoute from "@/components/members/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, ClipboardCopy, Save, History, RefreshCw, AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  buildSummaryReport,
  currentMasonicYearPeriod,
  type SummaryReportData,
} from "@/lib/development/summaryReport";
import { buildSummaryReportText } from "@/lib/development/summaryReportText";
import { buildSummaryReportPdf } from "@/lib/development/summaryReportPdf";
import { toast } from "@/hooks/use-toast";

type SavedReport = {
  id: string;
  period_start: string;
  period_end: string;
  generated_at: string;
  mentor_statement: string | null;
  exec_summary: string | null;
  snapshot: SummaryReportData;
};

function trendIcon(trend: string) {
  if (trend === "improving" || trend === "up") return <TrendingUp className="w-4 h-4 text-emerald-400" />;
  if (trend === "declining" || trend === "down") return <TrendingDown className="w-4 h-4 text-amber-400" />;
  return <Minus className="w-4 h-4 text-primary-foreground/40" />;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-gold/20 bg-navy-light/30 p-4 space-y-3">
      <h3 className="font-serif text-gold text-base">{title}</h3>
      {children}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="text-primary-foreground/70">{label}</span>
      <span className="text-primary-foreground font-medium tabular-nums">
        {value}
        {hint && <span className="ml-2 text-xs text-primary-foreground/50">{hint}</span>}
      </span>
    </div>
  );
}

function NameChips({ items, max = 6 }: { items: { id: string; name: string; detail?: string }[]; max?: number }) {
  if (!items.length) return <p className="text-xs text-primary-foreground/50 italic">None</p>;
  const shown = items.slice(0, max);
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((i) => (
        <Badge key={i.id} variant="outline" className="border-gold/30 text-primary-foreground/80 text-[10px]">
          {i.name}{i.detail ? ` · ${i.detail}` : ""}
        </Badge>
      ))}
      {items.length > max && (
        <span className="text-[10px] text-primary-foreground/50 self-center">+{items.length - max} more</span>
      )}
    </div>
  );
}

function Inner() {
  const { user, isAdmin, isWorshipfulMaster, isSecretary } = useAuth();
  const defaultPeriod = useMemo(() => currentMasonicYearPeriod(), []);
  const [start, setStart] = useState(defaultPeriod.start);
  const [end, setEnd] = useState(defaultPeriod.end);
  const [data, setData] = useState<SummaryReportData | null>(null);
  const [statement, setStatement] = useState("");
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<SavedReport[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isMentor, setIsMentor] = useState(false);

  const canAccess = isAdmin || isWorshipfulMaster || isSecretary || isMentor;

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: mentorRecs } = await supabase
        .from("member_development_records")
        .select("member_id")
        .eq("assigned_mentor_id", user.id)
        .limit(1);
      setIsMentor((mentorRecs ?? []).length > 0);
    })();
  }, [user]);

  const generate = async () => {
    setLoading(true);
    try {
      const period = {
        start,
        end,
        label:
          start === defaultPeriod.start && end === defaultPeriod.end
            ? defaultPeriod.label
            : `${start} → ${end}`,
      };
      const d = await buildSummaryReport(period);
      setData(d);
    } catch (e: any) {
      toast({ title: "Could not build report", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canAccess) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccess]);

  const loadHistory = async () => {
    const { data: rows } = await (supabase.from as any)("lodge_development_reports")
      .select("*")
      .order("generated_at", { ascending: false })
      .limit(25);
    setHistory((rows ?? []) as SavedReport[]);
  };

  useEffect(() => { if (canAccess) loadHistory(); }, [canAccess]);

  const downloadPdf = async () => {
    if (!data) return;
    const doc = await buildSummaryReportPdf({ data, mentorStatement: statement });
    doc.save(`weybridge-development-summary-${data.period.start}.pdf`);
  };

  const copyText = async () => {
    if (!data) return;
    const text = buildSummaryReportText(data, statement);
    await navigator.clipboard.writeText(text);
    toast({ title: "Copied report as plain text" });
  };

  const saveSnapshot = async () => {
    if (!data || !user) return;
    const { error } = await (supabase.from as any)("lodge_development_reports").insert({
      period_start: data.period.start,
      period_end: data.period.end,
      snapshot: data,
      mentor_statement: statement,
      exec_summary: data.execSummary,
      generated_by: user.id,
    });
    if (error) {
      toast({ title: "Could not save snapshot", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Snapshot saved to history" });
      await loadHistory();
    }
  };

  if (!canAccess) {
    return (
      <div className="rounded-sm border border-gold/20 p-6 text-primary-foreground/80">
        This report is restricted to the Worshipful Master, Secretary, and Mentors.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl text-primary-foreground">Lodge Development Summary Report</h1>
          <p className="text-xs text-primary-foreground/60 mt-1">
            Consolidated view across Members, Mentoring, Ritual, LoI, Working Groups, Engagement and Royal Arch.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="border-gold/40 bg-navy-dark text-gold hover:bg-gold/10 hover:text-gold" onClick={() => setShowHistory((v) => !v)}>
            <History className="w-4 h-4 mr-2" /> History ({history.length})
          </Button>
          <Button variant="outline" size="sm" className="border-gold/40 bg-navy-dark text-gold hover:bg-gold/10 hover:text-gold" onClick={copyText} disabled={!data}>
            <ClipboardCopy className="w-4 h-4 mr-2" /> Copy text
          </Button>
          <Button variant="outline" size="sm" className="border-gold/40 bg-navy-dark text-gold hover:bg-gold/10 hover:text-gold" onClick={saveSnapshot} disabled={!data}>
            <Save className="w-4 h-4 mr-2" /> Save snapshot
          </Button>
          <Button size="sm" onClick={downloadPdf} disabled={!data} className="bg-gold text-navy hover:bg-gold/90">
            <Download className="w-4 h-4 mr-2" /> Download PDF
          </Button>
        </div>
      </div>

      <div className="flex items-end gap-3 flex-wrap rounded-sm border border-gold/20 bg-navy-light/30 p-4">
        <div>
          <label className="text-xs text-primary-foreground/60 block mb-1">Period start</label>
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="bg-navy-dark text-primary-foreground" />
        </div>
        <div>
          <label className="text-xs text-primary-foreground/60 block mb-1">Period end</label>
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="bg-navy-dark text-primary-foreground" />
        </div>
        <Button size="sm" variant="outline" className="border-gold/40 bg-navy-dark text-gold hover:bg-gold/10 hover:text-gold" onClick={generate} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Regenerate
        </Button>
        <span className="text-xs text-primary-foreground/60 self-center">Default: current Masonic year ({defaultPeriod.label})</span>
      </div>

      {showHistory && (
        <div className="rounded-sm border border-gold/20 bg-navy-light/30 p-4 space-y-2">
          <h3 className="font-serif text-gold">Saved snapshots</h3>
          {history.length === 0 ? (
            <p className="text-xs text-primary-foreground/60 italic">No snapshots saved yet.</p>
          ) : (
            <ul className="text-sm divide-y divide-gold/10">
              {history.map((h) => (
                <li key={h.id} className="py-2 flex items-center justify-between gap-3">
                  <span className="text-primary-foreground/80">
                    {h.period_start} → {h.period_end}
                    <span className="text-xs text-primary-foreground/50 ml-2">saved {new Date(h.generated_at).toLocaleDateString("en-GB")}</span>
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => { setData(h.snapshot); setStatement(h.mentor_statement ?? ""); setStart(h.period_start); setEnd(h.period_end); setShowHistory(false); }}>
                    Load
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {loading || !data ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-gold animate-spin" /></div>
      ) : (
        <>
          <div className="rounded-sm border border-gold/30 bg-gold/5 p-4">
            <h3 className="font-serif text-gold text-sm tracking-wider uppercase mb-2">Executive Summary</h3>
            <p className="text-primary-foreground leading-relaxed">{data.execSummary}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="1. Membership Overview">
              <Stat label="Active subscribing" value={data.membership.subscribing} />
              <Stat label="In formal mentoring" value={data.membership.novice} />
              <Stat label="Exempt" value={data.membership.exempt} />
              <Stat label="Pipeline (candidates)" value={data.membership.pipeline} />
              <Stat label="Initiated" value={data.membership.initiated} />
              <Stat label="Joined" value={data.membership.joined} />
              <Stat label="Resigned / Excluded / Deceased" value={`${data.membership.resigned} / ${data.membership.excluded} / ${data.membership.deceased}`} />
              <Stat label="Net movement" value={`${data.membership.net >= 0 ? "+" : ""}${data.membership.net}`} />
            </Card>

            <Card title="2. Mentoring Progress">
              <Stat label="Checklists in progress" value={data.mentoring.inProgress} />
              <Stat label="Average completion" value={`${data.mentoring.avgCompletionPct}%`} />
              <Stat label="Completed this period" value={data.mentoring.completedThisYear} />
              <Stat label="Overdue items" value={data.mentoring.overdueTotal} hint={`${data.mentoring.overdueByMember.length} member(s)`} />
              <Stat label="Engagement risk" value={<span className="inline-flex items-center gap-1">{data.mentoring.engagementRisk.length > 0 && <AlertTriangle className="w-3 h-3 text-amber-400" />}{data.mentoring.engagementRisk.length}</span>} />
              <Stat label="Degrees (I/P/R)" value={`${data.mentoring.initiations} / ${data.mentoring.passings} / ${data.mentoring.raisings}`} />
              <div className="pt-2">
                <p className="text-xs text-primary-foreground/60 mb-1">Overdue by member</p>
                <NameChips items={data.mentoring.overdueByMember} />
              </div>
              <div>
                <p className="text-xs text-primary-foreground/60 mb-1">Engagement risk</p>
                <NameChips items={data.mentoring.engagementRisk} />
              </div>
            </Card>

            <Card title="3. Ritual Development">
              <Stat label="Total pieces" value={data.ritual.totalPieces} />
              <Stat label="Red (no qualified)" value={`${data.ritual.red} (${data.ritual.redPct}%)`} />
              <Stat label="Amber (single point)" value={data.ritual.amber} />
              <Stat label="Green (≥2 qualified)" value={`${data.ritual.green} (${data.ritual.greenPct}%)`} />
              <Stat label="New deliveries" value={data.ritual.newDeliveries} />
              <div className="pt-2">
                <p className="text-xs text-primary-foreground/60 mb-1">Amber pieces</p>
                {data.ritual.amberList.length ? (
                  <p className="text-xs text-primary-foreground/80">{data.ritual.amberList.slice(0, 8).join("; ")}{data.ritual.amberList.length > 8 ? ` +${data.ritual.amberList.length - 8} more` : ""}</p>
                ) : <p className="text-xs text-primary-foreground/50 italic">None</p>}
              </div>
              <div>
                <p className="text-xs text-primary-foreground/60 mb-1">First-time Lodge deliveries</p>
                <NameChips items={data.ritual.firstDeliveriesInLodge} />
              </div>
            </Card>

            <Card title="4. Lodge of Instruction">
              <Stat label="Sessions held" value={data.loi.sessions} />
              <Stat label="Avg attendance" value={data.loi.avgAttendance} />
              <Stat label="Avg attendance %" value={`${data.loi.avgAttendancePct}%`} />
              <Stat label="Trend" value={<span className="inline-flex items-center gap-2">{trendIcon(data.loi.trend)}{data.loi.trend}</span>} />
              <div className="pt-2">
                <p className="text-xs text-primary-foreground/60 mb-1">Below 50% attendance</p>
                <NameChips items={data.loi.lowAttenders} />
              </div>
            </Card>

            <Card title="5. Working Groups">
              <Stat label="Active groups" value={data.workingGroups.active} />
              <Stat label="Members assigned" value={`${data.workingGroups.assignedMembers} (${data.workingGroups.assignedPct}%)`} />
              <Stat label="Unassigned" value={data.workingGroups.unassigned.length} />
              {data.workingGroups.activityCountByGroup.length > 0 && (
                <div className="pt-2 space-y-1">
                  <p className="text-xs text-primary-foreground/60">Activities per group</p>
                  {data.workingGroups.activityCountByGroup.map((g) => (
                    <Stat key={g.group} label={g.group} value={g.count} />
                  ))}
                </div>
              )}
              <div>
                <p className="text-xs text-primary-foreground/60 mb-1">Unassigned members</p>
                <NameChips items={data.workingGroups.unassigned} />
              </div>
            </Card>

            <Card title="6. Engagement Summary">
              <Stat label="Avg touchpoints / novice" value={data.engagement.avgTouchpointsPerNovice} />
              <Stat label="Novices with zero touchpoints" value={data.engagement.zeroTouchpoints.length} />
              <Stat label="Social events" value={data.engagement.socialEvents} />
              <Stat label="Lodge visits" value={data.engagement.lodgeVisits} />
              <Stat label="Provincial events" value={data.engagement.provincialEvents} />
              <div className="pt-2">
                <p className="text-xs text-primary-foreground/60 mb-1">Zero-touchpoint novices</p>
                <NameChips items={data.engagement.zeroTouchpoints} />
              </div>
            </Card>

            <Card title="7. Royal Arch Conversion">
              <Stat label="Light Blues eligible" value={data.royalArch.eligible} />
              <Stat label="Recommended for Exaltation" value={data.royalArch.recommended} />
              <Stat label="Exalted in period" value={data.royalArch.exalted} />
              <Stat label="Previous period" value={data.royalArch.exaltedPrevious} />
              <Stat label="Trend" value={<span className="inline-flex items-center gap-2">{trendIcon(data.royalArch.trend)}{data.royalArch.trend}</span>} />
            </Card>

            <Card title="8. Mentor's Summary Statement">
              <p className="text-xs text-primary-foreground/60">
                Summarise the lodge's development activity, any members of particular note, and your priorities for the coming period. This becomes the spoken report at agenda item 7.
              </p>
              <Textarea
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                rows={8}
                placeholder="Brethren, in the period under review…"
                className="bg-navy-dark text-primary-foreground"
              />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export default function LodgeSummaryReportPage() {
  return (
    <ProtectedRoute>
      <MembersLayout>
        <Inner />
      </MembersLayout>
    </ProtectedRoute>
  );
}
