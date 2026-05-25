import { createSignal } from "solid-js";
import { TOKEN_EXPIRY_MS } from "./config";

const TOKEN_KEY = "admin-token";
const LOGIN_TS_KEY = "admin-login-time";

function readToken(): string {
  if (typeof localStorage === "undefined") return "";
  const ts = parseInt(localStorage.getItem(LOGIN_TS_KEY) ?? "0", 10);
  if (ts && Date.now() - ts > TOKEN_EXPIRY_MS) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LOGIN_TS_KEY);
    return "";
  }
  return localStorage.getItem(TOKEN_KEY) ?? "";
}

const [token, setTokenSignal] = createSignal<string>(readToken());

export const adminToken = token;

export function setToken(value: string) {
  setTokenSignal(value);
  if (typeof localStorage !== "undefined") {
    if (value) {
      localStorage.setItem(TOKEN_KEY, value);
      localStorage.setItem(LOGIN_TS_KEY, Date.now().toString());
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(LOGIN_TS_KEY);
    }
  }
}

export function clearToken() {
  setToken("");
}
