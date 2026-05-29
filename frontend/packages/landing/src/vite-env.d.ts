/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Canonical origin for this deploy (no trailing slash). Baked into
  // dist/llms.txt, dist/robots.txt, and dist/sitemap.xml by the postbuild
  // script. Unset → those files reference a placeholder URL.
  readonly VITE_SITE_URL?: string;
  // Backend URL for the live PV/UV demo at the top of the page.
  // Unset → the Stats section is not rendered (default for forks/templates).
  readonly VITE_DEMO_API?: string;
  // Artalk server base URL for the comments section at the bottom.
  // Unset → the Comments section is not rendered.
  readonly VITE_ARTALK_SERVER?: string;
  // Optional Artalk site display name. Defaults to "Busuanzi".
  readonly VITE_ARTALK_SITE_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
