import { createMemo, createResource, createSignal, For, Show, type Component } from "solid-js";
import Modal from "./Modal";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Table, TBody, THead, Th, Tr, Td } from "~/components/ui/table";
import { toast } from "~/components/ui/toast";
import { api, type PageInfo } from "~/lib/api";
import { PAGES_PAGE_SIZE } from "~/lib/config";

type Props = {
  siteKey: string;
  onClose: () => void;
  onChange: () => void;
};

const PagesDialog: Component<Props> = (props) => {
  const [page, setPage] = createSignal(1);
  const [selected, setSelected] = createSignal<string[]>([]);
  const [sub, setSub] = createSignal<
    | { kind: "none" }
    | { kind: "edit"; page: PageInfo }
    | { kind: "delete"; page: PageInfo }
    | { kind: "batchDelete" }
  >({ kind: "none" });

  const [pages, { refetch }] = createResource(async () => {
    const r = await api.get<PageInfo[]>(`/pages?site_key=${encodeURIComponent(props.siteKey)}&count=500`);
    return r.data ?? [];
  });

  const total = createMemo(() => Math.max(1, Math.ceil((pages()?.length ?? 0) / PAGES_PAGE_SIZE)));
  const paged = createMemo(() => (pages() ?? []).slice((page() - 1) * PAGES_PAGE_SIZE, page() * PAGES_PAGE_SIZE));
  const allSelected = createMemo(() =>
    paged().length > 0 && paged().every((p) => selected().includes(p.page_key)),
  );

  function toggle(key: string) {
    setSelected((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  }
  function toggleAll() {
    if (allSelected()) {
      setSelected((cur) => cur.filter((k) => !paged().some((p) => p.page_key === k)));
    } else {
      const toAdd = paged().map((p) => p.page_key).filter((k) => !selected().includes(k));
      setSelected((cur) => [...cur, ...toAdd]);
    }
  }

  function reload() {
    refetch();
    props.onChange();
  }

  return (
    <Modal title={`${props.siteKey} - 页面`} width="lg" onClose={props.onClose}>
      <div class="mb-3 flex items-center justify-between">
        <span class="text-xs text-muted-foreground">共 {pages()?.length ?? 0} 页</span>
        <div class="flex items-center gap-2">
          <Show when={selected().length > 0}>
            <span class="text-xs text-muted-foreground">已选 {selected().length}</span>
            <Button variant="destructive" size="sm" onClick={() => setSub({ kind: "batchDelete" })}>
              批量删除
            </Button>
          </Show>
        </div>
      </div>

      <div class="max-h-[60vh] overflow-y-auto rounded-md border border-border">
        <Table>
          <THead>
            <Tr>
              <Th class="w-10">
                <input type="checkbox" checked={allSelected()} onChange={toggleAll} />
              </Th>
              <Th>路径</Th>
              <Th class="w-20 text-right">PV</Th>
              <Th class="w-32 text-right">操作</Th>
            </Tr>
          </THead>
          <TBody>
            <Show
              when={!pages.loading}
              fallback={<Tr><Td colspan={4} class="py-8 text-center text-muted-foreground">加载中…</Td></Tr>}
            >
              <Show
                when={paged().length > 0}
                fallback={<Tr><Td colspan={4} class="py-8 text-center text-muted-foreground">暂无页面</Td></Tr>}
              >
                <For each={paged()}>
                  {(p) => (
                    <Tr>
                      <Td>
                        <input
                          type="checkbox"
                          checked={selected().includes(p.page_key)}
                          onChange={() => toggle(p.page_key)}
                        />
                      </Td>
                      <Td class="font-mono text-xs" title={p.path}>{p.path}</Td>
                      <Td class="text-right tabular-nums">{p.pv.toLocaleString()}</Td>
                      <Td class="text-right">
                        <Button size="sm" variant="ghost" onClick={() => setSub({ kind: "edit", page: p })}>编辑</Button>
                        <Button size="sm" variant="ghost" class="text-destructive" onClick={() => setSub({ kind: "delete", page: p })}>删除</Button>
                      </Td>
                    </Tr>
                  )}
                </For>
              </Show>
            </Show>
          </TBody>
        </Table>
      </div>

      <div class="mt-3 flex items-center justify-end gap-2 text-xs text-muted-foreground">
        <Button size="sm" variant="ghost" disabled={page() <= 1} onClick={() => setPage((p) => p - 1)}>上一页</Button>
        <span>{page()} / {total()}</span>
        <Button size="sm" variant="ghost" disabled={page() >= total()} onClick={() => setPage((p) => p + 1)}>下一页</Button>
      </div>

      <Show when={sub().kind === "edit"}>
        <EditPageDialog
          page={(sub() as { kind: "edit"; page: PageInfo }).page}
          onClose={() => setSub({ kind: "none" })}
          onSaved={() => { setSub({ kind: "none" }); reload(); }}
        />
      </Show>

      <Show when={sub().kind === "delete"}>
        <ConfirmDeleteDialog
          label={`页面 ${(sub() as { kind: "delete"; page: PageInfo }).page.path}`}
          onClose={() => setSub({ kind: "none" })}
          onConfirm={async () => {
            const target = (sub() as { kind: "delete"; page: PageInfo }).page;
            try {
              await api.delete(
                `/keys?site_key=${encodeURIComponent(target.site_key)}&page_key=${encodeURIComponent(target.page_key)}`,
              );
              toast("已删除", "success");
              setSub({ kind: "none" });
              reload();
            } catch (e: unknown) {
              toast(e instanceof Error ? e.message : "删除失败", "error");
            }
          }}
        />
      </Show>

      <Show when={sub().kind === "batchDelete"}>
        <ConfirmDeleteDialog
          label={`${selected().length} 个页面`}
          onClose={() => setSub({ kind: "none" })}
          onConfirm={async () => {
            try {
              const r = await api.post<unknown>("/pages/batch-delete", { page_keys: selected() });
              toast(r.message ?? "已删除", "success");
              setSelected([]);
              setSub({ kind: "none" });
              reload();
            } catch (e: unknown) {
              toast(e instanceof Error ? e.message : "批量删除失败", "error");
            }
          }}
        />
      </Show>
    </Modal>
  );
};

export default PagesDialog;

function EditPageDialog(props: { page: PageInfo; onClose: () => void; onSaved: () => void }) {
  const [pv, setPv] = createSignal(props.page.pv);
  const [busy, setBusy] = createSignal(false);
  async function save() {
    setBusy(true);
    try {
      const r = await api.post<unknown>("/pages/update", { page_key: props.page.page_key, pv: pv() });
      toast(r.message ?? "已保存", "success");
      props.onSaved();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "保存失败", "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="编辑页面" onClose={props.onClose}>
      <p class="mb-3 break-all text-xs text-muted-foreground">{props.page.path}</p>
      <label class="mb-1.5 block text-xs text-muted-foreground">页面 PV</label>
      <Input type="number" value={pv()} onInput={(e) => setPv(+e.currentTarget.value)} />
      <div class="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={props.onClose}>取消</Button>
        <Button disabled={busy()} onClick={save}>{busy() ? "保存中…" : "保存"}</Button>
      </div>
    </Modal>
  );
}

function ConfirmDeleteDialog(props: { label: string; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [busy, setBusy] = createSignal(false);
  return (
    <Modal title="确认删除" onClose={props.onClose}>
      <p class="text-sm">即将删除 <strong>{props.label}</strong>，此操作不可撤销。</p>
      <div class="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={props.onClose}>取消</Button>
        <Button
          variant="destructive"
          disabled={busy()}
          onClick={async () => { setBusy(true); try { await props.onConfirm(); } finally { setBusy(false); } }}
        >
          {busy() ? "删除中…" : "确认删除"}
        </Button>
      </div>
    </Modal>
  );
}
