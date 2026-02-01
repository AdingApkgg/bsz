# Busuanzi (不蒜子)

简洁的网站访客统计服务。单一二进制，零外部依赖。

## 特性

- **零外部依赖** - 单一二进制，内置 SQLite，无需 Redis/外部数据库
- **高性能** - 内存存储 + DashMap 并发安全
- **SQLite 持久化** - 内置数据库，支持事务，数据安全可靠
- **完整管理后台** - 查看/编辑/删除/导入/导出数据
- **Sitemap 同步** - 从 busuanzi.ibruce.info 迁移数据
- **兼容原版** - 支持 site_pv、site_uv、page_pv

## 编译运行

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
- API 文档: http://localhost:8080/
- 管理后台: http://localhost:8080/admin

## 配置

复制 `.env.example` 为 `.env` 并修改：

```bash
cp .env.example .env
```

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `WEB_ADDRESS` | 监听地址 | `0.0.0.0:8080` |
| `WEB_CORS` | CORS 允许域 | `*` |
| `BSZ_SECRET` | 签名密钥 | `bsz` |
| `BSZ_ENCRYPT` | Hash 算法 | `MD516` |
| `BSZ_PATH_STYLE` | 路径模式 | `true` |
| `ADMIN_TOKEN` | 管理密码 | _(空则禁用)_ |
| `SAVE_INTERVAL` | 保存间隔(秒) | `30` |

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

## Nginx 反向代理

参考 `nginx.conf.example` 配置 HTTP/3 + HTTP/2 + HSTS + SSL。

## 目录结构

```
.
├── src/               # Rust 源码
│   ├── api/           # API 处理器
│   ├── core/          # 计数逻辑
│   ├── middleware/    # 中间件
│   └── main.rs        # 入口
├── static/            # 嵌入的静态文件
├── nginx.conf.example # Nginx 配置示例
└── data.db            # SQLite 数据库 (运行时生成)
```

## License

MIT
