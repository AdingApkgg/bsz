import { API_BASE_URL } from "./config";
import { adminToken, clearToken } from "./auth";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type ApiResponse<T> = { success: boolean; message?: string; data?: T; total?: number };

export function adminUrl(path: string): string {
  return `${API_BASE_URL}/api/admin${path}`;
}

export function publicUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const token = adminToken();
  if (!token) throw new ApiError("not authenticated", 401);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  if (init?.body && !(init.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(adminUrl(path), { ...init, headers });

  if (res.status === 401) {
    clearToken();
    throw new ApiError("unauthorized", 401);
  }
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
  upload: <T>(path: string, form: FormData) =>
    request<T>(path, { method: "POST", body: form }),
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
  const token = adminToken();
  const search = new URLSearchParams({ ...params, token });
  return `${adminUrl("/sync")}?${search.toString()}`;
}

/// Direct download URL for /api/admin/export (uses query token).
export function exportDownloadUrl(): string {
  const token = adminToken();
  return `${adminUrl("/export")}?token=${encodeURIComponent(token)}`;
}
