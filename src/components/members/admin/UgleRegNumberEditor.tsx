import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * Inline editor for a member's Grand Lodge Reference Number (ugle_reg_number).
 * Saves via the set_member_ugle_reg_number RPC (admin, Secretary, WM only),
 * never via a general profile update.
 */
export default function UgleRegNumberEditor({
  memberId,
  value,
  onSaved,
}: {
  memberId: string;
  value: string | null | undefined;
  onSaved: (v: string | null) => void;
}) {
  const [draft, setDraft] = useState(value ?? "");
  const [busy, setBusy] = useState(false);
  useEffect(() => setDraft(value ?? ""), [value]);
  const dirty = draft.trim() !== (value ?? "").trim();
  const inputId = `ugle-${memberId}`;

  const save = async () => {
    setBusy(true);
    const { error } = await (supabase as any).rpc("set_member_ugle_reg_number", {
      _member: memberId,
      _value: draft,
    });
    setBusy(false);
    if (error) return toast.error(`Could not save Grand Lodge number: ${error.message}`);
    const v = draft.trim() || null;
    onSaved(v);
    toast.success("Grand Lodge number saved");
  };

  return (
    <div className="mt-2 max-w-xs">
      <label htmlFor={inputId} className="block text-[11px] uppercase tracking-wider text-primary-foreground/60">
        Grand Lodge Ref. No.
      </label>
      <div className="mt-1 flex gap-2">
        <input
          id={inputId}
          value={draft}
          maxLength={40}
          inputMode="numeric"
          placeholder={value ? "" : "Not yet recorded"}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && dirty && !busy) {
              e.preventDefault();
              save();
            }
          }}
          className="min-w-0 flex-1 min-h-[48px] px-3 bg-navy border border-gold/30 rounded-sm text-sm text-primary-foreground placeholder:text-primary-foreground/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        />
        <button
          type="button"
          onClick={save}
          disabled={!dirty || busy}
          className="min-h-[48px] min-w-[64px] px-3 text-xs uppercase tracking-wider border border-gold/40 text-gold rounded-sm hover:bg-gold/10 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          {busy ? "…" : "Save"}
        </button>
      </div>
    </div>
  );
}
