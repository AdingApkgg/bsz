import { activeConnection } from "./connections";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type ApiResponse<T> = { success: boolean; message?: string; data?: T; total?: number };

function require_connection() {
  const c = activeConnection();
  if (!c) throw new ApiError("no active connection", 0);
  if (!c.token) throw new ApiError("connection has no token", 0);
  return c;
}

export function adminUrl(path: string): string {
  const c = activeConnection();
  if (!c) throw new ApiError("no active connection", 0);
  return `${c.baseUrl}/api/admin${path}`;
}

export function publicUrl(path: string): string {
  const c = activeConnection();
  if (!c) throw new ApiError("no active connection", 0);
  return `${c.baseUrl}${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const c = require_connection();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${c.token}`,
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  if (init?.body && !(init.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${c.baseUrl}/api/admin${path}`, { ...init, headers });

  if (res.status === 401) throw new ApiError("unauthorized", 401);
  if (res.status === 404) throw new ApiError("admin api not available", 404);
  if (res.status === 429) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.message ?? "rate limited", 429);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.message ?? `HTTP ${res.status}`, res.status);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: "POST", body: form }),
};

export type SiteKey = {
  site_key: string;
  site_pv: number;
  site_uv: number;
};

export type PageInfo = {
  site_key: string;
  page_key: string;
  path: string;
  pv: number;
};

export type Stats = {
  total_sites: number;
  total_pages: number;
  total_site_pv: number;
  total_site_uv: number;
};

export type LogEntry = {
  id: number;
  timestamp: string;
  action: string;
  detail: string;
  ip: string;
};

/// SSE URL for sync (needs query-string token since EventSource cannot set headers).
export function syncEventSourceUrl(params: Record<string, string>): string {
  const c = require_connection();
  const search = new URLSearchParams({ ...params, token: c.token });
  return `${c.baseUrl}/api/admin/sync?${search.toString()}`;
}

/// Direct download URL for /api/admin/export.
export function exportDownloadUrl(): string {
  const c = require_connection();
  return `${c.baseUrl}/api/admin/export?token=${encodeURIComponent(c.token)}`;
}
