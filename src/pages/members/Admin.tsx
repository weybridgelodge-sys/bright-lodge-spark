import { useEffect, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X, ShieldPlus, ShieldMinus, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type Degree = "entered_apprentice" | "fellow_craft" | "master_mason";

const DEGREE_LABEL: Record<Degree, string> = {
  entered_apprentice: "Entered Apprentice",
  fellow_craft: "Fellow Craft",
  master_mason: "Master Mason",
};

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  ugle_reg_number: string | null;
  mother_lodge: string | null;
  status: "pending" | "active" | "suspended";
  degree: Degree;
  is_past_master: boolean;
  created_at: string;
};

type Role = { user_id: string; role: "member" | "admin" };

type Notice = {
  id: string;
  title: string;
  body: string;
  event_date: string | null;
  created_at: string;
};

export default function MembersAdmin() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [tab, setTab] = useState<"users" | "add" | "notices">("users");

  const [nTitle, setNTitle] = useState("");
  const [nBody, setNBody] = useState("");
  const [nDate, setNDate] = useState("");

  // Add-member form
  const [aEmail, setAEmail] = useState("");
  const [aName, setAName] = useState("");
  const [aInit, setAInit] = useState("");
  const [aDegree, setADegree] = useState<Degree>("master_mason");
  const [aPastMaster, setAPastMaster] = useState(false);
  const [aRank, setARank] = useState("");
  const [aBusy, setABusy] = useState(false);

  const load = async () => {
    const [{ data: p }, { data: r }, { data: n }] = await Promise.all([
      supabase.from("profiles").select("id,email,full_name,ugle_reg_number,mother_lodge,status,degree,is_past_master,created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id,role"),
      supabase.from("member_notices").select("*").order("created_at", { ascending: false }),
    ]);
    setProfiles((p as Profile[]) ?? []);
    setRoles((r as Role[]) ?? []);
    setNotices((n as Notice[]) ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  const setStatus = async (id: string, status: Profile["status"]) => {
    const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Member ${status}`);
      load();
    }
  };

  const setDegree = async (id: string, degree: Degree) => {
    const { error } = await supabase.from("profiles").update({ degree }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Degree set to ${DEGREE_LABEL[degree]}`);
      load();
    }
  };

  const togglePastMaster = async (id: string, value: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_past_master: value }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(value ? "Marked as Past Master" : "Past Master removed");
      load();
    }
  };

  const toggleAdmin = async (uid: string, makeAdmin: boolean) => {
    if (makeAdmin) {
      const { error } = await supabase.from("user_roles").insert({ user_id: uid, role: "admin" });
      if (error) toast.error(error.message);
      else toast.success("Promoted to admin");
    } else {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", "admin");
      if (error) toast.error(error.message);
      else toast.success("Admin removed");
    }
    load();
  };

  const addNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("member_notices").insert({
      title: nTitle.trim(),
      body: nBody.trim(),
      event_date: nDate ? new Date(nDate).toISOString() : null,
      author_id: user.id,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Notice posted");
      setNTitle("");
      setNBody("");
      setNDate("");
      load();
    }
  };

  const deleteNotice = async (id: string) => {
    if (!confirm("Delete this notice?")) return;
    await supabase.from("member_notices").delete().eq("id", id);
    load();
  };

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aEmail.trim() || !aName.trim()) return;
    setABusy(true);
    const { data, error } = await supabase.functions.invoke("admin-invite-member", {
      body: {
        email: aEmail.trim(),
        full_name: aName.trim(),
        initiation_date: aInit || null,
        degree: aDegree,
        is_past_master: aPastMaster,
        rank: aRank.trim() || null,
        status: "active",
      },
    });
    setABusy(false);
    if (error || (data as { error?: unknown })?.error) {
      const msg = (data as { error?: string })?.error ?? error?.message ?? "Could not add member";
      toast.error(typeof msg === "string" ? msg : "Could not add member");
      return;
    }
    toast.success(`${aName} added — they can sign in with ${aEmail}`);
    setAEmail("");
    setAName("");
    setAInit("");
    setARank("");
    setADegree("master_mason");
    setAPastMaster(false);
    setTab("users");
    load();
  };

  const isAdmin = (uid: string) => roles.some((r) => r.user_id === uid && r.role === "admin");

  return (
    <MembersLayout>
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-gold mb-2">Admin</h1>
        <p className="text-sm text-primary-foreground/60">Manage members, roles, and notices.</p>
      </div>

      <div className="flex gap-2 border-b border-gold/15 mb-6">
        {(["users", "add", "notices"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm uppercase tracking-wider border-b-2 -mb-px ${
              tab === t ? "border-gold text-gold" : "border-transparent text-primary-foreground/60 hover:text-gold"
            }`}
          >
            {t === "add" ? "Add Member" : t}
          </button>
        ))}
      </div>

      {tab === "users" && (
        <div className="bg-navy-dark/60 border border-gold/15 rounded-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-primary-foreground/50">
              <tr>
                <th className="text-left p-3">Member</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Role</th>
                <th className="text-left p-3">Degree</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold/10">
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td className="p-3">
                    <p className="font-medium">{p.full_name || "(No name)"}</p>
                    <p className="text-xs text-primary-foreground/50">{p.email}</p>
                    {(p.ugle_reg_number || p.mother_lodge) && (
                      <p className="text-[11px] text-primary-foreground/50 mt-1">
                        {p.ugle_reg_number && <>UGLE #{p.ugle_reg_number}</>}
                        {p.ugle_reg_number && p.mother_lodge && <> · </>}
                        {p.mother_lodge}
                      </p>
                    )}
                  </td>
                  <td className="p-3 text-xs uppercase tracking-wider">
                    <span
                      className={
                        p.status === "active"
                          ? "text-gold"
                          : p.status === "pending"
                          ? "text-amber-400"
                          : "text-red-400"
                      }
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="p-3 text-xs uppercase tracking-wider">{isAdmin(p.id) ? "Admin" : "Member"}</td>
                  <td className="p-3">
                    <select
                      value={p.degree ?? "entered_apprentice"}
                      onChange={(e) => setDegree(p.id, e.target.value as Degree)}
                      className="bg-navy border border-gold/20 rounded-sm px-2 py-1 text-xs focus:outline-none focus:border-gold"
                      aria-label={`Set degree for ${p.full_name || p.email}`}
                    >
                      <option value="entered_apprentice">Entered Apprentice</option>
                      <option value="fellow_craft">Fellow Craft</option>
                      <option value="master_mason">Master Mason</option>
                    </select>
                    <label className="mt-1 flex items-center gap-1.5 text-[11px] text-primary-foreground/70 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!p.is_past_master}
                        onChange={(e) => togglePastMaster(p.id, e.target.checked)}
                        className="accent-gold"
                      />
                      Past Master
                    </label>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1 justify-end">
                      {p.status !== "active" && (
                        <button
                          onClick={() => setStatus(p.id, "active")}
                          className="p-1.5 text-gold hover:bg-gold/10 rounded-sm"
                          aria-label="Approve"
                          title="Approve"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      {p.status !== "suspended" && (
                        <button
                          onClick={() => setStatus(p.id, "suspended")}
                          className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-sm"
                          aria-label="Suspend"
                          title="Suspend"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => toggleAdmin(p.id, !isAdmin(p.id))}
                        className="p-1.5 text-primary-foreground/70 hover:text-gold hover:bg-gold/10 rounded-sm"
                        aria-label={isAdmin(p.id) ? "Remove admin" : "Make admin"}
                        title={isAdmin(p.id) ? "Remove admin" : "Make admin"}
                      >
                        {isAdmin(p.id) ? <ShieldMinus className="w-4 h-4" /> : <ShieldPlus className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "add" && (
        <form onSubmit={addMember} className="bg-navy-dark/60 border border-gold/15 rounded-sm p-5 space-y-3 max-w-xl">
          <div className="flex items-center gap-2 text-gold">
            <Plus className="w-4 h-4" />
            <h2 className="font-serif text-base">Pre-create a member</h2>
          </div>
          <p className="text-xs text-primary-foreground/60">
            Adds the brother to the portal with an active account so they can sign in via
            magic link or Google as soon as we go live — no registration step required.
            Use this to seed the Officers Progression Tracker.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              required
              value={aName}
              onChange={(e) => setAName(e.target.value)}
              placeholder="Full name (e.g. W Bro. John Smith)"
              className="w-full bg-navy border border-gold/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-gold"
            />
            <input
              required
              type="email"
              value={aEmail}
              onChange={(e) => setAEmail(e.target.value)}
              placeholder="Email address"
              className="w-full bg-navy border border-gold/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-gold"
            />
            <label className="text-xs uppercase tracking-wider text-primary-foreground/60 sm:col-span-1">
              Initiation date
              <input
                type="date"
                value={aInit}
                onChange={(e) => setAInit(e.target.value)}
                className="mt-1 w-full bg-navy border border-gold/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-gold normal-case tracking-normal text-primary-foreground"
              />
            </label>
            <label className="text-xs uppercase tracking-wider text-primary-foreground/60">
              Degree
              <select
                value={aDegree}
                onChange={(e) => setADegree(e.target.value as Degree)}
                className="mt-1 w-full bg-navy border border-gold/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-gold normal-case tracking-normal text-primary-foreground"
              >
                <option value="entered_apprentice">Entered Apprentice</option>
                <option value="fellow_craft">Fellow Craft</option>
                <option value="master_mason">Master Mason</option>
              </select>
            </label>
            <input
              value={aRank}
              onChange={(e) => setARank(e.target.value)}
              placeholder="Rank (optional, e.g. PPrJGW)"
              className="sm:col-span-2 w-full bg-navy border border-gold/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-gold"
            />
          </div>
          <button
            disabled={aBusy}
            className="bg-gold-shimmer text-accent-foreground px-4 py-2 rounded-sm text-sm font-semibold disabled:opacity-50"
          >
            {aBusy ? "Adding…" : "Add member"}
          </button>
        </form>
      )}


      {tab === "notices" && (
        <div className="space-y-6">
          <form onSubmit={addNotice} className="bg-navy-dark/60 border border-gold/15 rounded-sm p-5 space-y-3">
            <div className="flex items-center gap-2 text-gold">
              <Plus className="w-4 h-4" />
              <h2 className="font-serif text-base">Post a notice</h2>
            </div>
            <input
              required
              value={nTitle}
              onChange={(e) => setNTitle(e.target.value)}
              placeholder="Title"
              className="w-full bg-navy border border-gold/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-gold"
            />
            <textarea
              required
              value={nBody}
              onChange={(e) => setNBody(e.target.value)}
              placeholder="Message…"
              rows={4}
              className="w-full bg-navy border border-gold/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-gold"
            />
            <input
              type="datetime-local"
              value={nDate}
              onChange={(e) => setNDate(e.target.value)}
              className="bg-navy border border-gold/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-gold"
            />
            <button className="bg-gold-shimmer text-accent-foreground px-4 py-2 rounded-sm text-sm font-semibold">
              Post notice
            </button>
          </form>

          <ul className="space-y-3">
            {notices.map((n) => (
              <li
                key={n.id}
                className="bg-navy-dark/60 border border-gold/15 rounded-sm p-4 flex items-start justify-between gap-3"
              >
                <div>
                  <p className="font-semibold">{n.title}</p>
                  {n.event_date && (
                    <p className="text-[11px] text-gold mb-1">
                      {new Date(n.event_date).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  )}
                  <p className="text-xs text-primary-foreground/70 whitespace-pre-wrap">{n.body}</p>
                </div>
                <button
                  onClick={() => deleteNotice(n.id)}
                  className="text-red-400 p-2 hover:bg-red-500/10 rounded-sm shrink-0"
                  aria-label="Delete notice"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </MembersLayout>
  );
}
