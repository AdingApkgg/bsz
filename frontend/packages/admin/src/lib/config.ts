/// Base URL of the busuanzi backend (no trailing slash).
/// Configurable via `VITE_API_BASE_URL` at build time. When unset, requests
/// go to the same origin that serves the frontend — only useful for the
/// `bun dev` workflow with `bun run dev:proxy`.
export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;
export const SITE_PAGE_SIZE = 20;
export const PAGES_PAGE_SIZE = 30;
export const LOGS_PAGE_SIZE = 20;
