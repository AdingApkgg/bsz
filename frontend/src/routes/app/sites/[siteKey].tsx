import { createMemo, createResource, createSignal, For, Show, type Component } from "solid-js";
import { Title } from "@solidjs/meta";
import { A, useParams, useNavigate } from "@solidjs/router";
import { toast } from "solid-sonner";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { TextField, TextFieldInput, TextFieldLabel } from "~/components/ui/text-field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Skeleton } from "~/components/ui/skeleton";
import { Separator } from "~/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { api, type PageInfo, type SiteKey } from "~/lib/api";
import { activeConnection } from "~/lib/connections";
import { offerUndo } from "~/lib/undo";
import { t } from "~/lib/i18n";

const SiteDetail: Component = () => {
  const params = useParams<{ siteKey: string }>();
  const navigate = useNavigate();
  const c = () => activeConnection();
  const siteKey = () => decodeURIComponent(params.siteKey);

  const [pages, { refetch: refetchPages }] = createResource(siteKey, async (k) => {
    if (!c()?.token) return [] as PageInfo[];
    const r = await api.get<PageInfo[]>(`/pages?site_key=${encodeURIComponent(k)}&count=500`);
    return r.data ?? [];
  });

  const [siteRow, { refetch: refetchSite }] = createResource(siteKey, async () => {
    if (!c()?.token) return null;
    const r = await api.get<SiteKey[]>("/keys?count=500");
    return (r.data ?? []).find((s) => s.site_key === siteKey()) ?? null;
  });

  const totalPagesPv = createMemo(() => (pages() ?? []).reduce((s, p) => s + (p.pv || 0), 0));

  // ----- Inline PV/UV edit -----
  const [pv, setPv] = createSignal<number | null>(null);
  const [uv, setUv] = createSignal<number | null>(null);

  function getPv(): number {
    return pv() ?? siteRow()?.site_pv ?? 0;
  }
  function getUv(): number {
    return uv() ?? siteRow()?.site_uv ?? 0;
  }

  async function saveField(kind: "site_pv" | "site_uv", value: number) {
    const old = kind === "site_pv" ? (siteRow()?.site_pv ?? 0) : (siteRow()?.site_uv ?? 0);
    if (value === old) return;
    try {
      await api.post("/keys/update", { site_key: siteKey(), key_type: kind, value });
      toast.success(t("common.success"));
      offerUndo(
        `${kind === "site_pv" ? "PV" : "UV"}: ${old.toLocaleString()} → ${value.toLocaleString()}`,
        async () => {
          await api.post("/keys/update", { site_key: siteKey(), key_type: kind, value: old });
          toast.success(t("common.undo"));
          if (kind === "site_pv") setPv(null);
          else setUv(null);
          refetchSite();
        },
      );
      refetchSite();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "save failed");
    }
  }

  // ----- Danger ops -----
  const [renameOpen, setRenameOpen] = createSignal(false);
  const [mergeOpen, setMergeOpen] = createSignal(false);
  const [deleteOpen, setDeleteOpen] = createSignal(false);
  const [newKey, setNewKey] = createSignal("");
  const [mergeTarget, setMergeTarget] = createSignal("");

  async function doRename() {
    const target = newKey().trim();
    if (!target) return toast.error("required");
    try {
      const r = await api.post<unknown>("/keys/rename", { old_key: siteKey(), new_key: target });
      toast.success(r.message ?? t("common.success"));
      navigate(`/app/sites/${encodeURIComponent(target)}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "rename failed");
    }
  }

  async function doMerge() {
    const target = mergeTarget().trim();
    if (!target) return toast.error("required");
    try {
      const r = await api.post<unknown>("/keys/merge", { source_key: siteKey(), target_key: target });
      toast.success(r.message ?? t("common.success"));
      navigate("/app/sites");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "merge failed");
    }
  }

  async function doDelete() {
    try {
      await api.delete(`/keys?site_key=${encodeURIComponent(siteKey())}`);
      toast.success(t("common.success"));
      navigate("/app/sites");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "delete failed");
    }
  }

  // ----- Page row -----
  const [editingPage, setEditingPage] = createSignal<PageInfo | null>(null);
  const [editingPv, setEditingPv] = createSignal(0);

  async function savePageEdit() {
    const target = editingPage();
    if (!target) return;
    const old = target.pv;
    if (editingPv() === old) {
      setEditingPage(null);
      return;
    }
    try {
      const r = await api.post<unknown>("/pages/update", { page_key: target.page_key, pv: editingPv() });
      toast.success(r.message ?? t("common.success"));
      offerUndo(`${target.path}: ${old.toLocaleString()} → ${editingPv().toLocaleString()}`, async () => {
        await api.post("/pages/update", { page_key: target.page_key, pv: old });
        toast.success(t("common.undo"));
        refetchPages();
      });
      setEditingPage(null);
      refetchPages();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "save failed");
    }
  }

  async function deletePage(p: PageInfo) {
    try {
      await api.delete(
        `/keys?site_key=${encodeURIComponent(siteKey())}&page_key=${encodeURIComponent(p.page_key)}`,
      );
      toast.success(t("common.success"));
      refetchPages();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "delete failed");
    }
  }

  return (
    <div class="px-6 py-6 lt-md:px-4">
      <Title>{siteKey()} · Busuanzi</Title>
      <div class="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <A href="/app/sites" class="hover:text-foreground">
          {t("site.back")}
        </A>
        <span>/</span>
        <span class="font-mono text-foreground">{siteKey()}</span>
      </div>

      <div class="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-sm text-muted-foreground">{t("site.edit_pv")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Show when={!siteRow.loading} fallback={<Skeleton class="h-9 w-24" />}>
              <input
                type="number"
                class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-2xl font-semibold tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
                value={getPv()}
                onInput={(e) => setPv(+e.currentTarget.value)}
                onBlur={() => pv() != null && saveField("site_pv", pv()!)}
                onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
              />
            </Show>
          </CardContent>
        </Card>
        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-sm text-muted-foreground">{t("site.edit_uv")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Show when={!siteRow.loading} fallback={<Skeleton class="h-9 w-24" />}>
              <input
                type="number"
                class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-2xl font-semibold tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
                value={getUv()}
                onInput={(e) => setUv(+e.currentTarget.value)}
                onBlur={() => uv() != null && saveField("site_uv", uv()!)}
                onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
              />
            </Show>
          </CardContent>
        </Card>
        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-sm text-muted-foreground">{t("site.pages")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-semibold tabular-nums">{(pages()?.length ?? 0).toLocaleString()}</div>
            <div class="mt-0.5 text-xs text-muted-foreground">Σ {totalPagesPv().toLocaleString()} PV</div>
          </CardContent>
        </Card>
      </div>

      <Card class="mb-6">
        <CardHeader>
          <CardTitle class="text-base">{t("site.pages")}</CardTitle>
        </CardHeader>
        <CardContent class="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("sites.col_site")}</TableHead>
                <TableHead class="w-24 text-right">PV</TableHead>
                <TableHead class="w-32 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <Show
                when={!pages.loading}
                fallback={
                  <For each={[1, 2, 3]}>
                    {() => (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <Skeleton class="h-6 w-full" />
                        </TableCell>
                      </TableRow>
                    )}
                  </For>
                }
              >
                <Show
                  when={(pages()?.length ?? 0) > 0}
                  fallback={
                    <TableRow>
                      <TableCell colSpan={3} class="py-8 text-center text-muted-foreground">
                        {t("sites.empty")}
                      </TableCell>
                    </TableRow>
                  }
                >
                  <For each={pages() ?? []}>
                    {(p) => (
                      <TableRow>
                        <TableCell class="font-mono text-xs" title={p.path}>
                          {p.path}
                        </TableCell>
                        <TableCell class="text-right tabular-nums">{p.pv.toLocaleString()}</TableCell>
                        <TableCell class="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingPage(p);
                              setEditingPv(p.pv);
                            }}
                          >
                            {t("common.confirm")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            class="text-destructive"
                            onClick={() => deletePage(p)}
                          >
                            {t("common.delete")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )}
                  </For>
                </Show>
              </Show>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Separator class="my-6" />

      <Card class="border-destructive/30">
        <CardHeader>
          <CardTitle class="text-base text-destructive">{t("site.danger")}</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <p class="text-xs text-muted-foreground">{t("site.danger_hint")}</p>
          <div class="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewKey("");
                setRenameOpen(true);
              }}
            >
              {t("site.rename")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMergeTarget("");
                setMergeOpen(true);
              }}
            >
              {t("site.merge")}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
              {t("site.delete")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Page edit dialog */}
      <Dialog open={!!editingPage()} onOpenChange={(v) => !v && setEditingPage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("site.edit_pv")}</DialogTitle>
            <DialogDescription class="break-all font-mono text-xs">{editingPage()?.path}</DialogDescription>
          </DialogHeader>
          <TextField>
            <TextFieldLabel>PV</TextFieldLabel>
            <TextFieldInput
              type="number"
              value={editingPv()}
              onInput={(e: InputEvent & { currentTarget: HTMLInputElement }) =>
                setEditingPv(+e.currentTarget.value)
              }
            />
          </TextField>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingPage(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={savePageEdit}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={renameOpen()} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("site.rename")}</DialogTitle>
            <DialogDescription>{siteKey()} → ?</DialogDescription>
          </DialogHeader>
          <TextField value={newKey()} onChange={setNewKey}>
            <TextFieldLabel>{t("conn.name")}</TextFieldLabel>
            <TextFieldInput placeholder="example.com" />
          </TextField>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={doRename}>{t("common.confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge dialog */}
      <Dialog open={mergeOpen()} onOpenChange={setMergeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("site.merge")}</DialogTitle>
            <DialogDescription>{siteKey()} → ?</DialogDescription>
          </DialogHeader>
          <TextField value={mergeTarget()} onChange={setMergeTarget}>
            <TextFieldLabel>{t("conn.name")}</TextFieldLabel>
            <TextFieldInput placeholder="example.com" />
          </TextField>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMergeOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={doMerge}>{t("common.confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteOpen()} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("site.delete")}</DialogTitle>
            <DialogDescription>
              {siteKey()} — {t("site.danger_hint")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={doDelete}>
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SiteDetail;
