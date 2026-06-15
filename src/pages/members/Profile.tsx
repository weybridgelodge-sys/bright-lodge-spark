import { useEffect, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const RANKS = ["Bro.", "W Bro.", "RW Bro."];

export default function MembersProfile() {
  const { profile, user, refreshProfile } = useAuth();
  const [full_name, setFullName] = useState("");
  const [rank, setRank] = useState("");
  const [office, setOffice] = useState("");
  const [joined_year, setJoinedYear] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setRank(profile.rank ?? "");
    setOffice(profile.office ?? "");
    setJoinedYear(profile.joined_year?.toString() ?? "");
    setPhone(profile.phone ?? "");
  }, [profile]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: full_name.trim() || null,
        rank: rank || null,
        office: office.trim() || null,
        joined_year: joined_year ? parseInt(joined_year, 10) : null,
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

  return (
    <MembersLayout>
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-gold mb-2">My Profile</h1>
        <p className="text-sm text-primary-foreground/60">
          Status:{" "}
          <span className="text-gold uppercase tracking-wider text-xs">{profile?.status}</span>
        </p>
      </div>

      <form onSubmit={save} className="max-w-xl space-y-4 bg-navy-dark/60 border border-gold/15 rounded-sm p-6">
        <div>
          <label className="block text-xs uppercase tracking-wider text-primary-foreground/60 mb-1">Full name</label>
          <input
            value={full_name}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full bg-navy border border-gold/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-gold"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-primary-foreground/60 mb-1">Rank</label>
            <select
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              className="w-full bg-navy border border-gold/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-gold"
            >
              <option value="">—</option>
              {RANKS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-primary-foreground/60 mb-1">Joined year</label>
            <input
              type="number"
              min={1949}
              max={new Date().getFullYear()}
              value={joined_year}
              onChange={(e) => setJoinedYear(e.target.value)}
              className="w-full bg-navy border border-gold/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-gold"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-primary-foreground/60 mb-1">Office</label>
          <input
            value={office}
            onChange={(e) => setOffice(e.target.value)}
            placeholder="e.g. Senior Warden"
            className="w-full bg-navy border border-gold/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-gold"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-primary-foreground/60 mb-1">Phone (optional)</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-navy border border-gold/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-gold"
          />
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
