import { useEffect, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import ProtectedRoute from "@/components/members/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, FileDown } from "lucide-react";
import { loadSkillsMatrix, type SkillsMatrix } from "@/lib/development/skillsMatrix";
import SkillsMatrixGrid from "@/components/members/development/SkillsMatrixGrid";
import { Button } from "@/components/ui/button";
import { buildGapReportPdf } from "@/lib/development/gapReportPdf";
import { toast } from "sonner";
import { Link } from "react-router-dom";

function Inner() {
  const { isAdmin, isWorshipfulMaster, isDirectorOfCeremonies } = useAuth();
  const canSee = isAdmin || isWorshipfulMaster || isDirectorOfCeremonies;
  const [matrix, setMatrix] = useState<SkillsMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!canSee) { setLoading(false); return; }
    (async () => {
      try { setMatrix(await loadSkillsMatrix()); }
      catch (e: any) { toast.error(e?.message ?? "Failed to load matrix"); }
      finally { setLoading(false); }
    })();
  }, [canSee]);

  if (!canSee) {
    return <p className="text-primary-foreground/80">The lodge-wide Skills Matrix is restricted to the Worshipful Master, Director of Ceremonies and Admin.</p>;
  }
  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-gold animate-spin" /></div>;
  }
  if (!matrix) return null;

  const exportGap = async () => {
    setExporting(true);
    try {
      const doc = await buildGapReportPdf(matrix);
      doc.save(`lodge-skills-gap-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e: any) {
      toast.error(e?.message ?? "Export failed");
    } finally { setExporting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl text-primary-foreground">Lodge Ritual Skills Matrix</h1>
          <p className="text-xs text-primary-foreground/60 mt-1">
            Every active member by every ritual piece. Red = no one qualified · Amber = single point of failure · Green = two or more.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/members/admin/loi-helper" className="inline-flex items-center gap-1 text-xs border border-gold/40 text-gold px-3 py-2 rounded-sm hover:bg-gold/10">
            LoI Part Assignment Helper
          </Link>
          <Button onClick={exportGap} disabled={exporting} className="bg-gold text-navy hover:bg-gold/90">
            <FileDown className="w-4 h-4 mr-2" /> {exporting ? "Building…" : "Gap Report PDF"}
          </Button>
        </div>
      </div>
      <SkillsMatrixGrid matrix={matrix} />
    </div>
  );
}

export default function SkillsMatrixPage() {
  return (
    <ProtectedRoute>
      <MembersLayout>
        <Inner />
      </MembersLayout>
    </ProtectedRoute>
  );
}
