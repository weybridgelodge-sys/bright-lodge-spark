import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";

const CONDITIONS = ["Excellent", "Good", "Fair", "Poor", "Needs Repair/Replacement"] as const;

const money = (pence: number) =>
  `${pence < 0 ? "-" : ""}£${(Math.abs(pence) / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Item = {
  id: string;
  item: string;
  count: number;
  value_pence: number;
  condition: string | null;
  notes: string | null;
};

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
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("lodge_property_items" as any)
      .select("id,item,count,value_pence,condition,notes")
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
    setNotes("");
  };

  const openNew = () => { resetForm(); setOpen(true); };

  const openEdit = (r: Item) => {
    setEditingId(r.id);
    setItem(r.item);
    setCount(String(r.count ?? 1));
    setValue(((r.value_pence ?? 0) / 100).toFixed(2));
    setCondition(r.condition ?? "Good");
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
          {canEdit && (
            <Button className="bg-gold text-navy hover:bg-gold/90" onClick={openNew}>
              <Plus className="w-4 h-4 mr-1" /> New item
            </Button>
          )}
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
                  <th className="py-2 text-right">Value</th>
                  <th className="py-2">Condition</th>
                  <th className="py-2">Notes</th>
                  {canEdit && <th className="py-2 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 6 : 5} className="py-3 text-primary-foreground/60">No property recorded yet.</td>
                  </tr>
                ) : rows.map((r) => (
                  <tr key={r.id} className="border-b border-gold/10 align-top">
                    <td className="py-2 text-primary-foreground">{r.item}</td>
                    <td className="py-2 text-right text-primary-foreground">{r.count}</td>
                    <td className="py-2 text-right text-primary-foreground">{money(r.value_pence ?? 0)}</td>
                    <td className="py-2 text-primary-foreground/80">{r.condition ?? "—"}</td>
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
                  <td className="py-3 text-primary-foreground font-semibold" colSpan={2}>Total estimated value</td>
                  <td className="py-3 text-right text-gold font-semibold">{money(totalPence)}</td>
                  <td className="py-3" colSpan={canEdit ? 3 : 2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="bg-navy-light border-gold/30">
          <DialogHeader>
            <DialogTitle className="font-serif text-gold">{editingId ? "Edit item" : "Add item"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Item</Label>
              <Input value={item} onChange={(e) => setItem(e.target.value)} placeholder="e.g. Master's chair" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Count</Label>
                <Input type="number" min="0" step="1" value={count} onChange={(e) => setCount(e.target.value)} />
              </div>
              <div>
                <Label>Value (£)</Label>
                <Input type="number" min="0" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Condition</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional — condition detail, location, provenance" />
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
