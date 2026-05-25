# Busuanzi (不蒜子)

[![Release](https://img.shields.io/github/v/release/AdingApkgg/bsz?style=flat-square)](https://github.com/AdingApkgg/bsz/releases)
[![License](https://img.shields.io/github/license/AdingApkgg/bsz?style=flat-square)](LICENSE)

简洁的网站访客统计服务。后端单一二进制零外部依赖，前端拆成介绍页和管理后台两个独立应用，可分开部署。

![截图](screenshot.avif)

## 结构

```
.
├── backend/                    Rust 后端 — 统计 API + 可选 Admin API
└── frontend/                   bun workspaces
    └── packages/
        ├── shared/             共用 UI 组件 + theme + tailwind preset
        ├── landing/            apex 域（介绍页，纯静态）
        └── admin/              dash 域（管理后台 SPA，可选部署）
```

后端 / landing / admin 三者**完全解耦**：
- **backend**：JSON API，可独立部署
- **landing**：纯介绍页 + 后端文档链接 + 「进入控制台」入口（指向 dash 域）。即便不部署 admin 也能用
- **admin**：管理后台，仅当后端配置了 `ADMIN_TOKEN` 时有意义

## 5 分钟跑通

```bash
# Terminal 1 — backend
cd backend && ADMIN_TOKEN=test-token cargo run

# Terminal 2 — landing
cd frontend && bun install
bun run dev:landing        # http://localhost:12702

# Terminal 3 — admin
bun run dev:admin          # http://localhost:12705
```

## Admin 控制流

后端默认**不**挂载 `/api/admin/*`。要启用管理后台：

1. 在 `backend/.env`（或环境变量）里设置一个非空的 `ADMIN_TOKEN`
2. 重启后端 — 日志显示 `Admin API mounted at /api/admin/*`
3. 在 admin 前端的欢迎页填入后端 URL + 同一份 token

token 为空时，整个 `/api/admin/*` 路由不存在（404，不是 401）。

## 域名建议：apex + dash

典型的两域部署：

| 域名 | 内容 | 部署到 |
|---|---|---|
| `bsz.example.com` (apex) | landing | GitHub Pages / Cloudflare Pages |
| `dash.bsz.example.com` (dash) | admin | GitHub Pages / Cloudflare Pages |
| `api.bsz.example.com` 或 `bsz.example.com/api` | backend | VPS + nginx |

构建命令：

```bash
# landing → apex
VITE_ADMIN_URL=https://dash.bsz.example.com \
  bun run build:landing
# 产物在 frontend/packages/landing/dist/

# admin → dash
VITE_API_BASE_URL=https://bsz.example.com \
  bun run build:admin
# 产物在 frontend/packages/admin/dist/
```

只部署 landing（不要 admin）也完全 OK — admin 是可选的。

详见：
- [后端文档](backend/README.md) — 配置、systemd、API 契约、nginx
- [Landing 文档](frontend/packages/landing/README.md) — apex 部署
- [Admin 文档](frontend/packages/admin/README.md) — dash 部署、连接管理

## License

MIT
