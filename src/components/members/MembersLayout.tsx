import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LayoutDashboard, Users, FileText, User as UserIcon, ShieldCheck, LogOut, Shield, CalendarDays, CreditCard, BookOpen } from "lucide-react";
import logo from "@/assets/weybridge-logo.svg";

const navCls = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 px-3 py-2 rounded-sm text-sm font-sans transition-colors ${
    isActive ? "bg-gold/15 text-gold" : "text-primary-foreground/70 hover:text-gold hover:bg-navy-light/40"
  }`;

export default function MembersLayout({ children }: { children: React.ReactNode }) {
  const { profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/members/login");
  };

  return (
    <div className="min-h-screen bg-navy text-primary-foreground">
      <header className="border-b border-gold/20 bg-navy-dark/80 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/members" className="flex items-center gap-3">
            <img src={logo} alt="Weybridge Lodge crest" className="h-9 w-9 bg-primary-foreground/80 rounded-full p-0.5" />
            <div>
              <p className="font-serif text-sm font-semibold leading-tight">Members Portal</p>
              <p className="text-gold text-[10px] uppercase tracking-wider">Weybridge Lodge 6787</p>
            </div>
          </Link>
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
        <aside>
          <nav aria-label="Members navigation" className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
            <NavLink to="/members" end className={navCls}>
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </NavLink>
            <NavLink to="/members/directory" className={navCls}>
              <Users className="w-4 h-4" /> Directory
            </NavLink>
            <NavLink to="/members/documents" className={navCls}>
              <FileText className="w-4 h-4" /> Documents
            </NavLink>
            <NavLink to="/members/profile" className={navCls}>
              <UserIcon className="w-4 h-4" /> My Profile
            </NavLink>
            {isAdmin && (
              <NavLink to="/members/admin" className={navCls}>
                <ShieldCheck className="w-4 h-4" /> Admin
              </NavLink>
            )}
          </nav>
        </aside>
        <main className="pb-20 lg:pb-0">{children}</main>
      </div>

      {/* Mobile Bottom Sticky Navigation Strip — Visible below 1024px */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around z-50">
        <NavLink to="/members" end className={({ isActive }) => `flex flex-col items-center justify-center text-[10px] font-bold ${isActive ? "text-gold" : "text-muted-foreground"}`}>
          <Shield className="h-5 w-5" />
          Hub
        </NavLink>
        <NavLink to="/members/directory" className={({ isActive }) => `flex flex-col items-center justify-center text-[10px] font-bold ${isActive ? "text-gold" : "text-muted-foreground"}`}>
          <CalendarDays className="h-5 w-5" />
          Trestle
        </NavLink>
        <NavLink to="/members/profile" className={({ isActive }) => `flex flex-col items-center justify-center text-[10px] font-bold ${isActive ? "text-gold" : "text-muted-foreground"}`}>
          <CreditCard className="h-5 w-5" />
          Accounts
        </NavLink>
        <NavLink to="/members/documents" className={({ isActive }) => `flex flex-col items-center justify-center text-[10px] font-bold ${isActive ? "text-gold" : "text-muted-foreground"}`}>
          <BookOpen className="h-5 w-5" />
          Ritual
        </NavLink>
      </div>
    </div>
  );
}
