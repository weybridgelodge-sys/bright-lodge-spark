import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PostingPeriod } from "@/lib/treasurer/periods";

type Props = {
  periods: PostingPeriod[];
  value: string | null;
  autoId: string | null;
  onChange: (id: string) => void;
  disabled?: boolean;
  label?: string;
  compact?: boolean;
  id?: string;
};

/** Dropdown of all unlocked Treasurer periods, defaulting to the one containing the entry date. */
export default function PeriodPicker({ periods, value, autoId, onChange, disabled, label = "Period", compact, id }: Props) {
  const overridden = value && autoId && value !== autoId;
  return (
    <div>
      {!compact && <Label htmlFor={id}>{label}</Label>}
      <Select value={value ?? ""} onValueChange={onChange} disabled={disabled || periods.length === 0}>
        <SelectTrigger id={id} aria-label={label} className={compact ? "h-8 w-44 text-xs" : undefined}>
          <SelectValue placeholder={periods.length ? "Choose a period" : "No unlocked periods"} />
        </SelectTrigger>
        <SelectContent>
          {periods.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.label}{p.id === autoId ? " (matches date)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!value && (
        <p className="text-xs text-amber-300 mt-1">
          No unlocked period covers this date. Unlock or create that month, or pick another period.
        </p>
      )}
      {overridden && !compact && (
        <p className="text-xs text-amber-300 mt-1">Overridden — the entry date falls in a different period.</p>
      )}
    </div>
  );
}
