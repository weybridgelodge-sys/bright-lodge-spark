import { Link } from "react-router-dom";
import MembersLayout from "@/components/members/MembersLayout";
import ProtectedRoute from "@/components/members/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { CalendarPlus, Utensils, Mail, BarChart3, ArrowRight, Users, GraduationCap, Crown, FileCheck } from "lucide-react";

type Tile = { to: string; title: string; description: string; icon: React.ComponentType<{ className?: string }>; visible: boolean };

function Inner() {
  const { canManageSummons, canManageProgression, isAdmin, isSecretary, isWorshipfulMaster, isAssistantSecretary } = useAuth();

  if (!canManageSummons) {
    return (
      <MembersLayout>
        <p className="text-primary-foreground/70">You don't have permission to view the Secretary Portal.</p>
      </MembersLayout>
    );
  }

  const tiles: Tile[] = [
    { to: "/members/admin/festive-board", title: "Festive Board Register", description: "Attendance, visitors, waitlist, walk-ins and table plan export.", icon: Utensils, visible: true },
    { to: "/members/kpis", title: "KPI Dashboard", description: "Membership, LOI, Festive Board, Royal Arch conversion.", icon: BarChart3, visible: canManageProgression },
    { to: "/members/admin/loi", title: "LOI Register", description: "Sessions, attendance and ritual parts practised.", icon: GraduationCap, visible: true },
    { to: "/members/events", title: "Meetings", description: "Edit the meeting shown on the public Bookings page.", icon: CalendarPlus, visible: true },
    { to: "/members/admin", title: "Member Management", description: "Directory, member records, roles, and notices.", icon: Users, visible: isAdmin || isSecretary || isWorshipfulMaster || isAssistantSecretary },
    { to: "/members/admin/minutes", title: "Minutes", description: "Regular and Committee meeting minutes, with action items and the source transcript.", icon: NotebookPen, visible: canManageSummons },
    { to: "/members/officers-tracker", title: "Officers Tracker", description: "Officer progression, succession risk, and appointment tracking.", icon: Crown, visible: canManageProgression },
    { to: "/members/admin/returns", title: "Returns & Certificates", description: "UGLE and Provincial forms — Form P, LP&A5, clearance letters, change of status, Installation and Provincial Returns.", icon: FileCheck, visible: isAdmin || isSecretary || isAssistantSecretary || isWorshipfulMaster },
    { to: "/members/summons", title: "Summons Builder", description: "Build, preview and circulate the Lodge summons.", icon: Mail, visible: true },
  ];

  const visible = tiles.filter((t) => t.visible);

  return (
    <MembersLayout>
      <header className="mb-6">
        <h1 className="font-serif text-2xl md:text-3xl text-gold">Secretary Portal</h1>
        <p className="text-primary-foreground/60 text-sm">Meetings, register, summons and lodge reporting.</p>
      </header>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((t) => (
          <Link key={t.title + t.to} to={t.to} className="group rounded-sm border border-gold/20 bg-navy-light/30 p-5 hover:border-gold/50 hover:bg-navy-light/50 transition-colors">
            <div className="flex items-start gap-3 mb-2">
              <t.icon className="w-6 h-6 text-gold shrink-0" />
              <h2 className="font-serif text-gold text-lg">{t.title}</h2>
            </div>
            <p className="text-primary-foreground/70 text-sm mb-3">{t.description}</p>
            <span className="inline-flex items-center gap-1 text-xs text-gold/80 group-hover:text-gold">Open <ArrowRight className="w-3 h-3" /></span>
          </Link>
        ))}
      </div>
    </MembersLayout>
  );
}

export default function SecretaryPortal() {
  return <ProtectedRoute><Inner /></ProtectedRoute>;
}
