import { createMemo, createResource, createSignal, For, Show, type Component } from "solid-js";
import { Title } from "@solidjs/meta";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { api, type LogEntry } from "~/lib/api";
import { activeConnection } from "~/lib/connections";
import { t, locale } from "~/lib/i18n";
import { LOGS_PAGE_SIZE } from "~/lib/config";

const ACTION_LABELS_ZH: Record<string, string> = {
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

function actionLabel(a: string) {
  return locale() === "zh" ? (ACTION_LABELS_ZH[a] ?? a) : a;
}

function actionVariant(a: string): "default" | "secondary" | "warning" | "error" {
  if (a.includes("delete")) return "error";
  if (a.includes("import") || a.includes("merge")) return "warning";
  return "default";
}

const Logs: Component = () => {
  const c = () => activeConnection();
  const [page, setPage] = createSignal(1);

  const [data, { refetch }] = createResource(
    () => ({ c: c(), p: page() }),
    async ({ c, p }) => {
      if (!c?.token) return { rows: [] as LogEntry[], total: 0 };
      const r = await api.get<LogEntry[]>(`/logs?page=${p}&size=${LOGS_PAGE_SIZE}`);
      return { rows: r.data ?? [], total: r.total ?? 0 };
    },
  );

  const totalPages = createMemo(() => Math.max(1, Math.ceil((data()?.total ?? 0) / LOGS_PAGE_SIZE)));

  return (
    <div class="px-6 py-6 lt-md:px-4">
      <Title>{t("logs.title")} · Busuanzi</Title>
      <div class="mb-4 flex items-center justify-between">
        <h1 class="text-2xl font-semibold tracking-tight">{t("logs.title")}</h1>
        <Button size="sm" variant="outline" onClick={() => refetch()}>{t("common.refresh")}</Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-44">{t("logs.col_time")}</TableHead>
              <TableHead class="w-32">{t("logs.col_action")}</TableHead>
              <TableHead>{t("logs.col_detail")}</TableHead>
              <TableHead class="w-32">{t("logs.col_ip")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <Show
              when={!data.loading}
              fallback={
                <For each={[1, 2, 3, 4, 5]}>
                  {() => (
                    <TableRow>
                      <TableCell colSpan={4}><Skeleton class="h-6 w-full" /></TableCell>
                    </TableRow>
                  )}
                </For>
              }
            >
              <Show
                when={(data()?.rows.length ?? 0) > 0}
                fallback={
                  <TableRow>
                    <TableCell colSpan={4} class="py-12 text-center text-muted-foreground">{t("logs.empty")}</TableCell>
                  </TableRow>
                }
              >
                <For each={data()?.rows}>
                  {(l) => (
                    <TableRow>
                      <TableCell class="font-mono text-xs text-muted-foreground tabular-nums">{l.timestamp}</TableCell>
                      <TableCell>
                        <Badge variant={actionVariant(l.action)}>{actionLabel(l.action)}</Badge>
                      </TableCell>
                      <TableCell class="font-mono text-xs text-muted-foreground" title={l.detail}>
                        {l.detail.length > 80 ? l.detail.slice(0, 77) + "…" : l.detail}
                      </TableCell>
                      <TableCell class="font-mono text-xs text-muted-foreground">{l.ip}</TableCell>
                    </TableRow>
                  )}
                </For>
              </Show>
            </Show>
          </TableBody>
        </Table>
        <div class="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <span>{data()?.total ?? 0}</span>
          <div class="flex items-center gap-2">
            <Button size="sm" variant="ghost" disabled={page() <= 1} onClick={() => setPage((p) => p - 1)}>
              {t("common.prev")}
            </Button>
            <span>{page()} / {totalPages()}</span>
            <Button size="sm" variant="ghost" disabled={page() >= totalPages()} onClick={() => setPage((p) => p + 1)}>
              {t("common.next")}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Logs;
