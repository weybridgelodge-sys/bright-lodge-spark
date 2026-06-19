import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MembersLayout from "@/components/members/MembersLayout";
import ProtectedRoute from "@/components/members/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ProfileSection, { MemberProfile } from "@/components/members/development/ProfileSection";
import MentoringChecklist from "@/components/members/development/MentoringChecklist";
import RitualRecord from "@/components/members/development/RitualRecord";
import OfficesRecord, { LodgeAppointmentRow } from "@/components/members/development/OfficesRecord";
import ExportPdfButton from "@/components/members/development/ExportPdfButton";
import ExemptionPanel from "@/components/members/development/ExemptionPanel";
import {
  ensureSeeded,
  loadChecklist,
  loadDevelopmentRecord,
  loadExternalAppointments,
  loadLodgeAppointmentsForMember,
  loadRitualRows,
  type ChecklistItem,
  type DevelopmentRecord,
  type ExternalAppointment,
  type RitualRow,
} from "@/lib/development/queries";
import { ChevronLeft, Loader2 } from "lucide-react";

type MentorOption = { id: string; full_name: string | null; first_name: string | null; last_name: string | null; preferred_name: string | null };

const displayName = (p?: MentorOption | null) => {
  if (!p) return "—";
  const f = p.preferred_name?.trim() || p.first_name?.trim() || "";
  return [f, p.last_name?.trim() || ""].filter(Boolean).join(" ") || p.full_name || "Unnamed";
};

export default function MemberDevelopmentInner({ memberIdOverride }: { memberIdOverride?: string }) {
  const params = useParams<{ memberId?: string }>();
  const { user, isAdmin, isWorshipfulMaster, isDirectorOfCeremonies } = useAuth();
  const showPreceptorNotes = isAdmin || isWorshipfulMaster || isDirectorOfCeremonies;
  const navigate = useNavigate();
  const memberId = memberIdOverride || params.memberId || user?.id || "";

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [record, setRecord] = useState<DevelopmentRecord | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [ritual, setRitual] = useState<RitualRow[]>([]);
  const [external, setExternal] = useState<ExternalAppointment[]>([]);
  const [lodgeAppts, setLodgeAppts] = useState<LodgeAppointmentRow[]>([]);
  const [mentors, setMentors] = useState<MentorOption[]>([]);

  const isOwn = !!user && memberId === user.id;
  const isAssignedMentor = !!user && record?.assigned_mentor_id === user.id;
  const canEdit = isAdmin || isWorshipfulMaster || isAssignedMentor;
  const canEditRitual = canEdit; // RLS also allows secretary/DC server-side

  useEffect(() => {
    if (!memberId) return;
    (async () => {
      setLoading(true);
      try {
        await ensureSeeded(memberId);
        const [{ data: prof }, rec, ch, ri, ex, la, ms] = await Promise.all([
          supabase.from("profiles").select("id, full_name, first_name, last_name, preferred_name, title, initiation_date, passing_date, raising_date, royal_arch_date, ugle_reg_number, proposer").eq("id", memberId).maybeSingle(),
          loadDevelopmentRecord(memberId),
          loadChecklist(memberId),
          loadRitualRows(memberId),
          loadExternalAppointments(memberId),
          loadLodgeAppointmentsForMember(memberId),
          supabase.from("profiles").select("id, full_name, first_name, last_name, preferred_name").eq("status", "active").order("last_name", { ascending: true }),
        ]);
        setProfile(prof as MemberProfile | null);
        setRecord(rec);
        setChecklist(ch);
        setRitual(ri);
        setExternal(ex);
        setLodgeAppts(la.map((a) => ({ id: a.id, lodge_year: a.lodge_year, appointed_on: a.appointed_on, position_label: a.officer_positions?.label || a.position_key })));
        setMentors((ms.data as MentorOption[]) ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [memberId]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-gold animate-spin" /></div>;
  }
  if (!profile) {
    return <p className="text-primary-foreground/80">Member not found or you do not have access.</p>;
  }

  const mentorName = mentors.find((m) => m.id === record?.assigned_mentor_id) ? displayName(mentors.find((m) => m.id === record?.assigned_mentor_id)) : null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          {!isOwn && (
            <button onClick={() => navigate(-1)} className="text-xs text-gold hover:underline flex items-center gap-1 mb-1">
              <ChevronLeft className="w-3 h-3" /> Back
            </button>
          )}
          <h1 className="font-serif text-2xl text-primary-foreground">
            {isOwn ? "My Development Record" : `Development Record — ${displayName(profile as any)}`}
          </h1>
          <p className="text-xs text-primary-foreground/60 mt-1">
            {canEdit ? "You can edit this record." : "Read-only view."}
          </p>
        </div>
        <ExportPdfButton
          profile={profile}
          mentorName={mentorName}
          record={record}
          checklist={checklist}
          ritual={ritual}
          lodgeAppointments={lodgeAppts}
          externalAppointments={external}
        />
      </div>

      <section className="rounded-sm border border-gold/20 bg-navy-dark/40 p-5">
        <h2 className="font-serif text-gold text-lg mb-4">1. Member Profile</h2>
        <ProfileSection
          profile={profile}
          record={record}
          canEdit={canEdit}
          mentors={mentors}
          onSaved={(r) => setRecord(r)}
        />
      </section>

      <section className="rounded-sm border border-gold/20 bg-navy-dark/40 p-5 space-y-3">
        <h2 className="font-serif text-gold text-lg">2. Mentoring Checklist</h2>
        <ExemptionPanel memberId={memberId} record={record} canEdit={canEdit} onSaved={setRecord} />
        {record?.mentoring_exempt ? (
          <p className="text-xs text-primary-foreground/70 italic">
            This member is exempt from the structured mentoring checklist
            {record.exemption_reason === "senior_member" ? " (Senior Member)" : record.exemption_reason === "joining_member" ? " (Joining Member)" : ""}.
            {record.exemption_note ? ` Note: ${record.exemption_note}` : ""}
          </p>
        ) : (
          <MentoringChecklist items={checklist} canEdit={canEdit} onChange={setChecklist} />
        )}
      </section>

      <section className="rounded-sm border border-gold/20 bg-navy-dark/40 p-5">
        <h2 className="font-serif text-gold text-lg mb-4">3. Ritual Learning &amp; Delivery</h2>
        <RitualRecord rows={ritual} canEdit={canEditRitual} memberId={memberId} showPreceptorNotes={showPreceptorNotes} onChange={setRitual} />
      </section>

      <section className="rounded-sm border border-gold/20 bg-navy-dark/40 p-5">
        <h2 className="font-serif text-gold text-lg mb-4">4. Offices &amp; Appointments</h2>
        <OfficesRecord
          memberId={memberId}
          lodgeAppointments={lodgeAppts}
          externalAppointments={external}
          canEdit={canEdit}
          onChange={setExternal}
        />
      </section>
    </div>
  );
}

export function MyDevelopmentPage() {
  return (
    <ProtectedRoute>
      <MembersLayout>
        <MemberDevelopmentInner />
      </MembersLayout>
    </ProtectedRoute>
  );
}

export function MemberDevelopmentPage() {
  return (
    <ProtectedRoute>
      <MembersLayout>
        <MemberDevelopmentInner />
      </MembersLayout>
    </ProtectedRoute>
  );
}
