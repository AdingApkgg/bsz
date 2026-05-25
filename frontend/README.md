# Busuanzi Frontend

[SolidStart](https://start.solidjs.com/) + [solid-ui](https://solid-ui.com/) 风格的默认前端，纯静态产物，可部署到任意静态托管。

包含两个路由：

- `/` — 项目介绍 + 实时统计示例
- `/admin` — 管理面板（要求后端已启用 `ADMIN_TOKEN`）

## 开发

```bash
bun install
VITE_API_BASE_URL=http://localhost:8080 bun run dev
# → http://localhost:3000
```

## 构建

```bash
VITE_API_BASE_URL=https://bsz.example.com bun run build
# 产物：.output/public/
```

构建脚本会额外生成：

- `404.html` — GitHub Pages SPA 路由 fallback
- `admin/index.html` — `/admin` 直链可用
- `_redirects` — Cloudflare Pages / Netlify SPA 路由
- `.nojekyll` — 让 GH Pages 输出 `_build/` 静态资源

## 部署：GitHub Pages

把 `.output/public/` 推送到 `gh-pages` 分支即可。下面是个 GitHub Actions 模板：

```yaml
# .github/workflows/frontend-pages.yml
name: Deploy frontend

on:
  push:
    branches: [main]
    paths: ['frontend/**']
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2

      - name: Build
        working-directory: frontend
        env:
          VITE_API_BASE_URL: ${{ vars.VITE_API_BASE_URL }}
        run: |
          bun install
          bun run build

      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: frontend/.output/public
      - id: deployment
        uses: actions/deploy-pages@v4
```

在仓库 **Settings → Secrets and variables → Actions → Variables** 里加 `VITE_API_BASE_URL = https://your-backend.example.com`。

> ⚠️ 若部署到 `<user>.github.io/<repo>` 这种子路径，请在 [app.config.ts](app.config.ts) 加 `baseURL`：
> ```ts
> defineConfig({ server: { baseURL: "/bsz" } })
> ```

## 部署：Cloudflare Pages

控制台配置（或 `wrangler pages deploy`）：

| 项 | 值 |
|---|---|
| Framework preset | `None` |
| Build command | `bun install && bun run build` |
| Build output directory | `frontend/.output/public` |
| Root directory | `frontend` 或仓库根（取决于 monorepo 配置）|
| 环境变量 | `VITE_API_BASE_URL = https://your-backend.example.com` |

`_redirects` 已经由构建脚本生成 — 不用额外配置 SPA 路由。

## 部署：自托管

直接把 `.output/public/` 整个目录扔到任何静态服务器（nginx, caddy, busybox httpd…）。一些注意事项：

- 服务器必须给 `/admin` 这种客户端路由也返回 `index.html`（404 fallback 或 SPA 重写）
- 跨域请求会从浏览器发到 `VITE_API_BASE_URL`，后端的 CORS 已经允许 mirror_request，所以正常工作

## 后端连接配置

仅一个环境变量：

| 变量 | 说明 |
|---|---|
| `VITE_API_BASE_URL` | 后端绝对地址（含 `https://`，无尾斜杠）|

未设置时：
- 着陆页 `/` 显示提示，不会发起请求
- 管理页 `/admin` 显示"未配置后端"提示

## 与后端的契约

前端只读 `/api/admin/*` JSON 响应。所有交互（authentication, list, edit, delete, import, sync SSE）都通过：

- `Authorization: Bearer <token>` header
- SSE 端点 fallback 到 `?token=<token>` query（`EventSource` 无法设置 header）

详见 [src/lib/api.ts](src/lib/api.ts)。

## 自定义

- 改主题色：编辑 [src/app.css](src/app.css) 的 CSS 变量（`--primary` 等 HSL 值）
- 改组件：[src/components/ui/](src/components/ui) 下是 shadcn 风格的最小组件，可随便改
- 加路由：往 [src/routes/](src/routes) 加 `.tsx` 文件，SolidStart 自动注册

## 技术栈

- [SolidStart](https://start.solidjs.com/) 1.x — Solid 的 SSR/SSG meta-framework
- [Solid](https://www.solidjs.com/) 1.9+ — 细粒度响应式 UI
- [solid-ui](https://solid-ui.com/) 风格组件 — class-variance-authority + tailwind-merge
- [Tailwind CSS](https://tailwindcss.com/) 3
- [Vinxi](https://vinxi.vercel.app/) — SolidStart 构建器
