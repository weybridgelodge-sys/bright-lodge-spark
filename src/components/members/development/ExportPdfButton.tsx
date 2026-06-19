import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import { buildDevelopmentPdf } from "@/lib/development/pdf";
import type { MemberProfile } from "./ProfileSection";
import type { LodgeAppointmentRow } from "./OfficesRecord";
import type { ChecklistItem, RitualRow, ExternalAppointment, DevelopmentRecord } from "@/lib/development/queries";

export default function ExportPdfButton(props: {
  profile: MemberProfile;
  mentorName: string | null;
  record: DevelopmentRecord | null;
  checklist: ChecklistItem[];
  ritual: RitualRow[];
  lodgeAppointments: LodgeAppointmentRow[];
  externalAppointments: ExternalAppointment[];
}) {
  const [busy, setBusy] = useState(false);
  const handle = async () => {
    setBusy(true);
    try {
      const doc = await buildDevelopmentPdf(props);
      const slug = (props.profile.full_name || "member").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      doc.save(`development-record-${slug}.pdf`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate PDF");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button onClick={handle} disabled={busy} className="bg-gold text-navy hover:bg-gold/90">
      <FileDown className="w-4 h-4 mr-2" /> {busy ? "Building…" : "Export PDF"}
    </Button>
  );
}
