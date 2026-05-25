import { createSignal } from "solid-js";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { toast } from "~/components/ui/toast";
import { setToken } from "~/lib/auth";
import { adminUrl } from "~/lib/api";

export default function Login() {
  const [value, setValue] = createSignal("");
  const [busy, setBusy] = createSignal(false);

  async function submit() {
    const tok = value().trim();
    if (!tok) return toast("请输入 Token", "error");
    setBusy(true);
    try {
      const res = await fetch(adminUrl("/stats"), {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (res.status === 401) {
        toast("Token 无效", "error");
      } else if (res.status === 429) {
        const body = await res.json().catch(() => ({}));
        toast(body.message ?? "登录失败次数过多", "error");
      } else if (!res.ok) {
        toast(`登录失败 (${res.status})`, "error");
      } else {
        setToken(tok);
        toast("登录成功", "success");
      }
    } catch {
      toast("无法连接后端", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main class="mx-auto max-w-sm px-6 py-24">
      <Card>
        <CardHeader>
          <CardTitle>管理面板</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <Input
            type="password"
            placeholder="Admin Token"
            value={value()}
            onInput={(e) => setValue(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autofocus
          />
          <Button class="w-full" disabled={busy()} onClick={submit}>
            {busy() ? "登录中…" : "登录"}
          </Button>
          <p class="text-center text-xs text-muted-foreground">
            Token 即后端 <code class="rounded bg-muted px-1 py-0.5">ADMIN_TOKEN</code>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
