# @bsz/landing

介绍页 — 纯静态单页，**不依赖任何后端**。设计上挂在 apex 域名（如 `bsz.example.com`）。落地页有意**不暴露管理后台入口** — admin 是单独的应用，部署到 dash 子域，普通访客不需要看到。

## 内容

- Hero（项目名 + 一句话定位）
- 特性卡片
- API 方法列表 + 注意事项
- HTML 嵌入示例代码
- 右上角：GitHub 链接 + 主题切换 (system / light / dark) + 7 语言（zh / en / ja / ko / es / fr / de）

## 环境变量

无。零环境变量。

## 开发

```bash
bun run dev          # http://localhost:12702
```

## 构建

```bash
bun run build
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
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with: { path: frontend/packages/landing/dist }
      - uses: actions/deploy-pages@v4
```

### Cloudflare Pages

Build command：`cd frontend && bun install && bun run build:landing`
Output directory：`frontend/packages/landing/dist`

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

## 跟 admin 的关系

零耦合。访客知道 admin 在哪里只能靠链接外传 / 你在自己的文档里写 dash 子域。landing 本身不会提及 admin 的存在。
