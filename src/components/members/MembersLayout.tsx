import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LayoutDashboard, Users, FileText, User as UserIcon, ShieldCheck, LogOut, Shield, CalendarDays, BookOpen, Crown, CalendarPlus, BarChart3, GraduationCap, Utensils, Mail, HeartHandshake, Sprout, Hexagon, Banknote, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import logoAsset from "@/assets/weybridge-logo-no-bg.png.asset.json";
import { assetUrl } from "@/lib/assetUrl";
const logo = assetUrl(logoAsset);

const navCls = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 px-3 py-2 rounded-sm text-sm font-sans transition-colors ${
    isActive ? "bg-gold/15 text-gold" : "text-primary-foreground/70 hover:text-gold hover:bg-navy-light/40"
  }`;

export default function MembersLayout({ children }: { children: React.ReactNode }) {
  const { profile, isAdmin, isSecretary, isWorshipfulMaster, isDirectorOfCeremonies, canManageProgression, canManageSummons, canAccessAlmoner, canAccessCharity, canAccessAdminArea, signOut } = useAuth();
  const canSeeMatrix = isAdmin || isWorshipfulMaster || isDirectorOfCeremonies;
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/members/login");
  };

  const navItems = (
    <>
      <NavLink to="/members" end className={navCls}>
        <LayoutDashboard className="w-4 h-4" /> Dashboard
      </NavLink>
      <NavLink to="/members/calendar" className={navCls}>
        <CalendarDays className="w-4 h-4" /> Calendar
      </NavLink>
      <NavLink to="/members/directory" className={navCls}>
        <Users className="w-4 h-4" /> Directory
      </NavLink>
      <NavLink to="/members/documents" className={navCls}>
        <FileText className="w-4 h-4" /> Documents
      </NavLink>
      <NavLink to="/members/ritual" className={navCls}>
        <BookOpen className="w-4 h-4" /> Ritual
      </NavLink>
      <NavLink to="/members/loi-register" className={navCls}>
        <GraduationCap className="w-4 h-4" /> LOI Register
      </NavLink>
      <NavLink to="/members/festive-register" className={navCls}>
        <Utensils className="w-4 h-4" /> Lodge Meetings
      </NavLink>
      {canManageSummons && (
        <NavLink to="/members/summons" className={navCls}>
          <Mail className="w-4 h-4" /> Summons Builder
        </NavLink>
      )}
      {canAccessAlmoner && (
        <NavLink to="/members/almoner" className={navCls}>
          <HeartHandshake className="w-4 h-4" /> Almoner Portal
        </NavLink>
      )}
      {canAccessCharity && (
        <NavLink to="/members/admin/charity" className={navCls}>
          <Banknote className="w-4 h-4" /> Charity Steward
        </NavLink>
      )}
      {canAccessAdminArea && (
        <NavLink to="/members/admin-hub" className={navCls}>
          <ShieldCheck className="w-4 h-4" /> Admin Hub
        </NavLink>
      )}

      <NavLink to="/members/profile" className={navCls}>
        <UserIcon className="w-4 h-4" /> My Profile
      </NavLink>
      <NavLink to="/members/development" className={navCls}>
        <Sprout className="w-4 h-4" /> My Development
      </NavLink>
      {(isAdmin || canManageProgression) && (
        <NavLink to="/members/admin/development" className={navCls}>
          <GraduationCap className="w-4 h-4" /> Member Development
        </NavLink>
      )}
      {canSeeMatrix && (
        <NavLink to="/members/admin/skills-matrix" className={navCls}>
          <BarChart3 className="w-4 h-4" /> Skills Matrix
        </NavLink>
      )}
      <NavLink to="/members/working-groups" className={navCls}>
        <Hexagon className="w-4 h-4" /> Working Groups
      </NavLink>
      {canManageProgression && (
        <NavLink to="/members/officers-tracker" className={navCls}>
          <Crown className="w-4 h-4" /> Officers Tracker
        </NavLink>
      )}
      {(isAdmin || isSecretary) && (
        <NavLink to="/members/events" className={navCls}>
          <CalendarPlus className="w-4 h-4" /> Meetings
        </NavLink>
      )}
      {canManageProgression && (
        <NavLink to="/members/kpis" className={navCls}>
          <BarChart3 className="w-4 h-4" /> KPIs
        </NavLink>
      )}
      {isAdmin && (
        <NavLink to="/members/admin" className={navCls}>
          <ShieldCheck className="w-4 h-4" /> Admin
        </NavLink>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-navy text-primary-foreground">
      <header className="border-b border-gold/20 bg-navy-dark/80 backdrop-blur sticky top-0 z-40 pt-[max(0px,env(safe-area-inset-top))]">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild>
                <button
                  aria-label="Open navigation menu"
                  className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-sm text-primary-foreground/80 hover:text-gold hover:bg-navy-light/40"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-navy border-gold/20 text-primary-foreground p-0 flex flex-col overflow-hidden">
                <SheetHeader className="px-4 py-4 border-b border-gold/20 text-left shrink-0 pt-[max(1rem,env(safe-area-inset-top))]">
                  <SheetTitle className="font-serif text-primary-foreground text-base">Members Portal</SheetTitle>
                </SheetHeader>
                <nav
                  aria-label="Members navigation"
                  className="flex flex-col gap-1 p-3 pb-28 flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
                  style={{ paddingBottom: "max(7rem, calc(2rem + env(safe-area-inset-bottom)))" }}
                  onClick={() => setDrawerOpen(false)}
                >
                  {navItems}
                </nav>

              </SheetContent>

            </Sheet>
            <Link to="/members" className="flex items-center gap-3">
              <img src={logo} alt="Weybridge Lodge crest" width={44} height={44} decoding="async" className="h-11 w-11 shrink-0 bg-primary-foreground/90 rounded-full p-0.5" />
              <div className="min-w-0">
                <p className="font-serif text-sm font-semibold leading-tight truncate">Members Portal</p>
                <p className="text-gold text-[10px] uppercase tracking-wider truncate">Weybridge Lodge 6787</p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/" className="text-xs text-primary-foreground/60 hover:text-gold hidden sm:inline">
              ← Public site
            </Link>
            <span className="text-xs text-primary-foreground/60 hidden md:inline">
              {profile?.full_name || profile?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-xs border border-gold/40 text-gold px-3 py-1.5 rounded-sm hover:bg-gold/10"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
        <aside className="hidden lg:block">
          <nav aria-label="Members navigation" className="flex flex-col gap-1">
            {navItems}
          </nav>
        </aside>
        <main className="pb-[max(7rem,calc(5rem+env(safe-area-inset-bottom)))] lg:pb-0">{children}</main>
      </div>

      {/* Mobile Bottom Sticky Navigation Strip — Visible below 1024px */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 min-h-16 bg-card border-t border-border flex items-stretch justify-around z-50"
        style={{ paddingTop: "0.5rem", paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <NavLink to="/members" end className={({ isActive }) => `flex flex-col items-center justify-center text-[10px] font-bold ${isActive ? "text-gold" : "text-muted-foreground"}`}>
          <Shield className="h-5 w-5" />
          Hub
        </NavLink>
        <NavLink to="/members/calendar" className={({ isActive }) => `flex flex-col items-center justify-center text-[10px] font-bold ${isActive ? "text-gold" : "text-muted-foreground"}`}>
          <CalendarDays className="h-5 w-5" />
          Calendar
        </NavLink>
        <NavLink to="/members/directory" className={({ isActive }) => `flex flex-col items-center justify-center text-[10px] font-bold ${isActive ? "text-gold" : "text-muted-foreground"}`}>
          <Users className="h-5 w-5" />
          Directory
        </NavLink>
        <NavLink to="/members/profile" className={({ isActive }) => `flex flex-col items-center justify-center text-[10px] font-bold ${isActive ? "text-gold" : "text-muted-foreground"}`}>
          <UserIcon className="h-5 w-5" />
          Profile
        </NavLink>
        <NavLink to="/members/ritual" className={({ isActive }) => `flex flex-col items-center justify-center text-[10px] font-bold ${isActive ? "text-gold" : "text-muted-foreground"}`}>
          <BookOpen className="h-5 w-5" />
          Ritual
        </NavLink>
      </div>
    </div>
  );
}
