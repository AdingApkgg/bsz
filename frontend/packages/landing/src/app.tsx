import { For, Show, onMount, type Component } from "solid-js";
import { Button } from "@bsz/shared/components/ui/button";
import { Card, CardContent } from "@bsz/shared/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@bsz/shared/components/ui/dropdown-menu";
import { initTheme, setTheme, theme, type Theme } from "@bsz/shared/lib/theme";
import { LOCALE_LIST, locale, localeFullLabel, localeShortLabel, setLocale, t } from "./i18n";

const ADMIN_URL = (import.meta.env.VITE_ADMIN_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const GITHUB_URL = "https://github.com/AdingApkgg/bsz";

const App: Component = () => {
  onMount(initTheme);
  return (
    <main class="min-h-screen bg-background text-foreground">
      <Header />
      <div class="mx-auto max-w-3xl px-6 pt-16 pb-12 sm:pt-24">
        <Hero />
        <Features />
        <ApiSection />
        <Example />
      </div>
      <Footer />
    </main>
  );
};

const Header: Component = () => (
  <header class="flex items-center justify-end gap-2 px-6 py-4">
    <Show when={ADMIN_URL}>
      <a href={ADMIN_URL} rel="noopener">
        <Button size="sm">{t("open_dashboard")}</Button>
      </a>
    </Show>
    <ThemeButton />
    <LanguageButton />
  </header>
);

const Hero: Component = () => (
  <div class="mb-12 text-center">
    <div class="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
      <svg viewBox="0 0 24 24" fill="currentColor" class="size-6">
        <path d="M3 12l9-9 9 9-9 9-9-9zm9-6.5L5.5 12 12 18.5 18.5 12 12 5.5z" />
      </svg>
    </div>
    <h1 class="text-4xl font-semibold tracking-tight">Busuanzi</h1>
    <p class="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
  </div>
);

const Features: Component = () => (
  <Card class="mb-6">
    <CardContent class="p-6">
      <h2 class="mb-3 text-lg font-semibold">{t("features_title")}</h2>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <For each={t("features")}>
          {(f) => (
            <div class="rounded-md border border-primary/15 bg-primary/5 px-3 py-2 text-center text-xs">
              {f}
            </div>
          )}
        </For>
      </div>
    </CardContent>
  </Card>
);

type Method = "POST" | "GET" | "PUT";
const METHOD_COLOR: Record<Method, string> = {
  POST: "bg-green-500/15 text-green-500",
  GET: "bg-primary/15 text-primary",
  PUT: "bg-amber-500/15 text-amber-500",
};

const ApiRow: Component<{ method: Method; path: string; desc: string }> = (props) => (
  <div class="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
    <span class={`inline-block rounded px-2 py-0.5 text-xs font-medium ${METHOD_COLOR[props.method]}`}>
      {props.method}
    </span>
    <code class="min-w-[60px] font-mono text-xs">{props.path}</code>
    <span class="text-xs text-muted-foreground">{props.desc}</span>
  </div>
);

const ApiSection: Component = () => (
  <Card class="mb-6">
    <CardContent class="p-6">
      <h2 class="mb-3 text-lg font-semibold">{t("api_title")}</h2>
      <ApiRow method="POST" path="/api" desc={t("api_post")} />
      <ApiRow method="GET" path="/api" desc={t("api_get")} />
      <ApiRow method="PUT" path="/api" desc={t("api_put")} />
      <ApiRow method="GET" path="/ping" desc={t("api_ping")} />
      <div class="mt-4 border-l-2 border-l-primary bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
        <strong class="text-foreground">{t("api_header_hint")}：</strong>
        {t("api_header_text")}
        <br />
        <strong class="text-foreground">{t("api_cookie_hint")}：</strong>
        {t("api_cookie_text")}
      </div>
    </CardContent>
  </Card>
);

const Example: Component = () => {
  const apiUrl = "https://your-backend.example.com/api";
  return (
    <Card class="mb-6">
      <CardContent class="p-6">
        <h2 class="mb-3 text-lg font-semibold">{t("example_title")}</h2>
        <p class="mb-3 text-sm text-muted-foreground">{t("example_hint")}</p>
        <pre class="overflow-x-auto rounded-md border border-border bg-background p-3 text-xs leading-relaxed">
          {`<p>PV <span id="pv">-</span> · UV <span id="uv">-</span></p>
<script>
fetch('${apiUrl}', {
  method: 'POST',
  credentials: 'include',
  headers: { 'x-bsz-referer': location.href },
})
  .then(r => r.json())
  .then(({ success, data }) => {
    if (!success) return;
    pv.textContent = data.site_pv;
    uv.textContent = data.site_uv;
  });
</script>`}
        </pre>
      </CardContent>
    </Card>
  );
};

const Footer: Component = () => (
  <footer class="border-t border-border py-8 text-center text-xs text-muted-foreground">
    <div class="space-x-2">
      <a href={GITHUB_URL} rel="noopener" class="hover:text-foreground">
        {t("github")}
      </a>
      <span>·</span>
      <a href={`${GITHUB_URL}/tree/main/backend`} rel="noopener" class="hover:text-foreground">
        {t("backend_setup")}
      </a>
      <Show when={ADMIN_URL}>
        <span>·</span>
        <a href={ADMIN_URL} rel="noopener" class="hover:text-foreground">
          {t("open_dashboard")}
        </a>
      </Show>
    </div>
    <p class="mt-2">{t("footer_tagline")}</p>
  </footer>
);

const LanguageButton: Component = () => (
  <DropdownMenu>
    <DropdownMenuTrigger
      // biome-ignore lint/suspicious/noExplicitAny: Kobalte polymorphic `as` prop
      as={(p: any) => (
        <Button {...p} size="sm" variant="ghost" class="h-8 px-2.5 text-xs">
          {localeShortLabel()}
        </Button>
      )}
    />
    <DropdownMenuContent class="w-36">
      <For each={LOCALE_LIST}>
        {(v) => (
          <DropdownMenuItem onSelect={() => setLocale(v)} class="flex items-center justify-between">
            <span>{localeFullLabel(v)}</span>
            <Show when={locale() === v}>
              <span class="text-primary">●</span>
            </Show>
          </DropdownMenuItem>
        )}
      </For>
    </DropdownMenuContent>
  </DropdownMenu>
);

const ThemeButton: Component = () => (
  <DropdownMenu>
    <DropdownMenuTrigger
      // biome-ignore lint/suspicious/noExplicitAny: Kobalte polymorphic `as` prop
      as={(p: any) => (
        <Button {...p} size="sm" variant="ghost" class="h-8 w-8 p-0" title="Theme">
          <Show when={theme() === "dark"} fallback={<SunIcon />}>
            <MoonIcon />
          </Show>
        </Button>
      )}
    />
    <DropdownMenuContent class="w-32">
      <For each={["system", "light", "dark"] as Theme[]}>
        {(v) => (
          <DropdownMenuItem onSelect={() => setTheme(v)}>
            <span class="capitalize">{v}</span>
          </DropdownMenuItem>
        )}
      </For>
    </DropdownMenuContent>
  </DropdownMenu>
);

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="size-4">
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
        stroke-linecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="size-4">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default App;
