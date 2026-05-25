import { Show, createSignal, type Component } from "solid-js";
import { Title } from "@solidjs/meta";
import { useNavigate, A } from "@solidjs/router";
import { Button } from "~/components/ui/button";
import { TextField, TextFieldInput, TextFieldLabel } from "~/components/ui/text-field";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { addConnection, testConnection, verifyToken, activeConnection } from "~/lib/connections";
import { LOCALE_LIST, locale, localeFullLabel, localeShortLabel, setLocale, t } from "~/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { For } from "solid-js";
import { toast } from "solid-sonner";

const Welcome: Component = () => {
  const navigate = useNavigate();
  const [name, setName] = createSignal("");
  const [baseUrl, setBaseUrl] = createSignal("");
  const [token, setToken] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [test, setTest] = createSignal<{ ok: boolean; message: string } | null>(null);

  async function runTest() {
    const url = baseUrl().trim();
    if (!url) return toast.error(t("common.url_required"));
    setBusy(true);
    try {
      const ping = await testConnection({ baseUrl: url });
      if (!ping.ok) {
        setTest(ping);
        return;
      }
      if (token().trim()) {
        const v = await verifyToken({ baseUrl: url, token: token().trim() });
        setTest(v);
      } else {
        setTest({ ok: true, message: t("welcome.test_no_token") });
      }
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    const url = baseUrl().trim();
    if (!url) return toast.error(t("common.url_required"));
    addConnection({
      name: name().trim() || new URL(url).host,
      baseUrl: url,
      token: token().trim(),
    });
    toast.success(t("common.success"));
    navigate("/app/overview");
  }

  return (
    <main class="min-h-screen bg-background">
      <Title>Busuanzi · {t("welcome.no_conn_title")}</Title>
      <div class="absolute right-4 top-4 flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            // biome-ignore lint/suspicious/noExplicitAny: Kobalte polymorphic `as` prop
            as={(p: any) => (
              <Button {...p} size="sm" variant="ghost" title={t("top.language")}>
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
        <Show when={activeConnection()}>
          <A href="/app/overview">
            <Button size="sm" variant="outline">
              {t("welcome.continue")}
            </Button>
          </A>
        </Show>
      </div>

      <div class="mx-auto max-w-xl px-6 pt-20 pb-12">
        <div class="mb-10 text-center">
          <div class="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <svg viewBox="0 0 24 24" fill="currentColor" class="size-6">
              <path d="M3 12l9-9 9 9-9 9-9-9zm9-6.5L5.5 12 12 18.5 18.5 12 12 5.5z" />
            </svg>
          </div>
          <h1 class="text-3xl font-semibold tracking-tight">{t("welcome.title")}</h1>
          <p class="mt-1 text-sm text-muted-foreground">{t("welcome.subtitle")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle class="text-lg">{t("welcome.no_conn_title")}</CardTitle>
            <CardDescription>{t("welcome.no_conn_body")}</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <TextField value={name()} onChange={setName}>
              <TextFieldLabel>{t("conn.name")}</TextFieldLabel>
              <TextFieldInput placeholder="Production" />
            </TextField>

            <TextField value={baseUrl()} onChange={setBaseUrl}>
              <TextFieldLabel>{t("conn.base_url")}</TextFieldLabel>
              <TextFieldInput placeholder="https://bsz.example.com" type="url" />
            </TextField>

            <TextField value={token()} onChange={setToken}>
              <TextFieldLabel>
                {t("conn.token")} <span class="text-muted-foreground">{t("conn.token_optional")}</span>
              </TextFieldLabel>
              <TextFieldInput type="password" placeholder="ADMIN_TOKEN" />
            </TextField>

            <Show when={test()}>
              {(r) => (
                <div
                  class={
                    "rounded-md border px-3 py-2 text-xs " +
                    (r().ok
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-destructive/30 bg-destructive/10 text-destructive")
                  }
                >
                  {r().ok ? "✓ " : "✗ "}
                  {r().message}
                </div>
              )}
            </Show>

            <div class="flex justify-end gap-2 pt-2">
              <Button variant="outline" disabled={busy()} onClick={runTest}>
                {busy() ? t("common.loading") : t("conn.test")}
              </Button>
              <Button disabled={busy() || !baseUrl().trim()} onClick={save}>
                {t("common.save")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div class="mt-8 text-center text-xs text-muted-foreground">
          <p>{t("welcome.deploy_hint")}</p>
          <p class="mt-1">
            <a href="https://github.com/AdingApkgg/bsz" rel="noopener" class="hover:text-foreground">
              GitHub
            </a>
            <span class="mx-1.5">·</span>
            <a
              href="https://github.com/AdingApkgg/bsz/tree/main/backend"
              rel="noopener"
              class="hover:text-foreground"
            >
              {t("welcome.backend_docs")}
            </a>
          </p>
        </div>
      </div>
    </main>
  );
};

export default Welcome;
