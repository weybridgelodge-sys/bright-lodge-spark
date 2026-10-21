import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { fieldCls } from "@/lib/fieldStyle";
import { readFunctionError } from "@/lib/functionError";
import { blobToBase64, checkInputFile, processToPng, DEFAULT_WHITE_THRESHOLD } from "@/lib/signatureImage";

type Props = { memberId: string; memberName?: string; onBehalf?: boolean };
type Pt = { x: number; y: number };

const btn = "min-h-11 px-4 py-2 rounded-sm text-sm font-semibold border border-gold/70 text-gold hover:bg-gold/10 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold";
const primary = "min-h-11 px-4 py-2 rounded-sm text-sm font-semibold bg-gold-shimmer text-accent-foreground disabled:opacity-50 inline-flex items-center gap-2";
const labelCls = "block text-xs uppercase tracking-wider text-gold mb-1";
const todayIso = () => new Date().toISOString().slice(0, 10);

/** Upload or draw a signature; stored only through the signature-upload function. Never logs image data. */
export default function SignatureCapture({ memberId, memberName, onBehalf = false }: Props) {
  const [hasSig, setHasSig] = useState<boolean | null>(null);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<"draw" | "upload">("draw");
  const [strokes, setStrokes] = useState<Pt[][]>([]);
  const [pending, setPending] = useState<{ blob: Blob; url: string; method: "upload" | "drawn" } | null>(null);
  const [threshold, setThreshold] = useState(DEFAULT_WHITE_THRESHOLD);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [cDate, setCDate] = useState(todayIso());
  const [confirmed, setConfirmed] = useState(false);
  const [hp, setHp] = useState("");
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<Pt[] | null>(null);
  const idp = `sig-${memberId.slice(0, 8)}`;

  const loadStatus = useCallback(async () => {
    const { data } = await supabase.from("member_signatures").select("id").eq("member_id", memberId).eq("active", true).maybeSingle();
    setHasSig(!!data);
  }, [memberId]);
  useEffect(() => { loadStatus(); }, [loadStatus]);
  useEffect(() => () => { if (savedUrl) URL.revokeObjectURL(savedUrl); }, [savedUrl]);
  useEffect(() => () => { if (pending) URL.revokeObjectURL(pending.url); }, [pending]);

  // Redraw strokes onto the pad.
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#111111"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (const s of strokes) { ctx.beginPath(); s.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); if (s.length === 1) ctx.lineTo(s[0].x + 0.1, s[0].y); ctx.stroke(); }
  }, [strokes, mode]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * e.currentTarget.width, y: ((e.clientY - r.top) / r.height) * e.currentTarget.height };
  };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => { e.currentTarget.setPointerCapture(e.pointerId); drawing.current = [pos(e)]; setStrokes((s) => [...s, drawing.current!]); };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => { if (!drawing.current) return; drawing.current.push(pos(e)); setStrokes((s) => [...s.slice(0, -1), [...drawing.current!]]); };
  const up = () => { drawing.current = null; };

  const setPendingBlob = (blob: Blob, method: "upload" | "drawn") => setPending({ blob, url: URL.createObjectURL(blob), method });

  const processDrawn = async () => {
    const c = canvasRef.current; if (!c || !strokes.length) { toast.error("Please draw your signature first."); return; }
    const r = await processToPng(c, c.width, c.height);
    if (!r) { toast.error("No ink found. Please draw your signature."); return; }
    setPendingBlob(r.blob, "drawn");
  };

  const processFile = async (f: File, t = threshold) => {
    const err = checkInputFile(f); if (err) { toast.error(err); return; }
    const bmp = await createImageBitmap(f).catch(() => null);
    if (!bmp) { toast.error("That image could not be read."); return; }
    const r = await processToPng(bmp, bmp.width, bmp.height, t);
    bmp.close();
    if (!r) { toast.error("No ink found in that image. Try a darker scan or lower the background setting."); return; }
    setPendingBlob(r.blob, "upload");
  };

  const consentOk = !onBehalf || (note.trim() && cDate && confirmed);
  const consentBody = onBehalf ? { consent_note: note.trim(), consent_date: cDate, consent_confirmed: confirmed } : {};

  const save = async () => {
    if (!pending || hp) return;
    if (!consentOk) { toast.error("Please record the member's consent first."); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("signature-upload", {
      body: { member_id: memberId, image_base64: await blobToBase64(pending.blob), method: pending.method, ...consentBody },
    });
    setBusy(false);
    if (error || !data?.ok) { toast.error(await readFunctionError(error, data, "The signature could not be saved.")); return; }
    toast.success("Signature saved");
    setPending(null); setStrokes([]); setFile(null); setSavedUrl(null);
    loadStatus();
  };

  const remove = async () => {
    if (!consentOk) { toast.error("Please record the member's consent first."); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("signature-revoke", { body: { member_id: memberId, ...consentBody } });
    setBusy(false);
    if (error || !data?.ok) { toast.error(await readFunctionError(error, data, "The signature could not be removed.")); return; }
    toast.success("Signature removed");
    setSavedUrl(null); loadStatus();
  };

  const showSaved = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("signature-preview", { body: { member_id: memberId } });
    setBusy(false);
    if (error || !(data instanceof Blob)) { toast.error(await readFunctionError(error, data, "No signature on file.")); return; }
    setSavedUrl(URL.createObjectURL(data));
  };

  return (
    <div className="space-y-4 font-sans">
      <p className="text-sm text-primary-foreground/90" aria-live="polite">
        {hasSig === null ? "Checking…" : hasSig ? `A signature is on file${memberName ? ` for ${memberName}` : ""}.` : `No signature on file${memberName ? ` for ${memberName}` : ""}.`}
      </p>
      {hasSig && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn} onClick={showSaved} disabled={busy}>Show saved signature</button>
          <button type="button" className={btn} onClick={remove} disabled={busy || !consentOk}>Remove signature</button>
        </div>
      )}
      {savedUrl && (
        <div className="bg-cream rounded-sm p-3 max-w-full overflow-hidden">
          <img src={savedUrl} alt={`Saved signature${memberName ? ` of ${memberName}` : ""}`} className="max-w-full h-auto max-h-24" />
        </div>
      )}

      <div role="radiogroup" aria-label="How to add a signature" className="flex flex-wrap gap-2">
        {(["draw", "upload"] as const).map((m) => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => { setMode(m); setPending(null); }}
            className={`${btn} ${mode === m ? "bg-gold/15" : ""}`}>{m === "draw" ? "Draw" : "Upload image"}</button>
        ))}
      </div>

      {mode === "draw" ? (
        <div className="space-y-2">
          <canvas ref={canvasRef} width={600} height={200} tabIndex={0}
            aria-label="Signature pad. Draw with finger, mouse or stylus. Use Upload image if you cannot draw."
            className="w-full h-auto min-h-[120px] bg-cream rounded-sm touch-none border border-gold/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn} onClick={() => setStrokes((s) => s.slice(0, -1))} disabled={!strokes.length}>Undo</button>
            <button type="button" className={btn} onClick={() => { setStrokes([]); setPending(null); }} disabled={!strokes.length}>Clear</button>
            <button type="button" className={btn} onClick={processDrawn} disabled={!strokes.length}>Preview</button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <label htmlFor={`${idp}-file`} className={labelCls}>Signature image (PNG or JPEG, up to 2 MB)</label>
          <input id={`${idp}-file`} type="file" accept="image/png,image/jpeg" className={fieldCls}
            onChange={(e) => { const f = e.target.files?.[0] ?? null; setFile(f); if (f) processFile(f); }} />
          {file && (
            <div>
              <label htmlFor={`${idp}-thr`} className={labelCls}>Background removal ({threshold})</label>
              <input id={`${idp}-thr`} type="range" min={180} max={250} value={threshold} className="w-full min-h-11 accent-gold"
                onChange={(e) => setThreshold(Number(e.target.value))} onPointerUp={() => processFile(file, threshold)} onKeyUp={() => processFile(file, threshold)} />
            </div>
          )}
        </div>
      )}

      {pending && (
        <div className="space-y-1">
          <p className={labelCls}>Preview before saving</p>
          <div className="bg-cream rounded-sm p-3 max-w-full overflow-hidden">
            <img src={pending.url} alt="Signature preview" className="max-w-full h-auto max-h-24" />
          </div>
        </div>
      )}

      {onBehalf && (
        <fieldset className="space-y-3 border-t border-gold/10 pt-3">
          <legend className="font-serif text-gold">Member's consent</legend>
          <div>
            <label htmlFor={`${idp}-note`} className={labelCls}>Consent note</label>
            <textarea id={`${idp}-note`} rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Member agreed in person and signed on paper" className={fieldCls} />
          </div>
          <div>
            <label htmlFor={`${idp}-date`} className={labelCls}>Date agreed</label>
            <input id={`${idp}-date`} type="date" max={todayIso()} value={cDate} onChange={(e) => setCDate(e.target.value)} className={fieldCls} />
          </div>
          <label className="flex items-start gap-3 min-h-11 text-sm text-primary-foreground">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1 h-5 w-5 accent-gold" />
            I confirm the member agreed to this signature being stored and used on lodge returns.
          </label>
        </fieldset>
      )}

      <div aria-hidden="true" className="hidden">
        <label>Website<input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} name="website" /></label>
      </div>

      <button type="button" className={primary} onClick={save} disabled={busy || !pending || !consentOk}>
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        {hasSig ? "Replace signature" : "Save signature"}
      </button>
    </div>
  );
}
