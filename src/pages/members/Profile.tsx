import { useEffect, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Title = "Bro" | "W Bro" | "VW Bro" | "RW Bro";
const TITLES: Title[] = ["Bro", "W Bro", "VW Bro", "RW Bro"];

const DEGREE_LABEL: Record<string, string> = {
  entered_apprentice: "Entered Apprentice",
  fellow_craft: "Fellow Craft",
  master_mason: "Master Mason",
  installed_master: "Installed Master",
};

export default function MembersProfile() {
  const { profile, user, refreshProfile } = useAuth();

  const [title, setTitle] = useState<"" | Title>("");
  const [first_name, setFirstName] = useState("");
  const [last_name, setLastName] = useState("");
  const [provincial_rank, setProvincialRank] = useState("");
  const [grand_rank, setGrandRank] = useState("");
  const [date_of_birth, setDob] = useState("");
  const [initiation_date, setInitDate] = useState("");
  const [is_royal_arch, setRA] = useState(false);
  const [is_honorary_member, setHonorary] = useState(false);
  const [phone, setPhone] = useState("");

  const [office, setOffice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile || !user) return;
    const p = profile as unknown as Record<string, unknown>;
    setTitle(((p.title as Title | null) ?? "") as "" | Title);
    setFirstName((p.first_name as string | null) ?? "");
    setLastName((p.last_name as string | null) ?? "");
    setProvincialRank((p.provincial_rank as string | null) ?? "");
    setGrandRank((p.grand_rank as string | null) ?? "");
    setDob((p.date_of_birth as string | null) ?? "");
    setInitDate((p.initiation_date as string | null) ?? "");
    setRA(Boolean(p.is_royal_arch));
    setHonorary(Boolean(p.is_honorary_member));
    setPhone((p.phone as string | null) ?? "");

    supabase
      .rpc("current_office_label" as never, { _user_id: user.id } as never)
      .then(({ data, error }) => {
        if (!error) setOffice(((data as string | null) ?? null) || null);
      });
  }, [profile, user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!first_name.trim() || !last_name.trim()) {
      toast.error("First name and last name are required");
      return;
    }
    setBusy(true);
    const composed = `${title ? title + ". " : ""}${first_name.trim()} ${last_name.trim()}`.trim();
    const { error } = await supabase
      .from("profiles")
      .update({
        title: title || null,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        full_name: composed,
        provincial_rank: provincial_rank.trim() || null,
        grand_rank: grand_rank.trim() || null,
        date_of_birth: date_of_birth || null,
        initiation_date: initiation_date || null,
        is_royal_arch,
        is_honorary_member,
        phone: phone.trim() || null,
      } as never)
      .eq("id", user.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Profile updated");
      refreshProfile();
    }
  };

  const inputCls =
    "w-full bg-navy border border-gold/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-gold";
  const labelCls = "text-xs uppercase tracking-wider text-primary-foreground/60 block";
  const degree = (profile as unknown as { degree?: string } | null)?.degree ?? "";
  const isPM = Boolean((profile as unknown as { is_past_master?: boolean } | null)?.is_past_master);

  return (
    <MembersLayout>
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-gold mb-2">My Profile</h1>
        <p className="text-sm text-primary-foreground/60">
          Status:{" "}
          <span className="text-gold uppercase tracking-wider text-xs">{profile?.status}</span>
        </p>
      </div>

      <form
        onSubmit={save}
        className="max-w-2xl bg-navy-dark/60 border border-gold/15 rounded-sm p-6 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
          <label className={`${labelCls} sm:col-span-2`}>
            Title
            <select
              value={title}
              onChange={(e) => setTitle(e.target.value as "" | Title)}
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
              value={first_name}
              onChange={(e) => setFirstName(e.target.value)}
              className={`mt-1 ${inputCls} normal-case tracking-normal text-primary-foreground`}
            />
          </label>
          <label className={`${labelCls} sm:col-span-2`}>
            Last name
            <input
              required
              value={last_name}
              onChange={(e) => setLastName(e.target.value)}
              className={`mt-1 ${inputCls} normal-case tracking-normal text-primary-foreground`}
            />
          </label>

          <label className={`${labelCls} sm:col-span-3`}>
            Provincial rank
            <input
              value={provincial_rank}
              onChange={(e) => setProvincialRank(e.target.value)}
              placeholder="e.g. PPrJGW"
              className={`mt-1 ${inputCls} normal-case tracking-normal text-primary-foreground`}
            />
          </label>
          <label className={`${labelCls} sm:col-span-3`}>
            Grand rank
            <input
              value={grand_rank}
              onChange={(e) => setGrandRank(e.target.value)}
              placeholder="e.g. PAGDC"
              className={`mt-1 ${inputCls} normal-case tracking-normal text-primary-foreground`}
            />
          </label>

          <label className={`${labelCls} sm:col-span-3`}>
            Date of birth
            <input
              type="date"
              value={date_of_birth}
              onChange={(e) => setDob(e.target.value)}
              className={`mt-1 ${inputCls} normal-case tracking-normal text-primary-foreground`}
            />
          </label>
          <label className={`${labelCls} sm:col-span-3`}>
            Initiation / Joining date
            <input
              type="date"
              value={initiation_date}
              onChange={(e) => setInitDate(e.target.value)}
              className={`mt-1 ${inputCls} normal-case tracking-normal text-primary-foreground`}
            />
          </label>

          <label className={`${labelCls} sm:col-span-3`}>
            Degree
            <input
              readOnly
              value={`${DEGREE_LABEL[degree] ?? "—"}${isPM ? " (Past Master)" : ""}`}
              className={`mt-1 ${inputCls} normal-case tracking-normal text-primary-foreground/80 cursor-not-allowed`}
              title="Only admins can change this"
            />
          </label>
          <label className={`${labelCls} sm:col-span-3`}>
            Current office {office ? "" : "(none)"}
            <input
              readOnly
              value={office ?? "—"}
              className={`mt-1 ${inputCls} normal-case tracking-normal text-primary-foreground/80 cursor-not-allowed`}
              title="Pulled from the current year of the Progressive Officers Tracker"
            />
          </label>

          <label className={`${labelCls} sm:col-span-6 flex items-center gap-2 normal-case tracking-normal`}>
            <input
              type="checkbox"
              checked={is_royal_arch}
              onChange={(e) => setRA(e.target.checked)}
              className="accent-gold w-4 h-4"
            />
            <span className="text-sm text-primary-foreground">Royal Arch (Companion)</span>
          </label>
          <label className={`${labelCls} sm:col-span-6 flex items-center gap-2 normal-case tracking-normal`}>
            <input
              type="checkbox"
              checked={is_honorary_member}
              onChange={(e) => setHonorary(e.target.checked)}
              className="accent-gold w-4 h-4"
            />
            <span className="text-sm text-primary-foreground">Honorary member</span>
          </label>

          <label className={`${labelCls} sm:col-span-6`}>
            Phone (optional)
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`mt-1 ${inputCls} normal-case tracking-normal text-primary-foreground`}
            />
          </label>
        </div>

        <button
          disabled={busy}
          className="bg-gold-shimmer text-accent-foreground px-5 py-2 rounded-sm text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          Save changes
        </button>
      </form>
    </MembersLayout>
  );
}
