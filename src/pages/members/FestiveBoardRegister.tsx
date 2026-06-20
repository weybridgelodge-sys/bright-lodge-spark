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
import { Utensils, Plus, Pencil, ChevronRight, Trash2, UserPlus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  FB_MEETING_TYPES,
  FB_ATTENDANCE_STATUSES,
  FB_PAYMENT_METHODS,
  type FbMeetingType,
  type FbAttendanceStatus,
  type FbPaymentMethod,
  meetingTypeLabel,
  attendanceStatusLabel,
  paymentMethodLabel,
  computeHeadcount,
  isWeybridgeLodge,
} from "@/lib/festiveBoard";

type Meeting = {
  id: string;
  meeting_date: string;
  meeting_type: FbMeetingType;
  notes: string | null;
  headcount_override: number | null;
  event_key: string;
  status: "draft" | "published" | "completed";
  is_white_table: boolean;
  dining_price_pence: number;
};


type Attendance = {
  id: string;
  meeting_id: string;
  member_id: string | null;
  visitor_name: string | null;
  visitor_lodge_name: string | null;
  visitor_lodge_number: string | null;
  email: string | null;
  attendance_status: FbAttendanceStatus;
  payment_method: FbPaymentMethod;
  amount_pence: number;
  booking_id: string | null;
  source?: "manual" | "booking" | null;
  source_booking_id?: string | null;
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

function memberDisplay(m: Member) {
  return formatMemberLine(m as any) || "Unnamed brother";
}


const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export default function FestiveBoardRegister() {
  const { canManageLOI, user } = useAuth();
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    const [mt, at, mb] = await Promise.all([
      supabase
        .from("festive_board_meetings")
        .select("*")
        .order("meeting_date", { ascending: false }),
      supabase.from("festive_board_attendance").select("*"),
      supabase
        .from("profiles")
        .select("id,full_name,first_name,middle_name,last_name,preferred_name,post_nominals,title,is_past_master,rank,grand_rank,provincial_rank")
        .eq("status", "active")
        .eq("is_honorary_member", false)
        .order("last_name", { ascending: true }),
    ]);
    setMeetings((mt.data as Meeting[]) ?? []);
    setAttendance((at.data as Attendance[]) ?? []);
    setMembers((mb.data as Member[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const attendanceByMeeting = useMemo(() => {
    const map: Record<string, Attendance[]> = {};
    for (const r of attendance) (map[r.meeting_id] ??= []).push(r);
    return map;
  }, [attendance]);

  // My attendance — meetings where I'm marked attended
  const myAttendance = useMemo(() => {
    if (!user) return [];
    return attendance
      .filter((a) => a.member_id === user.id)
      .map((a) => ({ a, m: meetings.find((x) => x.id === a.meeting_id) }))
      .filter((x) => x.m)
      .sort((a, b) => b.m!.meeting_date.localeCompare(a.m!.meeting_date));
  }, [attendance, meetings, user]);

  const myAttendedCount = myAttendance.filter(
    (x) => x.a.attendance_status === "attended"
  ).length;

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this Festive Board record and all attendance?")) return;
    const { error } = await supabase.from("festive_board_meetings").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Record deleted" });
    loadAll();
  };

  return (
    <MembersLayout>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-gold mb-1 flex items-center gap-2">
            <Utensils className="w-6 h-6" /> Festive Board Register
          </h1>
          <p className="text-primary-foreground/60 text-sm">
            Meeting attendance, visitors, walk-ins and payment records.
          </p>
        </div>
        {canManageLOI && (
          <Button
            onClick={() => setCreating(true)}
            className="bg-gold text-navy hover:bg-gold/90"
          >
            <Plus className="w-4 h-4 mr-1" /> New record
          </Button>
        )}
      </div>

      {/* My attendance */}
      <section className="bg-navy-dark/60 border border-gold/15 rounded-sm p-5 mb-6">
        <h2 className="font-serif text-lg text-gold mb-3">My Festive Board attendance</h2>
        <p className="text-xs text-primary-foreground/60 mb-3">
          <span className="text-gold font-semibold">{myAttendedCount}</span> meeting
          {myAttendedCount === 1 ? "" : "s"} attended
        </p>
        {myAttendance.length === 0 ? (
          <p className="text-xs text-primary-foreground/50 italic">
            No Festive Board attendance recorded for you yet.
          </p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {myAttendance.map(({ a, m }) => (
              <li
                key={a.id}
                className="flex flex-wrap justify-between gap-2 border-l-2 border-gold/40 pl-3 py-1"
              >
                <span>
                  {fmtDate(m!.meeting_date)}{" "}
                  <span className="text-primary-foreground/60">
                    · {meetingTypeLabel(m!.meeting_type)}
                  </span>
                </span>
                <span className="text-gold text-xs">
                  {attendanceStatusLabel(a.attendance_status)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Past meetings */}
      <section className="bg-navy-dark/60 border border-gold/15 rounded-sm p-5">
        <h2 className="font-serif text-lg text-gold mb-3">Meeting records</h2>
        {loading ? (
          <p className="text-xs text-primary-foreground/50">Loading…</p>
        ) : meetings.length === 0 ? (
          <p className="text-xs text-primary-foreground/50 italic">
            No Festive Board meetings recorded yet.
          </p>
        ) : (
          <ul className="divide-y divide-gold/10">
            {meetings.map((mtg) => {
              const rows = attendanceByMeeting[mtg.id] ?? [];
              const hc = computeHeadcount(rows, mtg.headcount_override);
              const isOpen = expandedId === mtg.id;
              return (
                <li key={mtg.id} className="py-3">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : mtg.id)}
                    className="w-full text-left flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-semibold text-sm">
                        {fmtDate(mtg.meeting_date)}{" "}
                        <span className="text-primary-foreground/60 font-normal">
                          · {meetingTypeLabel(mtg.meeting_type)}
                        </span>
                      </p>
                      {mtg.notes && (
                        <p className="text-xs text-primary-foreground/50 mt-0.5 line-clamp-1">
                          {mtg.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gold">
                        {hc.total} cover{hc.total === 1 ? "" : "s"}{" "}
                        <span className="text-primary-foreground/50">
                          ({hc.members} M / {hc.visitors} V
                          {hc.isOverride ? " · override" : ""})
                        </span>
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
                      {mtg.notes && (
                        <p className="text-xs text-primary-foreground/70 whitespace-pre-wrap">
                          {mtg.notes}
                        </p>
                      )}
                      {rows.length === 0 ? (
                        <p className="text-xs italic text-primary-foreground/50">
                          No attendees recorded.
                        </p>
                      ) : (
                        <ul className="text-xs space-y-1">
                          {rows
                            .map((r) => {
                              const m = r.member_id
                                ? members.find((x) => x.id === r.member_id)
                                : null;
                              const name = m
                                ? memberDisplay(m)
                                : `${r.visitor_name ?? "Visitor"}${
                                    r.visitor_lodge_name
                                      ? ` — ${r.visitor_lodge_name}${
                                          r.visitor_lodge_number
                                            ? ` no. ${r.visitor_lodge_number}`
                                            : ""
                                        }`
                                      : ""
                                  }`;
                              return { r, name, isMember: !!m };
                            })
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(({ r, name, isMember }) => (
                              <li
                                key={r.id}
                                className="flex flex-wrap justify-between gap-3 border-b border-gold/5 pb-1"
                              >
                                <span>
                                  <span
                                    className={
                                      isMember
                                        ? "text-primary-foreground"
                                        : "text-primary-foreground/80 italic"
                                    }
                                  >
                                    {name}
                                  </span>
                                  <span className="text-primary-foreground/40 ml-2">
                                    · {paymentMethodLabel(r.payment_method)}
                                  </span>
                                </span>
                                <span
                                  className={
                                    r.attendance_status === "attended"
                                      ? "text-gold"
                                      : r.attendance_status === "no_show"
                                      ? "text-destructive"
                                      : "text-primary-foreground/60"
                                  }
                                >
                                  {attendanceStatusLabel(r.attendance_status)}
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
                            onClick={() => setEditing(mtg)}
                            className="border-gold/40 text-gold hover:bg-gold/10"
                          >
                            <Pencil className="w-3 h-3 mr-1" /> Edit / mark attendance
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(mtg.id)}
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
        <MeetingDialog
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
          existingAttendance={editing ? attendanceByMeeting[editing.id] ?? [] : []}
        />
      )}
    </MembersLayout>
  );
}

// ---------- Create / edit dialog ----------

type MemberDraft = {
  present: boolean;
  status: FbAttendanceStatus;
  paymentMethod: FbPaymentMethod;
  amountPounds: string;
  synced?: boolean;
  sourceBookingId?: string | null;
};

type VisitorDraft = {
  id: string; // local key (existing row id or temp)
  existingId?: string;
  name: string;
  lodgeName: string;
  lodgeNumber: string;
  email: string;
  status: FbAttendanceStatus;
  paymentMethod: FbPaymentMethod;
  amountPounds: string;
  synced?: boolean;
  sourceBookingId?: string | null;
};


type VisitorSuggestion = {
  id: string;
  email: string;
  name: string | null;
  lodge_name: string | null;
  lodge_number: string | null;
  last_seen_at: string | null;
};

function tempId() {
  return `tmp_${Math.random().toString(36).slice(2)}`;
}

function MeetingDialog({
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
  existing: Meeting | null;
  existingAttendance: Attendance[];
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = useState(
    existing?.meeting_date ?? new Date().toISOString().slice(0, 10)
  );
  const [type, setType] = useState<FbMeetingType>(existing?.meeting_type ?? "regular");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [override, setOverride] = useState<string>(
    existing?.headcount_override != null ? String(existing.headcount_override) : ""
  );
  const [status, setStatus] = useState<"draft" | "published" | "completed">(existing?.status ?? "draft");
  const [isWhiteTable, setIsWhiteTable] = useState<boolean>(existing?.is_white_table ?? false);
  const [diningPricePounds, setDiningPricePounds] = useState<string>(
    existing ? ((existing.dining_price_pence ?? 3500) / 100).toFixed(2) : "35.00"
  );
  const [eventKey, setEventKey] = useState<string>(existing?.event_key ?? `festive-board-${date}`);
  const [saving, setSaving] = useState(false);

  const [memberDrafts, setMemberDrafts] = useState<Record<string, MemberDraft>>(() => {
    const initial: Record<string, MemberDraft> = {};
    for (const m of members) {
      const row = existingAttendance.find((a) => a.member_id === m.id);
      initial[m.id] = {
        present: !!row,
        status: (row?.attendance_status as FbAttendanceStatus) ?? "booked",
        paymentMethod: (row?.payment_method as FbPaymentMethod) ?? "unknown",
        amountPounds: row ? (row.amount_pence / 100).toFixed(2) : "",
        synced: row?.source === "booking",
        sourceBookingId: row?.source_booking_id ?? null,
      };
    }
    return initial;
  });

  const [visitorDrafts, setVisitorDrafts] = useState<VisitorDraft[]>(() =>
    existingAttendance
      .filter((a) => !a.member_id)
      .map((a) => ({
        id: a.id,
        existingId: a.id,
        name: a.visitor_name ?? "",
        lodgeName: a.visitor_lodge_name ?? "",
        lodgeNumber: a.visitor_lodge_number ?? "",
        email: a.email ?? "",
        status: a.attendance_status as FbAttendanceStatus,
        paymentMethod: a.payment_method as FbPaymentMethod,
        amountPounds: (a.amount_pence / 100).toFixed(2),
        synced: a.source === "booking",
        sourceBookingId: a.source_booking_id ?? null,
      }))
  );

  const [visitorSuggestions, setVisitorSuggestions] = useState<VisitorSuggestion[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("visitor_contacts")
        .select("id,email,name,lodge_name,lodge_number,last_seen_at")
        .order("last_seen_at", { ascending: false })
        .limit(500);
      if (!cancelled) setVisitorSuggestions((data as VisitorSuggestion[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, []);

  // Auto-sync bookings → draft attendance rows (additive only, non-white-table meetings)
  useEffect(() => {
    if (!existing || isWhiteTable) return;
    let cancelled = false;
    (async () => {
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id,contact_name,contact_email,details,payment_status")
        .eq("meeting_id", existing.id);
      if (cancelled || !bookings?.length) return;

      const alreadySynced = new Set(
        existingAttendance.map((a) => a.source_booking_id).filter(Boolean) as string[]
      );

      const diningPence = existing.dining_price_pence ?? 3500;
      const newVisitorDrafts: VisitorDraft[] = [];
      const memberPatches: { id: string; patch: Partial<MemberDraft> }[] = [];

      for (const b of bookings) {
        if (alreadySynced.has(b.id)) continue;
        const d = (b.details ?? {}) as Record<string, unknown>;
        const opt = String(d.meetingOption ?? "");
        if (opt === "apologies" || b.payment_status === "apologies") continue;
        const amount = opt === "meeting-and-festive-board" ? (diningPence / 100).toFixed(2) : "0.00";

        // Respondent
        const respLodge = String(d.lodge ?? "");
        const respondentIsMember = isWeybridgeLodge(respLodge);
        if (respondentIsMember) {
          // Try to match by email or full name
          const targetEmail = (b.contact_email ?? "").toLowerCase().trim();
          const targetName = (b.contact_name ?? "").toLowerCase().trim();
          const match = members.find((m) => {
            const profileFull = [m.first_name, m.last_name].filter(Boolean).join(" ").toLowerCase();
            return (m.full_name?.toLowerCase() === targetName) || (profileFull === targetName);
          });
          if (match) {
            memberPatches.push({
              id: match.id,
              patch: {
                present: true,
                status: "booked",
                paymentMethod: "unknown",
                amountPounds: amount,
                synced: true,
                sourceBookingId: b.id,
              },
            });
          } else {
            // Unmatched Weybridge respondent — fall through as a visitor row so the Secretary can reconcile
            newVisitorDrafts.push({
              id: tempId(),
              name: String(b.contact_name ?? ""),
              lodgeName: respLodge,
              lodgeNumber: "",
              email: String(b.contact_email ?? ""),
              status: "booked",
              paymentMethod: "unknown",
              amountPounds: amount,
              synced: true,
              sourceBookingId: b.id,
            });
          }
        } else {
          newVisitorDrafts.push({
            id: tempId(),
            name: String(b.contact_name ?? ""),
            lodgeName: respLodge,
            lodgeNumber: "",
            email: String(b.contact_email ?? ""),
            status: "booked",
            paymentMethod: "unknown",
            amountPounds: amount,
            synced: true,
            sourceBookingId: b.id,
          });
        }

        // Guests
        const guests = Array.isArray(d.guests) ? (d.guests as Array<{ name?: string; lodge?: string }>) : [];
        for (const [gi, g] of guests.entries()) {
          const gLodge = String(g.lodge ?? "");
          const guestBookingId = `${b.id}::g${gi}`;
          if (alreadySynced.has(guestBookingId)) continue;
          const guestIsMember = isWeybridgeLodge(gLodge);
          if (guestIsMember) {
            const targetName = (g.name ?? "").toLowerCase().trim();
            const match = members.find((m) => {
              const profileFull = [m.first_name, m.last_name].filter(Boolean).join(" ").toLowerCase();
              return (m.full_name?.toLowerCase() === targetName) || (profileFull === targetName);
            });
            if (match) {
              memberPatches.push({
                id: match.id,
                patch: {
                  present: true,
                  status: "booked",
                  paymentMethod: "unknown",
                  amountPounds: amount,
                  synced: true,
                  sourceBookingId: b.id,
                },
              });
              continue;
            }
          }
          newVisitorDrafts.push({
            id: tempId(),
            name: String(g.name ?? ""),
            lodgeName: gLodge,
            lodgeNumber: "",
            email: "",
            status: "booked",
            paymentMethod: "unknown",
            amountPounds: amount,
            synced: true,
            sourceBookingId: b.id,
          });
        }
      }

      if (memberPatches.length) {
        setMemberDrafts((prev) => {
          const next = { ...prev };
          for (const { id, patch } of memberPatches) {
            if (next[id] && !next[id].present) next[id] = { ...next[id], ...patch };
          }
          return next;
        });
      }
      if (newVisitorDrafts.length) {
        setVisitorDrafts((prev) => [...prev, ...newVisitorDrafts]);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id, isWhiteTable]);




  const setMember = (id: string, patch: Partial<MemberDraft>) =>
    setMemberDrafts((p) => ({ ...p, [id]: { ...p[id], ...patch } }));

  const setVisitor = (id: string, patch: Partial<VisitorDraft>) =>
    setVisitorDrafts((p) => p.map((v) => (v.id === id ? { ...v, ...patch } : v)));

  const addVisitor = () =>
    setVisitorDrafts((p) => [
      ...p,
      {
        id: tempId(),
        name: "",
        lodgeName: "",
        lodgeNumber: "",
        email: "",
        status: "attended",
        paymentMethod: "unknown",
        amountPounds: "",
      },
    ]);


  const removeVisitor = (id: string) =>
    setVisitorDrafts((p) => p.filter((v) => v.id !== id));

  const computedAttended = useMemo(() => {
    const m = Object.values(memberDrafts).filter((d) => d.present && d.status === "attended").length;
    const v = visitorDrafts.filter((d) => d.name.trim() && d.status === "attended").length;
    return { members: m, visitors: v, total: m + v };
  }, [memberDrafts, visitorDrafts]);

  const parsePounds = (s: string): number => {
    const n = parseFloat(s);
    if (Number.isNaN(n)) return 0;
    return Math.round(n * 100);
  };

  const handleSave = async () => {
    if (!date) {
      toast({ title: "Please select a date", variant: "destructive" });
      return;
    }
    for (const v of visitorDrafts) {
      if (!v.name.trim()) {
        toast({ title: "Visitor needs a name", description: "Remove blank visitor rows or fill in their name.", variant: "destructive" });
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        meeting_date: date,
        meeting_type: type,
        notes: notes.trim() || null,
        headcount_override: override.trim() === "" ? null : Number(override),
        created_by: user?.id ?? null,
        event_key: eventKey.trim() || `festive-board-${date}`,
        status,
        is_white_table: isWhiteTable,
        dining_price_pence: parsePounds(diningPricePounds) || 3500,
      };

      // If publishing this meeting, demote any other currently-published meeting to draft
      if (status === "published") {
        await supabase
          .from("festive_board_meetings")
          .update({ status: "draft" })
          .eq("status", "published")
          .neq("id", existing?.id ?? "00000000-0000-0000-0000-000000000000");
      }

      let meetingId = existing?.id;
      if (existing) {
        const { error } = await supabase
          .from("festive_board_meetings")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("festive_board_meetings")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        meetingId = data.id;
      }

      // Replace all attendance rows (simple + reliable)
      await supabase.from("festive_board_attendance").delete().eq("meeting_id", meetingId!);

      const memberRows = Object.entries(memberDrafts)
        .filter(([, d]) => d.present)
        .map(([mid, d]) => ({
          meeting_id: meetingId!,
          member_id: mid,
          attendance_status: d.status,
          payment_method: d.paymentMethod,
          amount_pence: parsePounds(d.amountPounds),
          created_by: user?.id ?? null,
          source: (d.synced ? "booking" : "manual") as "booking" | "manual",
          source_booking_id: d.sourceBookingId ?? null,
        }));

      const visitorRows = visitorDrafts
        .filter((v) => v.name.trim())
        .map((v) => ({
          meeting_id: meetingId!,
          visitor_name: v.name.trim(),
          visitor_lodge_name: v.lodgeName.trim() || null,
          visitor_lodge_number: v.lodgeNumber.trim() || null,
          email: v.email.trim().toLowerCase() || null,
          attendance_status: v.status,
          payment_method: v.paymentMethod,
          amount_pence: parsePounds(v.amountPounds),
          created_by: user?.id ?? null,
          source: (v.synced ? "booking" : "manual") as "booking" | "manual",
          source_booking_id: v.sourceBookingId ?? null,
        }));



      const all = [...memberRows, ...visitorRows];
      if (all.length) {
        const { error } = await supabase.from("festive_board_attendance").insert(all);
        if (error) throw error;
      }
      toast({ title: existing ? "Record updated" : "Record created" });
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-navy-dark text-primary-foreground border-gold/30">
        <DialogHeader>
          <DialogTitle className="font-serif text-gold">
            {existing ? "Edit Festive Board record" : "New Festive Board record"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs uppercase tracking-wider text-primary-foreground/60 mb-1 block">
                Date
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-navy border-gold/20 text-primary-foreground placeholder:text-primary-foreground/40 [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-primary-foreground/60 mb-1 block">
                Meeting type
              </label>
              <Select value={type} onValueChange={(v) => setType(v as FbMeetingType)}>
                <SelectTrigger className="bg-navy border-gold/20 text-primary-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FB_MEETING_TYPES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-primary-foreground/60 mb-1 block">
                Headcount override
              </label>
              <Input
                type="number"
                min={0}
                placeholder={`auto: ${computedAttended.total}`}
                value={override}
                onChange={(e) => setOverride(e.target.value)}
                className="bg-navy border-gold/20 text-primary-foreground placeholder:text-primary-foreground/40"
              />
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-primary-foreground/60 mb-1 block">
              Notes
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="bg-navy border-gold/20 text-primary-foreground placeholder:text-primary-foreground/40"
              placeholder="Optional context, menu, special guests, etc."
            />
          </div>

          {/* Members grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-serif text-base text-gold">Members</h3>
              <span className="text-[11px] text-primary-foreground/60">
                {computedAttended.members} attending
              </span>
            </div>
            <div className="hidden sm:grid grid-cols-[auto_1fr_140px_180px_100px] gap-2 px-2 pb-1 text-[10px] uppercase tracking-wide text-gold/70">
              <span className="w-4" aria-hidden />
              <span>Member</span>
              <span>Status</span>
              <span>Payment method</span>
              <span>Amount</span>
            </div>
            <div className="border border-gold/15 rounded-sm divide-y divide-gold/10">
              {members.map((m) => {
                const d = memberDrafts[m.id];
                if (!d) return null;
                return (
                  <div
                    key={m.id}
                    className="grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_140px_180px_100px] gap-2 items-center p-2 text-sm"
                  >
                    <Checkbox
                      checked={d.present}
                      onCheckedChange={(v) => setMember(m.id, { present: !!v })}
                    />
                    <span className="truncate">{memberDisplay(m)}</span>
                    {d.present && (
                      <>
                        <Select
                          value={d.status}
                          onValueChange={(v) =>
                            setMember(m.id, { status: v as FbAttendanceStatus })
                          }
                        >
                          <SelectTrigger className="bg-navy border-gold/20 h-8 text-xs text-primary-foreground placeholder:text-primary-foreground/40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FB_ATTENDANCE_STATUSES.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={d.paymentMethod}
                          onValueChange={(v) =>
                            setMember(m.id, { paymentMethod: v as FbPaymentMethod })
                          }
                        >
                          <SelectTrigger className="bg-navy border-gold/20 h-8 text-xs text-primary-foreground placeholder:text-primary-foreground/40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FB_PAYMENT_METHODS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          placeholder="£"
                          value={d.amountPounds}
                          onChange={(e) =>
                            setMember(m.id, { amountPounds: e.target.value })
                          }
                          className="bg-navy border-gold/20 h-8 text-xs text-primary-foreground placeholder:text-primary-foreground/40"
                        />
                      </>
                    )}
                  </div>
                );
              })}
              {members.length === 0 && (
                <p className="p-3 text-xs italic text-primary-foreground/50">
                  No active members.
                </p>
              )}
            </div>
          </div>

          {/* Visitors */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-serif text-base text-gold">Visitors</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addVisitor}
                className="border-gold/40 text-gold hover:bg-gold/10"
              >
                <UserPlus className="w-3 h-3 mr-1" /> Add visitor / walk-in
              </Button>
            </div>
            {visitorDrafts.length === 0 ? (
              <p className="text-xs italic text-primary-foreground/50 border border-dashed border-gold/15 rounded-sm p-3">
                No visitors recorded. Use "Add visitor" for guests, late phone bookings or walk-ins paying on the night.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="hidden sm:grid grid-cols-[1fr_1fr_90px_1fr_140px_180px_100px_auto] gap-2 px-2 text-[10px] uppercase tracking-wide text-gold/70">
                  <span>Visitor name</span>
                  <span>Lodge name</span>
                  <span>Lodge no.</span>
                  <span>Email</span>
                  <span>Status</span>
                  <span>Payment method</span>
                  <span>Amount</span>
                  <span aria-hidden />
                </div>
                {visitorDrafts.map((v) => (
                  <div
                    key={v.id}
                    className="border border-gold/15 rounded-sm p-2 grid grid-cols-1 sm:grid-cols-[1fr_1fr_90px_1fr_140px_180px_100px_auto] gap-2 items-center"
                  >
                    <VisitorNameInput
                      value={v.name}
                      suggestions={visitorSuggestions}
                      onChange={(name) => setVisitor(v.id, { name })}
                      onPick={(s) => setVisitor(v.id, {
                        name: s.name ?? "",
                        lodgeName: s.lodge_name ?? "",
                        lodgeNumber: s.lodge_number ?? "",
                        email: s.email ?? "",
                      })}
                    />
                    <Input
                      value={v.lodgeName}
                      placeholder="Lodge name"
                      onChange={(e) => setVisitor(v.id, { lodgeName: e.target.value })}
                      className="bg-navy border-gold/20 h-8 text-xs text-primary-foreground placeholder:text-primary-foreground/40"
                    />
                    <Input
                      value={v.lodgeNumber}
                      placeholder="No."
                      onChange={(e) => setVisitor(v.id, { lodgeNumber: e.target.value })}
                      className="bg-navy border-gold/20 h-8 text-xs text-primary-foreground placeholder:text-primary-foreground/40"
                    />
                    <Input
                      type="email"
                      value={v.email}
                      placeholder="Email (optional, for newsletter)"
                      onChange={(e) => setVisitor(v.id, { email: e.target.value })}
                      className="bg-navy border-gold/20 h-8 text-xs text-primary-foreground placeholder:text-primary-foreground/40"
                    />

                    <Select
                      value={v.status}
                      onValueChange={(val) =>
                        setVisitor(v.id, { status: val as FbAttendanceStatus })
                      }
                    >
                      <SelectTrigger className="bg-navy border-gold/20 h-8 text-xs text-primary-foreground placeholder:text-primary-foreground/40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FB_ATTENDANCE_STATUSES.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={v.paymentMethod}
                      onValueChange={(val) =>
                        setVisitor(v.id, { paymentMethod: val as FbPaymentMethod })
                      }
                    >
                      <SelectTrigger className="bg-navy border-gold/20 h-8 text-xs text-primary-foreground placeholder:text-primary-foreground/40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FB_PAYMENT_METHODS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder="£"
                      value={v.amountPounds}
                      onChange={(e) => setVisitor(v.id, { amountPounds: e.target.value })}
                      className="bg-navy border-gold/20 h-8 text-xs text-primary-foreground placeholder:text-primary-foreground/40"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeVisitor(v.id)}
                      className="text-destructive hover:bg-destructive/10 h-8 w-8"
                      aria-label="Remove visitor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-xs text-primary-foreground/60 border-t border-gold/10 pt-3">
            Computed headcount:{" "}
            <span className="text-gold font-semibold">{computedAttended.total}</span>{" "}
            ({computedAttended.members} members, {computedAttended.visitors} visitors).{" "}
            {override.trim() !== "" && (
              <span className="text-gold">Override active: {override}.</span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-gold/30">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gold text-navy hover:bg-gold/90"
          >
            {saving ? "Saving…" : existing ? "Save changes" : "Create record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Visitor name autocomplete ----------

function VisitorNameInput({
  value,
  suggestions,
  onChange,
  onPick,
}: {
  value: string;
  suggestions: VisitorSuggestion[];
  onChange: (v: string) => void;
  onPick: (s: VisitorSuggestion) => void;
}) {
  const [open, setOpen] = useState(false);
  const q = value.trim().toLowerCase();
  const matches = useMemo(() => {
    if (q.length < 2) return [];
    return suggestions
      .filter((s) => (s.name ?? "").toLowerCase().includes(q))
      .slice(0, 6);
  }, [q, suggestions]);

  const showList = open && matches.length > 0;
  return (
    <div className="relative">
      <Input
        value={value}
        placeholder="Visitor name (start typing to find past visitors)"
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => { setTimeout(() => setOpen(false), 150); }}
        className="bg-navy border-gold/20 h-8 text-xs text-primary-foreground placeholder:text-primary-foreground/40"
      />
      {showList && (
        <ul className="absolute z-50 left-0 top-full mt-1 w-[320px] max-w-[90vw] p-1 bg-navy-dark border border-gold/30 rounded-sm text-xs shadow-lg">
          {matches.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onPick(s); setOpen(false); }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-gold/10"
              >
                <div className="text-primary-foreground">{s.name || s.email}</div>
                <div className="text-[10px] text-primary-foreground/60">
                  {s.lodge_name ? `${s.lodge_name}${s.lodge_number ? ` No. ${s.lodge_number}` : ""}` : "Lodge unknown"}
                  {s.last_seen_at ? ` · last seen ${new Date(s.last_seen_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}` : ""}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

