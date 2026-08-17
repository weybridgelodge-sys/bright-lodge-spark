import { assetUrl } from "../src/lib/assetUrl";
const u = "/__l5e/assets-v1/045b91d4-9b41-490d-baa9-8486eca7cb05/weybridge-logo-no-bg.png";
console.log("resolved:", assetUrl(u));
const r = await fetch(assetUrl(u));
console.log(r.status, r.headers.get("content-type"));
const b = await r.blob();
console.log(b.type, b.size, typeof FileReader);
