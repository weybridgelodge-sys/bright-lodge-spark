import { useEffect, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import ProtectedRoute from "@/components/members/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  listGroups, listGroupMembers, setGroupMembers, upsertGroup,
  type WorkingGroup,
} from "@/lib/workingGroups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Plus } from "lucide-react";
import { toast } from "sonner";

type Profile = { id: string; full_name: string | null; first_name: string | null; last_name: string | null; preferred_name: string | null };
const displayName = (p?: Profile | null) => {
  if (!p) return "—";
  const f = p.preferred_name?.trim() || p.first_name?.trim() || "";
  return [f, p.last_name?.trim() || ""].filter(Boolean).join(" ") || p.full_name || "Unnamed";
};
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function GroupEditor({ group, profiles, onSaved }: { group: WorkingGroup; profiles: Profile[]; onSaved: () => void }) {
  const [name, setName] = useState(group.name);
  const [remit, setRemit] = useState(group.remit);
  const [leadId, setLeadId] = useState<string>(group.lead_member_id ?? "none");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const m = await listGroupMembers(group.id);
      setMemberIds(m.map((x) => x.member_id));
      setLoaded(true);
    })();
  }, [group.id]);

  const toggle = (id: string) => setMemberIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const save = async () => {
    setBusy(true);
    try {
      await upsertGroup({ id: group.id, slug: group.slug, name, remit, lead_member_id: leadId === "none" ? null : leadId });
      const includesLead = leadId !== "none" && memberIds.includes(leadId);
      const ids = leadId !== "none" && !includesLead ? [...memberIds, leadId] : memberIds;
      await setGroupMembers(group.id, ids, leadId === "none" ? null : leadId);
      toast.success("Saved");
      onSaved();
    } catch (e: any) { toast.error(e?.message ?? "Save failed"); }
    finally { setBusy(false); }
  };

  return (
    <details className="rounded-sm border border-gold/20 bg-navy-dark/40 p-4 group" open={false}>
      <summary className="cursor-pointer font-serif text-gold text-lg flex items-center justify-between">
        <span>{group.name}</span>
        <span className="text-xs text-primary-foreground/50">{memberIds.length} member{memberIds.length === 1 ? "" : "s"}</span>
      </summary>
      <div className="space-y-3 mt-4">
        <div>
          <label className="text-[10px] text-primary-foreground/60 uppercase">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-navy text-primary-foreground" />
        </div>
        <div>
          <label className="text-[10px] text-primary-foreground/60 uppercase">Remit</label>
          <Textarea rows={3} value={remit} onChange={(e) => setRemit(e.target.value)} className="bg-navy text-primary-foreground" />
        </div>
        <div>
          <label className="text-[10px] text-primary-foreground/60 uppercase">Lead Brother</label>
          <Select value={leadId} onValueChange={setLeadId}>
            <SelectTrigger className="bg-navy text-primary-foreground"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— None —</SelectItem>
              {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{displayName(p)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[10px] text-primary-foreground/60 uppercase">Members</label>
          {!loaded ? <p className="text-xs text-primary-foreground/50">Loading…</p> : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1 mt-1 max-h-64 overflow-y-auto rounded-sm border border-gold/10 p-2">
              {profiles.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-xs text-primary-foreground/80 hover:text-gold cursor-pointer">
                  <input type="checkbox" checked={memberIds.includes(p.id)} onChange={() => toggle(p.id)} className="accent-gold" />
                  {displayName(p)}
                </label>
              ))}
            </div>
          )}
        </div>
        <Button onClick={save} disabled={busy} className="bg-gold text-navy hover:bg-gold/90">
          <Save className="w-4 h-4 mr-1" /> Save Group
        </Button>
      </div>
    </details>
  );
}

function Inner() {
  const { isAdmin, isWorshipfulMaster, isSecretary } = useAuth();
  const canManage = isAdmin || isWorshipfulMaster || isSecretary;
  const [groups, setGroups] = useState<WorkingGroup[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [threshold, setThreshold] = useState<string>("");
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const [g, ps, ms] = await Promise.all([
      listGroups(),
      supabase.from("profiles").select("id, full_name, first_name, last_name, preferred_name").eq("status", "active").order("last_name"),
      supabase.from("module_settings").select("value").eq("key", "mentoring_threshold_date").maybeSingle(),
    ]);
    setGroups(g); setProfiles((ps.data as Profile[]) ?? []);
    setThreshold((ms.data?.value as string) ?? "2025-10-01");
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const saveThreshold = async () => {
    setSavingThreshold(true);
    try {
      await supabase.from("module_settings").upsert({ key: "mentoring_threshold_date", value: threshold });
      toast.success("Threshold saved");
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setSavingThreshold(false); }
  };

  const createGroup = async () => {
    if (!newName.trim()) return;
    try {
      await upsertGroup({ slug: slugify(newName), name: newName.trim(), remit: "—" });
      setNewName("");
      await refresh();
      toast.success("Group created");
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  if (!canManage) return <p className="text-primary-foreground/80">Restricted to Admin, Worshipful Master, or Secretary.</p>;
  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-gold animate-spin" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl text-primary-foreground">Manage Working Groups</h1>
        <p className="text-xs text-primary-foreground/60 mt-1">Edit remits, leads, members, and create new groups.</p>
      </div>

      <section className="rounded-sm border border-gold/20 bg-navy-dark/40 p-5 space-y-3">
        <h2 className="font-serif text-gold text-lg">Module Settings</h2>
        <div className="flex items-end gap-2 flex-wrap">
          <div>
            <label className="text-[10px] text-primary-foreground/60 uppercase">Mentoring threshold date</label>
            <Input type="date" value={threshold} onChange={(e) => setThreshold(e.target.value)} className="bg-navy text-primary-foreground" />
          </div>
          <Button onClick={saveThreshold} disabled={savingThreshold} className="bg-gold text-navy hover:bg-gold/90">
            <Save className="w-4 h-4 mr-1" /> Save
          </Button>
          <p className="text-[10px] text-primary-foreground/50 italic ml-2 max-w-md">
            Members initiated on/after this date follow the full structured checklist; earlier members can be marked exempt.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end gap-2">
          <div className="flex-1 max-w-sm">
            <label className="text-[10px] text-primary-foreground/60 uppercase">New group name</label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-navy text-primary-foreground" placeholder="e.g. Mentoring Sub-Committee" />
          </div>
          <Button onClick={createGroup} className="bg-gold text-navy hover:bg-gold/90">
            <Plus className="w-4 h-4 mr-1" /> Create
          </Button>
        </div>
        {groups.map((g) => <GroupEditor key={g.id} group={g} profiles={profiles} onSaved={refresh} />)}
      </section>
    </div>
  );
}

export default function WorkingGroupsAdminPage() {
  return (
    <ProtectedRoute>
      <MembersLayout>
        <Inner />
      </MembersLayout>
    </ProtectedRoute>
  );
}
