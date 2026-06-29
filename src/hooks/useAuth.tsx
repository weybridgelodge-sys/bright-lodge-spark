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

type Role = "member" | "admin" | "secretary" | "assistant_secretary" | "worshipful_master" | "director_of_ceremonies" | "almoner" | "charity_steward";

type AuthCtx = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  isSecretary: boolean;
  isAssistantSecretary: boolean;
  isWorshipfulMaster: boolean;
  isDirectorOfCeremonies: boolean;
  isAlmoner: boolean;
  isCharitySteward: boolean;
  isCurrentWmOrIpm: boolean;
  canManageProgression: boolean;
  canManageLOI: boolean;
  canManageSummons: boolean;
  canAccessAlmoner: boolean;
  canAccessCharity: boolean;
  canAccessAdminArea: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isCurrentWmOrIpm, setIsCurrentWmOrIpm] = useState(false);
  const [loading, setLoading] = useState(true);


  const loadProfileAndRole = async (uid: string) => {
    // NOTE: sensitive PII columns (date_of_birth, phone, address_line*, town,
    // county, postcode, ugle_reg_number) are NOT readable via direct table
    // SELECT — they're column-level revoked. They're merged below via the
    // security-definer `get_profiles_pii` RPC.
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id,email,full_name,title,first_name,middle_name,last_name,preferred_name,post_nominals,rank,office,provincial_rank,grand_rank,joined_year,avatar_url,status,degree,is_past_master,is_royal_arch,is_honorary_member,is_ugle_portal_registered,initiation_date,passing_date,raising_date,joined_lodge_date,royal_arch_date,proposer,mother_lodge,created_at,updated_at"
        )
        .eq("id", uid)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    // Merge own PII (DOB, phone, address, UGLE no.) from the security-definer RPC
    let merged: Profile | null = (p as unknown as Profile) ?? null;
    if (merged) {
      const { data: pii } = await (supabase as any).rpc("get_profiles_pii", { _ids: [uid] });
      const row = Array.isArray(pii) && pii.length ? pii[0] : null;
      if (row) merged = { ...merged, ...row };
    }
    setProfile(merged);
    setRoles(((r as { role: Role }[]) ?? []).map((x) => x.role));
    // WM/IPM detection for current lodge year (auto-rotates on installation)
    try {
      const { data: wm } = await supabase.rpc("is_current_wm_or_ipm", { _user_id: uid });
      setIsCurrentWmOrIpm(!!wm);
    } catch {
      setIsCurrentWmOrIpm(false);
    }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess?.user) {
        setTimeout(() => loadProfileAndRole(sess.user.id), 0);
      } else {
        setProfile(null);
        setRoles([]);
        setIsCurrentWmOrIpm(false);
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
    setIsCurrentWmOrIpm(false);
  };

  const isAdmin = roles.includes("admin");
  const isSecretary = roles.includes("secretary");
  const isAssistantSecretary = roles.includes("assistant_secretary");
  const isWorshipfulMaster = roles.includes("worshipful_master");
  const isDirectorOfCeremonies = roles.includes("director_of_ceremonies");
  const isAlmoner = roles.includes("almoner");
  const isCharitySteward = roles.includes("charity_steward");
  const canManageProgression = isAdmin || isSecretary || isWorshipfulMaster;
  const canManageLOI = isAdmin || isSecretary || isWorshipfulMaster || isDirectorOfCeremonies;
  const canManageSummons = isAdmin || isSecretary || isAssistantSecretary;
  const canAccessAlmoner = isAdmin || isAlmoner || isCurrentWmOrIpm;
  const canAccessCharity = isAdmin || isWorshipfulMaster || isCharitySteward || isSecretary;
  const canAccessAdminArea = isAdmin || isSecretary || isWorshipfulMaster || isDirectorOfCeremonies || isAlmoner || isCharitySteward || isAssistantSecretary;

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, profile, isAdmin, isSecretary, isAssistantSecretary, isWorshipfulMaster, isDirectorOfCeremonies, isAlmoner, isCharitySteward, isCurrentWmOrIpm, canManageProgression, canManageLOI, canManageSummons, canAccessAlmoner, canAccessCharity, canAccessAdminArea, loading, refreshProfile, signOut }}>
      {children}
    </Ctx.Provider>
  );
}


export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
