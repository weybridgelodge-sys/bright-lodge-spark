import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, CalendarClock, HeartHandshake, Plus, ShieldAlert, X } from "lucide-react";

// ============ Types ============
type WelfareStatus = "green" | "amber" | "red";
type ContactType = "in_person" | "phone" | "card" | "email" | "lodge_visit" | "none";
type ContactNature = "routine" | "illness" | "bereavement" | "financial" | "mental_health" | "hospitalisation" | "other";

const STATUS_LABEL: Record<WelfareStatus, string> = {
  red: "Needs urgent attention",
  amber: "Needs monitoring",
  green: "Fine",
};
const STATUS_RANK: Record<WelfareStatus, number> = { red: 0, amber: 1, green: 2 };
const STATUS_DOT: Record<WelfareStatus, string> = {
  red: "bg-red-500",
  amber: "bg-amber-400",
  green: "bg-emerald-500",
};

const CONTACT_TYPE_LABEL: Record<ContactType, string> = {
  in_person: "In person",
  phone: "Phone call",
  card: "Card sent",
  email: "Email",
  lodge_visit: "Lodge visit",
  none: "No contact attempted",
};
const NATURE_LABEL: Record<ContactNature, string> = {
  routine: "Routine check-in",
  illness: "Illness",
  bereavement: "Bereavement",
  financial: "Financial concern",
  mental_health: "Mental health",
  hospitalisation: "Hospitalisation",
  other: "Other",
};

type MemberRow = {
  id: string;
  full_name: string | null;
  preferred_name: string | null;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  date_of_birth: string | null;
  initiation_date: string | null;
  joined_lodge_date: string | null;
  joined_year: number | null;
};

type StatusRow = { member_id: string; status: WelfareStatus; updated_at: string };

type LogRow = {
  id: string;
  member_id: string;
  contact_date: string;
  contact_type: ContactType;
  contact_nature: ContactNature;
  nature_detail: string | null;
  notes: string | null;
  action_taken: string | null;
  follow_up_date: string | null;
  logged_by: string | null;
  created_at: string;
};

// ============ Helpers ============
const displayName = (m: MemberRow) =>
  m.preferred_name?.trim() ||
  m.full_name?.trim() ||
  [m.title, m.first_name, m.last_name].filter(Boolean).join(" ").trim() ||
  "Unnamed member";

const ageFrom = (dob: string | null) => {
  if (!dob) return null;
  const d = new Date(dob); if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
};

const yearsMember = (m: MemberRow) => {
  const seed = m.initiation_date || m.joined_lodge_date || (m.joined_year ? `${m.joined_year}-01-01` : null);
  if (!seed) return null;
  const d = new Date(seed); if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, new Date().getFullYear() - d.getFullYear());
};

const fmtDate = (s: string | null) => s ? new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const daysAgo = (s: string | null) => {
  if (!s) return null;
  const ms = Date.now() - new Date(s).getTime();
  return Math.floor(ms / 86_400_000);
};

// ============ Page ============
export default function AlmonerPortal() {
  const { canAccessAlmoner, loading } = useAuth();
  const [acknowledged, setAcknowledged] = useState(() => sessionStorage.getItem("almoner-confidentiality") === "1");

  if (loading) return null;
  if (!canAccessAlmoner) return <Navigate to="/members" replace />;

  return (
    <MembersLayout>
      <header className="mb-6 flex items-start gap-3">
        <div className="p-2.5 bg-gold/10 border border-gold/30 rounded">
          <HeartHandshake className="w-6 h-6 text-gold" />
        </div>
        <div>
          <h1 className="font-serif text-2xl text-primary-foreground">Almoner Portal</h1>
          <p className="text-sm text-primary-foreground/60">Confidential member welfare records</p>
        </div>
      </header>

      {!acknowledged && (
        <ConfidentialityNotice onAcknowledge={() => {
          sessionStorage.setItem("almoner-confidentiality", "1");
          setAcknowledged(true);
        }} />
      )}

      {acknowledged && <PortalBody />}
    </MembersLayout>
  );
}

function ConfidentialityNotice({ onAcknowledge }: { onAcknowledge: () => void }) {
  return (
    <div className="bg-navy-light/40 border border-gold/30 rounded p-6">
      <div className="flex items-start gap-3">
        <ShieldAlert className="w-6 h-6 text-gold shrink-0 mt-0.5" />
        <div>
          <h2 className="font-serif text-lg text-primary-foreground mb-2">Confidential records</h2>
          <p className="text-sm text-primary-foreground/80 leading-relaxed mb-4">
            Welfare records are strictly confidential. This information is visible only to the Almoner and Worshipful
            Master and will never be shared with other lodge members or third parties.
          </p>
          <Button className="bg-gold text-navy hover:bg-gold/90" onClick={onAcknowledge}>
            I understand — continue
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============ Body: board + record split-view ============
function PortalBody() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [statuses, setStatuses] = useState<Record<string, StatusRow>>({});
  const [lastContactByMember, setLastContactByMember] = useState<Record<string, string>>({});
  const [openFollowUps, setOpenFollowUps] = useState<Record<string, string>>({});
  const [absentFlags, setAbsentFlags] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadAll = async () => {
    const [{ data: ms }, { data: st }, { data: lgs }, { data: meetings }] = await Promise.all([
      supabase.from("profiles")
        .select("id,full_name,preferred_name,first_name,last_name,title,date_of_birth,initiation_date,joined_lodge_date,joined_year,status")
        .eq("status", "active"),
      supabase.from("welfare_member_status").select("member_id,status,updated_at"),
      supabase.from("welfare_log_entries")
        .select("id,member_id,contact_date,follow_up_date,created_at")
        .is("deleted_at", null)
        .order("contact_date", { ascending: false }),
      supabase.from("festive_board_meetings")
        .select("id,meeting_date")
        .lte("meeting_date", new Date().toISOString().slice(0, 10))
        .order("meeting_date", { ascending: false })
        .limit(2),
    ]);

    setMembers((ms as MemberRow[]) ?? []);
    const sMap: Record<string, StatusRow> = {};
    (st as StatusRow[] ?? []).forEach((r) => { sMap[r.member_id] = r; });
    setStatuses(sMap);

    // Last contact per member: from logs ordered desc, first row per member_id wins
    const last: Record<string, string> = {};
    const followUp: Record<string, string> = {}; // earliest open follow_up per member
    (lgs as any[] ?? []).forEach((l) => {
      if (!last[l.member_id]) last[l.member_id] = l.contact_date;
      if (l.follow_up_date) {
        const existing = followUp[l.member_id];
        if (!existing || l.follow_up_date < existing) followUp[l.member_id] = l.follow_up_date;
      }
    });
    setLastContactByMember(last);

    // Overdue follow-up if follow_up_date < today AND no new log after that date
    const today = new Date().toISOString().slice(0, 10);
    const overdue: Record<string, string> = {};
    Object.entries(followUp).forEach(([mid, dt]) => {
      if (dt < today) {
        const newest = last[mid];
        if (!newest || newest <= dt) overdue[mid] = dt;
      }
    });
    setOpenFollowUps(overdue);

    // Absence: missed last 2 meetings (no attending row)
    const meetingIds = ((meetings as any[]) ?? []).map((m) => m.id);
    if (meetingIds.length >= 2) {
      const { data: att } = await supabase.from("festive_board_attendance")
        .select("member_id,meeting_id,attendance_status")
        .in("meeting_id", meetingIds);
      const present = new Map<string, Set<string>>();
      ((att as any[]) ?? []).forEach((a) => {
        if (a.attendance_status === "attending" && a.member_id) {
          if (!present.has(a.member_id)) present.set(a.member_id, new Set());
          present.get(a.member_id)!.add(a.meeting_id);
        }
      });
      const flags: Record<string, boolean> = {};
      (ms as any[] ?? []).forEach((m) => {
        const s = present.get(m.id) ?? new Set();
        // Absent from both = missed two consecutive
        if (!s.has(meetingIds[0]) && !s.has(meetingIds[1])) flags[m.id] = true;
      });
      setAbsentFlags(flags);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const sorted = useMemo(() => {
    return [...members].sort((a, b) => {
      const sa = statuses[a.id]?.status ?? "green";
      const sb = statuses[b.id]?.status ?? "green";
      if (STATUS_RANK[sa] !== STATUS_RANK[sb]) return STATUS_RANK[sa] - STATUS_RANK[sb];
      const ca = lastContactByMember[a.id] ?? "0000-00-00";
      const cb = lastContactByMember[b.id] ?? "0000-00-00";
      return ca.localeCompare(cb); // oldest first
    });
  }, [members, statuses, lastContactByMember]);

  if (selectedId) {
    const member = members.find((m) => m.id === selectedId);
    if (!member) return null;
    return (
      <MemberRecord
        member={member}
        currentStatus={statuses[selectedId]?.status ?? "green"}
        onBack={() => { setSelectedId(null); loadAll(); }}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-serif text-xl text-primary-foreground">Member Welfare Board</h2>
        <p className="text-xs text-primary-foreground/50">{sorted.length} active members</p>
      </div>
      {sorted.length === 0 ? (
        <p className="text-sm text-primary-foreground/60">No active members.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sorted.map((m) => {
            const s: WelfareStatus = statuses[m.id]?.status ?? "green";
            const last = lastContactByMember[m.id] ?? null;
            const lastDays = daysAgo(last);
            return (
              <button
                key={m.id}
                onClick={() => setSelectedId(m.id)}
                className="text-left bg-navy-light/40 border border-gold/20 hover:border-gold/50 rounded p-4 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-serif text-base text-primary-foreground leading-tight">{displayName(m)}</p>
                    <p className="text-[11px] text-primary-foreground/50 mt-0.5">
                      {ageFrom(m.date_of_birth) != null ? `Age ${ageFrom(m.date_of_birth)}` : "Age —"}
                      {" · "}
                      {yearsMember(m) != null ? `${yearsMember(m)} yrs member` : "—"}
                    </p>
                  </div>
                  <span className={`w-3 h-3 rounded-full ${STATUS_DOT[s]} shrink-0 mt-1`} title={STATUS_LABEL[s]} />
                </div>
                <div className="text-[11px] text-primary-foreground/70 space-y-1">
                  <div>
                    Last contact: <span className="text-primary-foreground">{last ? fmtDate(last) : "Never"}</span>
                    {lastDays != null && <span className="text-primary-foreground/40"> · {lastDays}d ago</span>}
                  </div>
                  <div className="flex gap-1.5 flex-wrap pt-1">
                    {absentFlags[m.id] && (
                      <Badge variant="outline" className="border-amber-400/50 text-amber-400 text-[10px] px-1.5 py-0">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Missed 2 meetings
                      </Badge>
                    )}
                    {openFollowUps[m.id] && (
                      <Badge variant="outline" className="border-red-500/50 text-red-400 text-[10px] px-1.5 py-0">
                        <CalendarClock className="w-3 h-3 mr-1" /> Follow-up overdue
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============ Individual Member Record ============
function MemberRecord({ member, currentStatus, onBack }: {
  member: MemberRow;
  currentStatus: WelfareStatus;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [status, setStatus] = useState<WelfareStatus>(currentStatus);
  const [statusNote, setStatusNote] = useState("");
  const [showForm, setShowForm] = useState(false);

  const loadLogs = async () => {
    const { data } = await supabase
      .from("welfare_log_entries")
      .select("*")
      .eq("member_id", member.id)
      .is("deleted_at", null)
      .order("contact_date", { ascending: false })
      .order("created_at", { ascending: false });
    setLogs((data as LogRow[]) ?? []);
  };

  const loadStatus = async () => {
    const { data } = await supabase
      .from("welfare_member_status")
      .select("status,notes")
      .eq("member_id", member.id)
      .maybeSingle();
    if (data) {
      setStatus(data.status as WelfareStatus);
      setStatusNote(data.notes ?? "");
    }
  };

  useEffect(() => { loadLogs(); loadStatus(); }, [member.id]);

  const saveStatus = async (next: WelfareStatus, noteOverride?: string) => {
    const payload = {
      member_id: member.id,
      status: next,
      notes: noteOverride ?? statusNote,
      updated_by: user?.id ?? null,
    };
    const { error } = await supabase.from("welfare_member_status").upsert(payload, { onConflict: "member_id" });
    if (error) { toast.error(error.message); return; }
    setStatus(next);
    toast.success("Welfare status updated");
  };

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gold hover:text-gold/80 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Welfare Board
      </button>

      <div className="bg-navy-light/40 border border-gold/20 rounded p-5 mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-serif text-2xl text-primary-foreground">{displayName(member)}</h2>
            <p className="text-xs text-primary-foreground/60 mt-1">
              {ageFrom(member.date_of_birth) != null ? `Age ${ageFrom(member.date_of_birth)}` : "Age —"}
              {" · "}
              {yearsMember(member) != null ? `${yearsMember(member)} years a member` : "—"}
              {member.initiation_date && ` · Initiated ${fmtDate(member.initiation_date)}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs uppercase tracking-wider text-primary-foreground/60">Status</Label>
            <Select value={status} onValueChange={(v) => saveStatus(v as WelfareStatus)}>
              <SelectTrigger className="w-[200px] bg-navy text-primary-foreground border-gold/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="green">🟢 Green — {STATUS_LABEL.green}</SelectItem>
                <SelectItem value="amber">🟡 Amber — {STATUS_LABEL.amber}</SelectItem>
                <SelectItem value="red">🔴 Red — {STATUS_LABEL.red}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-serif text-lg text-primary-foreground">Welfare Log</h3>
        <Button size="sm" className="bg-gold text-navy hover:bg-gold/90" onClick={() => setShowForm((v) => !v)}>
          {showForm ? <><X className="w-4 h-4 mr-1" /> Cancel</> : <><Plus className="w-4 h-4 mr-1" /> New log entry</>}
        </Button>
      </div>

      {showForm && (
        <NewLogEntryForm
          memberId={member.id}
          loggedBy={user?.id ?? null}
          onSaved={() => { setShowForm(false); loadLogs(); }}
        />
      )}

      {logs.length === 0 ? (
        <p className="text-sm text-primary-foreground/60 italic">No log entries yet.</p>
      ) : (
        <div className="space-y-3">
          {logs.map((l) => (
            <article key={l.id} className="bg-navy-light/40 border border-gold/15 rounded p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                <div>
                  <p className="text-sm font-semibold text-primary-foreground">{fmtDate(l.contact_date)}</p>
                  <p className="text-[11px] text-primary-foreground/60 mt-0.5">
                    {CONTACT_TYPE_LABEL[l.contact_type]} · {NATURE_LABEL[l.contact_nature]}
                    {l.nature_detail && ` (${l.nature_detail})`}
                  </p>
                </div>
                {l.follow_up_date && (
                  <Badge variant="outline" className="border-gold/40 text-gold text-[10px]">
                    <CalendarClock className="w-3 h-3 mr-1" /> Follow-up {fmtDate(l.follow_up_date)}
                  </Badge>
                )}
              </div>
              {l.notes && <p className="text-sm text-primary-foreground/85 whitespace-pre-wrap mb-2">{l.notes}</p>}
              {l.action_taken && (
                <p className="text-xs text-primary-foreground/70">
                  <span className="uppercase tracking-wider text-primary-foreground/50 mr-1">Action:</span>
                  {l.action_taken}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function NewLogEntryForm({ memberId, loggedBy, onSaved }: {
  memberId: string;
  loggedBy: string | null;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [contactDate, setContactDate] = useState(today);
  const [contactType, setContactType] = useState<ContactType>("phone");
  const [contactNature, setContactNature] = useState<ContactNature>("routine");
  const [natureDetail, setNatureDetail] = useState("");
  const [notes, setNotes] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedBy) { toast.error("Not signed in"); return; }
    setBusy(true);
    const { error } = await supabase.from("welfare_log_entries").insert({
      member_id: memberId,
      contact_date: contactDate,
      contact_type: contactType,
      contact_nature: contactNature,
      nature_detail: contactNature === "other" ? (natureDetail.trim() || null) : null,
      notes: notes.trim() || null,
      action_taken: actionTaken.trim() || null,
      follow_up_date: followUp || null,
      logged_by: loggedBy,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Log entry saved");
    onSaved();
  };

  const inputCls = "bg-navy text-primary-foreground border-gold/30";

  return (
    <form onSubmit={submit} className="bg-navy-light/60 border border-gold/30 rounded p-4 mb-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Date of contact</Label>
          <Input type="date" value={contactDate} onChange={(e) => setContactDate(e.target.value)} className={inputCls} required />
        </div>
        <div>
          <Label className="text-xs">Type</Label>
          <Select value={contactType} onValueChange={(v) => setContactType(v as ContactType)}>
            <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(CONTACT_TYPE_LABEL) as ContactType[]).map((k) => (
                <SelectItem key={k} value={k}>{CONTACT_TYPE_LABEL[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Nature</Label>
          <Select value={contactNature} onValueChange={(v) => setContactNature(v as ContactNature)}>
            <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(NATURE_LABEL) as ContactNature[]).map((k) => (
                <SelectItem key={k} value={k}>{NATURE_LABEL[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {contactNature === "other" && (
        <div>
          <Label className="text-xs">Nature detail</Label>
          <Input value={natureDetail} onChange={(e) => setNatureDetail(e.target.value)} className={inputCls} maxLength={120} />
        </div>
      )}
      <div>
        <Label className="text-xs">Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} rows={3} maxLength={2000} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Action taken</Label>
          <Input value={actionTaken} onChange={(e) => setActionTaken(e.target.value)} className={inputCls} maxLength={300} />
        </div>
        <div>
          <Label className="text-xs">Next follow-up (optional)</Label>
          <Input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} className={inputCls} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="submit" disabled={busy} className="bg-gold text-navy hover:bg-gold/90">
          Save entry
        </Button>
      </div>
    </form>
  );
}
