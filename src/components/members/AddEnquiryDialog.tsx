import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { MANUAL_CHANNELS, type ManualEnquiryInput, type ManualEnquiryErrors, type ManualChannel, ukToday, validateManualEnquiry } from "@/lib/manualEnquiry";

const blank = (): ManualEnquiryInput => ({ full_name: "", email: "", phone: "", channel: "", received_on: ukToday(), message: "" });

export default function AddEnquiryDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const [v, setV] = useState<ManualEnquiryInput>(blank);
  const [errors, setErrors] = useState<ManualEnquiryErrors>({});
  const [saving, setSaving] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());

  const change = (o: boolean) => {
    if (saving) return;
    if (o) { setV(blank()); setErrors({}); setRequestId(crypto.randomUUID()); }
    onOpenChange(o);
  };
  const set = (p: Partial<ManualEnquiryInput>) => setV((s) => ({ ...s, ...p }));

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (saving) return;
    const errs = validateManualEnquiry(v);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    const { error } = await supabase.rpc("add_manual_enquiry" as any, {
      _request_id: requestId, _full_name: v.full_name.trim(), _email: v.email.trim() || null,
      _phone: v.phone.trim() || null, _channel: v.channel, _received_on: v.received_on, _message: v.message.trim(),
    } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Enquiry from ${v.full_name.trim()} added`);
    onOpenChange(false);
    onSaved();
  };

  const field = "min-h-11";
  const err = (m?: string, id?: string) => m ? <p id={id} role="alert" className="text-xs text-destructive-foreground mt-1">{m}</p> : null;

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto w-[calc(100vw-1rem)] max-w-lg p-4 sm:p-6 bg-navy text-cream border-gold/30">
        <DialogHeader>
          <DialogTitle className="font-serif text-gold">Add enquiry</DialogTitle>
          <DialogDescription className="text-cream">Log an enquiry received by email, phone or in person.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-3">
          <div>
            <Label htmlFor="enq-name">Name</Label>
            <Input id="enq-name" className={field} value={v.full_name} maxLength={120} onChange={(e) => set({ full_name: e.target.value })} aria-invalid={!!errors.full_name} placeholder="e.g. John Smith" />
            {err(errors.full_name)}
          </div>
          <div>
            <Label htmlFor="enq-email">Email</Label>
            <Input id="enq-email" type="email" inputMode="email" className={field} value={v.email} maxLength={255} onChange={(e) => set({ email: e.target.value })} aria-invalid={!!errors.email || !!errors.contact} placeholder="e.g. john@example.com" />
            {err(errors.email)}
          </div>
          <div>
            <Label htmlFor="enq-phone">Phone</Label>
            <Input id="enq-phone" type="tel" inputMode="tel" className={field} value={v.phone} maxLength={40} onChange={(e) => set({ phone: e.target.value })} aria-invalid={!!errors.phone || !!errors.contact} placeholder="e.g. 07700 900000" />
            {err(errors.phone)}
            {errors.contact ? err(errors.contact) : <p className="text-xs text-cream/80 mt-1">An email or a phone number is required.</p>}
          </div>
          <div>
            <Label htmlFor="enq-channel">How they got in touch</Label>
            <Select value={v.channel} onValueChange={(c) => set({ channel: c as ManualChannel })}>
              <SelectTrigger id="enq-channel" className={field} aria-label="How they got in touch" aria-invalid={!!errors.channel}><SelectValue placeholder="Choose…" /></SelectTrigger>
              <SelectContent>{MANUAL_CHANNELS.map((c) => <SelectItem key={c.value} value={c.value} className="min-h-11">{c.label}</SelectItem>)}</SelectContent>
            </Select>
            {err(errors.channel)}
          </div>
          <div>
            <Label htmlFor="enq-date">Date received</Label>
            <Input id="enq-date" type="date" className={field} max={ukToday()} value={v.received_on} onChange={(e) => set({ received_on: e.target.value })} aria-invalid={!!errors.received_on} />
            {err(errors.received_on)}
          </div>
          <div>
            <Label htmlFor="enq-message">Message / notes</Label>
            <Textarea id="enq-message" rows={4} maxLength={2000} value={v.message} onChange={(e) => set({ message: e.target.value })} aria-invalid={!!errors.message} placeholder="What they said, or any notes" />
            <p className="text-xs text-cream/80 mt-1">{v.message.length}/2000</p>
            {err(errors.message)}
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <button type="button" onClick={() => change(false)} disabled={saving} className="min-h-11 px-4 rounded-sm border border-gold/30 text-primary-foreground/80 text-sm disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={saving} className="min-h-11 px-4 rounded-sm bg-gold-shimmer text-accent-foreground font-semibold text-sm disabled:opacity-50">
              {saving ? "Saving…" : "Add enquiry"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
