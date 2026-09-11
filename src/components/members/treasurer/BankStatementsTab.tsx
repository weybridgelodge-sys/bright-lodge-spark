import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, Download, Trash2, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { toUploadBody } from "@/lib/nativeUpload";
import { saveBlob } from "@/lib/nativeDownload";
import { parseQif } from "@/lib/treasurer/qif";

const BUCKET = "bank-statements";

const money = (pence: number) =>
  `${pence < 0 ? "-" : ""}£${(Math.abs(pence) / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-GB");
};

type Statement = {
  id: string;
  period_label: string;
  file_name: string;
  storage_path: string;
  file_size: number | null;
  parse_status: string;
  parse_message: string | null;
  uploaded_at: string;
};

type StatementTx = {
  id: string;
  statement_id: string;
  transaction_date: string | null;
  description: string | null;
  amount_pence: number;
  raw_memo: string | null;
  parse_order: number;
};

export default function BankStatementsTab({ canEdit }: { canEdit: boolean }) {
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [period, setPeriod] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, StatementTx[]>>({});
  const [lastSummary, setLastSummary] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bank_statements" as any)
      .select("*")
      .order("uploaded_at", { ascending: false });
    if (error) toast({ title: "Could not load statements", description: error.message, variant: "destructive" });
    setStatements(((data as unknown as Statement[]) ?? []));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (rows[id]) return;
    const { data, error } = await supabase
      .from("bank_statement_transactions" as any)
      .select("*")
      .eq("statement_id", id)
      .order("transaction_date", { ascending: true })
      .order("parse_order", { ascending: true });
    if (error) { toast({ title: "Could not load transactions", description: error.message, variant: "destructive" }); return; }
    setRows((r) => ({ ...r, [id]: (data as unknown as StatementTx[]) ?? [] }));
  };

  const upload = async () => {
    if (!period.trim()) { toast({ title: "Period label is required", variant: "destructive" }); return; }
    if (!file) { toast({ title: "Choose a file to upload", variant: "destructive" }); return; }
    setBusy(true);
    setLastSummary(null);
    try {
      const { data: session } = await supabase.auth.getUser();
      const text = await file.text();
      const parsed = parseQif(text);

      const path = `${new Date().toISOString().slice(0, 10)}-${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
      const body = await toUploadBody(file);
      // The raw file is always stored, whether or not parsing succeeded.
      const up = await supabase.storage.from(BUCKET).upload(path, body, {
        contentType: "text/plain",
        upsert: false,
      });
      if (up.error) throw new Error(up.error.message);

      const { data: stmt, error: insErr } = await supabase
        .from("bank_statements" as any)
        .insert({
          period_label: period.trim(),
          file_name: file.name,
          storage_path: path,
          file_size: file.size,
          parse_status: parsed.ok ? "parsed" : "failed",
          parse_message: parsed.ok
            ? (parsed.warnings.join(" ") || null)
            : (parsed.error ?? "Could not parse this file."),
          uploaded_by: session?.user?.id ?? null,
        })
        .select("*")
        .single();
      if (insErr) throw new Error(insErr.message);

      const created = stmt as unknown as Statement;

      if (parsed.ok && parsed.transactions.length) {
        const { error: txErr } = await supabase.from("bank_statement_transactions" as any).insert(
          parsed.transactions.map((t) => ({
            statement_id: created.id,
            transaction_date: t.date,
            description: t.description,
            amount_pence: t.amountPence,
            raw_memo: t.memo,
            parse_order: t.order,
          })),
        );
        if (txErr) throw new Error(txErr.message);
        setLastSummary(
          `Parsed ${parsed.transactions.length} transaction${parsed.transactions.length === 1 ? "" : "s"}, ` +
          `${money(parsed.totalInPence)} paid in, ${money(parsed.totalOutPence)} paid out.` +
          (parsed.warnings.length ? ` — ${parsed.warnings.join(" ")}` : ""),
        );
        toast({ title: "Statement uploaded and parsed" });
      } else {
        setLastSummary(null);
        toast({
          title: "Could not parse this file",
          description: `${parsed.error ?? "Unrecognised format."} The original file has still been stored.`,
          variant: "destructive",
        });
      }

      setPeriod("");
      setFile(null);
      await load();
    } catch (e: any) {
      toast({ title: "Upload failed", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const download = async (s: Statement) => {
    const { data, error } = await supabase.storage.from(BUCKET).download(s.storage_path);
    if (error || !data) { toast({ title: "Download failed", description: error?.message, variant: "destructive" }); return; }
    await saveBlob(data, s.file_name);
  };

  const remove = async (s: Statement) => {
    if (!confirm(`Delete the statement for ${s.period_label}? This removes the file and its parsed transactions.`)) return;
    await supabase.storage.from(BUCKET).remove([s.storage_path]);
    const { error } = await supabase.from("bank_statements" as any).delete().eq("id", s.id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Statement deleted" });
    await load();
  };

  return (
    <div className="space-y-6">
      {canEdit && (
        <div className="rounded-sm border border-gold/20 bg-navy-light/30 p-4 space-y-3">
          <h3 className="font-serif text-gold">Upload a statement</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Period label *</Label>
              <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="e.g. January 2025" />
            </div>
            <div>
              <Label>QIF file (.qif or .txt)</Label>
              <Input
                type="file"
                accept=".qif,.txt,text/plain"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <Button className="bg-gold text-navy hover:bg-gold/90" disabled={busy} onClick={upload}>
            {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
            Upload &amp; parse
          </Button>
          {lastSummary && (
            <p className="text-sm text-gold/90 bg-gold/10 border border-gold/30 rounded-sm px-3 py-2">{lastSummary}</p>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-primary-foreground/60"><Loader2 className="w-4 h-4 mr-1 inline animate-spin" /> Loading…</p>
      ) : statements.length === 0 ? (
        <p className="text-primary-foreground/60 italic">No statements uploaded yet.</p>
      ) : (
        <div className="space-y-2">
          {statements.map((s) => {
            const open = expanded === s.id;
            const txs = rows[s.id] ?? [];
            const paidIn = txs.filter((t) => t.amount_pence > 0).reduce((a, t) => a + t.amount_pence, 0);
            const paidOut = txs.filter((t) => t.amount_pence < 0).reduce((a, t) => a - t.amount_pence, 0);
            return (
              <div key={s.id} className="rounded-sm border border-gold/20 bg-navy-light/20">
                <div className="flex items-center gap-2 p-3">
                  <button onClick={() => toggle(s.id)} className="flex items-center gap-2 text-left flex-1 min-w-0">
                    {open ? <ChevronDown className="w-4 h-4 text-gold shrink-0" /> : <ChevronRight className="w-4 h-4 text-gold shrink-0" />}
                    <span className="min-w-0">
                      <span className="block text-primary-foreground font-medium truncate">{s.period_label}</span>
                      <span className="block text-xs text-primary-foreground/60 truncate">
                        {s.file_name} · {fmtDate(s.uploaded_at)}
                        {s.file_size ? ` · ${(s.file_size / 1024).toFixed(0)} KB` : ""}
                      </span>
                    </span>
                  </button>
                  {s.parse_status !== "parsed" && (
                    <span className="flex items-center gap-1 text-xs text-amber-300 shrink-0">
                      <AlertTriangle className="w-3.5 h-3.5" /> Could not parse
                    </span>
                  )}
                  <Button variant="outline" size="sm" onClick={() => download(s)}>
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                  {canEdit && (
                    <Button variant="outline" size="sm" onClick={() => remove(s)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>

                {open && (
                  <div className="border-t border-gold/15 p-3">
                    {s.parse_status !== "parsed" ? (
                      <p className="text-sm text-amber-300">
                        Could not parse this file — {s.parse_message ?? "unrecognised format."} The original file is still stored and can be downloaded above.
                      </p>
                    ) : txs.length === 0 ? (
                      <p className="text-primary-foreground/60 text-sm">Loading transactions…</p>
                    ) : (
                      <>
                        {s.parse_message && (
                          <p className="text-xs text-amber-300 mb-2">{s.parse_message}</p>
                        )}
                        <p className="text-sm text-gold/90 mb-2">
                          {txs.length} transaction{txs.length === 1 ? "" : "s"} · {money(paidIn)} paid in · {money(paidOut)} paid out
                        </p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm min-w-[620px]">
                            <thead className="bg-navy text-gold/80 uppercase text-[10px] tracking-wider">
                              <tr>
                                <th className="text-left p-2 w-28">Date</th>
                                <th className="text-left p-2">Description</th>
                                <th className="text-left p-2">Memo</th>
                                <th className="text-right p-2 w-32">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {txs.map((t) => (
                                <tr key={t.id} className="border-t border-gold/10">
                                  <td className="p-2 text-primary-foreground/80">{fmtDate(t.transaction_date)}</td>
                                  <td className="p-2 text-primary-foreground">{t.description}</td>
                                  <td className="p-2 text-primary-foreground/70">{t.raw_memo ?? "—"}</td>
                                  <td className={`p-2 text-right tabular-nums ${t.amount_pence < 0 ? "text-red-300" : "text-emerald-300"}`}>
                                    {money(t.amount_pence)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
