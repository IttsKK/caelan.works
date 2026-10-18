import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://caelan.works",
  integrations: [sitemap()],
  redirects: {
    "/work": "/#work",
  },
});
