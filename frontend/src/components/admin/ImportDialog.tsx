import { createSignal, For, Show, type Component } from "solid-js";
import Modal from "./Modal";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { toast } from "~/components/ui/toast";
import { adminUrl, api, syncEventSourceUrl } from "~/lib/api";
import { adminToken } from "~/lib/auth";

type Props = { onClose: () => void; onComplete: () => void };

type SyncLog = { text: string; ok?: boolean; error?: boolean };
type Progress = { total: number; current: number; imported: number; errors: number };

const ImportDialog: Component<Props> = (props) => {
  const [tab, setTab] = createSignal<"db" | "sync">("db");

  // DB import
  const [dbFile, setDbFile] = createSignal<File | null>(null);

  // Sync
  const [sitemapUrl, setSitemapUrl] = createSignal("");
  const [xmlFile, setXmlFile] = createSignal<File | null>(null);
  const [concurrency, setConcurrency] = createSignal(3);

  // Shared state
  const [busy, setBusy] = createSignal(false);
  const [syncing, setSyncing] = createSignal(false);
  const [progress, setProgress] = createSignal<Progress>({ total: 0, current: 0, imported: 0, errors: 0 });
  const [logs, setLogs] = createSignal<SyncLog[]>([]);
  let sse: EventSource | null = null;

  function addLog(text: string, opts: { error?: boolean; ok?: boolean } = {}) {
    setLogs((cur) => [{ text, ...opts }, ...cur].slice(0, 30));
  }

  function close() {
    if (sse) { sse.close(); sse = null; }
    props.onClose();
  }

  async function importDb() {
    const file = dbFile();
    if (!file) return toast("请选择 data.db 文件", "error");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.upload<unknown>("/import", fd);
      if (!r.success) throw new Error(r.message ?? "导入失败");
      toast(r.message ?? "导入成功", "success");
      props.onComplete();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "导入失败", "error");
    } finally {
      setBusy(false);
    }
  }

  async function syncSitemap() {
    const url = sitemapUrl().trim();
    const file = xmlFile();
    if (!url && !file) return toast("请输入 Sitemap URL 或上传 XML 文件", "error");

    setBusy(true);
    setSyncing(true);
    setProgress({ total: 0, current: 0, imported: 0, errors: 0 });
    setLogs([]);

    let target: string;
    if (file) {
      addLog("正在解析上传的 XML 文件…");
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch(adminUrl("/sync/upload"), {
          method: "POST",
          headers: { Authorization: `Bearer ${adminToken()}` },
          body: fd,
        });
        const r = await res.json();
        if (!r.success) { addLog(r.message ?? "上传失败", { error: true }); setBusy(false); return; }
        addLog(`解析完成，发现 ${r.url_count} 个 URL`);
        target = syncEventSourceUrl({ sync_id: r.sync_id, concurrency: String(concurrency()) });
      } catch (e: unknown) {
        addLog(`上传失败: ${e instanceof Error ? e.message : "未知错误"}`, { error: true });
        setBusy(false);
        return;
      }
    } else {
      addLog("正在获取 sitemap…");
      target = syncEventSourceUrl({ sitemap_url: url, concurrency: String(concurrency()) });
    }

    const source = new EventSource(target);
    sse = source;
    source.addEventListener("progress", (e) => {
      const d = JSON.parse((e as MessageEvent<string>).data);
      if (d.total) setProgress({ total: d.total, current: d.current ?? 0, imported: d.imported ?? 0, errors: d.errors ?? 0 });
      if (d.path) addLog(d.error ? `✗ ${d.path}` : `✓ ${d.path} PV:${d.page_pv}`, { error: !!d.error, ok: !d.error });
      else if (d.message) addLog(d.message);
    });
    source.addEventListener("error", (e) => {
      let msg = "同步失败";
      try { msg = JSON.parse((e as MessageEvent<string>).data).message; } catch {}
      addLog(msg, { error: true });
      setBusy(false);
      source.close();
    });
    source.addEventListener("complete", (e) => {
      const d = JSON.parse((e as MessageEvent<string>).data);
      addLog(d.message, { ok: true });
      setProgress((p) => ({ ...p, current: p.total }));
      toast(d.message ?? "同步完成", "success");
      setBusy(false);
      source.close();
      sse = null;
      setTimeout(() => props.onComplete(), 800);
    });
    source.onerror = () => {
      addLog("连接断开", { error: true });
      setBusy(false);
      source.close();
      sse = null;
    };
  }

  const percent = () =>
    progress().total ? Math.min(100, Math.round((progress().current / progress().total) * 100)) : 0;

  return (
    <Modal title="导入数据" width="lg" onClose={close}>
      <div class="mb-4 flex gap-2">
        <Button
          size="sm"
          variant={tab() === "db" ? "default" : "outline"}
          onClick={() => setTab("db")}
        >
          数据库导入
        </Button>
        <Button
          size="sm"
          variant={tab() === "sync" ? "default" : "outline"}
          onClick={() => setTab("sync")}
        >
          Sitemap 同步
        </Button>
      </div>

      <Show when={tab() === "db"}>
        <div class="space-y-3">
          <label class="block">
            <span class="mb-1.5 block text-xs text-muted-foreground">选择 data.db 文件</span>
            <Input
              type="file"
              accept=".db"
              onChange={(e) => setDbFile(e.currentTarget.files?.[0] ?? null)}
            />
          </label>
          <p class="text-xs text-muted-foreground">上传从导出功能下载的 SQLite 数据库，将完全替换当前数据。</p>
          <p class="text-xs text-amber-500">⚠ 导入将覆盖现有数据。</p>
        </div>
      </Show>

      <Show when={tab() === "sync"}>
        <div class="space-y-3">
          <label class="block">
            <span class="mb-1.5 block text-xs text-muted-foreground">Sitemap URL</span>
            <Input
              type="url"
              placeholder="https://example.com/sitemap.xml"
              value={sitemapUrl()}
              onInput={(e) => setSitemapUrl(e.currentTarget.value)}
            />
          </label>
          <label class="block">
            <span class="mb-1.5 block text-xs text-muted-foreground">或上传 XML 文件</span>
            <Input
              type="file"
              accept=".xml"
              onChange={(e) => setXmlFile(e.currentTarget.files?.[0] ?? null)}
            />
          </label>
          <label class="block">
            <span class="mb-1.5 block text-xs text-muted-foreground">并发数</span>
            <Input
              type="number"
              class="w-24"
              min={1}
              max={10}
              value={concurrency()}
              onInput={(e) => setConcurrency(Math.max(1, Math.min(10, +e.currentTarget.value || 1)))}
            />
          </label>
          <p class="text-xs text-muted-foreground">从 sitemap.xml 获取 URL 列表，从 busuanzi.ibruce.info 拉取历史数据（增量合并，不覆盖）。</p>

          <Show when={syncing()}>
            <div class="mt-4 space-y-2">
              <div class="h-2 overflow-hidden rounded bg-muted">
                <div class="h-full bg-primary transition-all" style={{ width: `${percent()}%` }} />
              </div>
              <div class="flex gap-4 text-xs text-muted-foreground">
                <span>进度: <b class="text-foreground">{progress().current}</b>/{progress().total}</span>
                <span>成功: <b class="text-green-500">{progress().imported}</b></span>
                <span>失败: <b class="text-destructive">{progress().errors}</b></span>
              </div>
              <div class="max-h-[150px] overflow-y-auto rounded bg-background p-2 font-mono text-xs">
                <For each={logs()}>
                  {(line) => (
                    <div class={line.error ? "text-destructive" : line.ok ? "text-green-500" : "text-muted-foreground"}>
                      {line.text}
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>
        </div>
      </Show>

      <div class="mt-5 flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" onClick={close}>取消</Button>
        <Button disabled={busy()} onClick={() => (tab() === "db" ? importDb() : syncSitemap())}>
          {busy() ? (tab() === "db" ? "导入中…" : "同步中…") : tab() === "db" ? "导入" : "开始同步"}
        </Button>
      </div>
    </Modal>
  );
};

export default ImportDialog;
