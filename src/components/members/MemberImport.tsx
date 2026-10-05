import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Loader2, Upload } from "lucide-react";
import { csvToObjects } from "@/lib/csv";
import { saveText } from "@/lib/nativeDownload";
import { readFunctionError } from "@/lib/functionError";
import { TEMPLATE_COLUMNS } from "../../../supabase/functions/_shared/memberImport";

type Result = { row: number; email: string; action: "create" | "fill" | "unchanged" | "error"; fields?: string[]; message?: string };
type Resp = { dry_run: boolean; summary: Record<Result["action"], number>; results: Result[] };

const LABEL: Record<Result["action"], string> = { create: "New", fill: "Fill blanks", unchanged: "No change", error: "Error" };

export default function MemberImport({ onDone }: { onDone: () => void }) {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<Resp | null>(null);
  const [busy, setBusy] = useState(false);

  const call = async (dry_run: boolean): Promise<Resp | null> => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-import-members", { body: { dry_run, rows } });
    setBusy(false);
    if (error || (data as { error?: unknown })?.error) {
      toast.error(await readFunctionError(error, data, "Import failed"));
      return null;
    }
    return data as Resp;
  };

  const onFile = async (f: File | undefined) => {
    setPreview(null);
    if (!f) return;
    const parsed = csvToObjects(await f.text());
    setFileName(f.name);
    setRows(parsed);
    if (!parsed.length) { toast.error("No rows found in that file"); return; }
    if (parsed.length > 250) { toast.error("Up to 250 rows per import — split the file"); setRows([]); return; }
    const r = await call(true);
    if (r) setPreview(r);
  };

  const run = async () => {
    const r = await call(false);
    if (!r) return;
    setPreview(r);
    const s = r.summary;
    if (s.error) toast.error(`${s.create} added, ${s.fill} updated, ${s.error} failed — see the list`);
    else toast.success(`${s.create} added, ${s.fill} updated, ${s.unchanged} unchanged`);
    onDone();
  };

  const btn = "inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-sm text-sm";

  return (
    <div className="bg-navy-dark/60 border border-gold/15 rounded-sm p-4 sm:p-6 space-y-4 max-w-3xl">
      <h2 className="font-serif text-xl text-gold">Import members from a spreadsheet</h2>
      <ul className="text-sm text-primary-foreground/70 list-disc pl-5 space-y-1">
        <li>Matches existing members by email, then by Grand Lodge number.</li>
        <li>For existing members it only fills in blank details and never overwrites anything. Running the same file again changes nothing.</li>
        <li>New people get a sign-in (no email is sent) and are set to Active unless the file gives a status.</li>
        <li>Roles, sign-in emails and existing members' status are never changed.</li>
      </ul>
      <div className="flex flex-col sm:flex-row gap-2">
        <button type="button" onClick={() => saveText(TEMPLATE_COLUMNS.join(",") + "\r\n", "member-import-template.csv")}
          className={`${btn} border border-gold/40 text-gold`}>
          <Download className="w-4 h-4" /> Download template
        </button>
        <label className={`${btn} bg-gold-shimmer text-accent-foreground font-semibold cursor-pointer`}>
          <Upload className="w-4 h-4" /> Choose CSV file
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      </div>
      {busy && <p className="text-sm text-primary-foreground/70 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Working…</p>}

      {preview && (
        <div className="space-y-3">
          <p className="text-sm text-primary-foreground/80 break-words">
            {preview.dry_run ? "Preview of" : "Result for"} <span className="text-gold">{fileName}</span>:{" "}
            {preview.summary.create} new · {preview.summary.fill} fill blanks · {preview.summary.unchanged} no change · {preview.summary.error} errors
          </p>
          <ul className="divide-y divide-gold/10 border border-gold/15 rounded-sm max-h-[50vh] overflow-y-auto">
            {preview.results.map((r) => (
              <li key={r.row} className="p-3 text-sm flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-primary-foreground/50 text-xs">Row {r.row}</span>
                  <span className="break-all">{r.email || "—"}</span>
                  <span className={`text-[10px] uppercase tracking-wider border rounded-sm px-2 py-0.5 ${r.action === "error" ? "border-destructive text-destructive" : "border-gold/40 text-gold"}`}>
                    {LABEL[r.action]}
                  </span>
                </div>
                {r.message && <p className="text-xs text-destructive break-words">{r.message}</p>}
                {r.fields?.length ? <p className="text-xs text-primary-foreground/60 break-words">{r.fields.join(", ")}</p> : null}
              </li>
            ))}
          </ul>
          {preview.dry_run && (preview.summary.create + preview.summary.fill > 0) && (
            <button type="button" disabled={busy} onClick={run}
              className={`${btn} w-full sm:w-auto bg-gold-shimmer text-accent-foreground font-semibold disabled:opacity-50`}>
              Import {preview.summary.create + preview.summary.fill} row{preview.summary.create + preview.summary.fill === 1 ? "" : "s"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
