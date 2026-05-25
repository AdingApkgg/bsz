import { createMemo, createResource, createSignal, For, Show, type Component } from "solid-js";
import { Title } from "@solidjs/meta";
import { A, useNavigate } from "@solidjs/router";
import { Button } from "~/components/ui/button";
import { TextField, TextFieldInput } from "~/components/ui/text-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Card } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { toast } from "solid-sonner";
import { api, type SiteKey } from "~/lib/api";
import { activeConnection } from "~/lib/connections";
import { t } from "~/lib/i18n";
import { SITE_PAGE_SIZE } from "~/lib/config";

type Sort = "pv-desc" | "pv-asc" | "uv-desc" | "uv-asc" | "key-asc";

const sortOptions: Array<{ value: Sort; label: () => string }> = [
  { value: "pv-desc", label: () => "PV ↓" },
  { value: "pv-asc", label: () => "PV ↑" },
  { value: "uv-desc", label: () => "UV ↓" },
  { value: "uv-asc", label: () => "UV ↑" },
  { value: "key-asc", label: () => "A → Z" },
];

const SitesPage: Component = () => {
  const navigate = useNavigate();
  const c = () => activeConnection();
  const [search, setSearch] = createSignal("");
  const [sort, setSort] = createSignal<Sort>("pv-desc");
  const [page, setPage] = createSignal(1);
  const [selected, setSelected] = createSignal<string[]>([]);
  const [confirmBatch, setConfirmBatch] = createSignal(false);

  const [keys, { refetch }] = createResource(c, async () => {
    if (!c()?.token) return [] as SiteKey[];
    const r = await api.get<SiteKey[]>("/keys?count=500");
    return r.data ?? [];
  });

  const filtered = createMemo(() => {
    const list = keys() ?? [];
    const q = search().toLowerCase().trim();
    const s = sort();
    const out = q ? list.filter((k) => k.site_key.toLowerCase().includes(q)) : [...list];
    out.sort((a, b) => {
      switch (s) {
        case "pv-desc":
          return (b.site_pv || 0) - (a.site_pv || 0);
        case "pv-asc":
          return (a.site_pv || 0) - (b.site_pv || 0);
        case "uv-desc":
          return (b.site_uv || 0) - (a.site_uv || 0);
        case "uv-asc":
          return (a.site_uv || 0) - (b.site_uv || 0);
        case "key-asc":
          return a.site_key.localeCompare(b.site_key);
        default:
          return 0;
      }
    });
    return out;
  });

  const totalPages = createMemo(() => Math.max(1, Math.ceil(filtered().length / SITE_PAGE_SIZE)));
  const paged = createMemo(() => filtered().slice((page() - 1) * SITE_PAGE_SIZE, page() * SITE_PAGE_SIZE));
  const allSelected = createMemo(
    () => paged().length > 0 && paged().every((s) => selected().includes(s.site_key)),
  );

  function toggle(key: string) {
    setSelected((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  }
  function toggleAll() {
    if (allSelected()) {
      setSelected((cur) => cur.filter((k) => !paged().some((s) => s.site_key === k)));
    } else {
      const add = paged()
        .map((s) => s.site_key)
        .filter((k) => !selected().includes(k));
      setSelected((cur) => [...cur, ...add]);
    }
  }

  async function doBatchDelete() {
    try {
      const r = await api.post<unknown>("/keys/batch-delete", { site_keys: selected() });
      toast.success(r.message ?? t("common.success"));
      setSelected([]);
      setConfirmBatch(false);
      refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("common.delete_failed"));
    }
  }

  return (
    <div class="px-6 py-6 lt-md:px-4">
      <Title>{t("sites.title")} · Busuanzi</Title>
      <h1 class="mb-4 text-2xl font-semibold tracking-tight">{t("sites.title")}</h1>

      <div class="mb-4 flex flex-wrap items-center gap-2">
        <TextField
          value={search()}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          class="flex-1 min-w-[220px] max-w-md"
        >
          <TextFieldInput placeholder={t("sites.search_placeholder")} />
        </TextField>
        <Select<Sort>
          value={sort()}
          onChange={(v) => v && setSort(v)}
          options={sortOptions.map((o) => o.value)}
          itemComponent={(p) => (
            <SelectItem item={p.item}>
              {sortOptions.find((o) => o.value === p.item.rawValue)?.label()}
            </SelectItem>
          )}
        >
          <SelectTrigger class="w-32">
            <SelectValue<Sort>>
              {(s) => sortOptions.find((o) => o.value === s.selectedOption())?.label()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent />
        </Select>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          {t("common.refresh")}
        </Button>
        <Show when={selected().length > 0}>
          <div class="ml-auto flex items-center gap-2 text-xs">
            <span class="text-muted-foreground">
              {selected().length} {t("sites.selected")}
            </span>
            <Button variant="destructive" size="sm" onClick={() => setConfirmBatch(true)}>
              {t("sites.batch_delete")}
            </Button>
          </div>
        </Show>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-10">
                <input type="checkbox" checked={allSelected()} onChange={toggleAll} />
              </TableHead>
              <TableHead>{t("sites.col_site")}</TableHead>
              <TableHead class="w-28 text-right">{t("sites.col_pv")}</TableHead>
              <TableHead class="w-28 text-right">{t("sites.col_uv")}</TableHead>
              <TableHead class="w-28 text-right">{t("sites.col_pages")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <Show
              when={!keys.loading}
              fallback={
                <For each={[1, 2, 3, 4]}>
                  {() => (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Skeleton class="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  )}
                </For>
              }
            >
              <Show
                when={paged().length > 0}
                fallback={
                  <TableRow>
                    <TableCell colSpan={5} class="py-12 text-center text-muted-foreground">
                      {t("sites.empty")}
                    </TableCell>
                  </TableRow>
                }
              >
                <For each={paged()}>
                  {(s) => (
                    <TableRow
                      class="cursor-pointer"
                      onClick={(e: MouseEvent) => {
                        if ((e.target as HTMLElement).tagName === "INPUT") return;
                        navigate(`/app/sites/${encodeURIComponent(s.site_key)}`);
                      }}
                    >
                      <TableCell onClick={(e: MouseEvent) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected().includes(s.site_key)}
                          onChange={() => toggle(s.site_key)}
                        />
                      </TableCell>
                      <TableCell class="font-mono text-sm">{s.site_key}</TableCell>
                      <TableCell class="text-right tabular-nums">
                        {(s.site_pv ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell class="text-right tabular-nums">
                        {(s.site_uv ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell class="text-right text-primary">
                        <A
                          href={`/app/sites/${encodeURIComponent(s.site_key)}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          →
                        </A>
                      </TableCell>
                    </TableRow>
                  )}
                </For>
              </Show>
            </Show>
          </TableBody>
        </Table>
        <div class="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <span>
            {filtered().length} {t("nav.sites")}
          </span>
          <div class="flex items-center gap-2">
            <Button size="sm" variant="ghost" disabled={page() <= 1} onClick={() => setPage((p) => p - 1)}>
              {t("common.prev")}
            </Button>
            <span>
              {page()} / {totalPages()}
            </span>
            <Button
              size="sm"
              variant="ghost"
              disabled={page() >= totalPages()}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("common.next")}
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={confirmBatch()} onOpenChange={setConfirmBatch}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("sites.batch_delete")}</DialogTitle>
            <DialogDescription>
              {selected().length} {t("sites.selected")} — {t("site.danger_hint")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmBatch(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={doBatchDelete}>
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SitesPage;
