import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, FileDown } from "lucide-react";
import autoTable from "jspdf-autotable";
import { reportPdfDoc, INK, GOLD, NAVY } from "@/lib/treasurer/reports";
import { saveJsPdf } from "@/lib/nativeDownload";

const CONDITIONS = ["Excellent", "Good", "Fair", "Poor", "Needs Repair/Replacement"] as const;

const money = (pence: number) =>
  `${pence < 0 ? "-" : ""}£${(Math.abs(pence) / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-GB");
};

type Item = {
  id: string;
  item: string;
  count: number;
  value_pence: number;
  condition: string | null;
  date_acquired: string | null;
  location: string | null;
  notes: string | null;
};

export async function buildPropertyRegisterPdf(rows: Item[], totalPence: number) {
  const { doc, pageW, margin } = await reportPdfDoc(
    "Lodge Property Register",
    `Stock check sheet — ${rows.length} line${rows.length === 1 ? "" : "s"}`,
  );
  autoTable(doc, {
    startY: 135,
    head: [["Item", "Count", "Location", "Value", "Condition", "Date acquired", "Notes", "Checked / present?"]],
    body: rows.map((r) => [
      r.item,
      String(r.count ?? 0),
      r.location ?? "—",
      money(r.value_pence ?? 0),
      r.condition ?? "—",
      fmtDate(r.date_acquired),
      r.notes ?? "",
      "",
    ]),
    foot: [["Total estimated value", "", "", money(totalPence), "", "", "", ""]],
    margin: { left: margin, right: margin, bottom: 50 },
    styles: { font: "helvetica", fontSize: 8, cellPadding: 4, textColor: INK, lineColor: [220, 215, 200], lineWidth: 0.4, overflow: "linebreak" },
    headStyles: { fillColor: GOLD, textColor: NAVY, fontStyle: "bold" },
    footStyles: { fillColor: [250, 247, 238], textColor: INK, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 247, 238] },
    theme: "grid",
    columnStyles: {
      0: { cellWidth: 105 },
      1: { cellWidth: 34, halign: "right" },
      2: { cellWidth: 70 },
      3: { cellWidth: 55, halign: "right" },
      4: { cellWidth: 60 },
      5: { cellWidth: 62 },
      6: { cellWidth: 80 },
      7: { cellWidth: 50 },
    },
    rowPageBreak: "avoid",
  });
  const y = (doc as any).lastAutoTable.finalY + 24;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text("Checked by: ______________________________", margin, y);
  doc.text(`Date: ______________________`, pageW - margin - 160, y);
  return doc;
}


export default function PropertyRegisterTab({ canEdit }: { canEdit: boolean }) {
  const [rows, setRows] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [item, setItem] = useState("");
  const [count, setCount] = useState("1");
  const [value, setValue] = useState("0.00");
  const [condition, setCondition] = useState<string>("Good");
  const [dateAcquired, setDateAcquired] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("lodge_property_items" as any)
      .select("id,item,count,value_pence,condition,date_acquired,location,notes")
      .order("item", { ascending: true });
    if (error) toast({ title: "Could not load property register", description: error.message, variant: "destructive" });
    setRows(((data as unknown as Item[]) ?? []));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalPence = useMemo(() => rows.reduce((s, r) => s + (r.value_pence ?? 0), 0), [rows]);

  const resetForm = () => {
    setEditingId(null);
    setItem("");
    setCount("1");
    setValue("0.00");
    setCondition("Good");
    setDateAcquired("");
    setLocation("");
    setNotes("");
  };

  const openNew = () => { resetForm(); setOpen(true); };

  const openEdit = (r: Item) => {
    setEditingId(r.id);
    setItem(r.item);
    setCount(String(r.count ?? 1));
    setValue(((r.value_pence ?? 0) / 100).toFixed(2));
    setCondition(r.condition ?? "Good");
    setDateAcquired(r.date_acquired ?? "");
    setLocation(r.location ?? "");
    setNotes(r.notes ?? "");
    setOpen(true);
  };

  const save = async () => {
    const name = item.trim();
    if (!name) {
      toast({ title: "Enter an item name", variant: "destructive" });
      return;
    }
    const cnt = parseInt(count || "1", 10);
    const pence = Math.round(parseFloat(value || "0") * 100);
    if (!Number.isFinite(cnt) || cnt < 0) {
      toast({ title: "Enter a valid count", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(pence) || pence < 0) {
      toast({ title: "Enter a valid value", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload = {
      item: name,
      count: cnt,
      value_pence: pence,
      condition,
      date_acquired: dateAcquired || null,
      location: location.trim() || null,
      notes: notes.trim() || null,
    };

    const { error } = editingId
      ? await supabase.from("lodge_property_items" as any).update(payload).eq("id", editingId)
      : await supabase.from("lodge_property_items" as any).insert(payload);

    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    setOpen(false);
    resetForm();
    toast({ title: editingId ? "Item updated" : "Item added" });
    load();
  };

  const remove = async (r: Item) => {
    if (!window.confirm(`Delete “${r.item}” from the property register?`)) return;
    const { error } = await supabase.from("lodge_property_items" as any).delete().eq("id", r.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Item deleted" });
    load();
  };

  const exportPdf = async () => {
    const doc = await buildPropertyRegisterPdf(rows, totalPence);
    await saveJsPdf(doc, `lodge-property-register-${new Date().toISOString().slice(0, 10)}.pdf`);
  };


  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-gold/20 bg-primary-foreground/5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="font-serif text-lg text-gold">Lodge Property Register</h2>
            <p className="text-primary-foreground/60 text-sm">
              Audit of lodge property with estimated values — useful when discussing insurance cover with the Province.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="border-gold/40 text-gold hover:bg-gold/10 hover:text-gold"
              onClick={exportPdf}
              disabled={loading || rows.length === 0}
            >
              <FileDown className="w-4 h-4 mr-1" /> Download PDF
            </Button>
            {canEdit && (
              <Button className="bg-gold text-navy hover:bg-gold/90" onClick={openNew}>
                <Plus className="w-4 h-4 mr-1" /> New item
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-primary-foreground/60"><Loader2 className="w-4 h-4 mr-1 inline animate-spin" /> Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-primary-foreground/60 border-b border-gold/20">
                  <th className="py-2">Item</th>
                  <th className="py-2 text-right">Count</th>
                  <th className="py-2">Location</th>
                  <th className="py-2 text-right">Value</th>
                  <th className="py-2">Condition</th>
                  <th className="py-2">Date acquired</th>
                  <th className="py-2">Notes</th>
                  {canEdit && <th className="py-2 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 8 : 7} className="py-3 text-primary-foreground/60">No property recorded yet.</td>
                  </tr>
                ) : rows.map((r) => (
                  <tr key={r.id} className="border-b border-gold/10 align-top">
                    <td className="py-2 text-primary-foreground">{r.item}</td>
                    <td className="py-2 text-right text-primary-foreground">{r.count}</td>
                    <td className="py-2 text-primary-foreground/80">{r.location ?? "—"}</td>
                    <td className="py-2 text-right text-primary-foreground">{money(r.value_pence ?? 0)}</td>
                    <td className="py-2 text-primary-foreground/80">{r.condition ?? "—"}</td>
                    <td className="py-2 text-primary-foreground/80">{fmtDate(r.date_acquired)}</td>
                    <td className="py-2 text-primary-foreground/70 whitespace-pre-wrap">{r.notes ?? ""}</td>
                    {canEdit && (
                      <td className="py-2 text-right whitespace-nowrap">
                        <Button variant="ghost" size="icon" className="text-primary-foreground/70 hover:text-gold" onClick={() => openEdit(r)} aria-label={`Edit ${r.item}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-primary-foreground/70 hover:text-destructive" onClick={() => remove(r)} aria-label={`Delete ${r.item}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gold/30">
                  <td className="py-3 text-primary-foreground font-semibold" colSpan={3}>Total estimated value</td>
                  <td className="py-3 text-right text-gold font-semibold">{money(totalPence)}</td>
                  <td className="py-3" colSpan={canEdit ? 4 : 3}></td>

                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="bg-navy-light border-gold/30 max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-serif text-gold">{editingId ? "Edit item" : "Add item"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label className="text-primary-foreground">Item</Label>
              <Input value={item} onChange={(e) => setItem(e.target.value)} placeholder="e.g. Master's chair" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-primary-foreground">Count</Label>
                <Input type="number" min="0" step="1" value={count} onChange={(e) => setCount(e.target.value)} />
              </div>
              <div>
                <Label className="text-primary-foreground">Value (£)</Label>
                <Input type="number" min="0" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-primary-foreground">Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Lodge Room, GMC store, Secretary's custody" />
            </div>
            <div>
              <Label className="text-primary-foreground">Condition</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-primary-foreground">Date acquired</Label>
              <Input type="date" value={dateAcquired} onChange={(e) => setDateAcquired(e.target.value)} />
            </div>
            <div>
              <Label className="text-primary-foreground">Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional — condition detail, provenance, insurance notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-gold text-navy hover:bg-gold/90" disabled={saving} onClick={save}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}{editingId ? "Save changes" : "Add item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
