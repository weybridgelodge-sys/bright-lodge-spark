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
  isCurrentTreasurer: boolean;
  isCurrentAuditor1: boolean;
  isCurrentAuditor2: boolean;
  /** Holds the Secretary office in officer_appointments for the current lodge year. */
  isCurrentSecretary: boolean;
  isCurrentAlmoner: boolean;
  isCurrentCharitySteward: boolean;
  isCurrentMentor: boolean;
  /** Mentor Portal: admin, WM/DC roles, or the current Mentor. Separate from canManageProgression (KPIs, Officers Tracker). */
  canAccessMentorPortal: boolean;
  canManageProgression: boolean;
  canManageLOI: boolean;
  canManageSummons: boolean;
  canAccessAlmoner: boolean;
  canAccessCharity: boolean;
  canAccessTreasurer: boolean;
  canAccessAdminArea: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

const isLocalLayoutTest =
  import.meta.env.MODE === "e2e" &&
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

const layoutTestUser = {
  id: "00000000-0000-4000-8000-000000000001",
  aud: "authenticated",
  role: "authenticated",
  email: "portal-layout-test@localhost.invalid",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-01-01T00:00:00.000Z",
} as User;

const layoutTestSession = {
  access_token: "local-layout-test-only",
  refresh_token: "local-layout-test-only",
  expires_in: 3600,
  token_type: "bearer",
  user: layoutTestUser,
} as Session;

const layoutTestProfile: Profile = {
  id: layoutTestUser.id,
  email: layoutTestUser.email ?? null,
  full_name: "W Bro. Bartholomew Montgomery-Smythe",
  title: "W Bro.",
  first_name: "Bartholomew",
  last_name: "Montgomery-Smythe",
  rank: null,
  office: null,
  provincial_rank: null,
  grand_rank: null,
  date_of_birth: null,
  joined_year: 2000,
  phone: null,
  avatar_url: null,
  status: "active",
  degree: "installed_master",
};

// Local layout tests only: "?e2e_as=secretary" narrows the synthetic identity
// to the Secretary alone (no admin, no other offices).
const layoutTestSecretaryOnly =
  isLocalLayoutTest && new URLSearchParams(window.location.search).get("e2e_as") === "secretary";
const layoutAll = isLocalLayoutTest && !layoutTestSecretaryOnly;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(isLocalLayoutTest ? layoutTestSession : null);
  const [profile, setProfile] = useState<Profile | null>(isLocalLayoutTest ? layoutTestProfile : null);
  const [roles, setRoles] = useState<Role[]>(
    layoutTestSecretaryOnly ? ["member", "secretary"] as Role[] : isLocalLayoutTest ? ["admin", "secretary", "worshipful_master"] : [],
  );
  const [isCurrentWmOrIpm, setIsCurrentWmOrIpm] = useState(layoutAll);
  const [isCurrentTreasurer, setIsCurrentTreasurer] = useState(layoutAll);
  const [isCurrentAuditor1, setIsCurrentAuditor1] = useState(layoutAll);
  const [isCurrentAuditor2, setIsCurrentAuditor2] = useState(layoutAll);
  const [isCurrentSecretary, setIsCurrentSecretary] = useState(isLocalLayoutTest);
  const [isCurrentAlmoner, setIsCurrentAlmoner] = useState(layoutAll);
  const [isCurrentCharitySteward, setIsCurrentCharitySteward] = useState(layoutAll);
  const [isCurrentMentor, setIsCurrentMentor] = useState(layoutAll);
  const [loading, setLoading] = useState(!isLocalLayoutTest);


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
    // WM/IPM + Treasurer/Auditor detection for current lodge year (auto-rotates on installation)
    try {
      const [{ data: wm }, { data: tr }, { data: a1 }, { data: a2 }, { data: sec }, { data: alm }, { data: cs }, { data: men }] = await Promise.all([
        supabase.rpc("is_current_wm_or_ipm", { _user_id: uid }),
        supabase.rpc("is_current_officer" as any, { _user_id: uid, _position_key: "treasurer" } as any),
        supabase.rpc("is_current_officer" as any, { _user_id: uid, _position_key: "auditor_1" } as any),
        supabase.rpc("is_current_officer" as any, { _user_id: uid, _position_key: "auditor_2" } as any),
        supabase.rpc("is_current_officer" as any, { _user_id: uid, _position_key: "secretary" } as any),
        supabase.rpc("is_current_officer" as any, { _user_id: uid, _position_key: "almoner" } as any),
        supabase.rpc("is_current_officer" as any, { _user_id: uid, _position_key: "charity_steward" } as any),
        supabase.rpc("is_current_officer" as any, { _user_id: uid, _position_key: "mentor" } as any),
      ]);
      setIsCurrentWmOrIpm(!!wm);
      setIsCurrentTreasurer(!!tr);
      setIsCurrentAuditor1(!!a1);
      setIsCurrentAuditor2(!!a2);
      setIsCurrentSecretary(!!sec);
      setIsCurrentAlmoner(!!alm);
      setIsCurrentCharitySteward(!!cs);
      setIsCurrentMentor(!!men);
    } catch {
      setIsCurrentWmOrIpm(false);
      setIsCurrentTreasurer(false);
      setIsCurrentAuditor1(false);
      setIsCurrentAuditor2(false);
      setIsCurrentSecretary(false);
      setIsCurrentAlmoner(false);
      setIsCurrentCharitySteward(false);
      setIsCurrentMentor(false);
    }
  };

  useEffect(() => {
    if (isLocalLayoutTest) return;
    // Backstop: if the auth chain below ever fails to settle for any reason, the
    // app must not sit behind ProtectedRoute's full-screen loader forever.
    const SETTLE_GUARD_MS = 8000;
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      setLoading(false);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess?.user) {
        setTimeout(() => {
          loadProfileAndRole(sess.user.id).catch(() => {}).finally(settle);
        }, 0);
      } else {
        setProfile(null);
        setRoles([]);
        setIsCurrentWmOrIpm(false);
        settle();
      }
    });

    supabase.auth
      .getSession()
      .then(({ data: { session: sess } }) => {
        setSession(sess ?? null);
        if (sess?.user) loadProfileAndRole(sess.user.id).catch(() => {}).finally(settle);
        else settle();
      })
      .catch(() => {
        // getSession() itself failed (storage/network/browser context): fall
        // through to the normal "not logged in" path instead of hanging.
        setSession(null);
        setProfile(null);
        setRoles([]);
        settle();
      });

    const guard = window.setTimeout(() => settle(), SETTLE_GUARD_MS);

    return () => {
      window.clearTimeout(guard);
      sub.subscription.unsubscribe();
    };
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
  const canAccessAlmoner = isAdmin || isAlmoner || isCurrentAlmoner || isCurrentWmOrIpm;
  const canAccessCharity = isAdmin || isWorshipfulMaster || isCharitySteward || isCurrentCharitySteward;
  const canAccessMentorPortal = isAdmin || isWorshipfulMaster || isDirectorOfCeremonies || isCurrentMentor;
  const canAccessTreasurer = isAdmin || isCurrentTreasurer || isCurrentAuditor1 || isCurrentAuditor2 || isWorshipfulMaster || isCurrentWmOrIpm || isSecretary || isCurrentSecretary;
  const canAccessAdminArea = isAdmin || isSecretary || isWorshipfulMaster || isDirectorOfCeremonies || isAlmoner || isCharitySteward || isAssistantSecretary || isCurrentAlmoner || isCurrentCharitySteward || isCurrentMentor || isCurrentWmOrIpm || isCurrentSecretary || isCurrentTreasurer || isCurrentAuditor1 || isCurrentAuditor2;

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, profile, isAdmin, isSecretary, isAssistantSecretary, isWorshipfulMaster, isDirectorOfCeremonies, isAlmoner, isCharitySteward, isCurrentWmOrIpm, isCurrentTreasurer, isCurrentAuditor1, isCurrentAuditor2, isCurrentSecretary, isCurrentAlmoner, isCurrentCharitySteward, isCurrentMentor, canAccessMentorPortal, canManageProgression, canManageLOI, canManageSummons, canAccessAlmoner, canAccessCharity, canAccessTreasurer, canAccessAdminArea, loading, refreshProfile, signOut }}>
      {children}
    </Ctx.Provider>
  );
}


export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
