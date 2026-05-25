import { createMemo, createResource, createSignal, For, Show, type Component } from "solid-js";
import Modal from "./Modal";
import { Button } from "~/components/ui/button";
import { Table, TBody, THead, Th, Tr, Td } from "~/components/ui/table";
import { api, type LogEntry } from "~/lib/api";
import { LOGS_PAGE_SIZE } from "~/lib/config";

const ACTION_LABELS: Record<string, string> = {
  delete_site: "删除站点",
  delete_page: "删除页面",
  edit_site: "编辑站点",
  edit_page: "编辑页面",
  rename_site: "重命名",
  merge_site: "合并站点",
  import: "导入",
  export: "导出",
  batch_delete_sites: "批量删除站点",
  batch_delete_pages: "批量删除页面",
};

function actionColor(action: string) {
  if (action.includes("delete")) return "bg-destructive/20 text-destructive";
  if (action.includes("import") || action.includes("merge")) return "bg-amber-500/20 text-amber-400";
  if (action.includes("export")) return "bg-green-500/20 text-green-400";
  return "bg-primary/20 text-primary";
}

const LogsDialog: Component<{ onClose: () => void }> = (props) => {
  const [page, setPage] = createSignal(1);

  const [data] = createResource(page, async (p) => {
    const r = await api.get<LogEntry[]>(`/logs?page=${p}&size=${LOGS_PAGE_SIZE}`);
    return { rows: r.data ?? [], total: r.total ?? 0 };
  });

  const totalPages = createMemo(() => Math.max(1, Math.ceil((data()?.total ?? 0) / LOGS_PAGE_SIZE)));

  return (
    <Modal title="操作日志" width="lg" onClose={props.onClose}>
      <div class="max-h-[60vh] overflow-y-auto rounded-md border border-border">
        <Table>
          <THead>
            <Tr>
              <Th class="w-40">时间</Th>
              <Th class="w-28">操作</Th>
              <Th>详情</Th>
              <Th class="w-28">IP</Th>
            </Tr>
          </THead>
          <TBody>
            <Show when={!data.loading} fallback={<Tr><Td colspan={4} class="py-8 text-center text-muted-foreground">加载中…</Td></Tr>}>
              <Show when={(data()?.rows.length ?? 0) > 0} fallback={<Tr><Td colspan={4} class="py-8 text-center text-muted-foreground">暂无日志</Td></Tr>}>
                <For each={data()?.rows}>
                  {(l) => (
                    <Tr>
                      <Td class="font-mono text-xs text-muted-foreground tabular-nums">{l.timestamp}</Td>
                      <Td>
                        <span class={`inline-block rounded px-1.5 py-0.5 text-xs ${actionColor(l.action)}`}>
                          {ACTION_LABELS[l.action] ?? l.action}
                        </span>
                      </Td>
                      <Td class="font-mono text-xs text-muted-foreground" title={l.detail}>
                        {l.detail.length > 80 ? l.detail.slice(0, 77) + "…" : l.detail}
                      </Td>
                      <Td class="font-mono text-xs text-muted-foreground">{l.ip}</Td>
                    </Tr>
                  )}
                </For>
              </Show>
            </Show>
          </TBody>
        </Table>
      </div>
      <div class="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>共 {data()?.total ?? 0} 条</span>
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
    </Modal>
  );
};

export default LogsDialog;
