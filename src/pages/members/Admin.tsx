import { useEffect, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X, ShieldPlus, ShieldMinus, Plus, Trash2, Pencil } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type Degree = "entered_apprentice" | "fellow_craft" | "master_mason";
type Title = "Bro" | "W Bro" | "VW Bro" | "RW Bro";
type Status = "pending" | "active" | "suspended" | "year_out" | "resigned" | "excluded" | "deceased";

const TITLES: Title[] = ["Bro", "W Bro", "VW Bro", "RW Bro"];
const STATUSES: { value: Status; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "year_out", label: "Year Out" },
  { value: "suspended", label: "Suspended" },
  { value: "resigned", label: "Resigned" },
  { value: "excluded", label: "Excluded" },
  { value: "deceased", label: "Deceased" },
];

const DEGREE_LABEL: Record<Degree, string> = {
  entered_apprentice: "Entered Apprentice",
  fellow_craft: "Fellow Craft",
  master_mason: "Master Mason",
};

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  title: Title | null;
  first_name: string | null;
  last_name: string | null;
  provincial_rank: string | null;
  grand_rank: string | null;
  date_of_birth: string | null;
  initiation_date: string | null;
  rank: string | null;
  ugle_reg_number: string | null;
  mother_lodge: string | null;
  status: Status;
  degree: Degree;
  is_past_master: boolean;
  is_royal_arch: boolean;
  is_honorary_member: boolean;
  is_ugle_portal_registered: boolean;
  passing_date: string | null;
  raising_date: string | null;
  joined_lodge_date: string | null;
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

const EMPTY_FORM = {
  id: "" as string,
  email: "",
  title: "" as "" | Title,
  first_name: "",
  last_name: "",
  provincial_rank: "",
  grand_rank: "",
  date_of_birth: "",
  initiation_date: "",
  degree: "master_mason" as Degree,
  is_past_master: false,
  is_royal_arch: false,
  is_honorary_member: false,
  rank: "",
  status: "active" as Status,
  is_ugle_portal_registered: false,
  passing_date: "",
  raising_date: "",
  joined_lodge_date: "",
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

  // Member form (create + edit)
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const isEdit = !!form.id;

  const load = async () => {
    const [{ data: p }, { data: r }, { data: n }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id,email,full_name,title,first_name,last_name,provincial_rank,grand_rank,date_of_birth,initiation_date,rank,ugle_reg_number,mother_lodge,status,degree,is_past_master,is_royal_arch,is_honorary_member,is_ugle_portal_registered,passing_date,raising_date,joined_lodge_date,created_at"
        )
        .order("created_at", { ascending: false }),
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

  const startEdit = (p: Profile) => {
    setForm({
      id: p.id,
      email: p.email ?? "",
      title: (p.title as Title) ?? "",
      first_name: p.first_name ?? "",
      last_name: p.last_name ?? "",
      provincial_rank: p.provincial_rank ?? "",
      grand_rank: p.grand_rank ?? "",
      date_of_birth: p.date_of_birth ?? "",
      initiation_date: p.initiation_date ?? "",
      degree: p.degree,
      is_past_master: p.is_past_master,
      is_royal_arch: p.is_royal_arch,
      is_honorary_member: p.is_honorary_member,
      rank: p.rank ?? "",
      status: p.status,
      is_ugle_portal_registered: p.is_ugle_portal_registered ?? false,
      passing_date: p.passing_date ?? "",
      raising_date: p.raising_date ?? "",
      joined_lodge_date: p.joined_lodge_date ?? "",
    });
    setTab("add");
  };

  const resetForm = () => setForm(EMPTY_FORM);

  const entryType: "initiate" | "joiner" =
    form.joined_lodge_date && form.joined_lodge_date !== form.initiation_date ? "joiner" : "initiate";

  const setEntryType = (t: "initiate" | "joiner") => {
    if (t === "initiate") {
      setForm({ ...form, joined_lodge_date: "" });
    } else {
      setForm({ ...form, joined_lodge_date: form.joined_lodge_date || form.initiation_date });
    }
  };

  const saveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() || !form.first_name.trim() || !form.last_name.trim()) {
      toast.error("Title, first name, last name and email are required");
      return;
    }
    setBusy(true);
    // For initiates, joined_lodge_date mirrors initiation_date so KPI "movement in" still works.
    const joinedLodge =
      entryType === "initiate"
        ? form.initiation_date || null
        : form.joined_lodge_date || null;
    const payload: Record<string, unknown> = {
      email: form.email.trim(),
      title: form.title || null,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      provincial_rank: form.provincial_rank.trim() || null,
      grand_rank: form.grand_rank.trim() || null,
      date_of_birth: form.date_of_birth || null,
      initiation_date: form.initiation_date || null,
      degree: form.degree,
      is_past_master: form.is_past_master,
      is_royal_arch: form.is_royal_arch,
      is_honorary_member: form.is_honorary_member,
      rank: form.rank.trim() || null,
      status: form.status,
      is_ugle_portal_registered: form.is_ugle_portal_registered,
      passing_date: form.passing_date || null,
      raising_date: form.raising_date || null,
      joined_lodge_date: joinedLodge,
    };
    if (form.id) payload.id = form.id;

    const { data, error } = await supabase.functions.invoke("admin-invite-member", { body: payload });
    setBusy(false);

    if (error || (data as { error?: unknown })?.error) {
      const msg = (data as { error?: string })?.error ?? error?.message ?? "Could not save member";
      toast.error(typeof msg === "string" ? msg : "Could not save member");
      return;
    }
    toast.success(isEdit ? "Member updated" : `${form.first_name} ${form.last_name} added`);
    resetForm();
    setTab("users");
    load();
  };

  const isAdminUser = (uid: string) => roles.some((r) => r.user_id === uid && r.role === "admin");

  const inputCls =
    "w-full bg-navy border border-gold/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-gold";
  const labelCls = "text-xs uppercase tracking-wider text-primary-foreground/60 block";

  return (
    <MembersLayout>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl text-gold mb-2">Admin</h1>
          <p className="text-sm text-primary-foreground/60">Manage members, roles, and notices.</p>
        </div>
        <button
          onClick={async () => {
            if (!confirm("Import the 2026 Lodge roster? New members will be created; existing profiles will have blank fields filled in (no data overwritten).")) return;
            const t = toast.loading("Importing 2026 roster…");
            const { data, error } = await supabase.functions.invoke("admin-bulk-import-2026", { body: {} });
            toast.dismiss(t);
            if (error || (data as { error?: string })?.error) {
              toast.error((data as { error?: string })?.error ?? error?.message ?? "Import failed");
              return;
            }
            const s = (data as { summary?: { created: number; updated: number; no_change: number; errors: number } }).summary;
            toast.success(`Roster imported — created ${s?.created ?? 0}, updated ${s?.updated ?? 0}, unchanged ${s?.no_change ?? 0}, errors ${s?.errors ?? 0}`);
            load();
          }}
          className="text-xs uppercase tracking-wider border border-gold/40 text-gold px-3 py-2 rounded-sm hover:bg-gold/10"
          title="One-shot import of the Lodge Members List 2026 — safe to re-run"
        >
          Import 2026 Roster
        </button>
      </div>


      <div className="flex gap-2 border-b border-gold/15 mb-6">
        {(["users", "add", "notices"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              if (t === "add" && tab !== "add") resetForm();
              setTab(t);
            }}
            className={`px-3 py-2 text-sm uppercase tracking-wider border-b-2 -mb-px ${
              tab === t ? "border-gold text-gold" : "border-transparent text-primary-foreground/60 hover:text-gold"
            }`}
          >
            {t === "add" ? (isEdit ? "Edit Member" : "Add Member") : t}
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
                <th className="text-left p-3">Flags</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold/10">
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td className="p-3">
                    <p className="font-medium">{p.full_name || "(No name)"}</p>
                    <p className="text-xs text-primary-foreground/50">{p.email}</p>
                    {(p.provincial_rank || p.grand_rank) && (
                      <p className="text-[11px] text-primary-foreground/60 mt-1">
                        {p.grand_rank ? `Grand: ${p.grand_rank}` : `Prov: ${p.provincial_rank}`}
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
                  <td className="p-3 text-xs uppercase tracking-wider">
                    {isAdminUser(p.id) ? "Admin" : "Member"}
                  </td>
                  <td className="p-3 text-[11px] text-primary-foreground/70 space-y-0.5">
                    <div>{DEGREE_LABEL[p.degree]}</div>
                    {p.is_past_master && <div className="text-gold">PM</div>}
                    {p.is_royal_arch && <div>RA</div>}
                    {p.is_honorary_member && <div>Honorary</div>}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => startEdit(p)}
                        className="p-1.5 text-primary-foreground/70 hover:text-gold hover:bg-gold/10 rounded-sm"
                        aria-label="Edit member"
                        title="Edit member"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
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
                        onClick={() => toggleAdmin(p.id, !isAdminUser(p.id))}
                        className="p-1.5 text-primary-foreground/70 hover:text-gold hover:bg-gold/10 rounded-sm"
                        aria-label={isAdminUser(p.id) ? "Remove admin" : "Make admin"}
                        title={isAdminUser(p.id) ? "Remove admin" : "Make admin"}
                      >
                        {isAdminUser(p.id) ? (
                          <ShieldMinus className="w-4 h-4" />
                        ) : (
                          <ShieldPlus className="w-4 h-4" />
                        )}
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
        <form
          onSubmit={saveMember}
          className="bg-navy-dark/60 border border-gold/15 rounded-sm p-5 space-y-4 max-w-2xl"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-gold">
              {isEdit ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <h2 className="font-serif text-base">
                {isEdit ? "Edit member" : "Pre-create a member"}
              </h2>
            </div>
            {isEdit && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs uppercase tracking-wider text-primary-foreground/60 hover:text-gold"
              >
                + New instead
              </button>
            )}
          </div>

          {!isEdit && (
            <p className="text-xs text-primary-foreground/60">
              Adds the brother to the portal with an active account so he can sign in via magic
              link or Google straight away — no registration step required.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
            <label className={`${labelCls} sm:col-span-2`}>
              Title
              <select
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value as "" | Title })}
                className={`mt-1 ${inputCls} normal-case tracking-normal text-primary-foreground`}
              >
                <option value="">—</option>
                {TITLES.map((t) => (
                  <option key={t} value={t}>
                    {t}.
                  </option>
                ))}
              </select>
            </label>
            <label className={`${labelCls} sm:col-span-2`}>
              First name
              <input
                required
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className={`mt-1 ${inputCls} normal-case tracking-normal text-primary-foreground`}
              />
            </label>
            <label className={`${labelCls} sm:col-span-2`}>
              Last name
              <input
                required
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className={`mt-1 ${inputCls} normal-case tracking-normal text-primary-foreground`}
              />
            </label>

            <label className={`${labelCls} sm:col-span-6`}>
              Email address
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={`mt-1 ${inputCls} normal-case tracking-normal text-primary-foreground`}
              />
            </label>

            <label className={`${labelCls} sm:col-span-3`}>
              Provincial rank
              <input
                value={form.provincial_rank}
                onChange={(e) => setForm({ ...form, provincial_rank: e.target.value })}
                placeholder="e.g. PPrJGW"
                className={`mt-1 ${inputCls} normal-case tracking-normal text-primary-foreground`}
              />
            </label>
            <label className={`${labelCls} sm:col-span-3`}>
              Grand rank
              <input
                value={form.grand_rank}
                onChange={(e) => setForm({ ...form, grand_rank: e.target.value })}
                placeholder="e.g. PAGDC"
                className={`mt-1 ${inputCls} normal-case tracking-normal text-primary-foreground`}
              />
            </label>

            <label className={`${labelCls} sm:col-span-3`}>
              Date of birth
              <input
                type="date"
                value={form.date_of_birth}
                onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                className={`mt-1 ${inputCls} normal-case tracking-normal text-primary-foreground`}
              />
            </label>
            <label className={`${labelCls} sm:col-span-2`}>
              Entry type
              <select
                value={entryType}
                onChange={(e) => setEntryType(e.target.value as "initiate" | "joiner")}
                className={`mt-1 ${inputCls} normal-case tracking-normal text-primary-foreground`}
              >
                <option value="initiate">Initiate (I)</option>
                <option value="joiner">Joiner (J)</option>
              </select>
            </label>
            <label className={`${labelCls} sm:col-span-1`}>
              {entryType === "joiner" ? "Original initiation date" : "Initiation date"}
              <input
                type="date"
                value={form.initiation_date}
                onChange={(e) => setForm({ ...form, initiation_date: e.target.value })}
                className={`mt-1 ${inputCls} normal-case tracking-normal text-primary-foreground`}
              />
            </label>

            <label className={`${labelCls} sm:col-span-6`}>
              Degree
              <select
                value={form.is_past_master ? "past_master" : form.degree}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "past_master") {
                    setForm({ ...form, is_past_master: true, degree: "master_mason" });
                  } else {
                    setForm({ ...form, is_past_master: false, degree: v as Degree });
                  }
                }}
                className={`mt-1 ${inputCls} normal-case tracking-normal text-primary-foreground`}
              >
                <option value="entered_apprentice">Entered Apprentice</option>
                <option value="fellow_craft">Fellow Craft</option>
                <option value="master_mason">Master Mason</option>
                <option value="past_master">Past Master (incl. Installed Masters ritual)</option>
              </select>
            </label>

            <label className={`${labelCls} sm:col-span-2`}>
              Date Passed (FC)
              <input
                type="date"
                value={form.passing_date}
                onChange={(e) => setForm({ ...form, passing_date: e.target.value })}
                className={`mt-1 ${inputCls} normal-case tracking-normal text-primary-foreground`}
              />
            </label>
            <label className={`${labelCls} sm:col-span-2`}>
              Date Raised (MM)
              <input
                type="date"
                value={form.raising_date}
                onChange={(e) => setForm({ ...form, raising_date: e.target.value })}
                className={`mt-1 ${inputCls} normal-case tracking-normal text-primary-foreground`}
              />
            </label>
            <label className={`${labelCls} sm:col-span-2`}>
              Joined this Lodge
              <input
                type="date"
                value={form.joined_lodge_date}
                onChange={(e) => setForm({ ...form, joined_lodge_date: e.target.value })}
                className={`mt-1 ${inputCls} normal-case tracking-normal text-primary-foreground`}
              />
            </label>

            <label className={`${labelCls} sm:col-span-3`}>
              Member status
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as Status })}
                className={`mt-1 ${inputCls} normal-case tracking-normal text-primary-foreground`}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </label>

            <div className="sm:col-span-6 flex flex-wrap gap-4 pt-1">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_royal_arch}
                  onChange={(e) => setForm({ ...form, is_royal_arch: e.target.checked })}
                  className="accent-gold w-4 h-4"
                />
                Royal Arch
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_honorary_member}
                  onChange={(e) => setForm({ ...form, is_honorary_member: e.target.checked })}
                  className="accent-gold w-4 h-4"
                />
                Honorary member
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_ugle_portal_registered}
                  onChange={(e) => setForm({ ...form, is_ugle_portal_registered: e.target.checked })}
                  className="accent-gold w-4 h-4"
                />
                UGLE Portal registered
              </label>
            </div>
          </div>


          <div className="flex items-center gap-3 pt-1">
            <button
              disabled={busy}
              className="bg-gold-shimmer text-accent-foreground px-4 py-2 rounded-sm text-sm font-semibold disabled:opacity-50"
            >
              {busy ? "Saving…" : isEdit ? "Save changes" : "Add member"}
            </button>
            {isEdit && (
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setTab("users");
                }}
                className="text-sm text-primary-foreground/60 hover:text-gold"
              >
                Cancel
              </button>
            )}
          </div>
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
              className={inputCls}
            />
            <textarea
              required
              value={nBody}
              onChange={(e) => setNBody(e.target.value)}
              placeholder="Message…"
              rows={4}
              className={inputCls}
            />
            <input
              type="datetime-local"
              value={nDate}
              onChange={(e) => setNDate(e.target.value)}
              className={inputCls}
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
                      {new Date(n.event_date).toLocaleString("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
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
