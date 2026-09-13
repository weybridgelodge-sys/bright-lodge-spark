import { useEffect, useMemo, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap } from "lucide-react";
import { focusLabel, partLabel, masonicYearStart } from "@/lib/loi";

type Session = {
  id: string;
  session_date: string;
  focus: string;
  focus_other: string | null;
};

type Attendance = {
  id: string;
  session_id: string;
  member_id: string;
  part: string;
  part_other: string | null;
};

export default function LoiRegister() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);

  useEffect(() => {
    (async () => {
      const [s, a] = await Promise.all([
        supabase.from("loi_sessions").select("id,session_date,focus,focus_other").order("session_date", { ascending: false }),
        supabase.from("loi_attendance").select("id,session_id,member_id,part,part_other"),
      ]);
      setSessions((s.data as Session[]) ?? []);
      setAttendance((a.data as Attendance[]) ?? []);
    })();
  }, []);

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

  return (
    <MembersLayout>
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-gold mb-1 flex items-center gap-2">
          <GraduationCap className="w-6 h-6" /> LOI Register
        </h1>
        <p className="text-primary-foreground/60 text-sm">
          Your personal record of Lodge of Instruction attendance.
        </p>
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
    </MembersLayout>
  );
}
