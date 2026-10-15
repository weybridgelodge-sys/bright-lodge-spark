// Permanent public image link for published events: /event-image/<slug>/og or /event-image/<slug>/<info-block-id>.
// Streams bytes (no redirect) so crawlers can read og:image; drafts, archived events and foreign paths 404.
import { serviceClient } from "../_shared/stripe-events.ts";

const notFound = () => new Response("Not found", { status: 404, headers: { "Access-Control-Allow-Origin": "*" } });
const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const i = parts.indexOf("event-image");
  const [slug, key] = [parts[i + 1], parts[i + 2]].map((p) => (p ? decodeURIComponent(p) : p));
  if (!slug || !key || !/^[a-z0-9-]{1,80}$/.test(slug)) return notFound();
  const sb = serviceClient();
  const { data: ev } = await sb.from("event_accounts").select("id,og_image_url").eq("slug", slug).eq("is_public", true).is("archived_at", null).maybeSingle();
  if (!ev) return notFound();
  let path: string | null = null;
  if (key === "og") path = ev.og_image_url && !/^https?:\/\//.test(ev.og_image_url) ? ev.og_image_url : null;
  else if (/^[0-9a-f-]{36}$/.test(key)) {
    const { data: b } = await sb.from("event_info_blocks").select("image_path").eq("id", key).eq("event_id", ev.id).eq("visible", true).maybeSingle();
    path = b?.image_path ?? null;
  }
  if (!path || !path.startsWith(`${ev.id}/`) || path.includes("..")) return notFound();
  const type = TYPES[(path.split(".").pop() || "").toLowerCase()];
  if (!type) return notFound();
  const { data: file } = await sb.storage.from("event-content-images").download(path);
  if (!file) return notFound();
  return new Response(req.method === "HEAD" ? null : file.stream(), {
    headers: { "Content-Type": type, "Cache-Control": "public, max-age=3600, s-maxage=86400", "Access-Control-Allow-Origin": "*" },
  });
});
