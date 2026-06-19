import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ExternalAppointment } from "@/lib/development/queries";

export type LodgeAppointmentRow = {
  id: string;
  lodge_year: number;
  appointed_on: string | null;
  position_label: string;
};

const fmt = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function OfficesRecord({
  memberId,
  lodgeAppointments,
  externalAppointments,
  canEdit,
  onChange,
}: {
  memberId: string;
  lodgeAppointments: LodgeAppointmentRow[];
  externalAppointments: ExternalAppointment[];
  canEdit: boolean;
  onChange: (next: ExternalAppointment[]) => void;
}) {
  const [office, setOffice] = useState("");
  const [year, setYear] = useState("");
  const [appointed, setAppointed] = useState("");
  const [installed, setInstalled] = useState("");
  const [level, setLevel] = useState<ExternalAppointment["level"]>("province");
  const [notes, setNotes] = useState("");
  const [adding, setAdding] = useState(false);

  const add = async () => {
    if (!office.trim()) { toast.error("Office is required"); return; }
    setAdding(true);
    const { data, error } = await supabase
      .from("member_external_appointments")
      .insert({
        member_id: memberId,
        office: office.trim(),
        masonic_year: year || null,
        date_appointed: appointed || null,
        date_installed: installed || null,
        level,
        notes: notes || null,
      })
      .select()
      .single();
    setAdding(false);
    if (error) { toast.error(error.message); return; }
    onChange([data as ExternalAppointment, ...externalAppointments]);
    setOffice(""); setYear(""); setAppointed(""); setInstalled(""); setNotes("");
    toast.success("Appointment added");
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("member_external_appointments").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    onChange(externalAppointments.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-serif text-gold text-sm mb-2">Lodge offices (from Officers Tracker)</h3>
        <div className="overflow-x-auto rounded-sm border border-gold/20">
          <table className="w-full text-xs">
            <thead className="bg-navy-light/40 text-gold/80 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="text-left p-2">Office</th>
                <th className="text-left p-2">Masonic Year</th>
                <th className="text-left p-2">Appointed</th>
                <th className="text-left p-2">Source</th>
              </tr>
            </thead>
            <tbody>
              {lodgeAppointments.length === 0 && (
                <tr><td colSpan={4} className="p-3 text-primary-foreground/60 italic">No Lodge offices recorded.</td></tr>
              )}
              {lodgeAppointments.map((a) => (
                <tr key={a.id} className="border-t border-gold/10">
                  <td className="p-2 text-primary-foreground">{a.position_label}</td>
                  <td className="p-2 text-primary-foreground/80">{a.lodge_year}</td>
                  <td className="p-2 text-primary-foreground/80">{fmt(a.appointed_on)}</td>
                  <td className="p-2 text-[10px] text-gold/70 uppercase">Officers Tracker</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="font-serif text-gold text-sm mb-2">Provincial &amp; UGLE appointments</h3>
        <div className="overflow-x-auto rounded-sm border border-gold/20">
          <table className="w-full text-xs">
            <thead className="bg-navy-light/40 text-gold/80 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="text-left p-2">Office</th>
                <th className="text-left p-2">Year</th>
                <th className="text-left p-2">Appointed</th>
                <th className="text-left p-2">Installed</th>
                <th className="text-left p-2">Level</th>
                <th className="text-left p-2">Notes</th>
                {canEdit && <th />}
              </tr>
            </thead>
            <tbody>
              {externalAppointments.length === 0 && (
                <tr><td colSpan={canEdit ? 7 : 6} className="p-3 text-primary-foreground/60 italic">No external appointments yet.</td></tr>
              )}
              {externalAppointments.map((a) => (
                <tr key={a.id} className="border-t border-gold/10">
                  <td className="p-2 text-primary-foreground">{a.office}</td>
                  <td className="p-2 text-primary-foreground/80">{a.masonic_year || "—"}</td>
                  <td className="p-2 text-primary-foreground/80">{fmt(a.date_appointed)}</td>
                  <td className="p-2 text-primary-foreground/80">{fmt(a.date_installed)}</td>
                  <td className="p-2 text-[10px] uppercase text-gold/80">{a.level}</td>
                  <td className="p-2 text-primary-foreground/80">{a.notes || ""}</td>
                  {canEdit && (
                    <td className="p-2 text-right">
                      <button onClick={() => remove(a.id)} className="text-red-400 hover:text-red-300" aria-label="Remove">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {canEdit && (
        <div className="rounded-sm border border-gold/20 bg-navy-light/30 p-4">
          <p className="text-xs uppercase tracking-wider text-gold mb-3">Add appointment</p>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
            <Input placeholder="Office" value={office} onChange={(e) => setOffice(e.target.value)} className="bg-navy-dark text-primary-foreground" />
            <Input placeholder="Masonic year (e.g. 2024–25)" value={year} onChange={(e) => setYear(e.target.value)} className="bg-navy-dark text-primary-foreground" />
            <Select value={level} onValueChange={(v) => setLevel(v as ExternalAppointment["level"])}>
              <SelectTrigger className="bg-navy-dark text-primary-foreground"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lodge">Lodge</SelectItem>
                <SelectItem value="province">Province</SelectItem>
                <SelectItem value="ugle">UGLE</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <label className="text-[10px] uppercase tracking-wider text-gold/70">Appointed
              <Input type="date" value={appointed} onChange={(e) => setAppointed(e.target.value)} className="mt-1 bg-navy-dark text-primary-foreground" />
            </label>
            <label className="text-[10px] uppercase tracking-wider text-gold/70">Installed
              <Input type="date" value={installed} onChange={(e) => setInstalled(e.target.value)} className="mt-1 bg-navy-dark text-primary-foreground" />
            </label>
            <Input placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-navy-dark text-primary-foreground" />
          </div>
          <div className="flex justify-end mt-3">
            <Button onClick={add} disabled={adding} className="bg-gold text-navy hover:bg-gold/90">
              <Plus className="w-4 h-4 mr-1" /> {adding ? "Adding…" : "Add"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
