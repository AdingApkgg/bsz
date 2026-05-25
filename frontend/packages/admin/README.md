# @bsz/admin

Busuanzi 管理后台 SPA — 设计上挂在 dash 子域（如 `dash.bsz.example.com`）。

只在后端配置了 `ADMIN_TOKEN` 时才有意义；空 token 时后端不挂载 `/api/admin/*`，前端会显示「未配置」提示。

## 路由

- `/welcome` — 首次添加后端连接
- `/app/overview` — 总览（统计卡 + Top sites 柱状图 + PV 分布环形图 + 最近活动）
- `/app/sites` — 站点列表（搜索/排序/分页/批量删除）
- `/app/sites/:siteKey` — 站点详情（内联编辑 PV/UV + 页面表 + 危险区）
- `/app/logs` — 活动日志
- `/app/settings` — 连接管理 + 外观 + 数据工具（import / export / sitemap 同步）

⌘K 命令面板覆盖所有导航 + 主题/语言切换 + 数据导出。

## 环境变量

| 变量 | 必需 | 作用 |
|---|---|---|
| `VITE_API_BASE_URL` | 否 | 预填欢迎页的「后端 URL」字段。用户也可在 UI 里手动填或换 |

不设置 `VITE_API_BASE_URL` 也行 — 用户进入 `/welcome` 时手动填后端地址即可。

## 开发

```bash
bun run dev          # http://localhost:12705
```

后端默认 `http://localhost:12700`，需要先在后端设 `ADMIN_TOKEN` 并启动。

## 构建

```bash
VITE_API_BASE_URL=https://bsz.example.com bun run build
# → dist/
```

`dist/` 含 SPA 兜底：`404.html`、`_redirects`、`.nojekyll`。

## 部署到 dash 子域

### GitHub Pages

```yaml
name: Deploy admin
on:
  push:
    branches: [main]
    paths:
      - "frontend/packages/admin/**"
      - "frontend/packages/shared/**"
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions: { contents: read, pages: write, id-token: write }
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
        working-directory: frontend
      - run: bun run build:admin
        working-directory: frontend
        env:
          VITE_API_BASE_URL: ${{ vars.API_BASE_URL }}
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with: { path: frontend/packages/admin/dist }
      - uses: actions/deploy-pages@v4
```

仓库 Settings → Variables → 加 `API_BASE_URL=https://bsz.example.com`。

⚠️ GitHub Pages 子域 (CNAME) 要在 Settings → Pages → Custom domain 填 `dash.bsz.example.com`，DNS 加 CNAME 指向 `<user>.github.io`。

### Cloudflare Pages

Build command：`cd frontend && bun install && bun run build:admin`
Output directory：`frontend/packages/admin/dist`
环境变量：`VITE_API_BASE_URL=https://bsz.example.com`

CF Pages → 项目 → Custom domains 加 `dash.bsz.example.com`。

### nginx (自托管)

```nginx
server {
  server_name dash.bsz.example.com;
  root /var/www/admin;
  index index.html;
  location / {
    # SPA fallback — 所有未命中文件的请求都返回 index.html
    try_files $uri $uri/ /index.html;
  }
}
```

## 与后端的契约

- `Authorization: Bearer <token>` header 做鉴权
- SSE 端点（sitemap 同步）回退到 `?token=<token>` query（`EventSource` 无法设 header）

详见 [src/lib/api.ts](src/lib/api.ts)。

## 共享代码

UI 组件 (`Button` / `Card` / `Dialog` / `Table` / `DropdownMenu` / ...) 全部来自 `@bsz/shared`：

```tsx
import { Button } from "@bsz/shared/components/ui/button";
import { cn } from "@bsz/shared/lib/utils";
import { theme, setTheme } from "@bsz/shared/lib/theme";
```

加新 solid-ui 组件：

```bash
cd ../shared && bun install-ui.ts <component>
```

(运行时依赖会自动安装到 admin。)

## 技术栈

- [Solid](https://www.solidjs.com/) 1.9 + [@solidjs/router](https://docs.solidjs.com/solid-router) 0.15
- [Vite](https://vitejs.dev/) 5 + vite-plugin-solid
- [solid-ui](https://www.solid-ui.com/) 组件（来自 `@bsz/shared`）
- [@kobalte/core](https://kobalte.dev/) 无障碍原语
- [cmdk-solid](https://github.com/marketplace) ⌘K 面板
- [chart.js](https://www.chartjs.org/) 图表
- [solid-sonner](https://github.com/wobsoriano/solid-sonner) 通知
- [@solid-primitives/i18n](https://primitives.solidjs.community/package/i18n) i18n
- [Biome](https://biomejs.dev/) lint + format
