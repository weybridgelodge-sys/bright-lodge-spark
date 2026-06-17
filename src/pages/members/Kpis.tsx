import { useEffect, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { toast } from "sonner";
import { Download, FileText, AlertTriangle, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchKpiBundle,
  snapshot,
  movement,
  uglePortal,
  raConversion,
  milestones,
  officersHealth,
  pipeline,
  fullName,
  currentMasonicYear,
  type KpiBundle,
} from "@/lib/kpis";
import { exportVoReport, exportFullKpi } from "@/lib/kpiExports";
import AttendanceCharts from "@/components/members/AttendanceCharts";

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details
      open={defaultOpen}
      className="bg-navy-dark/60 border border-gold/15 rounded-sm group"
    >
      <summary className="cursor-pointer list-none flex items-center justify-between p-4 sm:p-5">
        <h2 className="font-serif text-lg sm:text-xl text-gold">{title}</h2>
        <ChevronDown className="w-4 h-4 text-gold transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-4 sm:px-5 pb-5">{children}</div>
    </details>
  );
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="bg-navy/60 border border-gold/10 rounded-sm p-3">
      <p className="text-[11px] uppercase tracking-wider text-primary-foreground/60">{label}</p>
      <p className="font-serif text-2xl text-gold mt-1">{value}</p>
      {sub && <p className="text-[11px] text-primary-foreground/50 mt-1">{sub}</p>}
    </div>
  );
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-14 text-primary-foreground/70">{label}</span>
      <div className="flex-1 bg-navy h-3 rounded-sm overflow-hidden">
        <div className="h-full bg-gold-shimmer" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-right text-gold">{value}</span>
    </div>
  );
}

export default function Kpis() {
  const { user } = useAuth();
  const [bundle, setBundle] = useState<KpiBundle | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const b = await fetchKpiBundle();
      setBundle(b);
    } catch (e) {
      toast.error("Could not load KPI data");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const saveRisk = async (roleKey: string, note: string) => {
    const trimmed = note.trim();
    if (!trimmed) {
      await (supabase.from as any)("succession_risks").delete().eq("role_key", roleKey);
    } else {
      await (supabase.from as any)("succession_risks").upsert(
        { role_key: roleKey, note: trimmed, flagged_by: user?.id ?? null },
        { onConflict: "role_key" }
      );
    }
    toast.success("Saved");
    load();
  };

  if (loading || !bundle) {
    return (
      <MembersLayout>
        <p className="text-sm text-primary-foreground/60">Loading KPIs…</p>
      </MembersLayout>
    );
  }

  const s = snapshot(bundle.members);
  const mv = movement(bundle.members);
  const ra = uglePortal(bundle.members);
  const conv = raConversion(bundle.members);
  const ms = milestones(bundle.members, bundle.wmTerms);
  const oh = officersHealth(bundle);
  const pl = pipeline(bundle.members);
  const my = currentMasonicYear();
  const maxBand = Math.max(1, ...s.ageBands.map((b) => b.count));
  const funnelMax = Math.max(1, pl.candidates.length, pl.ea.length, pl.fc.length, pl.mm.length);

  return (
    <MembersLayout>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="font-serif text-3xl text-gold mb-1">Lodge KPI Dashboard</h1>
          <p className="text-sm text-primary-foreground/60">
            Live figures from member records · Masonic year {my}/{my + 1}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportVoReport(bundle)}
            className="flex items-center gap-1.5 border border-gold/40 text-gold px-3 py-2 rounded-sm text-xs uppercase tracking-wider hover:bg-gold/10"
          >
            <FileText className="w-3.5 h-3.5" /> Export VO Report
          </button>
          <button
            onClick={() => exportFullKpi(bundle)}
            className="flex items-center gap-1.5 bg-gold-shimmer text-accent-foreground px-3 py-2 rounded-sm text-xs uppercase tracking-wider font-semibold"
          >
            <Download className="w-3.5 h-3.5" /> Export Full KPI
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Section 1 */}
        <Section title="1 · Membership Snapshot">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <Stat label="Subscribing" value={s.subscribingCount} />
            <Stat label="Honorary" value={s.honoraryCount} />
            <Stat label="Average age" value={s.averageAge ?? "—"} />
            <Stat label="Royal Arch %" value={`${s.royalArchPct}%`} sub={`${s.royalArchCount} brethren`} />
            <Stat label="Light Blues" value={s.lightBlueCount} />
            <Stat
              label="Last Initiation"
              value={s.lastInitiation ? new Date(s.lastInitiation.date).toLocaleDateString("en-GB") : "—"}
              sub={s.lastInitiation && s.lastInitiation.count > 1 ? s.lastInitiation.label : undefined}
            />
          </div>
          <p className="text-[11px] uppercase tracking-wider text-primary-foreground/60 mb-2">
            Age distribution
          </p>
          <div className="space-y-1.5">
            {s.ageBands.map((b) => (
              <BarRow key={b.label} label={b.label} value={b.count} max={maxBand} />
            ))}
          </div>
        </Section>

        {/* Section 2 */}
        <Section title="2 · Movement (rolling 12 months)">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Initiated" value={mv.initiated.length} />
            <Stat label="Joined" value={mv.joined.length} />
            <Stat label="Resigned" value={mv.resigned.length} />
            <Stat label="Excluded" value={mv.excluded.length} />
            <Stat label="Deceased" value={mv.deceased.length} />
            <Stat label="Year Out" value={mv.yearOut.length} sub="Not counted in net" />
            <Stat label="Net movement" value={mv.net >= 0 ? `+${mv.net}` : mv.net} />
          </div>
        </Section>

        {/* Section 3 */}
        <Section title="3 · UGLE Portal Registration">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <Stat label="% registered" value={`${ra.pct}%`} sub="Active subscribing only" />
            <Stat label="Registered" value={`${ra.registeredCount} / ${ra.totalActive}`} />
            <Stat label="Outstanding" value={ra.unregisteredCount} />
          </div>
          {ra.unregistered.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-primary-foreground/60 mb-2">
                For Secretary follow-up
              </p>
              <ul className="text-sm space-y-1">
                {ra.unregistered.map((m) => (
                  <li key={m.id} className="text-primary-foreground/80">• {fullName(m)}</li>
                ))}
              </ul>
            </div>
          )}
        </Section>

        {/* Section 4 */}
        <Section title="4 · Royal Arch Conversion Opportunity">
          {conv.length === 0 ? (
            <p className="text-sm text-primary-foreground/60">No Light Blues currently eligible.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-primary-foreground/50">
                  <tr>
                    <th className="text-left p-2">Brother</th>
                    <th className="text-left p-2">Date Raised</th>
                    <th className="text-right p-2">Months eligible</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold/10">
                  {conv.map((r) => (
                    <tr key={r.member.id}>
                      <td className="p-2">{fullName(r.member)}</td>
                      <td className="p-2 text-primary-foreground/70">
                        {new Date(r.member.raising_date!).toLocaleDateString("en-GB")}
                      </td>
                      <td className="p-2 text-right text-gold">{r.monthsEligible}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* Section 5 */}
        <Section title={`5 · Milestones & Anniversaries (${my}/${my + 1})`}>
          {ms.length === 0 ? (
            <p className="text-sm text-primary-foreground/60">No milestones this year.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {ms.map((x, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between bg-navy/60 border border-gold/10 rounded-sm px-3 py-2"
                >
                  <div>
                    <p className="font-medium">{fullName(x.member)}</p>
                    <p className="text-[11px] text-primary-foreground/60">{x.label}</p>
                  </div>
                  <p className="text-gold text-xs">{new Date(x.date).toLocaleDateString("en-GB")}</p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Section 6 */}
        <Section title="6 · Officers & Succession Health">
          <div className="grid grid-cols-2 gap-3 mb-5">
            <Stat
              label="Progressive offices filled"
              value={`${oh.progressiveFilled.length} / ${oh.progressiveTotal}`}
            />
            <Stat label="Vacant" value={oh.progressiveVacant.length} />
          </div>
          {oh.progressiveVacant.length > 0 && (
            <p className="text-xs text-primary-foreground/70 mb-4">
              Vacant: {oh.progressiveVacant.map((v) => v.label).join(", ")}
            </p>
          )}
          <p className="text-[11px] uppercase tracking-wider text-primary-foreground/60 mb-2">
            Critical roles
          </p>
          <div className="space-y-2">
            {oh.criticals.map((c) => (
              <div
                key={c.key}
                className="flex flex-wrap items-center gap-3 bg-navy/60 border border-gold/10 rounded-sm p-3"
              >
                <div className="flex-1 min-w-[12rem]">
                  <p className="font-medium text-sm">{c.label}</p>
                  <p className="text-[11px] text-primary-foreground/60">
                    {c.holder ? fullName(c.holder) : <span className="text-amber-400">VACANT</span>}
                  </p>
                </div>
                <RiskInput
                  initial={c.risk?.note ?? ""}
                  onSave={(v) => saveRisk(c.key, v)}
                  flagged={!!c.risk}
                />
              </div>
            ))}
          </div>
        </Section>

        {/* Section 7 */}
        <Section title="7 · Pipeline">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <Stat label="Candidates" value={pl.candidates.length} />
            <Stat label="EA → FC" value={pl.ea.length} />
            <Stat label="FC → MM" value={pl.fc.length} />
            <Stat label="Master Masons" value={pl.mm.length} />
          </div>
          <div className="space-y-1.5">
            <BarRow label="Cand." value={pl.candidates.length} max={funnelMax} />
            <BarRow label="EA" value={pl.ea.length} max={funnelMax} />
            <BarRow label="FC" value={pl.fc.length} max={funnelMax} />
            <BarRow label="MM" value={pl.mm.length} max={funnelMax} />
          </div>
        </Section>

        {/* Section 8 */}
        <Section title="8 · Attendance Analytics" defaultOpen={false}>
          <AttendanceCharts />
        </Section>
      </div>

    </MembersLayout>
  );
}

function RiskInput({
  initial,
  onSave,
  flagged,
}: {
  initial: string;
  onSave: (v: string) => void;
  flagged: boolean;
}) {
  const [v, setV] = useState(initial);
  const dirty = v !== initial;
  return (
    <div className="flex items-center gap-2 w-full sm:w-auto">
      {flagged && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" aria-label="Flagged" />}
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="Succession risk note…"
        className="flex-1 sm:w-72 bg-navy border border-gold/20 rounded-sm px-2 py-1.5 text-xs"
      />
      {dirty && (
        <button
          onClick={() => onSave(v)}
          className="text-[11px] uppercase tracking-wider text-gold border border-gold/40 px-2 py-1 rounded-sm hover:bg-gold/10"
        >
          Save
        </button>
      )}
    </div>
  );
}
