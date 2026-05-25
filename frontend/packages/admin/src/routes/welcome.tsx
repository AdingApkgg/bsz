import { For, Show, createSignal, type Component } from "solid-js";
import { Title } from "@solidjs/meta";
import { useNavigate, A } from "@solidjs/router";
import { CheckCircle2, XCircle } from "lucide-solid";
import { Motion } from "solid-motionone";
import { Button } from "@bsz/shared/components/ui/button";
import { TextField, TextFieldInput, TextFieldLabel } from "@bsz/shared/components/ui/text-field";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@bsz/shared/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@bsz/shared/components/ui/dropdown-menu";
import { addConnection, testConnection, verifyToken, activeConnection } from "~/lib/connections";
import { LOCALE_LIST, locale, localeFullLabel, localeShortLabel, setLocale, t } from "~/lib/i18n";
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
      <div class="absolute top-4 right-4 flex items-center gap-2">
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
        <Motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          class="mb-10 text-center"
        >
          <Motion.div
            initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.5, easing: [0.34, 1.56, 0.64, 1] }}
            class="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" class="size-6">
              <path d="M3 12l9-9 9 9-9 9-9-9zm9-6.5L5.5 12 12 18.5 18.5 12 12 5.5z" />
            </svg>
          </Motion.div>
          <h1 class="font-semibold text-3xl tracking-tight">{t("welcome.title")}</h1>
          <p class="mt-1 text-muted-foreground text-sm">{t("welcome.subtitle")}</p>
        </Motion.div>

        <Motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
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
                  <Motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    class={
                      "flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs " +
                      (r().ok
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-destructive/30 bg-destructive/10 text-destructive")
                    }
                  >
                    {r().ok ? <CheckCircle2 class="size-3.5" /> : <XCircle class="size-3.5" />}
                    <span>{r().message}</span>
                  </Motion.div>
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
        </Motion.div>

        <div class="mt-8 text-center text-muted-foreground text-xs">
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
