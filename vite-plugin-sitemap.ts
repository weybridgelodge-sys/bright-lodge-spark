import { spawnSync } from "child_process";
import type { Plugin } from "vite";

/**
 * Runs scripts/generate-sitemap-and-feed.ts as part of every dev start and
 * production build.
 *
 * package.json still has predev/prebuild hooks, but some package managers
 * (notably bun) skip pre/post lifecycle scripts, which means the publish
 * pipeline could build without regenerating public/sitemap.xml. Wiring it in
 * here — the same way vite-plugin-static-meta.ts is wired in — guarantees a
 * Sanity-authored post needs zero manual steps to appear in the sitemap/RSS.
 */
export function sitemapAndFeed(): Plugin {
  let ran = false;
  const run = () => {
    if (ran) return;
    ran = true;
    const res = spawnSync(
      "npx",
      ["tsx", "scripts/generate-sitemap-and-feed.ts"],
      { stdio: "inherit", shell: process.platform === "win32" },
    );
    if (res.error) {
      // Never fail the build if Sanity/tsx is temporarily unavailable.
      console.warn("[sitemap] generation skipped:", res.error.message);
    }
  };

  return {
    name: "sitemap-and-feed",
    // Runs for both `vite` (dev) and `vite build`, before public/ is copied.
    buildStart() {
      run();
    },
  };
}
