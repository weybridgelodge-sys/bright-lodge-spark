import { useEffect, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import DuesStatusCard from "@/components/members/DuesStatusCard";

export default function MembersProfile() {
  const { profile, user, refreshProfile, isAdmin } = useAuth();
  const [preferredName, setPreferredName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [addressLine3, setAddressLine3] = useState("");
  const [town, setTown] = useState("");
  const [county, setCounty] = useState("");
  const [postcode, setPostcode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setPreferredName((profile as { preferred_name?: string | null }).preferred_name ?? "");
    setPhone(profile.phone ?? "");
    const p = profile as unknown as Record<string, string | null>;
    setAddressLine1(p.address_line1 ?? "");
    setAddressLine2(p.address_line2 ?? "");
    setAddressLine3(p.address_line3 ?? "");
    setTown(p.town ?? "");
    setCounty(p.county ?? "");
    setPostcode(p.postcode ?? "");
  }, [profile]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        preferred_name: preferredName.trim() || null,
        phone: phone.trim() || null,
        address_line1: addressLine1.trim() || null,
        address_line2: addressLine2.trim() || null,
        address_line3: addressLine3.trim() || null,
        town: town.trim() || null,
        county: county.trim() || null,
        postcode: postcode.trim() || null,
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

  const fmtDate = (d?: string | null) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    } catch { return d; }
  };

  const p = profile as unknown as Record<string, string | null | boolean | undefined> | null;
  const joinedLodgeDate = (p?.joined_lodge_date as string | null | undefined) ?? null;
  const initiationDate = (p?.initiation_date as string | null | undefined) ?? null;
  const isJoiner = !!(joinedLodgeDate && joinedLodgeDate !== initiationDate);

  const ReadOnly = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
      <div className={labelCls}>{label}</div>
      <div className="text-sm text-primary-foreground/90 py-2">{value || <span className="text-primary-foreground/40">—</span>}</div>
    </div>
  );

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

      {isAdmin && user?.id && (
        <div className="max-w-2xl mb-6">
          <DuesStatusCard memberId={user.id} />
        </div>
      )}

      {/* Read-only official details */}
      <div className="max-w-2xl mb-6 bg-navy-dark/60 border border-gold/15 rounded-sm p-4 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h2 className="font-serif text-xl text-gold">Official details</h2>
          <span className="text-[10px] uppercase tracking-wider text-gold/60 border border-gold/30 rounded-sm px-2 py-0.5">Read only</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr_1fr] gap-4">
          <ReadOnly label="Title" value={profile?.title} />
          <ReadOnly label="First name" value={profile?.first_name} />
          <ReadOnly label="Last name" value={profile?.last_name} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ReadOnly label="Provincial rank" value={profile?.provincial_rank} />
          <ReadOnly label="Grand rank" value={profile?.grand_rank} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ReadOnly label="Date of birth" value={fmtDate(profile?.date_of_birth)} />
          <ReadOnly label="Type" value={isJoiner ? "Joiner (J)" : "Initiate (I)"} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ReadOnly label={isJoiner ? "Original initiation date" : "Initiation date"} value={fmtDate(initiationDate)} />
          {isJoiner && <ReadOnly label="Joined this Lodge" value={fmtDate(joinedLodgeDate)} />}
        </div>
        <div className="flex flex-wrap gap-6 pt-2">
          <ReadOnly label="Royal Arch" value={profile?.is_royal_arch ? "Yes" : "No"} />
          <ReadOnly label="Honorary member" value={profile?.is_honorary_member ? "Yes" : "No"} />
        </div>
        <p className="text-xs text-primary-foreground/60 pt-3 border-t border-gold/10">
          These details are maintained by the Lodge. Contact the Secretary to update them.
        </p>
      </div>

      {/* Editable member-controlled fields */}
      <form
        onSubmit={save}
        className="max-w-2xl space-y-4 bg-navy-dark/60 border border-gold/15 rounded-sm p-4 sm:p-6"
      >
        <h2 className="font-serif text-xl text-gold">Your contact details</h2>

        <div>
          <label className={labelCls}>Preferred name (optional)</label>
          <input
            value={preferredName}
            onChange={(e) => setPreferredName(e.target.value)}
            placeholder="e.g. Bob (shown as 'Welcome Bob' in the portal)"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Phone (optional)</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
        </div>

        <div className="pt-3 mt-2 border-t border-gold/10">
          <p className="text-xs uppercase tracking-wider text-gold/70 mb-3">Address</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Address line 1</label>
              <input value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Address line 2</label>
              <input value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Address line 3</label>
              <input value={addressLine3} onChange={(e) => setAddressLine3(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Town</label>
              <input value={town} onChange={(e) => setTown(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>County</label>
              <input value={county} onChange={(e) => setCounty(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Post code</label>
              <input value={postcode} onChange={(e) => setPostcode(e.target.value)} className={`${inputCls} uppercase`} />
            </div>
          </div>
        </div>

        <p className="text-xs text-primary-foreground/50 pt-2 border-t border-gold/10">
          Degree, Past Master status and active/pending status can only be changed by an admin.
        </p>

        <button
          disabled={busy}
          className="bg-gold-shimmer text-accent-foreground px-5 py-2.5 sm:py-2 rounded-sm text-sm font-semibold flex items-center gap-2 min-h-11 sm:min-h-10 disabled:opacity-50"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          Save changes
        </button>
      </form>
    </MembersLayout>
  );
}
