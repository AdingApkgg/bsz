import { createSignal, createEffect } from "solid-js";

export type Theme = "system" | "light" | "dark";

const KEY = "bsz.theme";

function read(): Theme {
  if (typeof localStorage === "undefined") return "system";
  const v = localStorage.getItem(KEY);
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

const [theme, setThemeSignal] = createSignal<Theme>(read());

function apply(t: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const resolved =
    t === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : t;
  root.classList.toggle("dark", resolved === "dark");
  root.classList.toggle("light", resolved === "light");
  root.style.colorScheme = resolved;
}

export { theme };

export function setTheme(t: Theme) {
  setThemeSignal(t);
  if (typeof localStorage !== "undefined") localStorage.setItem(KEY, t);
  apply(t);
}

export function initTheme() {
  apply(theme());
  if (typeof matchMedia !== "undefined") {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", () => theme() === "system" && apply("system"));
  }
  createEffect(() => apply(theme()));
}
