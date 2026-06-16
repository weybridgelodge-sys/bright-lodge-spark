import { useEffect, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const TITLES = ["Bro", "W Bro", "VW Bro", "RW Bro"];

export default function MembersProfile() {
  const { profile, user, refreshProfile } = useAuth();
  const [title, setTitle] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [provincialRank, setProvincialRank] = useState("");
  const [grandRank, setGrandRank] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [initiationDate, setInitiationDate] = useState("");
  const [isRoyalArch, setIsRoyalArch] = useState(false);
  const [isHonoraryMember, setIsHonoraryMember] = useState(false);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setTitle(profile.title ?? "");
    setFirstName(profile.first_name ?? "");
    setLastName(profile.last_name ?? "");
    setProvincialRank(profile.provincial_rank ?? "");
    setGrandRank(profile.grand_rank ?? "");
    setDateOfBirth(profile.date_of_birth ?? "");
    setInitiationDate(profile.initiation_date ?? "");
    setIsRoyalArch(!!profile.is_royal_arch);
    setIsHonoraryMember(!!profile.is_honorary_member);
    setPhone(profile.phone ?? "");
  }, [profile]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const composedName = [title, firstName.trim(), lastName.trim()].filter(Boolean).join(" ").trim();
    const { error } = await supabase
      .from("profiles")
      .update({
        title: title || null,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        full_name: composedName || null,
        provincial_rank: provincialRank.trim() || null,
        grand_rank: grandRank.trim() || null,
        date_of_birth: dateOfBirth || null,
        initiation_date: initiationDate || null,
        is_royal_arch: isRoyalArch,
        is_honorary_member: isHonoraryMember,
        phone: phone.trim() || null,
      })
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
  const labelCls = "block text-xs uppercase tracking-wider text-primary-foreground/60 mb-1";

  return (
    <MembersLayout>
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-gold mb-2">My Profile</h1>
        <p className="text-sm text-primary-foreground/60">
          Status:{" "}
          <span className="text-gold uppercase tracking-wider text-xs">{profile?.status}</span>
          {profile?.degree && (
            <>
              {" · "}Degree:{" "}
              <span className="text-gold uppercase tracking-wider text-xs">
                {profile.degree.replace(/_/g, " ")}
              </span>
            </>
          )}
        </p>
      </div>

      <form
        onSubmit={save}
        className="max-w-2xl space-y-4 bg-navy-dark/60 border border-gold/15 rounded-sm p-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr_1fr] gap-4">
          <div>
            <label className={labelCls}>Title</label>
            <select value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls}>
              <option value="">—</option>
              {TITLES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>First name</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Last name</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Provincial rank</label>
            <input
              value={provincialRank}
              onChange={(e) => setProvincialRank(e.target.value)}
              placeholder="e.g. PPrJGW"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Grand rank</label>
            <input
              value={grandRank}
              onChange={(e) => setGrandRank(e.target.value)}
              placeholder="e.g. PAGDC"
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Date of birth</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Initiation / joining date</label>
            <input
              type="date"
              value={initiationDate}
              onChange={(e) => setInitiationDate(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Phone (optional)</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
        </div>

        <div className="flex flex-wrap gap-6 pt-2">
          <label className="flex items-center gap-2 text-sm text-primary-foreground/80">
            <input
              type="checkbox"
              checked={isRoyalArch}
              onChange={(e) => setIsRoyalArch(e.target.checked)}
              className="accent-gold w-4 h-4"
            />
            Royal Arch
          </label>
          <label className="flex items-center gap-2 text-sm text-primary-foreground/80">
            <input
              type="checkbox"
              checked={isHonoraryMember}
              onChange={(e) => setIsHonoraryMember(e.target.checked)}
              className="accent-gold w-4 h-4"
            />
            Honorary member
          </label>
        </div>

        <p className="text-xs text-primary-foreground/50 pt-2 border-t border-gold/10">
          Degree, Past Master status and active/pending status can only be changed by an admin.
        </p>

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
