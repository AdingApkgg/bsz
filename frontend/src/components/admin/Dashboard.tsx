import { createMemo, createResource, createSignal, For, Show, type Component } from "solid-js";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent } from "~/components/ui/card";
import { Table, TBody, THead, Th, Tr, Td } from "~/components/ui/table";
import { toast } from "~/components/ui/toast";
import { api, exportDownloadUrl, type SiteKey, type Stats } from "~/lib/api";
import { clearToken } from "~/lib/auth";
import { SITE_PAGE_SIZE } from "~/lib/config";
import Modal from "./Modal";
import PagesDialog from "./PagesDialog";
import ImportDialog from "./ImportDialog";
import LogsDialog from "./LogsDialog";

type Sort = "pv-desc" | "pv-asc" | "uv-desc" | "uv-asc" | "key-asc";

const Dashboard: Component = () => {
  const [search, setSearch] = createSignal("");
  const [sort, setSort] = createSignal<Sort>("pv-desc");
  const [page, setPage] = createSignal(1);
  const [selected, setSelected] = createSignal<string[]>([]);
  const [modal, setModal] = createSignal<
    | { kind: "none" }
    | { kind: "edit"; site: SiteKey }
    | { kind: "rename"; site: SiteKey }
    | { kind: "merge"; site: SiteKey }
    | { kind: "delete"; siteKey: string }
    | { kind: "batchDelete" }
    | { kind: "pages"; siteKey: string }
    | { kind: "import" }
    | { kind: "logs" }
  >({ kind: "none" });

  const [stats, { refetch: refetchStats }] = createResource(async () => {
    const r = await api.get<Stats>("/stats");
    return r.data;
  });
  const [keys, { refetch: refetchKeys }] = createResource(async () => {
    const r = await api.get<SiteKey[]>("/keys?count=500");
    return r.data ?? [];
  });

  function refresh() {
    refetchStats();
    refetchKeys();
  }

  const filtered = createMemo(() => {
    const list = keys() ?? [];
    const q = search().toLowerCase().trim();
    const out = q ? list.filter((k) => k.site_key.toLowerCase().includes(q)) : [...list];
    out.sort((a, b) => {
      switch (sort()) {
        case "pv-desc": return (b.site_pv || 0) - (a.site_pv || 0);
        case "pv-asc": return (a.site_pv || 0) - (b.site_pv || 0);
        case "uv-desc": return (b.site_uv || 0) - (a.site_uv || 0);
        case "uv-asc": return (a.site_uv || 0) - (b.site_uv || 0);
        case "key-asc": return a.site_key.localeCompare(b.site_key);
      }
    });
    return out;
  });

  const totalPages = createMemo(() => Math.max(1, Math.ceil(filtered().length / SITE_PAGE_SIZE)));
  const paged = createMemo(() => filtered().slice((page() - 1) * SITE_PAGE_SIZE, page() * SITE_PAGE_SIZE));
  const isAllSelected = createMemo(() =>
    paged().length > 0 && paged().every((k) => selected().includes(k.site_key)),
  );

  function toggleSelect(key: string) {
    setSelected((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  }
  function toggleSelectAll() {
    if (isAllSelected()) {
      setSelected((cur) => cur.filter((k) => !paged().some((pk) => pk.site_key === k)));
    } else {
      const toAdd = paged().map((p) => p.site_key).filter((k) => !selected().includes(k));
      setSelected((cur) => [...cur, ...toAdd]);
    }
  }

  function logout() {
    clearToken();
  }

  const fmt = (n: number | undefined) => (n != null ? n.toLocaleString() : "-");

  return (
    <main class="mx-auto max-w-[1100px] px-4 py-6 lt-sm:px-3">
      {/* Header */}
      <header class="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 class="text-xl font-semibold">Busuanzi Admin</h1>
        <div class="flex flex-wrap items-center gap-2">
          <Button variant="default" size="sm" onClick={() => setModal({ kind: "import" })}>
            导入
          </Button>
          <Button variant="ghost" size="sm" onClick={() => (window.location.href = exportDownloadUrl())}>
            导出
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setModal({ kind: "logs" })}>
            日志
          </Button>
          <Button variant="ghost" size="sm" onClick={logout}>
            登出
          </Button>
        </div>
      </header>

      {/* Stats */}
      <section class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="站点" value={fmt(stats()?.total_sites)} />
        <StatTile label="页面" value={fmt(stats()?.total_pages)} />
        <StatTile label="总 PV" value={fmt(stats()?.total_site_pv)} />
        <StatTile label="总 UV" value={fmt(stats()?.total_site_uv)} />
      </section>

      {/* Filters */}
      <Card class="mb-4">
        <CardContent class="flex flex-wrap items-center gap-2 p-3">
          <Input
            class="flex-1 min-w-[180px]"
            placeholder="搜索站点…"
            value={search()}
            onInput={(e) => { setSearch(e.currentTarget.value); setPage(1); }}
          />
          <select
            class="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={sort()}
            onChange={(e) => setSort(e.currentTarget.value as Sort)}
          >
            <option value="pv-desc">PV ↓</option>
            <option value="pv-asc">PV ↑</option>
            <option value="uv-desc">UV ↓</option>
            <option value="uv-asc">UV ↑</option>
            <option value="key-asc">域名 A-Z</option>
          </select>
          <Button variant="outline" size="sm" onClick={refresh}>
            刷新
          </Button>
          <Show when={selected().length > 0}>
            <span class="text-xs text-muted-foreground">已选 {selected().length}</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setModal({ kind: "batchDelete" })}
            >
              批量删除
            </Button>
          </Show>
        </CardContent>
      </Card>

      {/* Sites table */}
      <Card>
        <Table>
          <THead>
            <Tr>
              <Th class="w-10">
                <input type="checkbox" class="ck" checked={isAllSelected()} onChange={toggleSelectAll} />
              </Th>
              <Th>站点</Th>
              <Th class="w-24 text-right">PV</Th>
              <Th class="w-24 text-right">UV</Th>
              <Th class="w-72 text-right">操作</Th>
            </Tr>
          </THead>
          <TBody>
            <Show when={!keys.loading} fallback={<Tr><Td colspan={5} class="py-12 text-center text-muted-foreground">加载中…</Td></Tr>}>
              <Show when={paged().length > 0} fallback={<Tr><Td colspan={5} class="py-12 text-center text-muted-foreground">暂无站点</Td></Tr>}>
                <For each={paged()}>
                  {(site) => (
                    <Tr>
                      <Td>
                        <input
                          type="checkbox"
                          class="ck"
                          checked={selected().includes(site.site_key)}
                          onChange={() => toggleSelect(site.site_key)}
                        />
                      </Td>
                      <Td class="font-mono text-sm">{site.site_key}</Td>
                      <Td class="text-right tabular-nums">{fmt(site.site_pv)}</Td>
                      <Td class="text-right tabular-nums">{fmt(site.site_uv)}</Td>
                      <Td class="text-right">
                        <div class="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setModal({ kind: "pages", siteKey: site.site_key })}>
                            页面
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setModal({ kind: "edit", site })}>
                            编辑
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setModal({ kind: "rename", site })}>
                            重命名
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setModal({ kind: "merge", site })}>
                            合并
                          </Button>
                          <Button size="sm" variant="ghost" class="text-destructive" onClick={() => setModal({ kind: "delete", siteKey: site.site_key })}>
                            删除
                          </Button>
                        </div>
                      </Td>
                    </Tr>
                  )}
                </For>
              </Show>
            </Show>
          </TBody>
        </Table>
        <div class="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <span>共 {filtered().length} 个站点</span>
          <div class="flex items-center gap-2">
            <Button size="sm" variant="ghost" disabled={page() <= 1} onClick={() => setPage((p) => p - 1)}>
              上一页
            </Button>
            <span>{page()} / {totalPages()}</span>
            <Button size="sm" variant="ghost" disabled={page() >= totalPages()} onClick={() => setPage((p) => p + 1)}>
              下一页
            </Button>
          </div>
        </div>
      </Card>

      {/* ===== Modals ===== */}

      <Show when={modal().kind === "edit"}>
        <EditDialog
          site={(modal() as { kind: "edit"; site: SiteKey }).site}
          onClose={() => setModal({ kind: "none" })}
          onSaved={() => { setModal({ kind: "none" }); refresh(); }}
        />
      </Show>

      <Show when={modal().kind === "rename"}>
        <RenameDialog
          site={(modal() as { kind: "rename"; site: SiteKey }).site}
          onClose={() => setModal({ kind: "none" })}
          onSaved={() => { setModal({ kind: "none" }); refresh(); }}
        />
      </Show>

      <Show when={modal().kind === "merge"}>
        <MergeDialog
          site={(modal() as { kind: "merge"; site: SiteKey }).site}
          onClose={() => setModal({ kind: "none" })}
          onSaved={() => { setModal({ kind: "none" }); refresh(); }}
        />
      </Show>

      <Show when={modal().kind === "delete"}>
        <DeleteDialog
          label={(modal() as { kind: "delete"; siteKey: string }).siteKey}
          onClose={() => setModal({ kind: "none" })}
          onConfirm={async () => {
            const siteKey = (modal() as { kind: "delete"; siteKey: string }).siteKey;
            try {
              await api.delete(`/keys?site_key=${encodeURIComponent(siteKey)}`);
              toast("已删除", "success");
              setSelected((cur) => cur.filter((k) => k !== siteKey));
              setModal({ kind: "none" });
              refresh();
            } catch (e: unknown) {
              toast(e instanceof Error ? e.message : "删除失败", "error");
            }
          }}
        />
      </Show>

      <Show when={modal().kind === "batchDelete"}>
        <DeleteDialog
          label={`${selected().length} 个站点`}
          onClose={() => setModal({ kind: "none" })}
          onConfirm={async () => {
            try {
              const r = await api.post<unknown>("/keys/batch-delete", { site_keys: selected() });
              toast(r.message ?? "已删除", "success");
              setSelected([]);
              setModal({ kind: "none" });
              refresh();
            } catch (e: unknown) {
              toast(e instanceof Error ? e.message : "批量删除失败", "error");
            }
          }}
        />
      </Show>

      <Show when={modal().kind === "pages"}>
        <PagesDialog
          siteKey={(modal() as { kind: "pages"; siteKey: string }).siteKey}
          onClose={() => setModal({ kind: "none" })}
          onChange={refresh}
        />
      </Show>

      <Show when={modal().kind === "import"}>
        <ImportDialog
          onClose={() => setModal({ kind: "none" })}
          onComplete={() => { setModal({ kind: "none" }); refresh(); }}
        />
      </Show>

      <Show when={modal().kind === "logs"}>
        <LogsDialog onClose={() => setModal({ kind: "none" })} />
      </Show>
    </main>
  );
};

export default Dashboard;

function StatTile(props: { label: string; value: string }) {
  return (
    <Card>
      <CardContent class="px-4 py-4">
        <div class="text-2xl font-semibold text-primary tabular-nums">{props.value}</div>
        <div class="mt-0.5 text-xs uppercase tracking-wider text-muted-foreground">{props.label}</div>
      </CardContent>
    </Card>
  );
}

function EditDialog(props: { site: SiteKey; onClose: () => void; onSaved: () => void }) {
  const [pv, setPv] = createSignal(props.site.site_pv ?? 0);
  const [uv, setUv] = createSignal(props.site.site_uv ?? 0);
  const [busy, setBusy] = createSignal(false);

  async function save() {
    setBusy(true);
    try {
      await api.post("/keys/update", { site_key: props.site.site_key, key_type: "site_pv", value: pv() });
      await api.post("/keys/update", { site_key: props.site.site_key, key_type: "site_uv", value: uv() });
      toast("已保存", "success");
      props.onSaved();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "保存失败", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`编辑 ${props.site.site_key}`} onClose={props.onClose}>
      <div class="space-y-3">
        <Field label="站点 PV">
          <Input type="number" value={pv()} onInput={(e) => setPv(+e.currentTarget.value)} />
        </Field>
        <Field label="站点 UV">
          <Input type="number" value={uv()} onInput={(e) => setUv(+e.currentTarget.value)} />
        </Field>
      </div>
      <div class="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={props.onClose}>取消</Button>
        <Button disabled={busy()} onClick={save}>{busy() ? "保存中…" : "保存"}</Button>
      </div>
    </Modal>
  );
}

function RenameDialog(props: { site: SiteKey; onClose: () => void; onSaved: () => void }) {
  const [newKey, setNewKey] = createSignal("");
  const [busy, setBusy] = createSignal(false);

  async function save() {
    const target = newKey().trim();
    if (!target) return toast("请输入新域名", "error");
    setBusy(true);
    try {
      const r = await api.post<unknown>("/keys/rename", { old_key: props.site.site_key, new_key: target });
      toast(r.message ?? "已重命名", "success");
      props.onSaved();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "重命名失败", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="重命名站点" onClose={props.onClose}>
      <div class="space-y-3">
        <Field label="原域名">
          <Input value={props.site.site_key} readOnly />
        </Field>
        <Field label="新域名">
          <Input
            value={newKey()}
            onInput={(e) => setNewKey(e.currentTarget.value)}
            placeholder="example.com"
            autofocus
          />
        </Field>
      </div>
      <div class="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={props.onClose}>取消</Button>
        <Button disabled={busy()} onClick={save}>{busy() ? "保存中…" : "确认"}</Button>
      </div>
    </Modal>
  );
}

function MergeDialog(props: { site: SiteKey; onClose: () => void; onSaved: () => void }) {
  const [target, setTarget] = createSignal("");
  const [busy, setBusy] = createSignal(false);

  async function save() {
    const t = target().trim();
    if (!t) return toast("请输入目标站点", "error");
    setBusy(true);
    try {
      const r = await api.post<unknown>("/keys/merge", { source_key: props.site.site_key, target_key: t });
      toast(r.message ?? "已合并", "success");
      props.onSaved();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "合并失败", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="合并站点" onClose={props.onClose}>
      <p class="mb-3 text-xs text-muted-foreground">
        将 <code class="rounded bg-muted px-1">{props.site.site_key}</code> 的统计数据合并到目标站点，源站点会被删除。
      </p>
      <div class="space-y-3">
        <Field label="目标站点">
          <Input
            value={target()}
            onInput={(e) => setTarget(e.currentTarget.value)}
            placeholder="example.com"
            autofocus
          />
        </Field>
      </div>
      <div class="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={props.onClose}>取消</Button>
        <Button disabled={busy()} onClick={save}>{busy() ? "合并中…" : "确认"}</Button>
      </div>
    </Modal>
  );
}

function DeleteDialog(props: { label: string; onClose: () => void; onConfirm: () => void | Promise<void> }) {
  const [busy, setBusy] = createSignal(false);
  return (
    <Modal title="确认删除" onClose={props.onClose}>
      <p class="text-sm">
        即将删除 <strong>{props.label}</strong>，此操作不可撤销。
      </p>
      <div class="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={props.onClose}>取消</Button>
        <Button
          variant="destructive"
          disabled={busy()}
          onClick={async () => {
            setBusy(true);
            try { await props.onConfirm(); } finally { setBusy(false); }
          }}
        >
          {busy() ? "删除中…" : "确认删除"}
        </Button>
      </div>
    </Modal>
  );
}

function Field(props: { label: string; children: any }) {
  return (
    <label class="block">
      <span class="mb-1.5 block text-xs text-muted-foreground">{props.label}</span>
      {props.children}
    </label>
  );
}
