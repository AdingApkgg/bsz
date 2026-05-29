import { For, Show, Suspense, createEffect, lazy, onMount, type Component, type JSX } from "solid-js";
import { Motion } from "solid-motionone";
import { Navigate, Route, Router, useLocation, useNavigate } from "@solidjs/router";
import { Button } from "@bsz/shared/components/ui/button";
import { Card, CardContent } from "@bsz/shared/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@bsz/shared/components/ui/dropdown-menu";
// Shiki + a syntax theme weigh ~360 kB — defer loading until the example
// section actually renders.
const CodeBlock = lazy(() => import("./components/CodeBlock"));
import Stats, { STATS_ENABLED } from "./components/Stats";
// Artalk + i18n bundles weigh ~400 kB — defer to its own chunk so deploys
// without VITE_ARTALK_SERVER ship zero Artalk weight. The COMMENTS_ENABLED
// check is duplicated here (instead of imported from Comments.tsx) so the
// module never loads when disabled.
const COMMENTS_ENABLED = Boolean(import.meta.env.VITE_ARTALK_SERVER);
const Comments = lazy(() => import("./components/Comments"));
import {
  LOCALE_LIST,
  type Locale,
  locale,
  localeFullLabel,
  localePath,
  localeShortLabel,
  parseLocaleFromPath,
  syncLocale,
  t,
} from "./i18n";

const GITHUB_URL = "https://github.com/AdingApkgg/bsz";

// Landing always follows the OS color-scheme preference — no manual
// toggle. (Admin still ships the full system/light/dark picker via
// the shared theme module.) We mirror the chosen mode onto `html.dark`
// + `html.light` + `color-scheme` so Tailwind variants, Artalk's
// `.atk-dark-mode` observer, and form-control native styling all agree.
function initSystemTheme() {
  if (typeof matchMedia === "undefined") return;
  const mq = matchMedia("(prefers-color-scheme: dark)");
  const apply = () => {
    const root = document.documentElement;
    const isDark = mq.matches;
    root.classList.toggle("dark", isDark);
    root.classList.toggle("light", !isDark);
    root.style.colorScheme = isDark ? "dark" : "light";
  };
  apply();
  mq.addEventListener("change", apply);
}
// One Route handling every locale path; switching between them won't remount
// the page, only refresh the locale-derived strings.
const ROUTE_PATHS = ["/", ...LOCALE_LIST.filter((l) => l !== "zh").map((l) => `/${l}`)];

const App: Component = () => {
  onMount(initSystemTheme);
  return (
    <Router>
      <Route path={ROUTE_PATHS} component={LandingPage} />
      {/* Anything outside the known locale set redirects to the apex — sane
          fallback for typos and stripped paths from SPA hosts. */}
      <Route path="*" component={() => <Navigate href="/" />} />
    </Router>
  );
};

// Keeps the locale signal in lockstep with the URL the router resolved to.
const LocaleSync: Component = () => {
  const location = useLocation();
  createEffect(() => syncLocale(parseLocaleFromPath(location.pathname)));
  return null;
};

const LandingPage: Component = () => (
  <main class="min-h-screen bg-background text-foreground">
    <LocaleSync />
    <Header />
    <div class="mx-auto max-w-3xl px-6 pt-16 pb-12 sm:pt-24">
      <Hero />
      <Show when={STATS_ENABLED}>
        <Stats />
      </Show>
      <Section delay={0.1}>
        <Features />
      </Section>
      <Section delay={0.18}>
        <ApiSection />
      </Section>
      <Section delay={0.24}>
        <ResponseSection />
      </Section>
      <Section delay={0.3}>
        <QuickStartSection />
      </Section>
      <Section delay={0.36}>
        <Example />
      </Section>
      <Section delay={0.42}>
        <GetSection />
      </Section>
      <Section delay={0.48}>
        <PutSection />
      </Section>
      <Show when={COMMENTS_ENABLED}>
        <Section delay={0.54}>
          <Comments />
        </Section>
      </Show>
    </div>
    <Footer />
  </main>
);

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
    <a href={GITHUB_URL} target="_blank" rel="noopener" aria-label="GitHub">
      <Button size="sm" variant="ghost" class="h-8 gap-1.5 px-2.5 text-xs">
        <GithubMark />
        <span>GitHub</span>
      </Button>
    </a>
    <LanguageButton />
  </header>
);

// Brand mark — Lucide dropped Github in v1, so we inline the official SVG.
const GithubMark: Component = () => (
  <svg viewBox="0 0 16 16" class="size-4" fill="currentColor" aria-hidden="true">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
  </svg>
);

const Hero: Component = () => (
  <Motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45 }}
    class="mb-12 text-center"
  >
    <div class="flex items-center justify-center gap-3">
      <Motion.div
        initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.55, easing: [0.34, 1.56, 0.64, 1] }}
        class="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" class="size-5">
          <path d="M3 12l9-9 9 9-9 9-9-9zm9-6.5L5.5 12 12 18.5 18.5 12 12 5.5z" />
        </svg>
      </Motion.div>
      <h1 class="font-semibold text-4xl tracking-tight">{t("brand")}</h1>
    </div>
    <p class="mt-2 text-muted-foreground text-sm">{t("subtitle")}</p>
  </Motion.div>
);

const Features: Component = () => (
  <Card id="features" class="mb-6 scroll-mt-8">
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
  <Card id="api" class="mb-6 scroll-mt-8">
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

// Bake the deploy's backend origin into every code snippet so users can
// copy-paste verbatim. Falls back to a clearly-fake placeholder when
// VITE_DEMO_API is unset (forks/templates without a configured backend).
const BACKEND_URL = import.meta.env.VITE_DEMO_API || "https://your-backend.example.com";

const RESPONSE_CODE = `{
  "success": true,
  "data": {
    "site_pv": 1234,
    "site_uv": 567,
    "page_pv": 89
  }
}
`;

const QUICKSTART_STEP1 = `const res = await fetch("${BACKEND_URL}/api", {
  method: "POST",
  credentials: "include",
  headers: { "x-bsz-referer": location.href },
});
`;

const QUICKSTART_STEP2 = `const { success, data } = await res.json();
// data.site_pv  site total page views
// data.site_uv  site unique visitors
// data.page_pv  current page views
`;

const QUICKSTART_STEP3 = `document.getElementById("pv").textContent = data.site_pv;
`;

const EXAMPLE_CODE = `// PV/UV counter — drop into any HTML page
fetch("${BACKEND_URL}/api", {
  method: "POST",
  credentials: "include",
  headers: { "x-bsz-referer": location.href },
})
  .then((r) => r.json())
  .then(({ success, data }) => {
    if (!success) return;
    pv.textContent = data.site_pv;
    uv.textContent = data.site_uv;
  });
`;

const GET_CODE = `const res = await fetch("${BACKEND_URL}/api", {
  headers: { "x-bsz-referer": "https://your-site.com/page" },
});
const { data } = await res.json();
`;

const PUT_CODE = `fetch("${BACKEND_URL}/api", {
  method: "PUT",
  credentials: "include",
  headers: { "x-bsz-referer": location.href },
});
`;

const CodeFallback: Component<{ code: string }> = (props) => (
  <div class="overflow-x-auto rounded-md border border-border bg-background p-3 font-mono text-muted-foreground text-xs leading-relaxed">
    <pre>{props.code}</pre>
  </div>
);

const ResponseSection: Component = () => (
  <Card id="response" class="mb-6 scroll-mt-8">
    <CardContent class="p-6">
      <h2 class="mb-3 font-semibold text-lg">{t("response_title")}</h2>
      <p class="mb-3 text-muted-foreground text-sm">{t("response_hint")}</p>
      <Suspense fallback={<CodeFallback code={RESPONSE_CODE} />}>
        <CodeBlock code={RESPONSE_CODE} lang="json" />
      </Suspense>
      <ul class="mt-3 space-y-1 text-muted-foreground text-xs">
        <li>
          <code class="font-mono text-foreground">site_pv</code> — {t("response_field_site_pv")}
        </li>
        <li>
          <code class="font-mono text-foreground">site_uv</code> — {t("response_field_site_uv")}
        </li>
        <li>
          <code class="font-mono text-foreground">page_pv</code> — {t("response_field_page_pv")}
        </li>
      </ul>
    </CardContent>
  </Card>
);

const QuickStartStep: Component<{ n: number; title: string; code: string }> = (props) => (
  <li class="relative pl-9">
    <span class="absolute top-0 left-0 inline-flex size-6 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground text-xs">
      {props.n}
    </span>
    <h3 class="mb-2 font-medium text-sm">{props.title}</h3>
    <Suspense fallback={<CodeFallback code={props.code} />}>
      <CodeBlock code={props.code} />
    </Suspense>
  </li>
);

const QuickStartSection: Component = () => (
  <Card id="quickstart" class="mb-6 scroll-mt-8">
    <CardContent class="p-6">
      <h2 class="mb-3 font-semibold text-lg">{t("quickstart_title")}</h2>
      <p class="mb-4 text-muted-foreground text-sm">{t("quickstart_hint")}</p>
      <ol class="space-y-5">
        <QuickStartStep n={1} title={t("quickstart_step1")} code={QUICKSTART_STEP1} />
        <QuickStartStep n={2} title={t("quickstart_step2")} code={QUICKSTART_STEP2} />
        <QuickStartStep n={3} title={t("quickstart_step3")} code={QUICKSTART_STEP3} />
      </ol>
    </CardContent>
  </Card>
);

const Example: Component = () => (
  <Card id="example" class="mb-6 scroll-mt-8">
    <CardContent class="p-6">
      <h2 class="mb-3 font-semibold text-lg">{t("example_title")}</h2>
      <p class="mb-3 text-muted-foreground text-sm">{t("example_hint")}</p>
      <Suspense fallback={<CodeFallback code={EXAMPLE_CODE} />}>
        <CodeBlock code={EXAMPLE_CODE} />
      </Suspense>
    </CardContent>
  </Card>
);

const GetSection: Component = () => (
  <Card id="get" class="mb-6 scroll-mt-8">
    <CardContent class="p-6">
      <h2 class="mb-3 font-semibold text-lg">{t("get_title")}</h2>
      <p class="mb-3 text-muted-foreground text-sm">{t("get_hint")}</p>
      <Suspense fallback={<CodeFallback code={GET_CODE} />}>
        <CodeBlock code={GET_CODE} />
      </Suspense>
    </CardContent>
  </Card>
);

const PutSection: Component = () => (
  <Card id="put" class="mb-6 scroll-mt-8">
    <CardContent class="p-6">
      <h2 class="mb-3 font-semibold text-lg">{t("put_title")}</h2>
      <p class="mb-3 text-muted-foreground text-sm">{t("put_hint")}</p>
      <Suspense fallback={<CodeFallback code={PUT_CODE} />}>
        <CodeBlock code={PUT_CODE} />
      </Suspense>
    </CardContent>
  </Card>
);

const Footer: Component = () => (
  <footer class="border-t border-border py-8 text-center text-muted-foreground text-xs">
    <nav class="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
      <a href={GITHUB_URL} target="_blank" rel="noopener" class="hover:text-foreground">
        GitHub
      </a>
      <span aria-hidden="true">·</span>
      {/* /llms.txt and /sitemap.xml are emitted by the postbuild script,
          /robots.txt is reachable too — these are the conventional URLs
          crawlers and curious humans look for, so keep them surfaced. */}
      <a href="/llms.txt" target="_blank" rel="noopener external" class="hover:text-foreground">
        llms.txt
      </a>
      <span aria-hidden="true">·</span>
      <a href="/sitemap.xml" target="_blank" rel="noopener external" class="hover:text-foreground">
        sitemap
      </a>
    </nav>
    <p class="mt-3">{t("footer_tagline")}</p>
  </footer>
);

const LanguageButton: Component = () => {
  const navigate = useNavigate();
  // We push instead of replace so the back button steps through language
  // switches like any other navigation. The route component is reused
  // (single Route with an array of paths), so no remount + animation rerun.
  const switchTo = (l: Locale) => navigate(localePath(l));
  return (
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
            <DropdownMenuItem onSelect={() => switchTo(v)} class="flex items-center justify-between">
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
};

export default App;
