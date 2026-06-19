import { Link } from "react-router-dom";
import MembersLayout from "@/components/members/MembersLayout";
import ProtectedRoute from "@/components/members/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, HeartHandshake, GraduationCap, BarChart3, ShieldCheck, Banknote, Mail, ArrowRight } from "lucide-react";

type Tile = { to: string; title: string; description: string; icon: React.ComponentType<{ className?: string }>; visible: boolean };

function Inner() {
  const { isAdmin, isSecretary, isWorshipfulMaster, canAccessAlmoner, canManageProgression } = useAuth();
  const [isCharitySteward, setIsCharitySteward] = useState(false);
  const [canEditNewsletter, setCanEditNewsletter] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const [{ data: charity }, { data: newsletter }] = await Promise.all([
        supabase.rpc("can_edit_charity" as any, { _user: u.user.id }),
        supabase.rpc("can_edit_newsletter" as any, { _user: u.user.id } as any),
      ]);
      if (typeof charity === "boolean") setIsCharitySteward(charity);
      if (typeof newsletter === "boolean") setCanEditNewsletter(newsletter);
    })();
  }, []);

  const tiles: Tile[] = [
    { to: "/members/admin", title: "Members", description: "Directory, member records, roles and progression.", icon: Users, visible: isAdmin || isSecretary || isWorshipfulMaster },
    { to: "/members/almoner", title: "Almoner Portal", description: "Welfare board, life events, correspondence, referrals.", icon: HeartHandshake, visible: canAccessAlmoner },
    { to: "/members/admin/development", title: "Mentor Portal", description: "Mentor dashboard, development records, summary report.", icon: GraduationCap, visible: isAdmin || canManageProgression },
    { to: "/members/admin/charity", title: "Charity Steward", description: "Collections, donations, Charity Ledger, Festival tracker.", icon: Banknote, visible: isAdmin || isWorshipfulMaster || isCharitySteward || isSecretary },
    { to: "/members/kpis", title: "KPI Dashboard", description: "Membership, LOI, Festive Board, Royal Arch conversion.", icon: BarChart3, visible: canManageProgression },
    { to: "/members/admin/newsletter", title: "Newsletter Hub", description: "Compose and broadcast the Monthly Chronicle.", icon: Mail, visible: canEditNewsletter },
    { to: "/members/admin", title: "Admin Settings", description: "Module settings and member administration.", icon: ShieldCheck, visible: isAdmin },
  ];

  const visible = tiles.filter((t) => t.visible);

  return (
    <MembersLayout>
      <header className="mb-6">
        <h1 className="font-serif text-2xl md:text-3xl text-gold">Admin</h1>
        <p className="text-primary-foreground/60 text-sm">Tools for officers and lodge administrators.</p>
      </header>
      {visible.length === 0 ? (
        <p className="text-primary-foreground/60">You don't have access to any admin sections.</p>
      ) : (
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
      )}
    </MembersLayout>
  );
}

export default function AdminHub() {
  return <ProtectedRoute><Inner /></ProtectedRoute>;
}
