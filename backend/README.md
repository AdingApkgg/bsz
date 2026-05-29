# Busuanzi Backend

Rust 后端，提供：

- 公开统计 API（`POST /api`, `GET /api`, `PUT /api`, `GET /ping`）
- 可选 Admin API（`/api/admin/*`），仅当 `ADMIN_TOKEN` 非空时挂载

## 快速开始

```bash
# 编译运行
cargo run

# 仅启用统计 API（默认）
PORT=12700 ./target/release/busuanzi-rs

# 启用 admin API
ADMIN_TOKEN=$(openssl rand -hex 16) cargo run
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 监听端口 | `12700` |
| `ADMIN_TOKEN` | 非空时挂载 `/api/admin/*` 并作为 Bearer 校验 | _（空 → admin 不挂载）_ |
| `SAVE_INTERVAL` | 持久化间隔（秒） | `30` |
| `MAX_BODY_SIZE` | 上传体积上限 | `100MB` |

环境变量也可以放进 `.env`：

```bash
cp example/.env .env
```

## ADMIN_TOKEN 行为

| `ADMIN_TOKEN` 值 | 行为 |
|---|---|
| 未设置 / 空字符串 | `/api/admin/*` 路由不挂载，请求得到 404 |
| 任意非空字符串 | `/api/admin/*` 挂载；调用需 `Authorization: Bearer <token>` |

不再有"未配置 token 时允许访问"的开发模式 — 想要 admin 就设 token，不想要就别设。

## 公开 API

```bash
# 计一次并返回数据
curl -X POST http://localhost:12700/api \
  -H "x-bsz-referer: https://example.com/page" \
  -c cookies.txt -b cookies.txt

# 仅查询，不计数
curl http://localhost:12700/api -H "x-bsz-referer: https://example.com/page"

# 仅上报，不返回
curl -X PUT http://localhost:12700/api -H "x-bsz-referer: https://example.com/page"

# 健康检查
curl http://localhost:12700/ping
```

响应格式：

```json
{ "success": true, "data": { "site_pv": 1234, "site_uv": 567, "page_pv": 89 } }
```

## Admin API

所有 admin 端点都在 `/api/admin/` 前缀下，需要 `Authorization: Bearer <ADMIN_TOKEN>`。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/admin/stats` | 总览统计 |
| GET | `/api/admin/keys?count=N` | 列出站点 |
| POST | `/api/admin/keys/update` | 编辑 PV/UV |
| POST | `/api/admin/keys/rename` | 重命名站点 |
| POST | `/api/admin/keys/merge` | 合并站点 |
| DELETE | `/api/admin/keys?site_key=...` | 删除站点 |
| POST | `/api/admin/keys/batch-delete` | 批量删除站点 |
| GET | `/api/admin/pages?site_key=...&count=N` | 列出页面 |
| POST | `/api/admin/pages/update` | 编辑页面 PV |
| POST | `/api/admin/pages/batch-delete` | 批量删除页面 |
| GET | `/api/admin/logs?page=N&size=M` | 操作日志 |
| GET | `/api/admin/export?token=...` | 下载 `data.db`（SSE 友好的 query 鉴权） |
| POST | `/api/admin/import` | 上传 `data.db` 替换 |
| GET | `/api/admin/sync?sitemap_url=...&token=...` | SSE：从 sitemap 同步老 busuanzi 数据 |
| POST | `/api/admin/sync/upload` | 上传 sitemap XML（搭配 `/sync?sync_id=...`） |

防爆破：连续失败 5 次的 IP 锁定 5 分钟（在中间件层，`backend/src/middleware/admin_auth.rs`）。

## CORS

后端开启了请求来源镜像 + 凭据，允许前端跨域调用。允许的 headers：`Content-Type`、`Authorization`、`X-Admin-Token`、`x-bsz-referer`。

## 部署

### systemd

```bash
sudo mkdir -p /opt/bsz
sudo cp target/release/busuanzi-rs /opt/bsz/
sudo cp example/.env /opt/bsz/.env       # 编辑后填入 ADMIN_TOKEN
sudo cp example/bsz.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now bsz
```

### Nginx

两份示例，按部署拓扑选一份（都带 HTTP/3 + HTTP/2 + HSTS + SSL，且为 `/api/admin/sync` SSE 端点关闭了 buffer）：

| 文件 | 拓扑 |
|---|---|
| [`example/nginx.conf`](example/nginx.conf) | **仅反代 API** — 前端单独部署在 GitHub/Cloudflare Pages，nginx 只转发后端，跨域由 axum CORS 处理 |
| [`example/nginx-all-in-one.conf`](example/nginx-all-in-one.conf) | **单域名一体化** — 同一域名下 `/` 出 landing、`/api` 走后端、`/dash` 出 admin，全在一台 VPS 上 |

## 数据持久化

SQLite 数据库 `data.db`（启动时从工作目录加载）：

- 每 `SAVE_INTERVAL` 秒自动保存
- SIGINT/SIGTERM 时也会保存
- 备份：拷贝 `data.db` 即可

## 从旧版 busuanzi 迁移

启用 admin 后，在前端的 "导入 → Sitemap 同步" 里粘贴你的 sitemap URL，会自动从 busuanzi.ibruce.info 拉取历史数据（增量合并不覆盖）。
