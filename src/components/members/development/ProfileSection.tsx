import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { DevelopmentRecord } from "@/lib/development/queries";

export type MemberProfile = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  title: string | null;
  initiation_date: string | null;
  passing_date: string | null;
  raising_date: string | null;
  royal_arch_date: string | null;
  ugle_reg_number: string | null;
  proposer: string | null;
};

type MentorOption = { id: string; full_name: string | null; first_name: string | null; last_name: string | null; preferred_name: string | null };

const displayName = (p: { first_name?: string | null; last_name?: string | null; full_name?: string | null; preferred_name?: string | null }) => {
  const f = p.preferred_name?.trim() || p.first_name?.trim() || "";
  return [f, p.last_name?.trim() || ""].filter(Boolean).join(" ") || p.full_name || "Unnamed";
};

const fmt = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const Field = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[10px] uppercase tracking-wider text-gold/80">{label}</p>
    <p className="text-sm text-primary-foreground/90">{value}</p>
  </div>
);

export default function ProfileSection({
  profile,
  record,
  canEdit,
  mentors,
  onSaved,
}: {
  profile: MemberProfile;
  record: DevelopmentRecord | null;
  canEdit: boolean;
  mentors: MentorOption[];
  onSaved: (r: DevelopmentRecord) => void;
}) {
  const [mentorId, setMentorId] = useState<string>(record?.assigned_mentor_id ?? "");
  const [experience, setExperience] = useState(record?.previous_masonic_experience ?? "");
  const [royalArchDate, setRoyalArchDate] = useState(profile.royal_arch_date ?? "");
  const [proposer, setProposer] = useState(profile.proposer ?? "");
  const [grandLodgeNo, setGrandLodgeNo] = useState(profile.ugle_reg_number ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setMentorId(record?.assigned_mentor_id ?? ""); setExperience(record?.previous_masonic_experience ?? ""); }, [record]);
  useEffect(() => {
    setRoyalArchDate(profile.royal_arch_date ?? "");
    setProposer(profile.proposer ?? "");
    setGrandLodgeNo(profile.ugle_reg_number ?? "");
  }, [profile]);

  const save = async () => {
    setSaving(true);
    const { data, error } = await supabase
      .from("member_development_records")
      .upsert({
        member_id: profile.id,
        assigned_mentor_id: mentorId || null,
        previous_masonic_experience: experience || null,
      }, { onConflict: "member_id" })
      .select()
      .single();
    if (error) { toast.error(error.message); setSaving(false); return; }
    // Profile fields (admin/WM/mentor may not have RLS on profiles UPDATE; ignore failures silently except for messaging)
    const profileUpdate: Record<string, string | null> = {
      royal_arch_date: royalArchDate || null,
      proposer: proposer || null,
      ugle_reg_number: grandLodgeNo || null,
    };
    const { error: pErr } = await supabase.from("profiles").update(profileUpdate).eq("id", profile.id);
    if (pErr) toast.message("Record saved. Profile fields require admin permission to update.");
    else toast.success("Profile section saved.");
    onSaved(data as DevelopmentRecord);
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Field label="Name" value={displayName(profile)} />
        <Field label="Initiation" value={fmt(profile.initiation_date)} />
        <Field label="Passed" value={fmt(profile.passing_date)} />
        <Field label="Raised" value={fmt(profile.raising_date)} />
        <Field label="Royal Arch" value={fmt(profile.royal_arch_date)} />
        <Field label="Grand Lodge No." value={profile.ugle_reg_number || "—"} />
        <Field label="Proposer" value={profile.proposer || "—"} />
      </div>

      {canEdit && (
        <div className="rounded-sm border border-gold/20 bg-navy-light/30 p-4 space-y-4">
          <p className="text-xs uppercase tracking-wider text-gold">Editable fields</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="ra" className="text-xs text-primary-foreground/70">Royal Arch date</Label>
              <Input id="ra" type="date" value={royalArchDate ?? ""} onChange={(e) => setRoyalArchDate(e.target.value)} className="bg-navy-dark text-primary-foreground" />
            </div>
            <div>
              <Label htmlFor="gl" className="text-xs text-primary-foreground/70">Grand Lodge No.</Label>
              <Input id="gl" value={grandLodgeNo ?? ""} onChange={(e) => setGrandLodgeNo(e.target.value)} className="bg-navy-dark text-primary-foreground" />
            </div>
            <div>
              <Label htmlFor="pr" className="text-xs text-primary-foreground/70">Proposer</Label>
              <Input id="pr" value={proposer ?? ""} onChange={(e) => setProposer(e.target.value)} className="bg-navy-dark text-primary-foreground" />
            </div>
            <div>
              <Label className="text-xs text-primary-foreground/70">Assigned Mentor</Label>
              <Select value={mentorId || "none"} onValueChange={(v) => setMentorId(v === "none" ? "" : v)}>
                <SelectTrigger className="bg-navy-dark text-primary-foreground"><SelectValue placeholder="Select mentor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {mentors.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{displayName(m)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="exp" className="text-xs text-primary-foreground/70">Previous Masonic Experience</Label>
            <Textarea id="exp" rows={3} value={experience ?? ""} onChange={(e) => setExperience(e.target.value)} className="bg-navy-dark text-primary-foreground" />
          </div>
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving} className="bg-gold text-navy hover:bg-gold/90">{saving ? "Saving…" : "Save"}</Button>
          </div>
        </div>
      )}

      {!canEdit && record && (
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Assigned Mentor" value={mentors.find((m) => m.id === record.assigned_mentor_id) ? displayName(mentors.find((m) => m.id === record.assigned_mentor_id)!) : "—"} />
          <div className="sm:col-span-2">
            <p className="text-[10px] uppercase tracking-wider text-gold/80">Previous Masonic Experience</p>
            <p className="text-sm text-primary-foreground/90 whitespace-pre-wrap">{record.previous_masonic_experience || "—"}</p>
          </div>
        </div>
      )}
    </div>
  );
}
