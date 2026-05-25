import { Show } from "solid-js";
import { Title } from "@solidjs/meta";
import { adminToken } from "~/lib/auth";
import { API_BASE_URL } from "~/lib/config";
import Login from "~/components/admin/Login";
import Dashboard from "~/components/admin/Dashboard";

export default function AdminPage() {
  return (
    <>
      <Title>Busuanzi Admin</Title>
      <Show when={API_BASE_URL} fallback={<MisconfiguredNotice />}>
        <Show when={adminToken()} fallback={<Login />}>
          <Dashboard />
        </Show>
      </Show>
    </>
  );
}

function MisconfiguredNotice() {
  return (
    <main class="mx-auto max-w-md px-6 py-24">
      <h1 class="mb-2 text-xl font-semibold">未配置后端</h1>
      <p class="text-sm text-muted-foreground">
        构建前端时需要把 <code class="rounded bg-muted px-1.5 py-0.5">VITE_API_BASE_URL</code> 设为你的 busuanzi
        后端地址，例如 <code class="rounded bg-muted px-1.5 py-0.5">https://bsz.example.com</code>。重新构建并部署即可。
      </p>
    </main>
  );
}
