import { For, Show, createSignal, type Component } from "solid-js";
import { Title } from "@solidjs/meta";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { TextField, TextFieldInput, TextFieldLabel } from "~/components/ui/text-field";
import { Separator } from "~/components/ui/separator";
import { Badge } from "~/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { toast } from "solid-sonner";
import {
  activeConnection,
  addConnection,
  connections,
  deleteConnection,
  setActive,
  testConnection,
  updateConnection,
  verifyToken,
  type Connection,
} from "~/lib/connections";
import { setTheme, theme, type Theme } from "~/lib/theme";
import { locale, setLocale, t, type Locale } from "~/lib/i18n";
import { adminUrl, api, exportDownloadUrl, syncEventSourceUrl } from "~/lib/api";

const Settings: Component = () => {
  return (
    <div class="px-6 py-6 lt-md:px-4">
      <Title>{t("settings.title")} · Busuanzi</Title>
      <h1 class="mb-4 text-2xl font-semibold tracking-tight">{t("settings.title")}</h1>
      <div class="grid gap-6 lg:grid-cols-3">
        <div class="lg:col-span-2 space-y-6">
          <ConnectionsCard />
          <DataCard />
        </div>
        <div class="space-y-6">
          <AppearanceCard />
        </div>
      </div>
    </div>
  );
};

// ============ Connections ============

const ConnectionsCard: Component = () => {
  const [editing, setEditing] = createSignal<Connection | null>(null);
  const [addOpen, setAddOpen] = createSignal(false);

  return (
    <Card>
      <CardHeader class="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t("settings.connections")}</CardTitle>
          <CardDescription>
            {locale() === "zh"
              ? "管理你要连接的 busuanzi 后端。"
              : "Manage which busuanzi backends you connect to."}
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          + {t("settings.add")}
        </Button>
      </CardHeader>
      <CardContent class="space-y-2">
        <For each={connections()}>
          {(c) => (
            <div class="flex items-center gap-3 rounded-md border border-border bg-card/40 p-3">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium">{c.name}</span>
                  <Show when={c.id === activeConnection()?.id}>
                    <Badge variant="default" class="h-4 px-1 text-[10px]">
                      {t("conn.active")}
                    </Badge>
                  </Show>
                  <Show when={c.token}>
                    <span class="text-[10px] text-muted-foreground">🔑</span>
                  </Show>
                </div>
                <div class="truncate font-mono text-xs text-muted-foreground">{c.baseUrl}</div>
              </div>
              <Show when={c.id !== activeConnection()?.id}>
                <Button size="sm" variant="ghost" onClick={() => setActive(c.id)}>
                  {t("conn.activate")}
                </Button>
              </Show>
              <Button size="sm" variant="outline" onClick={() => setEditing(c)}>
                {t("common.confirm")}…
              </Button>
            </div>
          )}
        </For>
        <Show when={connections().length === 0}>
          <p class="py-6 text-center text-sm text-muted-foreground">No connections yet.</p>
        </Show>
      </CardContent>

      <Show when={addOpen()}>
        <ConnectionDialog onClose={() => setAddOpen(false)} />
      </Show>
      <Show when={editing()}>
        <ConnectionDialog connection={editing()!} onClose={() => setEditing(null)} />
      </Show>
    </Card>
  );
};

const ConnectionDialog: Component<{ connection?: Connection; onClose: () => void }> = (props) => {
  // The dialog mounts fresh whenever the edited connection changes (parent
  // gates it with <Show when={editing()}>), so a one-shot snapshot of props is
  // exactly what we want for the form's initial values.
  // eslint-disable-next-line solid/reactivity
  const initial = props.connection;
  const editing = !!initial;
  const [name, setName] = createSignal(initial?.name ?? "");
  const [baseUrl, setBaseUrl] = createSignal(initial?.baseUrl ?? "");
  const [token, setToken] = createSignal(initial?.token ?? "");
  const [busy, setBusy] = createSignal(false);
  const [test, setTest] = createSignal<{ ok: boolean; message: string } | null>(null);

  async function runTest() {
    const url = baseUrl().trim();
    if (!url) return;
    setBusy(true);
    try {
      const ping = await testConnection({ baseUrl: url });
      if (!ping.ok) return setTest(ping);
      if (token().trim()) {
        setTest(await verifyToken({ baseUrl: url, token: token().trim() }));
      } else {
        setTest(ping);
      }
    } finally {
      setBusy(false);
    }
  }

  function save() {
    const url = baseUrl().trim();
    if (!url) return toast.error("URL required");
    const label =
      name().trim() ||
      (() => {
        try {
          return new URL(url).host;
        } catch {
          return url;
        }
      })();
    if (initial) {
      updateConnection(initial.id, { name: label, baseUrl: url, token: token().trim() });
      toast.success(t("common.success"));
    } else {
      addConnection({ name: label, baseUrl: url, token: token().trim() });
      toast.success(t("common.success"));
    }
    props.onClose();
  }

  function remove() {
    if (!initial) return;
    deleteConnection(initial.id);
    toast.success(t("common.success"));
    props.onClose();
  }

  return (
    <Dialog open onOpenChange={(v) => !v && props.onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? initial!.name : `+ ${t("top.add_connection")}`}</DialogTitle>
          <DialogDescription>{t("welcome.no_conn_body")}</DialogDescription>
        </DialogHeader>
        <div class="space-y-3">
          <TextField value={name()} onChange={setName}>
            <TextFieldLabel>{t("conn.name")}</TextFieldLabel>
            <TextFieldInput placeholder="Production" />
          </TextField>
          <TextField value={baseUrl()} onChange={setBaseUrl}>
            <TextFieldLabel>{t("conn.base_url")}</TextFieldLabel>
            <TextFieldInput placeholder="https://bsz.example.com" />
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
        </div>
        <DialogFooter>
          <Show when={editing}>
            <Button variant="destructive" onClick={remove} class="mr-auto">
              {t("conn.delete")}
            </Button>
          </Show>
          <Button variant="outline" disabled={busy()} onClick={runTest}>
            {t("conn.test")}
          </Button>
          <Button variant="ghost" onClick={props.onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={save}>{t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============ Appearance ============

const AppearanceCard: Component = () => (
  <Card>
    <CardHeader>
      <CardTitle>{t("settings.appearance")}</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <div>
        <div class="mb-2 text-xs text-muted-foreground">{t("top.theme")}</div>
        <div class="flex gap-2">
          <For each={["system", "light", "dark"] as Theme[]}>
            {(v) => (
              <Button size="sm" variant={theme() === v ? "default" : "outline"} onClick={() => setTheme(v)}>
                {t(`theme.${v}` as const)}
              </Button>
            )}
          </For>
        </div>
      </div>
      <Separator />
      <div>
        <div class="mb-2 text-xs text-muted-foreground">{t("top.language")}</div>
        <div class="flex gap-2">
          <For each={["zh", "en"] as Locale[]}>
            {(v) => (
              <Button size="sm" variant={locale() === v ? "default" : "outline"} onClick={() => setLocale(v)}>
                {v === "zh" ? "中文" : "English"}
              </Button>
            )}
          </For>
        </div>
      </div>
    </CardContent>
  </Card>
);

// ============ Data (import / export / sync) ============

const DataCard: Component = () => {
  const hasToken = () => !!activeConnection()?.token;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.data")}</CardTitle>
      </CardHeader>
      <CardContent class="space-y-6">
        <Show
          when={hasToken()}
          fallback={
            <p class="text-sm text-muted-foreground">
              Configure ADMIN_TOKEN on the active connection to enable data tools.
            </p>
          }
        >
          <ExportSection />
          <Separator />
          <ImportSection />
          <Separator />
          <SyncSection />
        </Show>
      </CardContent>
    </Card>
  );
};

const ExportSection: Component = () => (
  <div class="flex items-center justify-between gap-4">
    <div>
      <div class="text-sm font-medium">{t("settings.export_db")}</div>
      <div class="text-xs text-muted-foreground">Download a snapshot of data.db</div>
    </div>
    <Button size="sm" variant="outline" onClick={() => (window.location.href = exportDownloadUrl())}>
      Download
    </Button>
  </div>
);

const ImportSection: Component = () => {
  const [file, setFile] = createSignal<File | null>(null);
  const [busy, setBusy] = createSignal(false);

  async function go() {
    const f = file();
    if (!f) return toast.error("file required");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const r = await api.upload<unknown>("/import", fd);
      if (!r.success) throw new Error(r.message ?? "import failed");
      toast.success(r.message ?? t("common.success"));
      setFile(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div class="space-y-2">
      <div>
        <div class="text-sm font-medium">{t("settings.import_db")}</div>
        <div class="text-xs text-amber-500">⚠ Overwrites existing data</div>
      </div>
      <div class="flex items-center gap-2">
        <input
          type="file"
          accept=".db"
          onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
          class="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm file:mr-2 file:rounded file:border-0 file:bg-transparent file:text-sm file:font-medium"
        />
        <Button size="sm" disabled={busy() || !file()} onClick={go}>
          {busy() ? "…" : "Import"}
        </Button>
      </div>
    </div>
  );
};

type SyncState = {
  progress: { total: number; current: number; imported: number; errors: number };
  logs: Array<{ text: string; ok?: boolean; error?: boolean }>;
  running: boolean;
};

const SyncSection: Component = () => {
  const [url, setUrl] = createSignal("");
  const [file, setFile] = createSignal<File | null>(null);
  const [concurrency, setConcurrency] = createSignal(3);
  const [state, setState] = createSignal<SyncState>({
    progress: { total: 0, current: 0, imported: 0, errors: 0 },
    logs: [],
    running: false,
  });

  function addLog(text: string, opts: { ok?: boolean; error?: boolean } = {}) {
    setState((s) => ({ ...s, logs: [{ text, ...opts }, ...s.logs].slice(0, 30) }));
  }

  async function go() {
    const u = url().trim();
    const f = file();
    if (!u && !f) return toast.error("URL or file required");

    setState({ progress: { total: 0, current: 0, imported: 0, errors: 0 }, logs: [], running: true });
    let sseUrl: string;
    if (f) {
      addLog("Parsing uploaded XML…");
      const fd = new FormData();
      fd.append("file", f);
      try {
        const res = await fetch(`${adminUrl("/sync/upload")}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${activeConnection()!.token}` },
          body: fd,
        });
        const r = await res.json();
        if (!r.success) {
          addLog(r.message ?? "upload failed", { error: true });
          setState((s) => ({ ...s, running: false }));
          return;
        }
        addLog(`Found ${r.url_count} URLs`);
        sseUrl = syncEventSourceUrl({ sync_id: r.sync_id, concurrency: String(concurrency()) });
      } catch (e: unknown) {
        addLog(e instanceof Error ? e.message : "upload failed", { error: true });
        setState((s) => ({ ...s, running: false }));
        return;
      }
    } else {
      addLog("Fetching sitemap…");
      sseUrl = syncEventSourceUrl({ sitemap_url: u, concurrency: String(concurrency()) });
    }

    const sse = new EventSource(sseUrl);
    sse.addEventListener("progress", (e) => {
      const d = JSON.parse((e as MessageEvent<string>).data);
      if (d.total) {
        setState((s) => ({
          ...s,
          progress: {
            total: d.total,
            current: d.current ?? 0,
            imported: d.imported ?? 0,
            errors: d.errors ?? 0,
          },
        }));
      }
      if (d.path)
        addLog(d.error ? `✗ ${d.path}` : `✓ ${d.path} PV:${d.page_pv}`, { error: !!d.error, ok: !d.error });
      else if (d.message) addLog(d.message);
    });
    sse.addEventListener("error", (e: Event) => {
      let msg = "sync error";
      try {
        msg = JSON.parse((e as MessageEvent<string>).data).message;
      } catch {
        // event has no payload — fall back to generic message
      }
      addLog(msg, { error: true });
      setState((s) => ({ ...s, running: false }));
      sse.close();
    });
    sse.addEventListener("complete", (e) => {
      const d = JSON.parse((e as MessageEvent<string>).data);
      addLog(d.message, { ok: true });
      toast.success(d.message);
      setState((s) => ({ ...s, running: false, progress: { ...s.progress, current: s.progress.total } }));
      sse.close();
    });
    sse.onerror = () => {
      if (!state().running) return;
      addLog("connection lost", { error: true });
      setState((s) => ({ ...s, running: false }));
      sse.close();
    };
  }

  const percent = () =>
    state().progress.total
      ? Math.min(100, Math.round((state().progress.current / state().progress.total) * 100))
      : 0;

  return (
    <div class="space-y-2">
      <div class="text-sm font-medium">{t("settings.sitemap_sync")}</div>
      <p class="text-xs text-muted-foreground">
        Pull historical stats from busuanzi.ibruce.info using a sitemap (incremental merge).
      </p>
      <div class="flex gap-2">
        <input
          type="url"
          class="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="https://example.com/sitemap.xml"
          value={url()}
          onInput={(e) => setUrl(e.currentTarget.value)}
        />
        <input
          type="number"
          class="h-9 w-16 rounded-md border border-input bg-background px-2 text-sm tabular-nums"
          min={1}
          max={10}
          value={concurrency()}
          onInput={(e) => setConcurrency(Math.max(1, Math.min(10, +e.currentTarget.value || 1)))}
        />
        <Button size="sm" disabled={state().running} onClick={go}>
          {state().running ? "…" : "Sync"}
        </Button>
      </div>
      <div class="flex items-center gap-2">
        <input
          type="file"
          accept=".xml"
          onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
          class="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm file:mr-2 file:rounded file:border-0 file:bg-transparent file:text-sm file:font-medium"
        />
      </div>
      <Show when={state().running || state().progress.total > 0}>
        <div class="mt-3 space-y-2">
          <div class="h-1 overflow-hidden rounded bg-muted">
            <div class="h-full bg-primary transition-all" style={{ width: `${percent()}%` }} />
          </div>
          <div class="flex gap-4 text-xs text-muted-foreground">
            <span>
              {state().progress.current}/{state().progress.total}
            </span>
            <span>
              ok <b class="text-green-500">{state().progress.imported}</b>
            </span>
            <span>
              err <b class="text-destructive">{state().progress.errors}</b>
            </span>
          </div>
          <div class="max-h-[140px] overflow-y-auto rounded bg-background p-2 font-mono text-[11px]">
            <For each={state().logs}>
              {(line) => (
                <div
                  class={
                    line.error ? "text-destructive" : line.ok ? "text-green-500" : "text-muted-foreground"
                  }
                >
                  {line.text}
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default Settings;
