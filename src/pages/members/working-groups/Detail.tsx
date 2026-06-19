import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import MembersLayout from "@/components/members/MembersLayout";
import ProtectedRoute from "@/components/members/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import {
  getGroupBySlug,
  listActivities,
  listGroupMembers,
  addActivity,
  type WorkingGroup,
  type WorkingGroupActivity,
} from "@/lib/workingGroups";
import { Loader2, ChevronLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const fmt = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const displayName = (p: any) => {
  if (!p) return "Unnamed";
  const f = p.preferred_name?.trim() || p.first_name?.trim() || "";
  return [f, p.last_name?.trim() || ""].filter(Boolean).join(" ") || p.full_name || "Unnamed";
};

function Inner() {
  const { slug = "" } = useParams();
  const { user, isAdmin, isWorshipfulMaster, isSecretary } = useAuth();
  const [group, setGroup] = useState<WorkingGroup | null>(null);
  const [members, setMembers] = useState<Awaited<ReturnType<typeof listGroupMembers>>>([]);
  const [activities, setActivities] = useState<WorkingGroupActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    activity_date: new Date().toISOString().slice(0, 10),
    kind: "meeting" as "meeting" | "event" | "outcome",
    title: "",
    notes: "",
  });

  const refresh = async (g: WorkingGroup) => {
    const [m, a] = await Promise.all([listGroupMembers(g.id), listActivities(g.id)]);
    setMembers(m); setActivities(a);
  };

  useEffect(() => {
    (async () => {
      const g = await getGroupBySlug(slug);
      setGroup(g);
      if (g) await refresh(g);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-gold animate-spin" /></div>;
  if (!group) return <p className="text-primary-foreground/80">Group not found.</p>;

  const isMember = !!user && members.some((m) => m.member_id === user.id);
  const isLead = !!user && (group.lead_member_id === user.id || members.some((m) => m.member_id === user.id && m.role === "lead"));
  const canLog = isAdmin || isWorshipfulMaster || isSecretary || isLead || isMember;

  const onAdd = async () => {
    if (!form.title.trim()) { toast.error("Title required"); return; }
    setBusy(true);
    try {
      await addActivity({
        working_group_id: group.id,
        activity_date: form.activity_date,
        kind: form.kind,
        title: form.title,
        notes: form.notes || null,
        logged_by: user?.id ?? null,
      });
      setForm({ ...form, title: "", notes: "" });
      await refresh(group);
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusy(false); }
  };

  const leadMember = members.find((m) => m.member_id === group.lead_member_id);

  return (
    <div className="space-y-6">
      <div>
        <Link to="/members/working-groups" className="text-xs text-gold hover:underline flex items-center gap-1 mb-2">
          <ChevronLeft className="w-3 h-3" /> All Working Groups
        </Link>
        <h1 className="font-serif text-2xl text-primary-foreground">{group.name}</h1>
        <p className="text-sm text-primary-foreground/80 mt-2 leading-relaxed max-w-3xl">{group.remit}</p>
      </div>

      <section className="rounded-sm border border-gold/20 bg-navy-dark/40 p-5">
        <h2 className="font-serif text-gold text-lg mb-3">Group Members</h2>
        <div className="text-xs text-primary-foreground/60 mb-2">
          Lead: <span className="text-primary-foreground">{leadMember ? displayName(leadMember.profiles) : "Not yet assigned"}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {members.length === 0 && <span className="text-primary-foreground/50 italic text-xs">No members yet.</span>}
          {members.map((m) => (
            <span key={m.id} className={`text-xs px-2 py-1 rounded-sm border ${m.role === "lead" ? "border-gold text-gold" : "border-gold/30 text-primary-foreground/80"}`}>
              {displayName(m.profiles)}{m.role === "lead" ? " · Lead" : ""}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-sm border border-gold/20 bg-navy-dark/40 p-5 space-y-4">
        <h2 className="font-serif text-gold text-lg">Activity Log</h2>

        {canLog && (
          <div className="grid grid-cols-1 md:grid-cols-[120px_140px_1fr_auto] gap-2 items-end">
            <div>
              <label className="text-[10px] text-primary-foreground/60 uppercase">Date</label>
              <Input type="date" value={form.activity_date} onChange={(e) => setForm({ ...form, activity_date: e.target.value })}
                className="bg-navy text-primary-foreground" />
            </div>
            <div>
              <label className="text-[10px] text-primary-foreground/60 uppercase">Type</label>
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as any })}>
                <SelectTrigger className="bg-navy text-primary-foreground"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="outcome">Outcome</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] text-primary-foreground/60 uppercase">Title</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-navy text-primary-foreground" placeholder="e.g. Planning meeting" />
            </div>
            <Button onClick={onAdd} disabled={busy} className="bg-gold text-navy hover:bg-gold/90">
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="md:col-span-4 bg-navy text-primary-foreground" placeholder="Notes / outcomes (optional)" />
          </div>
        )}

        <div className="rounded-sm border border-gold/20 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-navy-light/40 text-gold/80 uppercase text-[10px] tracking-wider">
              <tr><th className="text-left p-2 w-32">Date</th><th className="text-left p-2 w-28">Type</th><th className="text-left p-2">Title</th><th className="text-left p-2">Notes</th></tr>
            </thead>
            <tbody>
              {activities.map((a) => (
                <tr key={a.id} className="border-t border-gold/10">
                  <td className="p-2 text-primary-foreground/80">{fmt(a.activity_date)}</td>
                  <td className="p-2 text-primary-foreground/70 capitalize">{a.kind}</td>
                  <td className="p-2 text-primary-foreground">{a.title}</td>
                  <td className="p-2 text-primary-foreground/70">{a.notes ?? ""}</td>
                </tr>
              ))}
              {activities.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-primary-foreground/60 italic">No activity recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function WorkingGroupDetailPage() {
  return (
    <ProtectedRoute>
      <MembersLayout>
        <Inner />
      </MembersLayout>
    </ProtectedRoute>
  );
}
