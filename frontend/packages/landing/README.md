# @bsz/landing

介绍页 — 纯静态单页，**不依赖任何后端**。设计上挂在 apex 域名（如 `bsz.example.com`）。

## 内容

- Hero（项目名 + 一句话定位）
- 特性卡片
- API 方法列表 + 注意事项
- HTML 嵌入示例代码
- 主题切换 (system / light / dark) + 7 语言（zh/en/ja/ko/es/fr/de）
- 「进入控制台」入口（如果 `VITE_ADMIN_URL` 设了）

## 环境变量

| 变量 | 必需 | 作用 |
|---|---|---|
| `VITE_ADMIN_URL` | 否 | 管理后台地址（如 `https://dash.bsz.example.com`）。设了就在 header 和 footer 渲染 CTA；不设则隐藏 |

## 开发

```bash
bun run dev          # http://localhost:12706
```

## 构建

```bash
VITE_ADMIN_URL=https://dash.bsz.example.com bun run build
# → dist/ (~55 kB gzipped)
```

`dist/` 里同时包含 `404.html`、`_redirects`、`.nojekyll`，可直接丢任何静态托管。

## 部署到 apex 域

### GitHub Pages (项目根路径)

仓库设置 → Pages → 自定义域名 `bsz.example.com`，Branch 选 `gh-pages` 或 Actions 发布。最小 workflow：

```yaml
name: Deploy landing
on:
  push:
    branches: [main]
    paths: ["frontend/packages/landing/**", "frontend/packages/shared/**"]
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions: { contents: read, pages: write, id-token: write }
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
        working-directory: frontend
      - run: bun run build:landing
        working-directory: frontend
        env:
          VITE_ADMIN_URL: ${{ vars.ADMIN_URL }}
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with: { path: frontend/packages/landing/dist }
      - uses: actions/deploy-pages@v4
```

仓库 Settings → Secrets and variables → Actions → Variables → 加 `ADMIN_URL=https://dash.example.com`。

### Cloudflare Pages

Build command：`cd frontend && bun install && bun run build:landing`
Output directory：`frontend/packages/landing/dist`
环境变量：`VITE_ADMIN_URL`

### nginx (自托管)

```nginx
server {
  server_name bsz.example.com;
  root /var/www/landing;
  index index.html;
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

## 不部署 admin 也能用

landing 完全不依赖 admin 的存在。不设 `VITE_ADMIN_URL` 时只是隐藏 dashboard 入口；其他 UI 一切照常。
