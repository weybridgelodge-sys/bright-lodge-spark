import { useEffect, useMemo, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatMemberLine } from "@/lib/summons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Plus, Pencil, ChevronRight, Trash2 } from "lucide-react";
import {
  LOI_FOCUS_OPTIONS,
  LOI_PART_OPTIONS,
  LOI_KPI_CATEGORIES,
  type LoiPart,
  focusLabel,
  partLabel,
  kpiCategoryLabel,
  autoKpiCategory,
  masonicYearStart,
} from "@/lib/loi";

type Session = {
  id: string;
  session_date: string;
  focus: string;
  focus_other: string | null;
  kpi_category: string | null;
  notes: string | null;
};

type Attendance = {
  id: string;
  session_id: string;
  member_id: string;
  part: string;
  part_other: string | null;
};

type Member = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  post_nominals: string | null;
  title: string | null;
  is_past_master: boolean | null;
  rank: string | null;
  grand_rank: string | null;
  provincial_rank: string | null;
};

const SINGLE_OFFICE_PARTS: LoiPart[] = [
  "inner_guard",
  "junior_deacon",
  "senior_deacon",
  "junior_warden",
  "senior_warden",
  "worshipful_master",
  "director_of_ceremonies",
  "ipm",
  "chaplain",
];

function memberDisplay(m: Member) {
  return formatMemberLine(m as any) || "Unnamed brother";
}

export default function LoiRegister() {
  const { canManageLOI, user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Session | null>(null);
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    const [s, a, m] = await Promise.all([
      supabase.from("loi_sessions").select("*").order("session_date", { ascending: false }),
      supabase.from("loi_attendance").select("*"),
      supabase
        .from("profiles")
        .select("id,full_name,first_name,middle_name,last_name,preferred_name,post_nominals,title,is_past_master,rank,grand_rank,provincial_rank")
        .eq("status", "active")
        .eq("is_honorary_member", false)
        .order("last_name", { ascending: true }),
    ]);
    setSessions((s.data as Session[]) ?? []);
    setAttendance((a.data as Attendance[]) ?? []);
    setMembers((m.data as Member[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const attendanceBySession = useMemo(() => {
    const map: Record<string, Attendance[]> = {};
    for (const r of attendance) {
      (map[r.session_id] ??= []).push(r);
    }
    return map;
  }, [attendance]);

  // Personal stats
  const myYearAttendance = useMemo(() => {
    if (!user) return [];
    const start = masonicYearStart();
    const cutoff = new Date(start, 9, 1); // Oct 1
    return attendance
      .filter((a) => a.member_id === user.id)
      .map((a) => ({ att: a, sess: sessions.find((s) => s.id === a.session_id) }))
      .filter((x) => x.sess && new Date(x.sess.session_date) >= cutoff)
      .sort((a, b) =>
        (b.sess!.session_date).localeCompare(a.sess!.session_date)
      );
  }, [attendance, sessions, user]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this LOI session and all attendance?")) return;
    const { error } = await supabase.from("loi_sessions").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Session deleted" });
    loadAll();
  };

  return (
    <MembersLayout>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-gold mb-1 flex items-center gap-2">
            <GraduationCap className="w-6 h-6" /> LOI Register
          </h1>
          <p className="text-primary-foreground/60 text-sm">
            Lodge of Instruction sessions, attendance and parts taken.
          </p>
        </div>
        {canManageLOI && (
          <Button
            onClick={() => setCreating(true)}
            className="bg-gold text-navy hover:bg-gold/90"
          >
            <Plus className="w-4 h-4 mr-1" /> New session
          </Button>
        )}
      </div>

      {/* My attendance */}
      <section className="bg-navy-dark/60 border border-gold/15 rounded-sm p-5 mb-6">
        <h2 className="font-serif text-lg text-gold mb-3">My LOI attendance</h2>
        <p className="text-xs text-primary-foreground/60 mb-3">
          Masonic year {masonicYearStart()}–{masonicYearStart() + 1} ·{" "}
          <span className="text-gold font-semibold">{myYearAttendance.length}</span> session
          {myYearAttendance.length === 1 ? "" : "s"} attended
        </p>
        {myYearAttendance.length === 0 ? (
          <p className="text-xs text-primary-foreground/50 italic">
            No attendance recorded yet this Masonic year.
          </p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {myYearAttendance.map(({ att, sess }) => (
              <li
                key={att.id}
                className="flex flex-wrap justify-between gap-2 border-l-2 border-gold/40 pl-3 py-1"
              >
                <span>
                  {new Date(sess!.session_date).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  <span className="text-primary-foreground/60">
                    · {focusLabel(sess!.focus, sess!.focus_other)}
                  </span>
                </span>
                <span className="text-gold text-xs">
                  {partLabel(att.part, att.part_other)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Past sessions */}
      <section className="bg-navy-dark/60 border border-gold/15 rounded-sm p-5">
        <h2 className="font-serif text-lg text-gold mb-3">Past sessions</h2>
        {loading ? (
          <p className="text-xs text-primary-foreground/50">Loading…</p>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-primary-foreground/50 italic">
            No LOI sessions recorded yet.
          </p>
        ) : (
          <ul className="divide-y divide-gold/10">
            {sessions.map((s) => {
              const rows = attendanceBySession[s.id] ?? [];
              const isOpen = expandedId === s.id;
              return (
                <li key={s.id} className="py-3">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : s.id)}
                    className="w-full text-left flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-semibold text-sm">
                        {new Date(s.session_date).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        <span className="text-primary-foreground/60 font-normal">
                          · {focusLabel(s.focus, s.focus_other)}
                        </span>
                      </p>
                      {s.notes && (
                        <p className="text-xs text-primary-foreground/50 mt-0.5 line-clamp-1">
                          {s.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gold">
                        {rows.length} of {members.length} attended
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 text-primary-foreground/40 transition-transform ${
                          isOpen ? "rotate-90" : ""
                        }`}
                      />
                    </div>
                  </button>
                  {isOpen && (
                    <div className="mt-3 pl-3 border-l-2 border-gold/20 space-y-2">
                      {s.kpi_category && (
                        <p className="text-[11px] text-gold/80 uppercase tracking-wider">
                          KPI block: {kpiCategoryLabel(s.kpi_category)}
                        </p>
                      )}
                      {s.notes && (
                        <p className="text-xs text-primary-foreground/70 whitespace-pre-wrap">
                          {s.notes}
                        </p>
                      )}
                      {rows.length === 0 ? (
                        <p className="text-xs italic text-primary-foreground/50">
                          No attendance recorded.
                        </p>
                      ) : (
                        <ul className="text-xs space-y-1">
                          {rows
                            .map((r) => {
                              const m = members.find((x) => x.id === r.member_id);
                              return { r, name: m ? memberDisplay(m) : "Unknown" };
                            })
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(({ r, name }) => (
                              <li
                                key={r.id}
                                className="flex justify-between gap-3 border-b border-gold/5 pb-1"
                              >
                                <span>{name}</span>
                                <span className="text-gold">
                                  {partLabel(r.part, r.part_other)}
                                </span>
                              </li>
                            ))}
                        </ul>
                      )}
                      {canManageLOI && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditing(s)}
                            className="border-gold/40 text-gold hover:bg-gold/10"
                          >
                            <Pencil className="w-3 h-3 mr-1" /> Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(s.id)}
                            className="border-destructive/40 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3 h-3 mr-1" /> Delete
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {(creating || editing) && (
        <SessionDialog
          open
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            loadAll();
          }}
          members={members}
          existing={editing}
          existingAttendance={
            editing ? attendanceBySession[editing.id] ?? [] : []
          }
        />
      )}
    </MembersLayout>
  );
}

// ---------- Create / edit dialog ----------

type Draft = {
  present: boolean;
  part: LoiPart;
  partOther: string;
};

function SessionDialog({
  open,
  onClose,
  onSaved,
  members,
  existing,
  existingAttendance,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  members: Member[];
  existing: Session | null;
  existingAttendance: Attendance[];
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = useState(
    existing?.session_date ?? new Date().toISOString().slice(0, 10)
  );
  const [focus, setFocus] = useState<string>(existing?.focus ?? "general");
  const [focusOther, setFocusOther] = useState(existing?.focus_other ?? "");
  const [kpiCategory, setKpiCategory] = useState<string>(
    existing?.kpi_category ?? ""
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => {
    const initial: Record<string, Draft> = {};
    for (const m of members) {
      const existingRow = existingAttendance.find((a) => a.member_id === m.id);
      initial[m.id] = {
        present: !!existingRow,
        part: (existingRow?.part as LoiPart) ?? "observing",
        partOther: existingRow?.part_other ?? "",
      };
    }
    return initial;
  });

  // Validate single office per session
  const officeConflicts = useMemo(() => {
    const counts: Record<string, string[]> = {};
    Object.entries(drafts).forEach(([mid, d]) => {
      if (!d.present) return;
      if (!SINGLE_OFFICE_PARTS.includes(d.part)) return;
      (counts[d.part] ??= []).push(mid);
    });
    return Object.entries(counts)
      .filter(([, ids]) => ids.length > 1)
      .map(([part]) => part);
  }, [drafts]);

  const presentCount = Object.values(drafts).filter((d) => d.present).length;

  const setDraft = (mid: string, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [mid]: { ...prev[mid], ...patch } }));

  const handleSave = async () => {
    if (officeConflicts.length) {
      toast({
        title: "Office conflict",
        description: `Two members assigned: ${officeConflicts.map((p) => partLabel(p)).join(", ")}`,
        variant: "destructive",
      });
      return;
    }
    if (focus === "other" && !focusOther.trim()) {
      toast({ title: "Please specify focus", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        session_date: date,
        focus,
        focus_other: focus === "other" ? focusOther.trim() : null,
        kpi_category: kpiCategory || autoKpiCategory(date),
        notes: notes.trim() || null,
        created_by: user?.id ?? null,
      };

      let sessionId = existing?.id;
      if (existing) {
        const { error } = await supabase
          .from("loi_sessions")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("loi_sessions")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        sessionId = data.id;
      }

      // Replace attendance rows
      await supabase.from("loi_attendance").delete().eq("session_id", sessionId!);
      const rows = Object.entries(drafts)
        .filter(([, d]) => d.present)
        .map(([mid, d]) => ({
          session_id: sessionId!,
          member_id: mid,
          part: d.part,
          part_other: d.part === "other" ? d.partOther.trim() || null : null,
        }));
      if (rows.length) {
        const { error } = await supabase.from("loi_attendance").insert(rows);
        if (error) throw error;
      }
      toast({ title: existing ? "Session updated" : "Session created" });
      onSaved();
    } catch (e) {
      const err = e as { message?: string };
      toast({
        title: "Save failed",
        description: err.message ?? "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-navy-dark text-primary-foreground border-gold/30">
        <DialogHeader>
          <DialogTitle className="font-serif text-gold">
            {existing ? "Edit LOI session" : "New LOI session"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-wider text-primary-foreground/60 mb-1 block">
                Date
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-navy border-gold/30 text-primary-foreground placeholder:text-primary-foreground/40"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-primary-foreground/60 mb-1 block">
                Focus
              </label>
              <Select value={focus} onValueChange={setFocus}>
                <SelectTrigger className="bg-navy border-gold/30 text-primary-foreground placeholder:text-primary-foreground/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOI_FOCUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {focus === "other" && (
            <Input
              placeholder="Specify focus"
              value={focusOther}
              onChange={(e) => setFocusOther(e.target.value)}
              className="bg-navy border-gold/30 text-primary-foreground placeholder:text-primary-foreground/40"
            />
          )}

          <div>
            <label className="text-xs uppercase tracking-wider text-primary-foreground/60 mb-1 block">
              KPI block (optional override — auto-grouped by date if blank)
            </label>
            <Select value={kpiCategory || "auto"} onValueChange={(v) => setKpiCategory(v === "auto" ? "" : v)}>
              <SelectTrigger className="bg-navy border-gold/30 text-primary-foreground placeholder:text-primary-foreground/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto ({kpiCategoryLabel(autoKpiCategory(date))})</SelectItem>
                {LOI_KPI_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-primary-foreground/60 mb-1 block">
              Notes (optional)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="bg-navy border-gold/30 text-primary-foreground placeholder:text-primary-foreground/40"
              placeholder="e.g. focus on Working Tools"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-serif text-gold text-sm">
                Attendance & parts ({presentCount} present)
              </h3>
            </div>
            {officeConflicts.length > 0 && (
              <p className="text-xs text-destructive mb-2">
                Office conflict: two members assigned —{" "}
                {officeConflicts.map((p) => partLabel(p)).join(", ")}
              </p>
            )}
            <div className="border border-gold/10 rounded-sm divide-y divide-gold/10 max-h-72 overflow-y-auto">
              {members.map((m) => {
                const d = drafts[m.id];
                if (!d) return null;
                return (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-center gap-2 p-2 text-sm"
                  >
                    <Checkbox
                      checked={d.present}
                      onCheckedChange={(v) =>
                        setDraft(m.id, { present: !!v })
                      }
                      className="border-gold/40"
                    />
                    <span className="flex-1 min-w-[140px]">{memberDisplay(m)}</span>
                    {d.present && (
                      <div className="flex items-center gap-2">
                        <Select
                          value={d.part}
                          onValueChange={(v) =>
                            setDraft(m.id, { part: v as LoiPart })
                          }
                        >
                          <SelectTrigger className="h-8 w-[180px] bg-navy border-gold/30 text-primary-foreground placeholder:text-primary-foreground/40 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LOI_PART_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {d.part === "other" && (
                          <Input
                            value={d.partOther}
                            onChange={(e) =>
                              setDraft(m.id, { partOther: e.target.value })
                            }
                            placeholder="Specify"
                            className="h-8 w-32 bg-navy border-gold/30 text-primary-foreground placeholder:text-primary-foreground/40 text-xs"
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {members.length === 0 && (
                <p className="p-3 text-xs italic text-primary-foreground/50">
                  No active members found.
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || officeConflicts.length > 0}
            className="bg-gold text-navy hover:bg-gold/90"
          >
            {saving ? "Saving…" : existing ? "Save changes" : "Create session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
