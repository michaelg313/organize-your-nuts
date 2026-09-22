// Astro configuration — see ADR-002. Fully pre-rendered static output; no adapter,
// no integrations. Vercel detects Astro on its own and serves the dist/ folder.
import { defineConfig } from "astro/config";

export default defineConfig({
  // The public origin. Used to build absolute <link rel="canonical"> URLs on the
  // platform pages (ADR-001 §5 Phase 4). Change here if the domain ever changes.
  site: "https://organizeyournuts.com",

  // Every page is generated at build time. A bad change fails the build, not the
  // live site (ADR-002 §2.2).
  output: "static",

  // Canonical URLs have no trailing slash (/hardware-kits/ls-gen3-early).
  // 'ignore' lets both spellings resolve in the dev server; vercel.json makes
  // production redirect the slashed spelling to the bare one.
  trailingSlash: "ignore",
});
