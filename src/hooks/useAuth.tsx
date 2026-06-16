import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  title: string | null;
  first_name: string | null;
  last_name: string | null;
  rank: string | null;
  office: string | null;
  provincial_rank: string | null;
  grand_rank: string | null;
  date_of_birth: string | null;
  joined_year: number | null;
  phone: string | null;
  avatar_url: string | null;
  status: "pending" | "active" | "suspended";
  degree: "entered_apprentice" | "fellow_craft" | "master_mason" | "installed_master";
  is_past_master?: boolean;
  is_royal_arch?: boolean;
  is_honorary_member?: boolean;
  initiation_date?: string | null;
};

type Role = "member" | "admin" | "secretary" | "worshipful_master";

type AuthCtx = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  isSecretary: boolean;
  isWorshipfulMaster: boolean;
  canManageProgression: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfileAndRole = async (uid: string) => {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile((p as Profile) ?? null);
    setRoles(((r as { role: Role }[]) ?? []).map((x) => x.role));
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess?.user) {
        setTimeout(() => loadProfileAndRole(sess.user.id), 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      if (sess?.user) loadProfileAndRole(sess.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (session?.user) await loadProfileAndRole(session.user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
  };

  const isAdmin = roles.includes("admin");
  const isSecretary = roles.includes("secretary");
  const isWorshipfulMaster = roles.includes("worshipful_master");
  const canManageProgression = isAdmin || isSecretary || isWorshipfulMaster;

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, profile, isAdmin, isSecretary, isWorshipfulMaster, canManageProgression, loading, refreshProfile, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
