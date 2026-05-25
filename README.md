# Busuanzi (不蒜子)

[![Release](https://img.shields.io/github/v/release/AdingApkgg/bsz?style=flat-square)](https://github.com/AdingApkgg/bsz/releases)
[![License](https://img.shields.io/github/license/AdingApkgg/bsz?style=flat-square)](LICENSE)

简洁的网站访客统计服务。单一二进制，零外部依赖。

![截图](screenshot.avif)

## 特性

- **零外部依赖** - 单一二进制，内置 SQLite，无需 Redis/外部数据库
- **高性能** - 内存存储 + DashMap 并发安全
- **SQLite 持久化** - 内置数据库，支持事务，数据安全可靠
- **完整管理后台** - 查看/编辑/删除/导入/导出数据
- **Sitemap 同步** - 从 busuanzi.ibruce.info 迁移数据
- **兼容原版** - 支持 site_pv、site_uv、page_pv

## 安装

### 下载预编译版本

从 [Releases](https://github.com/AdingApkgg/bsz/releases) 下载适合你平台的版本：

| 平台 | 文件 |
|------|------|
| Linux x86_64 | `busuanzi-x86_64-unknown-linux-gnu.tar.gz` |
| Linux x86_64 (静态) | `busuanzi-x86_64-unknown-linux-musl.tar.gz` |
| Linux ARM64 | `busuanzi-aarch64-unknown-linux-gnu.tar.gz` |
| Linux ARM64 (静态) | `busuanzi-aarch64-unknown-linux-musl.tar.gz` |
| Linux ARMv7 | `busuanzi-armv7-unknown-linux-gnueabihf.tar.gz` |
| macOS Apple Silicon | `busuanzi-aarch64-apple-darwin.tar.gz` |
| macOS Intel | `busuanzi-x86_64-apple-darwin.tar.gz` |
| Windows x86_64 | `busuanzi-x86_64-pc-windows-msvc.zip` |
| Windows ARM64 | `busuanzi-aarch64-pc-windows-msvc.zip` |

```bash
# Linux/macOS 示例
tar xzf busuanzi-*.tar.gz
./busuanzi-rs
```

### 从源码编译

```bash
# 安装 Rust (如未安装)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 克隆项目
git clone https://github.com/AdingApkgg/bsz.git
cd bsz

# 编译
cargo build --release

# 运行
./target/release/busuanzi-rs
```

访问：
- API 文档: http://localhost:12700/
- 管理后台: http://localhost:12700/admin

## 配置

复制 `example/.env` 为 `.env` 并修改：

```bash
cp example/.env .env
```

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 监听端口 | `8080` |
| `DOMAIN` | 对外域名 | `localhost:PORT` |
| `ADMIN_ENABLED` | 是否注册 `/admin` 与 `/api/admin/*` | `true` |
| `ADMIN_TOKEN` | 管理密码 | _(空则不校验)_ |
| `SAVE_INTERVAL` | 保存间隔(秒) | `30` |
| `MAX_BODY_SIZE` | 上传体积上限 | `100MB` |

## 自定义页面

在运行目录创建 `static/` 文件夹，放入同名文件即可覆盖默认页面：

```
./static/
├── index.html      # 自定义首页
├── admin.html      # 自定义管理面板
├── robots.txt      # 自定义 robots
├── llms.txt        # 自定义 AI 说明
└── sitemap.xml     # 自定义站点地图
```

支持 `{{HOST}}` 占位符，会被替换为配置的 `DOMAIN` 值。

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST /api` | 统计并返回 PV/UV |
| `GET /api` | 仅获取 (不计数) |
| `PUT /api` | 仅提交 (不返回) |
| `GET /ping` | 健康检查 |

### 前端调用示例

```javascript
fetch('https://your-domain.com/api', {
  method: 'POST',
  headers: { 'x-bsz-referer': location.href }
})
.then(res => res.json())
.then(({ data }) => {
  document.getElementById('site_pv').textContent = data.site_pv;
  document.getElementById('site_uv').textContent = data.site_uv;
  document.getElementById('page_pv').textContent = data.page_pv;
});
```

## 管理后台

默认会注册管理后台路由；如需完全关闭管理后台和 Admin API，设置：

```bash
ADMIN_ENABLED=false
```

设置 `ADMIN_TOKEN` 后访问 `/admin`：

- 📊 查看所有站点和页面统计
- ✏️ 编辑 PV/UV 数值
- 🗑️ 删除站点或页面数据
- 📤 导出 JSON 数据
- 📥 导入 JSON 数据
- 🔄 从 Sitemap 同步旧 busuanzi 数据

## 数据持久化

数据自动保存到 `data.db` (SQLite 数据库)：

- 每 30 秒自动保存
- Ctrl+C 退出时自动保存
- 启动时自动加载

备份只需复制 `data.db` 文件。可用任意 SQLite 工具查看/编辑。

## 从旧版迁移

1. 访问管理后台 `/admin`
2. 点击 "同步" 按钮
3. 输入你的 sitemap.xml 地址
4. 等待自动从 busuanzi.ibruce.info 拉取数据

## 部署

### systemd 服务

```bash
# 复制程序
sudo mkdir -p /opt/bsz
sudo cp target/release/busuanzi-rs /opt/bsz/
sudo cp example/.env /opt/bsz/.env

# 安装服务
sudo cp example/bsz.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now bsz

# 查看状态
sudo systemctl status bsz
sudo journalctl -u bsz -f
```

### Nginx 反向代理

参考 `example/nginx.conf` 配置 HTTP/3 + HTTP/2 + HSTS + SSL。

## 目录结构

```
.
├── src/               # Rust 源码
│   ├── api/           # API 处理器
│   ├── core/          # 计数逻辑
│   ├── middleware/    # 中间件
│   └── main.rs        # 入口
├── static/            # 嵌入的静态文件
├── example/           # 部署示例配置
│   ├── .env           # 环境变量示例
│   ├── bsz.service    # systemd 服务配置
│   └── nginx.conf     # Nginx 配置示例
└── data.db            # SQLite 数据库 (运行时生成)
```

## License

MIT
