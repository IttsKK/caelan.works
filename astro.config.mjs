import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { boardEditor } from "./editor-server.mjs";
import { pruneOriginals } from "./prune-originals.mjs";

export default defineConfig({
  site: "https://caelan.works",
  integrations: [sitemap(), pruneOriginals()],
  redirects: {
    "/work": "/#work",
  },
  vite: {
    // Save and upload endpoints for the photo board editor; dev server only.
    plugins: [boardEditor()],
  },
});
