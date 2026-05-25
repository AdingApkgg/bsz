# Busuanzi (不蒜子)

[![Release](https://img.shields.io/github/v/release/AdingApkgg/bsz?style=flat-square)](https://github.com/AdingApkgg/bsz/releases)
[![License](https://img.shields.io/github/license/AdingApkgg/bsz?style=flat-square)](LICENSE)

简洁的网站访客统计服务。后端单一二进制零外部依赖，前端独立部署至任意静态托管。

![截图](screenshot.avif)

## 结构

仓库为 monorepo：

```
.
├── backend/    Rust 后端 — 公开统计 API + 可选 Admin API（详见 backend/README.md）
└── frontend/   SolidStart + solid-ui — 默认前端，可部署到 GitHub Pages、Cloudflare Pages 等
```

后端和前端**完全解耦**：后端只提供 JSON API，前端是一份纯静态资源，用户可自行选择是否部署。

## 5 分钟跑通

```bash
# 1. 启动后端（无 admin，仅统计 API）
cd backend && cargo run

# 2. 启动前端（开发模式）
cd ../frontend && VITE_API_BASE_URL=http://localhost:12700 bun run dev
```

访问：
- 前端：http://localhost:12705
- 后端 API：http://localhost:12700/api

## Admin 控制流

后端默认**不**挂载 `/api/admin/*`。要启用管理后台：

1. 在 `backend/.env`（或环境变量）里设置一个非空的 `ADMIN_TOKEN`
2. 重启后端 — 日志会显示 `Admin API mounted at /api/admin/*`
3. 用同一份 token 登录前端的 `/admin` 页面

token 为空时，整个 `/api/admin/*` 路由不存在（不是返回 401，而是真实的 404）。

## 部署模式

- **单机一体化**：后端 + 前端跑在同一台机器，nginx 反代两者（参考 [backend/example/nginx.conf](backend/example/nginx.conf)）
- **前后端分离**：后端跑在 VPS，前端构建后丢到 GitHub Pages / Cloudflare Pages，用 `VITE_API_BASE_URL` 指向后端

详细见各子目录的 README：
- [后端文档](backend/README.md) — 配置、systemd、API 契约
- [前端文档](frontend/README.md) — GH Pages / CF Pages 部署、自定义

## License

MIT
