import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import ProtectedRoute from "@/components/members/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { listGroups, type WorkingGroup } from "@/lib/workingGroups";
import { Loader2, FileDown, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildWorkingGroupsActivityPdf } from "@/lib/development/activityReportPdf";
import { toast } from "sonner";

const PHILOSOPHY = `Weybridge Lodge operates on the principle of the beehive. Every brother, from the newest Entered Apprentice to the most senior Past Master, contributes to the life of the lodge. Working groups exist so that every member has a role, a purpose, and a home in the lodge beyond the progressive offices.`;

function Inner() {
  const { isAdmin, isWorshipfulMaster, isSecretary } = useAuth();
  const canManage = isAdmin || isWorshipfulMaster || isSecretary;
  const [groups, setGroups] = useState<WorkingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      try { setGroups(await listGroups()); }
      catch (e: any) { toast.error(e?.message ?? "Failed to load"); }
      finally { setLoading(false); }
    })();
  }, []);

  const exportPdf = async () => {
    setExporting(true);
    try {
      const doc = await buildWorkingGroupsActivityPdf();
      doc.save(`working-groups-activity-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e: any) { toast.error(e?.message ?? "Export failed"); }
    finally { setExporting(false); }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl text-primary-foreground">Working Groups</h1>
          <p className="text-xs text-primary-foreground/60 mt-1">
            Every brother has a role beyond the progressive offices.
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Link to="/members/working-groups/admin" className="inline-flex items-center gap-1 text-xs border border-gold/40 text-gold px-3 py-2 rounded-sm hover:bg-gold/10">
              <Settings2 className="w-3.5 h-3.5" /> Manage Groups
            </Link>
            <Button onClick={exportPdf} disabled={exporting} className="bg-gold text-navy hover:bg-gold/90">
              <FileDown className="w-4 h-4 mr-2" /> {exporting ? "Building…" : "Activity Report PDF"}
            </Button>
          </div>
        )}
      </div>

      <blockquote className="border-l-4 border-gold pl-6 py-2 bg-navy-dark/40 rounded-r-sm">
        <p className="font-serif italic text-gold text-lg leading-relaxed">
          “{PHILOSOPHY}”
        </p>
        <footer className="mt-3 text-xs text-primary-foreground/60 not-italic">
          — Lodge philosophy, adopted 2026
        </footer>
      </blockquote>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-gold animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((g) => (
            <Link key={g.id} to={`/members/working-groups/${g.slug}`}
              className="block rounded-sm border border-gold/20 bg-navy-dark/40 p-5 hover:border-gold/60 transition-colors">
              <h3 className="font-serif text-gold text-lg">{g.name}</h3>
              <p className="text-sm text-primary-foreground/80 mt-2 leading-relaxed">{g.remit}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function WorkingGroupsIndexPage() {
  return (
    <ProtectedRoute>
      <MembersLayout>
        <Inner />
      </MembersLayout>
    </ProtectedRoute>
  );
}
