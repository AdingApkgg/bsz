import type { TooltipItem } from "chart.js";
import { Show, createMemo, createResource, For, type Component } from "solid-js";
import { Title } from "@solidjs/meta";
import { A } from "@solidjs/router";
import { Card, CardContent, CardHeader, CardTitle } from "@bsz/shared/components/ui/card";
import { Skeleton } from "@bsz/shared/components/ui/skeleton";
import { BarChart, DonutChart } from "@bsz/shared/components/ui/charts";
import { api, type SiteKey, type Stats, type LogEntry } from "~/lib/api";
import { activeConnection } from "~/lib/connections";
import { t } from "~/lib/i18n";

const Overview: Component = () => {
  const c = () => activeConnection();
  const hasToken = () => !!c()?.token;

  const [stats] = createResource(c, async () => {
    if (!hasToken()) return null;
    const r = await api.get<Stats>("/stats");
    return r.data ?? null;
  });

  const [keys] = createResource(c, async () => {
    if (!hasToken()) return [] as SiteKey[];
    const r = await api.get<SiteKey[]>("/keys?count=500");
    return r.data ?? [];
  });

  const [recentLogs] = createResource(c, async () => {
    if (!hasToken()) return [] as LogEntry[];
    const r = await api.get<LogEntry[]>("/logs?page=1&size=8");
    return r.data ?? [];
  });

  const fmt = (n: number | undefined | null) => (n != null ? n.toLocaleString() : "-");

  const top = createMemo(() =>
    [...(keys() ?? [])].sort((a, b) => (b.site_pv || 0) - (a.site_pv || 0)).slice(0, 10),
  );

  const barData = createMemo(() => ({
    labels: top().map((s) => (s.site_key.length > 18 ? `${s.site_key.slice(0, 16)}…` : s.site_key)),
    datasets: [
      {
        label: "PV",
        data: top().map((s) => s.site_pv || 0),
        backgroundColor: "hsl(217 91% 60%)",
        borderRadius: 4,
      },
    ],
  }));

  const donutData = createMemo(() => {
    const arr = top();
    const others = (keys() ?? []).slice(10).reduce((s, k) => s + (k.site_pv || 0), 0);
    const colors = [
      "#3b82f6",
      "#22c55e",
      "#eab308",
      "#ef4444",
      "#a855f7",
      "#ec4899",
      "#14b8a6",
      "#f97316",
      "#06b6d4",
      "#8b5cf6",
    ];
    const labels = arr.map((k) => (k.site_key.length > 14 ? `${k.site_key.slice(0, 12)}…` : k.site_key));
    const data = arr.map((k) => k.site_pv || 0);
    if (others > 0) {
      labels.push(t("overview.other"));
      data.push(others);
      colors.push("#52525b");
    }
    return {
      labels,
      datasets: [{ data, backgroundColor: colors, borderWidth: 0 }],
    };
  });

  return (
    <div class="px-6 py-6 lt-md:px-4">
      <Title>{t("overview.title")} · Busuanzi</Title>
      <div class="mb-6">
        <h1 class="text-2xl font-semibold tracking-tight">{t("overview.title")}</h1>
        <p class="text-sm text-muted-foreground">
          {c()?.name} · <code class="font-mono">{c()?.baseUrl}</code>
        </p>
      </div>

      <Show when={!hasToken()}>
        <Card class="mb-6 border-amber-500/30 bg-amber-500/5">
          <CardContent class="py-4 text-sm">
            {t("overview.no_admin_token")}
            <A href="/app/settings" class="ml-2 text-primary underline">
              {t("settings.connections")}
            </A>
          </CardContent>
        </Card>
      </Show>

      <div class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={t("overview.sites")} loading={stats.loading} value={fmt(stats()?.total_sites)} />
        <StatTile label={t("overview.pages")} loading={stats.loading} value={fmt(stats()?.total_pages)} />
        <StatTile
          label={t("overview.total_pv")}
          loading={stats.loading}
          value={fmt(stats()?.total_site_pv)}
        />
        <StatTile
          label={t("overview.total_uv")}
          loading={stats.loading}
          value={fmt(stats()?.total_site_uv)}
        />
      </div>

      <div class="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card class="lg:col-span-2">
          <CardHeader>
            <CardTitle class="text-base">{t("overview.top_sites")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Show when={hasToken() && top().length > 0} fallback={<EmptyChart />}>
              <BarChart
                data={barData()}
                options={{
                  indexAxis: "y" as const,
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (ctx: TooltipItem<"bar">) => `PV: ${(ctx.raw as number).toLocaleString()}`,
                      },
                    },
                  },
                  scales: {
                    x: { grid: { color: "rgba(120,120,120,0.15)" } },
                    y: { grid: { display: false } },
                  },
                }}
                height={280}
              />
            </Show>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle class="text-base">{t("overview.pv_share")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Show when={hasToken() && top().length > 0} fallback={<EmptyChart />}>
              <DonutChart
                data={donutData()}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: "right" as const, labels: { boxWidth: 10, font: { size: 10 } } },
                    tooltip: {
                      callbacks: {
                        label: (ctx: TooltipItem<"doughnut">) =>
                          `${ctx.label}: ${(ctx.raw as number).toLocaleString()} PV`,
                      },
                    },
                  },
                }}
                height={280}
              />
            </Show>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">{t("overview.recent_activity")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Show
            when={!recentLogs.loading}
            fallback={
              <div class="space-y-2">
                <Skeleton class="h-6 w-full" />
                <Skeleton class="h-6 w-full" />
              </div>
            }
          >
            <Show
              when={(recentLogs()?.length ?? 0) > 0}
              fallback={
                <p class="py-4 text-center text-sm text-muted-foreground">{t("overview.no_activity")}</p>
              }
            >
              <ul class="divide-y divide-border">
                <For each={recentLogs() ?? []}>
                  {(l) => (
                    <li class="flex items-center gap-3 py-2 text-sm">
                      <span class="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {l.action}
                      </span>
                      <span class="flex-1 truncate font-mono text-xs text-muted-foreground" title={l.detail}>
                        {l.detail}
                      </span>
                      <span class="tabular-nums text-xs text-muted-foreground">{l.timestamp}</span>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </Show>
        </CardContent>
      </Card>
    </div>
  );
};

const StatTile: Component<{ label: string; value: string; loading: boolean }> = (props) => (
  <Card>
    <CardContent class="px-4 py-4">
      <Show when={!props.loading} fallback={<Skeleton class="h-7 w-16" />}>
        <div class="text-2xl font-semibold text-primary tabular-nums">{props.value}</div>
      </Show>
      <div class="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{props.label}</div>
    </CardContent>
  </Card>
);

const EmptyChart: Component = () => (
  <div class="flex h-[280px] items-center justify-center text-sm text-muted-foreground">—</div>
);

export default Overview;
