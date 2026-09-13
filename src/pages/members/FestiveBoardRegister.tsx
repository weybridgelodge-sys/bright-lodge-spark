import { useEffect, useMemo, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Utensils } from "lucide-react";
import {
  type FbMeetingType,
  type FbAttendanceStatus,
  meetingTypeLabel,
  attendanceStatusLabel,
} from "@/lib/festiveBoard";

type Meeting = {
  id: string;
  meeting_date: string;
  meeting_type: FbMeetingType;
};

type Attendance = {
  id: string;
  meeting_id: string;
  member_id: string | null;
  attendance_status: FbAttendanceStatus;
};

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export default function FestiveBoardRegister() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [mt, at] = await Promise.all([
        supabase
          .from("festive_board_meetings")
          .select("id,meeting_date,meeting_type")
          .order("meeting_date", { ascending: false }),
        supabase
          .from("festive_board_attendance")
          .select("id,meeting_id,member_id,attendance_status")
          .eq("member_id", user.id),
      ]);
      setMeetings((mt.data as Meeting[]) ?? []);
      setAttendance((at.data as Attendance[]) ?? []);
    })();
  }, [user]);

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

  return (
    <MembersLayout>
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-gold mb-1 flex items-center gap-2">
          <Utensils className="w-6 h-6" /> Lodge Meetings
        </h1>
        <p className="text-primary-foreground/60 text-sm">
          Your personal record of Lodge Meeting attendance.
        </p>
      </div>

      {/* My attendance */}
      <section className="bg-navy-dark/60 border border-gold/15 rounded-sm p-5 mb-6">
        <h2 className="font-serif text-lg text-gold mb-3">My Lodge Meeting attendance</h2>
        <p className="text-xs text-primary-foreground/60 mb-3">
          <span className="text-gold font-semibold">{myAttendedCount}</span> meeting
          {myAttendedCount === 1 ? "" : "s"} attended
        </p>
        {myAttendance.length === 0 ? (
          <p className="text-xs text-primary-foreground/50 italic">
            No Lodge Meeting attendance recorded for you yet.
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
    </MembersLayout>
  );
}
