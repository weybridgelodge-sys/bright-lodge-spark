// Shared public-event booking form pieces. Simple events (Christmas party etc.) render these
// with no optional modules; later event types plug extra sections in around them.
import { Minus, Plus } from "lucide-react";
import { calcProcessingFeePence, feeQuestion, type EventPayMethod } from "@/lib/cardFee";
import { CHILD_MAX_AGE, formatGBP } from "@/lib/publicEvents";
import { guestFieldId, invalidProps, type FieldError } from "@/lib/formErrors";
import { InlineFieldError } from "@/components/bookings/InlineFieldError";

export type GuestRow = { name: string; age: string; dietary: string; choice: string };
export type PayMethod = EventPayMethod;

export const inputCls = "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground font-sans ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[48px]";
export const labelClass = "block text-sm font-sans font-medium text-foreground mb-1";
export const req = <span className="text-destructive"> *</span>;

export const emptyGuest = (): GuestRow => ({ name: "", age: "", dietary: "", choice: "" });
export const resizeGuests = (rows: GuestRow[], n: number) =>
  n <= rows.length ? rows.slice(0, n) : [...rows, ...Array.from({ length: n - rows.length }, emptyGuest)];

export function Stepper({ label, value, onChange, hint }: { label: string; value: number; onChange: (n: number) => void; hint: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border border-border bg-card rounded-sm p-3">
      <div>
        <p className="font-sans font-semibold text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} onClick={() => onChange(Math.max(0, value - 1))}
          className="w-12 h-12 inline-flex items-center justify-center rounded-sm border border-border text-foreground"><Minus className="w-4 h-4" aria-hidden="true" /></button>
        <span className="w-8 text-center font-semibold text-foreground" aria-live="polite">{value}</span>
        <button type="button" aria-label={`More ${label.toLowerCase()}`} onClick={() => onChange(Math.min(20, value + 1))}
          className="w-12 h-12 inline-flex items-center justify-center rounded-sm border border-border text-foreground"><Plus className="w-4 h-4" aria-hidden="true" /></button>
      </div>
    </div>
  );
}

/** Off-screen (not display:none) so bots still fill it; checked again server-side. */
export function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", overflow: "hidden" }}>
      <label htmlFor="pev-website">Website (do not fill this in)</label>
      <input id="pev-website" name="website" type="text" value={value} onChange={(e) => onChange(e.target.value)} tabIndex={-1} autoComplete="off" />
    </div>
  );
}

export function GuestRowsFieldset({ adultRows, childRows, setAdultRows, setChildRows, dietaryChoices, renderExtra, errors = [] }: {
  /** Inline field errors (ids from guestFieldId). */
  errors?: FieldError[];
  adultRows: GuestRow[]; childRows: GuestRow[];
  setAdultRows: React.Dispatch<React.SetStateAction<GuestRow[]>>; setChildRows: React.Dispatch<React.SetStateAction<GuestRow[]>>;
  dietaryChoices: string[];
  /** Optional per-guest module controls (e.g. course choices); simple events pass nothing. */
  renderExtra?: (child: boolean, i: number) => React.ReactNode;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="font-serif text-xl text-foreground mb-2">Guest names and dietary needs</legend>
      {[...adultRows.map((g, i) => ({ g, i, child: false })), ...childRows.map((g, i) => ({ g, i, child: true }))].map(({ g, i, child }) => {
        const set = (patch: Partial<GuestRow>) => (child ? setChildRows : setAdultRows)((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
        return (
          <div key={`${child}-${i}`} className="border border-border bg-background rounded-sm p-3 space-y-2">
            <p className="text-sm font-semibold text-foreground">{child ? `Child ${i + 1}` : `Adult ${i + 1}`}</p>
            <div className="grid sm:grid-cols-[1fr_6rem] gap-2">
              <div><label className="block"><span className="sr-only">{child ? `Child ${i + 1} name` : `Adult ${i + 1} name`}</span><input id={guestFieldId(child, i, "name")} className={`${inputCls} scroll-mt-28`} placeholder="Name" aria-required="true" {...invalidProps(errors, guestFieldId(child, i, "name"))} value={g.name} onChange={(e) => set({ name: e.target.value })} /></label>
                <InlineFieldError errors={errors} id={guestFieldId(child, i, "name")} /></div>
              {child && <div><label className="block"><span className="sr-only">{`Child ${i + 1} age`}</span><input id={guestFieldId(child, i, "age")} className={`${inputCls} scroll-mt-28`} type="number" inputMode="numeric" min={0} max={CHILD_MAX_AGE} placeholder="Age" aria-required="true" {...invalidProps(errors, guestFieldId(child, i, "age"))} value={g.age} onChange={(e) => set({ age: e.target.value })} /></label>
                <InlineFieldError errors={errors} id={guestFieldId(child, i, "age")} /></div>}
            </div>
            {renderExtra?.(child, i)}
            {dietaryChoices.length > 0 && (
              <label className="block"><span className="sr-only">Menu choice</span>
                <select className={inputCls} value={g.choice} onChange={(e) => set({ choice: e.target.value })}>
                  <option value="">Standard menu</option>
                  {dietaryChoices.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            )}
            <label className="block"><span className="sr-only">Dietary needs</span><input className={inputCls} placeholder="Dietary needs or allergies (optional)" value={g.dietary} maxLength={500} onChange={(e) => set({ dietary: e.target.value })} /></label>
          </div>
        );
      })}
    </fieldset>
  );
}

const METHODS = [
  ["card", "Card", "Visa, Mastercard, Apple Pay or Google Pay"],
  ["pay_by_bank", "Pay by Bank", "Pay instantly from your banking app"],
  ["bank_transfer", "Bank transfer", "We'll show you the account details and a reference"],
] as const;

export function PaymentMethodFieldset({ method, onChange, allowed }: { method: PayMethod; onChange: (m: PayMethod) => void; allowed?: PayMethod[] }) {
  return (
    <fieldset className="space-y-2">
      <legend className="font-serif text-xl text-foreground mb-2">Payment</legend>
      {METHODS.filter(([v]) => !allowed || allowed.includes(v)).map(([v, l, h]) => (
        <label key={v} className={`flex items-center gap-3 min-h-[56px] w-full border rounded-sm px-4 py-2 cursor-pointer bg-background ${method === v ? "border-gold" : "border-border"}`}>
          <input type="radio" name="pay" value={v} checked={method === v} onChange={() => onChange(v)} className="w-5 h-5 shrink-0 accent-[hsl(var(--gold))]" />
          <span><span className="block font-semibold text-foreground">{l}</span><span className="block text-sm text-muted-foreground">{h}</span></span>
        </label>
      ))}
    </fieldset>
  );
}

/** Yes/No fee question plus subtotal / fee / total summary for the amount being charged now. */
export function FeeAndSummary({ subtotal, feePence, total, method, coverFee, onCoverFee, hideSummary }: {
  subtotal: number; feePence: number; total: number; method: PayMethod; coverFee: boolean; onCoverFee: (v: boolean) => void;
  /** Deposit and balance screens show their own summary. */
  hideSummary?: boolean;
}) {
  if (subtotal <= 0) return null;
  return (
    <div className="border-t border-border pt-4 space-y-3">
      <p className="block text-sm font-sans font-medium text-foreground mb-1">{feeQuestion(method)}</p>
      <div className="space-y-2 mt-1" role="radiogroup" aria-label="Processing fee preference">
        <label className="flex items-center gap-3 cursor-pointer min-h-[48px]">
          <input type="radio" name="fee" checked={coverFee} onChange={() => onCoverFee(true)} className="w-5 h-5 shrink-0 accent-[hsl(var(--gold))]" />
          <span className="text-sm font-sans text-foreground">Yes — add {formatGBP(calcProcessingFeePence(subtotal, method))} to my total</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer min-h-[48px]">
          <input type="radio" name="fee" checked={!coverFee} onChange={() => onCoverFee(false)} className="w-5 h-5 shrink-0 accent-[hsl(var(--gold))]" />
          <span className="text-sm font-sans text-foreground">No — the Lodge will cover it</span>
        </label>
      </div>
      {!hideSummary && <div className="bg-background border border-border rounded-sm p-4 space-y-1">
        <div className="flex justify-between text-sm font-sans"><span className="text-muted-foreground">Subtotal</span><span className="text-foreground">{formatGBP(subtotal)}</span></div>
        {feePence > 0 && <div className="flex justify-between text-sm font-sans"><span className="text-muted-foreground">{method === "card" ? "Card fee" : "Processing fee"}</span><span className="text-foreground">{formatGBP(feePence)}</span></div>}
        <div className="flex justify-between text-base font-sans font-semibold border-t border-border pt-2 mt-2"><span className="text-foreground">Total</span><span className="text-gold-dark">{formatGBP(total)}</span></div>
      </div>}
    </div>
  );
}

/** "Pay in full" / "Pay deposit now" choice, shown only on deposit-enabled events. */
export function PaymentPlanFieldset({ plan, onChange, depositLabel, dueDateLabel }: {
  plan: "full" | "deposit"; onChange: (p: "full" | "deposit") => void; depositLabel: string; dueDateLabel: string;
}) {
  const opts = [
    ["full", "Pay in full", "Pay the whole amount now"],
    ["deposit", "Pay deposit now", `${depositLabel} now, balance due by ${dueDateLabel} (card or Pay by Bank)`],
  ] as const;
  return (
    <fieldset className="space-y-2">
      <legend className="font-serif text-xl text-foreground mb-2">How would you like to pay?</legend>
      {opts.map(([v, l, h]) => (
        <label key={v} className={`flex items-center gap-3 min-h-[56px] w-full border rounded-sm px-4 py-2 cursor-pointer bg-background ${plan === v ? "border-gold" : "border-border"}`}>
          <input type="radio" name="plan" value={v} checked={plan === v} onChange={() => onChange(v)} className="w-5 h-5 shrink-0 accent-[hsl(var(--gold))]" />
          <span className="min-w-0"><span className="block font-semibold text-foreground">{l}</span><span className="block text-sm text-muted-foreground break-words">{h}</span></span>
        </label>
      ))}
    </fieldset>
  );
}

/** Rows for what is paid now and what is left, used for deposits and balances. */
export function PayNowSummary({ rows, totalLabel, total, note }: { rows: [string, number][]; totalLabel: string; total: number; note?: string }) {
  return (
    <div className="bg-background border border-border rounded-sm p-4 space-y-1" aria-live="polite">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3 text-sm font-sans"><span className="text-muted-foreground min-w-0">{k}</span><span className="text-foreground tabular-nums shrink-0">{formatGBP(v)}</span></div>
      ))}
      <div className="flex justify-between gap-3 text-base font-sans font-semibold border-t border-border pt-2 mt-2"><span className="text-foreground">{totalLabel}</span><span className="text-gold-dark tabular-nums">{formatGBP(total)}</span></div>
      {note && <p className="text-sm text-foreground font-semibold pt-1 break-words">{note}</p>}
    </div>
  );
}
