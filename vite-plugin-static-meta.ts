import fs from "fs";
import path from "path";
import type { Plugin } from "vite";

/**
 * Single-route static meta test.
 *
 * This app is a client-side SPA: dist/index.html's head is served for every
 * route, so crawlers see homepage meta everywhere. As a proof of concept we
 * emit ONE prerendered head variant for /ladies-night.
 *
 * Note: /ladies-night is an intentional alias of /ladies-festival — both
 * render the same component and the canonical stays /ladies-festival.
 */

const SITE_TITLE = "Ladies Festival 2026 | Weybridge Lodge No. 6787";
const SITE_DESC =
  "Join Weybridge & Astolat Lodges for a black tie charity gala on 22 August 2026 at Macdonald Frimley Hall Hotel. Three-course dinner, DJ, raffle — in aid of Action for Carers Surrey. Tickets £75.";
const CANONICAL = "https://weybridgelodge.org.uk/ladies-festival";

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const replaceTag = (html: string, pattern: RegExp, replacement: string) => {
  if (!pattern.test(html)) {
    throw new Error(`static-meta: tag not found for ${pattern}`);
  }
  return html.replace(pattern, replacement);
};

export function staticMeta(): Plugin {
  return {
    name: "static-meta-ladies-night",
    apply: "build",
    writeBundle(options) {
      const outDir = options.dir ?? path.resolve(process.cwd(), "dist");
      const indexPath = path.join(outDir, "index.html");
      if (!fs.existsSync(indexPath)) return;

      let html = fs.readFileSync(indexPath, "utf8");
      const t = escape(SITE_TITLE);
      const d = escape(SITE_DESC);

      html = replaceTag(html, /<title>[\s\S]*?<\/title>/, `<title>${t}</title>`);
      html = replaceTag(
        html,
        /<meta name="description" content="[^"]*" \/>/,
        `<meta name="description" content="${d}" />`,
      );
      html = replaceTag(
        html,
        /<link rel="canonical" href="[^"]*" \/>/,
        `<link rel="canonical" href="${CANONICAL}" />`,
      );
      html = replaceTag(
        html,
        /<meta property="og:url" content="[^"]*" \/>/,
        `<meta property="og:url" content="${CANONICAL}" />`,
      );
      html = replaceTag(
        html,
        /<meta property="og:title" content="[^"]*" \/>/,
        `<meta property="og:title" content="${t}" />`,
      );
      html = replaceTag(
        html,
        /<meta property="og:description" content="[^"]*" \/>/,
        `<meta property="og:description" content="${d}" />`,
      );
      html = replaceTag(
        html,
        /<meta name="twitter:title" content="[^"]*" \/>/,
        `<meta name="twitter:title" content="${t}" />`,
      );
      html = replaceTag(
        html,
        /<meta name="twitter:description" content="[^"]*" \/>/,
        `<meta name="twitter:description" content="${d}" />`,
      );

      const routeDir = path.join(outDir, "ladies-night");
      fs.mkdirSync(routeDir, { recursive: true });
      fs.writeFileSync(path.join(routeDir, "index.html"), html);
      this.info?.("static-meta: wrote ladies-night/index.html");
    },
  };
}
