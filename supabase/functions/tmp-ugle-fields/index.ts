// TEMPORARY read-only: lists AcroForm field names/sizes of the UGLE template. Deleted after use.
import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument } from "pdf-lib";
Deno.serve(async (req) => {
  if (new URL(req.url).searchParams.get("k") !== "0e140604a48b86c206bc126d2102a851") return new Response("no", { status: 403 });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const dl = await admin.storage.from("secretary-returns").download("templates/New_IR_Craft.pdf");
  if (dl.error || !dl.data) return new Response("missing", { status: 404 });
  const pdf = await PDFDocument.load(new Uint8Array(await dl.data.arrayBuffer()));
  const out = pdf.getForm().acroForm.getAllFields().map(([f]) => ({ name: f.getFullyQualifiedName(), da: (f as any).getDefaultAppearance?.() ?? null, w: f.getWidgets().map((w) => Math.round(w.getRectangle().width)) }));
  return new Response(JSON.stringify(out.filter((o) => /date|signed|row1/i.test(o.name ?? ""))), { headers: { "Content-Type": "application/json" } });
});
