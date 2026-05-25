import { For, Show, onMount, type Component, type JSX } from "solid-js";
import { ExternalLink, Moon, Sun } from "lucide-solid";
import { Motion } from "solid-motionone";
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
        <Section delay={0.1}>
          <Features />
        </Section>
        <Section delay={0.18}>
          <ApiSection />
        </Section>
        <Section delay={0.26}>
          <Example />
        </Section>
      </div>
      <Footer />
    </main>
  );
};

const Section: Component<{ children: JSX.Element; delay: number }> = (props) => (
  <Motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: props.delay }}
  >
    {props.children}
  </Motion.div>
);

const Header: Component = () => (
  <header class="flex items-center justify-end gap-2 px-6 py-4">
    <Show when={ADMIN_URL}>
      <a href={ADMIN_URL} rel="noopener">
        <Button size="sm" class="gap-1.5">
          {t("open_dashboard")} <ExternalLink class="size-3.5" />
        </Button>
      </a>
    </Show>
    <ThemeButton />
    <LanguageButton />
  </header>
);

const Hero: Component = () => (
  <Motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45 }}
    class="mb-12 text-center"
  >
    <Motion.div
      initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 0.55, easing: [0.34, 1.56, 0.64, 1] }}
      class="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" class="size-6">
        <path d="M3 12l9-9 9 9-9 9-9-9zm9-6.5L5.5 12 12 18.5 18.5 12 12 5.5z" />
      </svg>
    </Motion.div>
    <h1 class="font-semibold text-4xl tracking-tight">Busuanzi</h1>
    <p class="mt-2 text-muted-foreground text-sm">{t("subtitle")}</p>
  </Motion.div>
);

const Features: Component = () => (
  <Card class="mb-6">
    <CardContent class="p-6">
      <h2 class="mb-3 font-semibold text-lg">{t("features_title")}</h2>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <For each={t("features")}>
          {(f, i) => (
            <Motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * i() }}
              class="rounded-md border border-primary/15 bg-primary/5 px-3 py-2 text-center text-xs"
            >
              {f}
            </Motion.div>
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
    <span class={`inline-block rounded px-2 py-0.5 font-medium text-xs ${METHOD_COLOR[props.method]}`}>
      {props.method}
    </span>
    <code class="min-w-[60px] font-mono text-xs">{props.path}</code>
    <span class="text-muted-foreground text-xs">{props.desc}</span>
  </div>
);

const ApiSection: Component = () => (
  <Card class="mb-6">
    <CardContent class="p-6">
      <h2 class="mb-3 font-semibold text-lg">{t("api_title")}</h2>
      <ApiRow method="POST" path="/api" desc={t("api_post")} />
      <ApiRow method="GET" path="/api" desc={t("api_get")} />
      <ApiRow method="PUT" path="/api" desc={t("api_put")} />
      <ApiRow method="GET" path="/ping" desc={t("api_ping")} />
      <div class="mt-4 border-l-2 border-l-primary bg-primary/5 px-3 py-2 text-muted-foreground text-xs">
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
        <h2 class="mb-3 font-semibold text-lg">{t("example_title")}</h2>
        <p class="mb-3 text-muted-foreground text-sm">{t("example_hint")}</p>
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
  <footer class="border-t border-border py-8 text-center text-muted-foreground text-xs">
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
          <Show when={theme() === "dark"} fallback={<Sun class="size-4" />}>
            <Moon class="size-4" />
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

export default App;
