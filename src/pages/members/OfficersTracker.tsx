import { useEffect, useMemo, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  POSITION_ORDER,
  POSITION_LABELS,
  PositionKey,
  MemberLite,
  Appointment,
  computeProjection,
  sortBySeniority,
  detectDuplicateInitiations,
  masonicYear,
  formatMasonicYear,
  NON_PROGRESSIVE_ORDER,
  NON_PROGRESSIVE_LABELS,
  NonProgressiveKey,
  tenureSince,
} from "@/lib/officersProgression";
import { Loader2, AlertTriangle, Crown, Download, UserPlus, Lock, ShieldAlert, X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Tab = "board" | "ladder" | "readiness";
type Readiness = "ready" | "needs_experience" | "non_progressive";

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  rank: string | null;
  office: string | null;
  joined_year: number | null;
  status: string;
  initiation_date: string | null;
};

type StatusRow = {
  member_id: string;
  readiness: Readiness;
  seniority_initiation_date: string | null;
  seniority_tiebreaker: number | null;
  notes: string | null;
  updated_by: string | null;
};

type AppointmentRow = {
  id: string;
  position_key: PositionKey;
  member_id: string | null;
  lodge_year: number;
  appointed_on: string | null;
  is_projection: boolean;
  override_reason: string | null;
  override_by: string | null;
};

const READINESS_LABEL: Record<Readiness, string> = {
  ready: "Ready for Progression",
  needs_experience: "Needs More Experience",
  non_progressive: "Non-Progressive by Choice",
};

export default function OfficersTracker() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<Tab>("board");
  const [loading, setLoading] = useState(true);

  const [members, setMembers] = useState<ProfileRow[]>([]);
  const [statuses, setStatuses] = useState<StatusRow[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);

  const currentYear = masonicYear();

  const load = async () => {
    setLoading(true);
    const [{ data: m, error: e1 }, { data: s, error: e2 }, { data: a, error: e3 }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,full_name,email,rank,office,joined_year,status,initiation_date")
        .eq("status", "active")
        .order("full_name", { ascending: true }),
      supabase.from("member_progression_status").select("*"),
      supabase.from("officer_appointments").select("*"),
    ]);
    if (e1) toast.error(e1.message);
    if (e2) toast.error(e2.message);
    if (e3) toast.error(e3.message);
    setMembers((m as ProfileRow[]) ?? []);
    setStatuses((s as StatusRow[]) ?? []);
    setAppointments((a as AppointmentRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // Build helpers
  const membersById = useMemo(() => {
    const map: Record<string, MemberLite> = {};
    const statusMap = new Map(statuses.map((s) => [s.member_id, s]));
    for (const m of members) {
      const st = statusMap.get(m.id);
      map[m.id] = {
        id: m.id,
        full_name: m.full_name,
        effective_initiation_date: st?.seniority_initiation_date ?? m.initiation_date,
        tiebreaker: st?.seniority_tiebreaker ?? null,
      };
    }
    return map;
  }, [members, statuses]);

  const overrideByName = useMemo(() => {
    const map = new Map(members.map((m) => [m.id, m.full_name ?? m.email ?? "—"]));
    return (id: string | null) => (id ? map.get(id) ?? "—" : "—");
  }, [members]);

  const appointmentsLite: Appointment[] = useMemo(
    () =>
      appointments.map((a) => ({
        position_key: a.position_key,
        member_id: a.member_id,
        lodge_year: a.lodge_year,
        is_projection: a.is_projection,
        override_reason: a.override_reason,
        override_by_name: a.override_by ? overrideByName(a.override_by) : null,
      })),
    [appointments, overrideByName]
  );

  // Members currently holding a progressive office
  const onLadderIds = useMemo(() => {
    const set = new Set<string>();
    for (const a of appointments) {
      if (a.lodge_year === currentYear && a.member_id) set.add(a.member_id);
    }
    return set;
  }, [appointments, currentYear]);

  const readyQueue: MemberLite[] = useMemo(() => {
    const statusMap = new Map(statuses.map((s) => [s.member_id, s]));
    return Object.values(membersById).filter(
      (m) => !onLadderIds.has(m.id) && statusMap.get(m.id)?.readiness === "ready"
    );
  }, [membersById, onLadderIds, statuses]);

  const projection = useMemo(
    () =>
      computeProjection({
        currentYear,
        yearsAhead: 7,
        appointments: appointmentsLite,
        readyQueue,
        membersById,
      }),
    [currentYear, appointmentsLite, readyQueue, membersById]
  );

  const dupWarnings = useMemo(
    () =>
      detectDuplicateInitiations(
        Object.values(membersById).filter((m) => {
          const st = statuses.find((s) => s.member_id === m.id);
          return st?.readiness === "ready" || onLadderIds.has(m.id);
        })
      ),
    [membersById, statuses, onLadderIds]
  );

  // ---------- Mutations ----------

  const assignToOffice = async (positionKey: PositionKey, memberId: string | null, year: number, opts?: { reason?: string; isOverride?: boolean; appointedOn?: string | null }) => {
    if (!user) return;
    const existing = appointments.find((a) => a.position_key === positionKey && a.lodge_year === year);
    const payload = {
      position_key: positionKey,
      member_id: memberId,
      lodge_year: year,
      is_projection: year > currentYear,
      appointed_on:
        opts?.appointedOn !== undefined
          ? opts.appointedOn
          : year === currentYear
            ? new Date().toISOString().slice(0, 10)
            : null,
      override_reason: opts?.isOverride ? opts.reason ?? null : null,
      override_by: opts?.isOverride ? user.id : null,
    };
    let error;
    if (existing) {
      ({ error } = await supabase.from("officer_appointments").update(payload).eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("officer_appointments").insert(payload));
    }
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Appointment saved");
      await load();
    }
  };

  const updateAppointmentDate = async (id: string, appointedOn: string | null) => {
    const { error } = await supabase
      .from("officer_appointments")
      .update({ appointed_on: appointedOn })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Date updated");
      await load();
    }
  };

  const removeAppointment = async (id: string) => {
    const { error } = await supabase.from("officer_appointments").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Removed");
      await load();
    }
  };

  const upsertStatus = async (memberId: string, patch: Partial<StatusRow>) => {
    if (!user) return;
    const existing = statuses.find((s) => s.member_id === memberId);
    const row = {
      member_id: memberId,
      readiness: (patch.readiness ?? existing?.readiness ?? "needs_experience") as Readiness,
      seniority_initiation_date: patch.seniority_initiation_date ?? existing?.seniority_initiation_date ?? null,
      seniority_tiebreaker: patch.seniority_tiebreaker ?? existing?.seniority_tiebreaker ?? null,
      notes: patch.notes ?? existing?.notes ?? null,
      updated_by: user.id,
    };
    const { error } = await supabase.from("member_progression_status").upsert(row, { onConflict: "member_id" });
    if (error) toast.error(error.message);
    else await load();
  };

  const updateMemberInitiation = async (memberId: string, date: string | null) => {
    const { error } = await supabase.from("profiles").update({ initiation_date: date }).eq("id", memberId);
    if (error) toast.error(error.message);
    else {
      toast.success("Initiation date updated");
      await load();
    }
  };

  // ---------- PDF Export ----------

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    doc.setFont("times", "bold");
    doc.setTextColor(27, 42, 74);
    doc.setFontSize(18);
    doc.text("Weybridge Lodge No. 6787", 40, 40);
    doc.setFontSize(13);
    doc.setTextColor(201, 164, 50);
    doc.text("Progressive Officers Projection", 40, 60);
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(`Generated ${new Date().toLocaleDateString("en-GB")} · Prepared by ${profile?.full_name ?? "Secretary"}`, 40, 76);

    const head = [["Office", ...projection.years.map((y) => formatMasonicYear(y))]];
    const body = POSITION_ORDER.map((pos) => {
      const row: string[] = [POSITION_LABELS[pos]];
      for (const y of projection.years) {
        const cell = projection.grid[y][pos];
        const name = cell.member?.full_name ?? "VACANT";
        const tag = cell.isOverride ? `\n(override: ${cell.overrideReason ?? "—"})` : "";
        row.push(`${name}${tag}`);
      }
      return row;
    });

    autoTable(doc, {
      startY: 95,
      head,
      body,
      theme: "grid",
      styles: { font: "times", fontSize: 9, cellPadding: 6, textColor: [30, 30, 30] },
      headStyles: { fillColor: [27, 42, 74], textColor: [201, 164, 50], halign: "center" },
      columnStyles: { 0: { fontStyle: "bold", fillColor: [245, 240, 225] } },
    });

    let y = (doc as any).lastAutoTable.finalY + 20;
    if (projection.warnings.length || dupWarnings.length) {
      doc.setFontSize(11);
      doc.setTextColor(180, 80, 0);
      doc.text("Warnings", 40, y);
      y += 14;
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      const all = [
        ...projection.warnings.map((w) =>
          w.kind === "vacant_feeder"
            ? `Vacant office: ${POSITION_LABELS[w.position]} in ${w.year}`
            : w.kind === "gap"
              ? `Gap in projection: ${POSITION_LABELS[w.position]} in ${w.year}`
              : ""
        ),
        ...dupWarnings.map((w) =>
          w.kind === "duplicate_initiation"
            ? `Shared initiation date ${w.date}: ${w.memberIds.map((id) => membersById[id]?.full_name ?? "—").join(", ")} — set precedence manually.`
            : ""
        ),
      ].filter(Boolean);
      for (const line of all) {
        doc.text(`• ${line}`, 50, y);
        y += 12;
      }
    }

    doc.save(`weybridge-officers-projection-${formatMasonicYear(currentYear)}.pdf`);
  };

  // ---------- UI ----------

  if (loading) {
    return (
      <MembersLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-gold animate-spin" />
        </div>
      </MembersLayout>
    );
  }

  return (
    <MembersLayout>
      <div className="space-y-6">
        <header>
          <h1 className="font-serif text-3xl text-primary-foreground">Progressive Officers Tracker</h1>
          <p className="text-primary-foreground/70 text-sm mt-1">
            Weybridge Lodge No. 6787 · Eight-year progression based on initiation seniority, plus non-progressive offices.
          </p>
        </header>

        {/* Tabs */}
        <nav className="flex gap-1 border-b border-gold/20" aria-label="Tracker views">
          {([
            ["board", "Current Year Board"],
            ["ladder", "Progression Ladder"],
            ["readiness", "Member Readiness"],
          ] as [Tab, string][]).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-4 py-2 text-sm font-sans transition-colors border-b-2 -mb-px ${
                tab === k ? "border-gold text-gold" : "border-transparent text-primary-foreground/60 hover:text-gold"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Warnings strip */}
        {(projection.warnings.length > 0 || dupWarnings.length > 0) && tab !== "readiness" && (
          <div className="bg-amber-500/10 border border-amber-500/40 rounded-sm p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
              <AlertTriangle className="w-4 h-4" /> {projection.warnings.length + dupWarnings.length} warning(s)
            </div>
            <ul className="text-xs text-primary-foreground/75 space-y-1 pl-6 list-disc">
              {projection.warnings.slice(0, 6).map((w, i) => (
                <li key={i}>
                  {w.kind === "vacant_feeder" && `Vacant office: ${POSITION_LABELS[w.position]} in ${w.year}`}
                  {w.kind === "gap" && `Gap in projection: ${POSITION_LABELS[w.position]} in ${w.year}`}
                </li>
              ))}
              {dupWarnings.map((w, i) =>
                w.kind === "duplicate_initiation" ? (
                  <li key={`d${i}`}>
                    Shared initiation date {w.date}:{" "}
                    {w.memberIds.map((id) => membersById[id]?.full_name ?? "—").join(", ")} — set precedence manually in
                    Readiness panel.
                  </li>
                ) : null
              )}
            </ul>
          </div>
        )}

        {tab === "board" && (
          <>
            <BoardView
              projection={projection.grid[currentYear]}
              year={currentYear}
              members={members}
              appointments={appointments}
              onAssign={(pos, mid) => assignToOffice(pos, mid, currentYear)}
              onClear={(id) => removeAppointment(id)}
            />
            <NonProgressiveBoard
              year={currentYear}
              members={members}
              appointments={appointments}
              onAssign={(pos, mid, appointedOn) =>
                assignToOffice(pos as unknown as PositionKey, mid, currentYear, { appointedOn })
              }
              onClear={(id) => removeAppointment(id)}
              onUpdateDate={(id, appointedOn) => updateAppointmentDate(id, appointedOn)}
            />
          </>
        )}

        {tab === "ladder" && (
          <>
            <LadderView
              years={projection.years}
              grid={projection.grid}
              members={members}
              appointments={appointments}
              currentYear={currentYear}
              onOverride={(pos, mid, year, reason) =>
                assignToOffice(pos, mid, year, { isOverride: true, reason })
              }
              onClearOverride={(pos, year) => {
                const ex = appointments.find((a) => a.position_key === pos && a.lodge_year === year);
                if (ex) removeAppointment(ex.id);
              }}
              onExport={exportPdf}
            />
            <NonProgressiveBoard
              year={currentYear}
              members={members}
              appointments={appointments}
              onAssign={(pos, mid, appointedOn) =>
                assignToOffice(pos as unknown as PositionKey, mid, currentYear, { appointedOn })
              }
              onClear={(id) => removeAppointment(id)}
              onUpdateDate={(id, appointedOn) => updateAppointmentDate(id, appointedOn)}
            />
          </>
        )}

        {tab === "readiness" && (
          <ReadinessView
            members={members}
            statuses={statuses}
            onLadderIds={onLadderIds}
            membersById={membersById}
            onSetReadiness={(mid, r) => upsertStatus(mid, { readiness: r })}
            onSetSeniorityDate={(mid, d) => upsertStatus(mid, { seniority_initiation_date: d })}
            onSetTiebreaker={(mid, n) => upsertStatus(mid, { seniority_tiebreaker: n })}
            onSetInitiation={(mid, d) => updateMemberInitiation(mid, d)}
            onPromote={(mid) => {
              // promote to next Inner Guard slot for currentYear
              assignToOffice("inner_guard", mid, currentYear);
            }}
          />
        )}
      </div>
    </MembersLayout>
  );
}

// ============= Sub-views =============

function BoardView({
  projection,
  year,
  members,
  appointments,
  onAssign,
  onClear,
}: {
  projection: Record<PositionKey, any>;
  year: number;
  members: ProfileRow[];
  appointments: AppointmentRow[];
  onAssign: (pos: PositionKey, memberId: string | null) => void;
  onClear: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...POSITION_ORDER].reverse().map((pos) => {
        const cell = projection[pos];
        const appt = appointments.find((a) => a.position_key === pos && a.lodge_year === year);
        const vacant = !cell.member;
        return (
          <div
            key={pos}
            className={`rounded-sm border p-4 ${
              vacant
                ? "border-amber-500/60 bg-amber-500/5"
                : "border-gold/30 bg-navy-light/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gold/80">{vacant ? "Vacant" : "Officer"}</p>
                <h3 className="font-serif text-lg text-primary-foreground flex items-center gap-2">
                  {pos === "worshipful_master" && <Crown className="w-4 h-4 text-gold" />}
                  {POSITION_LABELS[pos]}
                </h3>
              </div>
              {!vacant && appt && (
                <button
                  onClick={() => onClear(appt.id)}
                  className="text-primary-foreground/40 hover:text-amber-300"
                  title="Clear appointment"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="font-sans text-primary-foreground mt-3 text-base font-medium">
              {cell.member?.full_name ?? "— vacant —"}
            </p>
            {appt && (
              <p className="text-xs text-primary-foreground/60 mt-1">
                Appointed {appt.appointed_on ?? "—"}
              </p>
            )}
            <div className="mt-3">
              <label className="text-[10px] uppercase tracking-wider text-primary-foreground/60">
                Assign holder
              </label>
              <select
                value={cell.member?.id ?? ""}
                onChange={(e) => onAssign(pos, e.target.value || null)}
                className="mt-1 w-full bg-navy-dark border border-gold/20 text-primary-foreground rounded-sm px-2 py-1.5 text-sm"
              >
                <option value="">— select member —</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name ?? m.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LadderView({
  years,
  grid,
  members,
  appointments,
  currentYear,
  onOverride,
  onClearOverride,
  onExport,
}: {
  years: number[];
  grid: Record<number, Record<PositionKey, any>>;
  members: ProfileRow[];
  appointments: AppointmentRow[];
  currentYear: number;
  onOverride: (pos: PositionKey, memberId: string | null, year: number, reason: string) => void;
  onClearOverride: (pos: PositionKey, year: number) => void;
  onExport: () => void;
}) {
  const [editing, setEditing] = useState<{ pos: PositionKey; year: number } | null>(null);
  const [editMember, setEditMember] = useState<string>("");
  const [editReason, setEditReason] = useState("");

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-primary-foreground/70">
          Future years (
          <span className="text-gold">projection</span>) advance every officer one rung; the Inner Guard slot is filled
          from the seniority queue of <em>Ready</em> members.
        </p>
        <button
          onClick={onExport}
          className="flex items-center gap-2 text-xs uppercase tracking-wider text-gold border border-gold/40 px-3 py-2 rounded-sm hover:bg-gold/10"
        >
          <Download className="w-3.5 h-3.5" /> Export PDF
        </button>
      </div>

      <div className="overflow-x-auto border border-gold/20 rounded-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-navy-dark/70">
            <tr>
              <th className="px-3 py-2 text-left font-serif text-gold border-b border-gold/20">Office</th>
              {years.map((y) => (
                <th
                  key={y}
                  className={`px-3 py-2 text-left font-serif border-b border-gold/20 ${
                    y === currentYear ? "text-gold" : "text-primary-foreground/80"
                  }`}
                >
                  {formatMasonicYear(y)}
                  {y === currentYear && (
                    <span className="ml-1 text-[10px] uppercase">(current)</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...POSITION_ORDER].reverse().map((pos) => (
              <tr key={pos} className="hover:bg-navy-light/20">
                <td className="px-3 py-2 font-serif text-primary-foreground border-b border-gold/10 whitespace-nowrap">
                  {POSITION_LABELS[pos]}
                </td>
                {years.map((y) => {
                  const cell = grid[y][pos];
                  const appt = appointments.find((a) => a.position_key === pos && a.lodge_year === y);
                  const isOverride = cell.isOverride;
                  return (
                    <td
                      key={y}
                      className={`px-3 py-2 border-b border-gold/10 align-top ${
                        !cell.member ? "bg-amber-500/5" : ""
                      }`}
                    >
                      <button
                        onClick={() => {
                          setEditing({ pos, year: y });
                          setEditMember(cell.member?.id ?? "");
                          setEditReason(cell.overrideReason ?? "");
                        }}
                        className="text-left w-full hover:text-gold transition-colors"
                      >
                        <span className="block text-primary-foreground text-sm">
                          {cell.member?.full_name ?? <span className="text-amber-300">— vacant —</span>}
                        </span>
                        {isOverride && (
                          <span className="text-[10px] text-gold flex items-center gap-1 mt-0.5">
                            <Lock className="w-3 h-3" /> override
                          </span>
                        )}
                        {isOverride && cell.overrideReason && (
                          <span className="block text-[10px] text-primary-foreground/55">
                            {cell.overrideReason} · {cell.overrideBy}
                          </span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-navy-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-navy border border-gold/30 rounded-sm p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-serif text-lg text-primary-foreground">
                  {POSITION_LABELS[editing.pos]} · {formatMasonicYear(editing.year)}
                </h3>
                <p className="text-xs text-primary-foreground/60">
                  {editing.year === currentYear
                    ? "Change the current holder."
                    : "Set a manual override (a brother taking a year out, declining progression, etc.)."}
                </p>
              </div>
              <button onClick={() => setEditing(null)} className="text-primary-foreground/50 hover:text-gold">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-gold">Member</label>
              <select
                value={editMember}
                onChange={(e) => setEditMember(e.target.value)}
                className="w-full bg-navy-dark border border-gold/20 text-primary-foreground rounded-sm px-2 py-1.5 text-sm"
              >
                <option value="">— vacant —</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name ?? m.email}
                  </option>
                ))}
              </select>
            </div>

            {editing.year !== currentYear && (
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider text-gold">Override reason</label>
                <input
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="e.g. Taking a year out for work"
                  className="w-full bg-navy-dark border border-gold/20 text-primary-foreground rounded-sm px-2 py-1.5 text-sm"
                />
              </div>
            )}

            <div className="flex justify-between gap-2 pt-2">
              <button
                onClick={() => {
                  onClearOverride(editing.pos, editing.year);
                  setEditing(null);
                }}
                className="text-xs text-amber-300 hover:underline"
              >
                Clear / reset to projected
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(null)}
                  className="text-xs text-primary-foreground/60 px-3 py-1.5"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onOverride(editing.pos, editMember || null, editing.year, editReason);
                    setEditing(null);
                  }}
                  className="text-xs bg-gold text-navy font-semibold px-3 py-1.5 rounded-sm hover:bg-gold/90"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReadinessView({
  members,
  statuses,
  onLadderIds,
  membersById,
  onSetReadiness,
  onSetSeniorityDate,
  onSetTiebreaker,
  onSetInitiation,
  onPromote,
}: {
  members: ProfileRow[];
  statuses: StatusRow[];
  onLadderIds: Set<string>;
  membersById: Record<string, MemberLite>;
  onSetReadiness: (mid: string, r: Readiness) => void;
  onSetSeniorityDate: (mid: string, d: string | null) => void;
  onSetTiebreaker: (mid: string, n: number | null) => void;
  onSetInitiation: (mid: string, d: string | null) => void;
  onPromote: (mid: string) => void;
}) {
  // Members NOT currently on ladder, sorted by effective initiation date oldest first
  const eligible = useMemo(() => {
    const off = members.filter((m) => !onLadderIds.has(m.id));
    const lite = off.map((m) => membersById[m.id]).filter(Boolean) as MemberLite[];
    const sorted = sortBySeniority(lite);
    return sorted.map((l) => members.find((m) => m.id === l.id)!).filter(Boolean);
  }, [members, onLadderIds, membersById]);

  const statusByMember = new Map(statuses.map((s) => [s.member_id, s]));

  const yearsOfMembership = (joined: number | null, initDate: string | null) => {
    if (initDate) return Math.max(0, new Date().getFullYear() - new Date(initDate).getFullYear());
    if (joined) return Math.max(0, new Date().getFullYear() - joined);
    return "—";
  };

  return (
    <div className="space-y-4">
      <div className="bg-navy-light/30 border border-gold/15 rounded-sm p-4 text-xs text-primary-foreground/70">
        Members are sorted strictly by Initiation date — oldest first. The brother initiated earliest has seniority and
        is next in line. Set an Initiation date for any joining member whose Initiation was in another lodge.
      </div>

      <div className="overflow-x-auto border border-gold/20 rounded-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-navy-dark/70 text-gold font-serif">
            <tr>
              <th className="px-3 py-2 text-left border-b border-gold/20">Name</th>
              <th className="px-3 py-2 text-left border-b border-gold/20">Initiation date</th>
              <th className="px-3 py-2 text-left border-b border-gold/20">Years</th>
              <th className="px-3 py-2 text-left border-b border-gold/20">Rank</th>
              <th className="px-3 py-2 text-left border-b border-gold/20">Readiness</th>
              <th className="px-3 py-2 text-left border-b border-gold/20">Seniority override</th>
              <th className="px-3 py-2 text-left border-b border-gold/20">Tie</th>
              <th className="px-3 py-2 text-left border-b border-gold/20">Action</th>
            </tr>
          </thead>
          <tbody>
            {eligible.map((m) => {
              const st = statusByMember.get(m.id);
              const readiness: Readiness = (st?.readiness ?? "needs_experience") as Readiness;
              return (
                <tr key={m.id} className="hover:bg-navy-light/20">
                  <td className="px-3 py-2 border-b border-gold/10 text-primary-foreground">
                    {m.full_name ?? m.email}
                  </td>
                  <td className="px-3 py-2 border-b border-gold/10">
                    <input
                      type="date"
                      defaultValue={m.initiation_date ?? ""}
                      onBlur={(e) => {
                        const v = e.target.value || null;
                        if (v !== m.initiation_date) onSetInitiation(m.id, v);
                      }}
                      className="bg-navy-dark border border-gold/20 text-primary-foreground rounded-sm px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="px-3 py-2 border-b border-gold/10 text-primary-foreground/80 text-xs">
                    {yearsOfMembership(m.joined_year, m.initiation_date)}
                  </td>
                  <td className="px-3 py-2 border-b border-gold/10 text-primary-foreground/80 text-xs">
                    {m.rank ?? "—"}
                  </td>
                  <td className="px-3 py-2 border-b border-gold/10">
                    <select
                      value={readiness}
                      onChange={(e) => onSetReadiness(m.id, e.target.value as Readiness)}
                      className={`text-xs rounded-sm px-2 py-1 border ${
                        readiness === "ready"
                          ? "bg-gold/15 border-gold/40 text-gold"
                          : readiness === "non_progressive"
                            ? "bg-primary-foreground/5 border-primary-foreground/20 text-primary-foreground/60"
                            : "bg-navy-dark border-gold/20 text-primary-foreground"
                      }`}
                    >
                      <option value="ready">{READINESS_LABEL.ready}</option>
                      <option value="needs_experience">{READINESS_LABEL.needs_experience}</option>
                      <option value="non_progressive">{READINESS_LABEL.non_progressive}</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 border-b border-gold/10">
                    <input
                      type="date"
                      defaultValue={st?.seniority_initiation_date ?? ""}
                      onBlur={(e) => {
                        const v = e.target.value || null;
                        if (v !== (st?.seniority_initiation_date ?? null)) onSetSeniorityDate(m.id, v);
                      }}
                      title="Seniority override (e.g. joining member initiated in another lodge)"
                      className="bg-navy-dark border border-gold/20 text-primary-foreground rounded-sm px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="px-3 py-2 border-b border-gold/10">
                    <input
                      type="number"
                      defaultValue={st?.seniority_tiebreaker ?? ""}
                      onBlur={(e) => {
                        const v = e.target.value ? Number(e.target.value) : null;
                        if (v !== (st?.seniority_tiebreaker ?? null)) onSetTiebreaker(m.id, v);
                      }}
                      className="w-14 bg-navy-dark border border-gold/20 text-primary-foreground rounded-sm px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="px-3 py-2 border-b border-gold/10">
                    {readiness === "ready" ? (
                      <button
                        onClick={() => onPromote(m.id)}
                        className="text-[11px] flex items-center gap-1 text-gold border border-gold/40 px-2 py-1 rounded-sm hover:bg-gold/10"
                      >
                        <UserPlus className="w-3 h-3" /> Promote to Inner Guard
                      </button>
                    ) : (
                      <span className="text-[11px] text-primary-foreground/40 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" /> Tag as Ready first
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {eligible.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-primary-foreground/50 text-sm">
                  All active members are currently on the progression ladder.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============= Non-progressive offices board =============

function NonProgressiveBoard({
  year,
  members,
  appointments,
  onAssign,
  onClear,
  onUpdateDate,
}: {
  year: number;
  members: ProfileRow[];
  appointments: AppointmentRow[];
  onAssign: (pos: NonProgressiveKey, memberId: string | null, appointedOn: string | null) => void;
  onClear: (id: string) => void;
  onUpdateDate: (id: string, appointedOn: string | null) => void;
}) {
  // For each non-progressive office, find the most recent appointment (any year)
  // so we can show who currently holds it and when they first did.
  const holderFor = (pos: NonProgressiveKey) => {
    const all = appointments
      .filter((a) => (a.position_key as string) === pos && a.member_id)
      .sort((a, b) => (b.lodge_year ?? 0) - (a.lodge_year ?? 0));
    return all[0];
  };

  // Earliest appointed_on across all years for the same (position, member)
  const firstHeld = (pos: NonProgressiveKey, memberId: string) => {
    const dates = appointments
      .filter((a) => (a.position_key as string) === pos && a.member_id === memberId && a.appointed_on)
      .map((a) => a.appointed_on as string)
      .sort();
    return dates[0] ?? null;
  };

  return (
    <section className="mt-10">
      <header className="mb-4">
        <h2 className="font-serif text-2xl text-gold">Non-Progressive Offices</h2>
        <p className="text-xs text-primary-foreground/60 mt-1">
          Appointed annually outside the ladder. The “First held” date shows tenure so you
          can see who has served longest, in case it’s time to give another brother a chance.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {NON_PROGRESSIVE_ORDER.map((pos) => {
          const appt = holderFor(pos);
          const memberId = appt?.member_id ?? "";
          const memberName = memberId
            ? members.find((m) => m.id === memberId)?.full_name ?? "—"
            : "— vacant —";
          const since = memberId ? firstHeld(pos, memberId) ?? appt?.appointed_on ?? null : null;
          const vacant = !memberId;

          return (
            <div
              key={pos}
              className={`rounded-sm border p-4 ${
                vacant ? "border-amber-500/40 bg-amber-500/5" : "border-gold/20 bg-navy-light/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gold/70">
                    {vacant ? "Vacant" : "Officer"}
                  </p>
                  <h3 className="font-serif text-base text-primary-foreground">
                    {NON_PROGRESSIVE_LABELS[pos]}
                  </h3>
                </div>
                {!vacant && appt && (
                  <button
                    onClick={() => onClear(appt.id)}
                    className="text-primary-foreground/40 hover:text-amber-300"
                    title="Clear appointment"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <p className="font-sans text-primary-foreground mt-3 text-sm font-medium">
                {memberName}
              </p>

              {!vacant && (
                <p className="text-[11px] text-primary-foreground/60 mt-1">
                  First held: <span className="text-gold">{since ?? "—"}</span>
                  {since && <span className="ml-1">· {tenureSince(since)}</span>}
                </p>
              )}

              <div className="mt-3 space-y-2">
                <label className="block text-[10px] uppercase tracking-wider text-primary-foreground/60">
                  Holder
                </label>
                <select
                  value={memberId}
                  onChange={(e) => onAssign(pos, e.target.value || null, since)}
                  className="w-full bg-navy-dark border border-gold/20 text-primary-foreground rounded-sm px-2 py-1.5 text-sm"
                >
                  <option value="">— select member —</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name ?? m.email}
                    </option>
                  ))}
                </select>

                {!vacant && appt && (
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-primary-foreground/60 mb-1">
                      Date first held this post
                    </label>
                    <input
                      type="date"
                      defaultValue={appt.appointed_on ?? ""}
                      onBlur={(e) => {
                        const v = e.target.value || null;
                        if (v !== (appt.appointed_on ?? null)) onUpdateDate(appt.id, v);
                      }}
                      className="w-full bg-navy-dark border border-gold/20 text-primary-foreground rounded-sm px-2 py-1.5 text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
