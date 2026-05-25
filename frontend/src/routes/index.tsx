import { createSignal, onMount, Show } from "solid-js";
import { Title } from "@solidjs/meta";
import { A } from "@solidjs/router";
import { API_BASE_URL } from "~/lib/config";
import { publicUrl } from "~/lib/api";
import { Card, CardContent } from "~/components/ui/card";

type Stats = { site_pv: number; site_uv: number; page_pv: number };

export default function Index() {
  const [stats, setStats] = createSignal<Stats | null>(null);
  const [error, setError] = createSignal<string | null>(null);

  onMount(async () => {
    if (!API_BASE_URL) {
      setError("VITE_API_BASE_URL 未配置 — 设置后部署即可显示实时数据。");
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api`, {
        method: "POST",
        credentials: "include",
        headers: { "x-bsz-referer": location.href },
      });
      const body = await res.json();
      if (body.success) setStats(body.data);
    } catch {
      setError("无法连接后端。请检查 VITE_API_BASE_URL 与 CORS 设置。");
    }
  });

  const fmt = (n: number | undefined) => (n == null ? "-" : n.toLocaleString());
  // Snippet shows the raw backend URL (already includes protocol when configured).
  const apiUrl = () => (API_BASE_URL ? `${API_BASE_URL}/api` : "https://your-backend.example.com/api");

  return (
    <main class="container mx-auto max-w-3xl px-6 py-12">
      <Title>不蒜子.rs — 极简网页计数器</Title>
      <header class="mb-8">
        <h1 class="text-3xl font-semibold">不蒜子.rs</h1>
        <p class="mt-1 text-muted-foreground">简洁的网站访客统计服务 · Rust 高性能实现</p>
      </header>

      <section class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label="实时统计">
        <StatTile label="站点访问 (PV)" value={fmt(stats()?.site_pv)} />
        <StatTile label="站点访客 (UV)" value={fmt(stats()?.site_uv)} />
        <StatTile label="本页访问" value={fmt(stats()?.page_pv)} />
      </section>

      <Show when={error()}>
        <Card class="mb-6 border-l-4 border-l-primary">
          <CardContent class="py-3 text-sm text-muted-foreground">{error()}</CardContent>
        </Card>
      </Show>

      <Card class="mb-6">
        <CardContent class="p-6">
          <h2 class="mb-3 text-lg font-semibold">特性</h2>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {["零外部依赖", "单一二进制", "SQLite 持久化", "内存级性能", "兼容原版", "完整后台"].map((f) => (
              <div class="rounded-md border border-primary/15 bg-primary/5 px-3 py-2 text-center text-xs">{f}</div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card class="mb-6">
        <CardContent class="p-6">
          <h2 class="mb-3 text-lg font-semibold">API 接口</h2>
          <div class="space-y-1.5 text-sm">
            <ApiRow method="POST" path="/api" desc="统计并返回 PV/UV" />
            <ApiRow method="GET" path="/api" desc="仅获取 PV/UV（不计数）" />
            <ApiRow method="PUT" path="/api" desc="仅提交统计（不返回）" />
            <ApiRow method="GET" path="/ping" desc="健康检查" />
          </div>
          <div class="mt-4 border-l-2 border-l-primary bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
            <strong class="text-foreground">请求头：</strong>
            <code class="ml-1 rounded bg-primary/10 px-1.5 py-0.5">x-bsz-referer</code> 为当前页 URL。
            <br />
            <strong class="text-foreground">访客识别：</strong>Cookie <code class="ml-1 rounded bg-primary/10 px-1.5 py-0.5">busuanziId</code>。
          </div>
        </CardContent>
      </Card>

      <Card class="mb-6">
        <CardContent class="p-6">
          <h2 class="mb-3 text-lg font-semibold">完整示例</h2>
          <p class="mb-3 text-sm text-muted-foreground">复制到 HTML 页面，把 URL 改成你的后端：</p>
          <pre class="overflow-x-auto rounded-md border border-border bg-background p-3 text-xs leading-relaxed">
{`<p>本站总访问 <span id="pv">-</span> 次，访客 <span id="uv">-</span> 人</p>
<script>
fetch('${apiUrl()}', {
  method: 'POST',
  credentials: 'include',
  headers: { 'x-bsz-referer': location.href },
})
  .then(r => r.json())
  .then(({ success, data }) => {
    if (!success) return;
    pv.textContent = data.site_pv;
    uv.textContent = data.site_uv;
  });
</script>`}
          </pre>
        </CardContent>
      </Card>

      <footer class="mt-10 text-center text-sm text-muted-foreground">
        <nav class="space-x-2">
          <a class="text-primary hover:underline" href="https://github.com/AdingApkgg/bsz" rel="noopener">
            GitHub
          </a>
          <span>·</span>
          <A href="/admin" class="text-primary hover:underline">管理面板</A>
          <Show when={API_BASE_URL}>
            <span>·</span>
            <a class="text-primary hover:underline" href={publicUrl("/ping")} target="_blank" rel="noopener">
              /ping
            </a>
          </Show>
        </nav>
        <p class="mt-2">Powered by Rust · Frontend by SolidStart</p>
      </footer>
    </main>
  );
}

function StatTile(props: { label: string; value: string }) {
  return (
    <Card>
      <CardContent class="px-4 py-5 text-center">
        <div class="text-3xl font-semibold text-primary tabular-nums">{props.value}</div>
        <div class="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{props.label}</div>
      </CardContent>
    </Card>
  );
}

function ApiRow(props: { method: "POST" | "GET" | "PUT"; path: string; desc: string }) {
  const colors = {
    POST: "bg-green-500/15 text-green-400",
    GET: "bg-primary/15 text-primary",
    PUT: "bg-amber-500/15 text-amber-400",
  };
  return (
    <div class="flex items-center gap-3 border-b border-border py-2 last:border-0">
      <span class={`inline-block rounded px-2 py-0.5 text-xs font-medium ${colors[props.method]}`}>{props.method}</span>
      <code class="min-w-[60px] font-mono text-xs">{props.path}</code>
      <span class="text-xs text-muted-foreground">{props.desc}</span>
    </div>
  );
}
