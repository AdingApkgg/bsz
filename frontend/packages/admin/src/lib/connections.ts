import { createSignal } from "solid-js";
import { t } from "./i18n";

export type Connection = {
  id: string;
  name: string;
  baseUrl: string; // no trailing slash
  token: string;
};

const STORAGE_KEY = "bsz.connections";
const ACTIVE_KEY = "bsz.active-connection";
const ENV_DEFAULT = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "");

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function normalize(url: string): string {
  return url.trim().replace(/\/$/, "");
}

function loadAndSeed(): { list: Connection[]; active: string | null } {
  if (typeof localStorage === "undefined") return { list: [], active: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const storedActive = localStorage.getItem(ACTIVE_KEY);
        const active =
          storedActive && parsed.some((c: Connection) => c.id === storedActive) ? storedActive : parsed[0].id;
        return { list: parsed, active };
      }
    }
  } catch {
    // localStorage may be corrupt or unparseable — fall through to seeding.
  }
  // Seed from env var on first run, and persist so the IDs stay stable
  // across reloads / signal re-reads. The user will almost certainly rename
  // this immediately, so we keep the seed label locale-neutral.
  if (ENV_DEFAULT) {
    const seed: Connection = { id: uid(), name: "Default", baseUrl: ENV_DEFAULT, token: "" };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([seed]));
    localStorage.setItem(ACTIVE_KEY, seed.id);
    return { list: [seed], active: seed.id };
  }
  return { list: [], active: null };
}

const initial = loadAndSeed();
const [connections, setConnectionsSignal] = createSignal<Connection[]>(initial.list);
const [activeId, setActiveIdSignal] = createSignal<string | null>(initial.active);

function persist(list: Connection[], id: string | null) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  if (id) localStorage.setItem(ACTIVE_KEY, id);
  else localStorage.removeItem(ACTIVE_KEY);
}

export { connections, activeId };

export function activeConnection(): Connection | null {
  const id = activeId();
  if (!id) return null;
  return connections().find((c) => c.id === id) ?? null;
}

export function setActive(id: string | null) {
  setActiveIdSignal(id);
  persist(connections(), id);
}

export function addConnection(input: Omit<Connection, "id">): Connection {
  const conn: Connection = { ...input, id: uid(), baseUrl: normalize(input.baseUrl) };
  const next = [...connections(), conn];
  setConnectionsSignal(next);
  // Newly-added connections always become active — almost always what the
  // user wants and it removes the "seed connection lingered" footgun.
  setActiveIdSignal(conn.id);
  persist(next, conn.id);
  return conn;
}

export function updateConnection(id: string, patch: Partial<Omit<Connection, "id">>) {
  const next = connections().map((c) =>
    c.id === id ? { ...c, ...patch, baseUrl: patch.baseUrl ? normalize(patch.baseUrl) : c.baseUrl } : c,
  );
  setConnectionsSignal(next);
  persist(next, activeId());
}

export function deleteConnection(id: string) {
  const next = connections().filter((c) => c.id !== id);
  setConnectionsSignal(next);
  let newActive = activeId();
  if (newActive === id) newActive = next[0]?.id ?? null;
  setActiveIdSignal(newActive);
  persist(next, newActive);
}

/// Lightweight reachability test — calls /ping (public) so it works regardless of token.
export async function testConnection(
  c: Pick<Connection, "baseUrl">,
): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${normalize(c.baseUrl)}/ping`, { method: "GET" });
    if (res.ok) return { ok: true, message: t("conn.test_ok") };
    return { ok: false, message: `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : t("conn.test_unreachable") };
  }
}

/// Check whether the configured token works for /api/admin/stats.
export async function verifyToken(
  c: Pick<Connection, "baseUrl" | "token">,
): Promise<{ ok: boolean; message: string }> {
  if (!c.token) return { ok: false, message: t("conn.test_token_empty") };
  try {
    const res = await fetch(`${normalize(c.baseUrl)}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${c.token}` },
    });
    if (res.ok) return { ok: true, message: t("conn.test_ok") };
    if (res.status === 401) return { ok: false, message: t("conn.test_token_invalid") };
    if (res.status === 404) return { ok: false, message: t("conn.test_admin_not_mounted") };
    return { ok: false, message: `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : t("conn.test_unreachable") };
  }
}
