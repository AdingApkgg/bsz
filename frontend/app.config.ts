import { defineConfig } from "@solidjs/start/config";

export default defineConfig({
  ssr: false,
  server: {
    // Pure static output for GitHub Pages / Cloudflare Pages.
    preset: "static",
    compatibilityDate: "2026-05-25",
    prerender: {
      routes: ["/"],
      crawlLinks: false,
      failOnError: false,
    },
  },
});
