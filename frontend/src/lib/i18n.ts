import { createSignal } from "solid-js";

export type Locale = "zh" | "en";

const KEY = "bsz.locale";

const dict = {
  // navigation
  "nav.overview": { zh: "总览", en: "Overview" },
  "nav.sites": { zh: "站点", en: "Sites" },
  "nav.logs": { zh: "日志", en: "Logs" },
  "nav.settings": { zh: "设置", en: "Settings" },

  // top bar
  "top.search": { zh: "搜索 / 命令", en: "Search / commands" },
  "top.theme": { zh: "主题", en: "Theme" },
  "top.language": { zh: "语言", en: "Language" },
  "top.no_connection": { zh: "未选择连接", en: "No connection" },
  "top.add_connection": { zh: "添加连接", en: "Add connection" },

  // theme
  "theme.system": { zh: "跟随系统", en: "System" },
  "theme.light": { zh: "亮色", en: "Light" },
  "theme.dark": { zh: "暗色", en: "Dark" },

  // welcome
  "welcome.title": { zh: "Busuanzi", en: "Busuanzi" },
  "welcome.subtitle": {
    zh: "网站访客统计 · 自托管 · 单二进制",
    en: "Self-hosted visitor counter · single binary",
  },
  "welcome.no_conn_title": { zh: "添加第一个后端连接", en: "Add your first backend" },
  "welcome.no_conn_body": {
    zh: "前端纯静态，需要指向你的 busuanzi 后端地址。后端 ADMIN_TOKEN 设了之后才能管理数据。",
    en: "This is a static frontend — it needs to know where your backend is. Backend must have ADMIN_TOKEN set for admin features.",
  },
  "welcome.continue": { zh: "进入控制台", en: "Open dashboard" },

  // overview
  "overview.title": { zh: "总览", en: "Overview" },
  "overview.sites": { zh: "站点", en: "Sites" },
  "overview.pages": { zh: "页面", en: "Pages" },
  "overview.total_pv": { zh: "总 PV", en: "Total PV" },
  "overview.total_uv": { zh: "总 UV", en: "Total UV" },
  "overview.top_sites": { zh: "Top 站点", en: "Top sites" },
  "overview.pv_share": { zh: "PV 分布", en: "PV share" },
  "overview.recent_activity": { zh: "最近活动", en: "Recent activity" },
  "overview.no_activity": { zh: "暂无日志", en: "No activity yet" },

  // sites
  "sites.title": { zh: "站点", en: "Sites" },
  "sites.search_placeholder": { zh: "搜索站点…", en: "Filter sites…" },
  "sites.col_site": { zh: "站点", en: "Site" },
  "sites.col_pv": { zh: "PV", en: "PV" },
  "sites.col_uv": { zh: "UV", en: "UV" },
  "sites.col_pages": { zh: "页面", en: "Pages" },
  "sites.empty": { zh: "暂无数据", en: "No data" },
  "sites.batch_delete": { zh: "批量删除", en: "Batch delete" },
  "sites.selected": { zh: "已选", en: "selected" },

  // site detail
  "site.back": { zh: "返回站点列表", en: "Back to sites" },
  "site.edit_pv": { zh: "编辑 PV", en: "Edit PV" },
  "site.edit_uv": { zh: "编辑 UV", en: "Edit UV" },
  "site.rename": { zh: "重命名", en: "Rename" },
  "site.merge": { zh: "合并到…", en: "Merge into…" },
  "site.delete": { zh: "删除站点", en: "Delete site" },
  "site.pages": { zh: "页面", en: "Pages" },
  "site.danger": { zh: "危险操作", en: "Danger zone" },
  "site.danger_hint": {
    zh: "重命名/合并/删除不可撤销（仅编辑 PV/UV 可 undo）",
    en: "Rename/merge/delete are irreversible (only PV/UV edits support undo)",
  },

  // logs
  "logs.title": { zh: "操作日志", en: "Activity log" },
  "logs.col_time": { zh: "时间", en: "Time" },
  "logs.col_action": { zh: "操作", en: "Action" },
  "logs.col_detail": { zh: "详情", en: "Detail" },
  "logs.col_ip": { zh: "IP", en: "IP" },
  "logs.empty": { zh: "暂无日志", en: "No logs" },
  "logs.filter_action": { zh: "全部操作", en: "All actions" },

  // settings
  "settings.title": { zh: "设置", en: "Settings" },
  "settings.connections": { zh: "连接", en: "Connections" },
  "settings.appearance": { zh: "外观", en: "Appearance" },
  "settings.data": { zh: "数据", en: "Data" },
  "settings.add": { zh: "新增", en: "Add" },
  "settings.import_db": { zh: "导入 data.db", en: "Import data.db" },
  "settings.export_db": { zh: "导出 data.db", en: "Export data.db" },
  "settings.sitemap_sync": { zh: "Sitemap 同步", en: "Sitemap sync" },

  // connection form
  "conn.name": { zh: "名称", en: "Name" },
  "conn.base_url": { zh: "后端 URL", en: "Backend URL" },
  "conn.token": { zh: "Admin Token", en: "Admin token" },
  "conn.token_optional": { zh: "（可选，用于 admin API）", en: "(optional, for admin API)" },
  "conn.test": { zh: "测试", en: "Test" },
  "conn.verify_token": { zh: "验证 token", en: "Verify token" },
  "conn.delete": { zh: "删除连接", en: "Delete" },
  "conn.activate": { zh: "切换到此连接", en: "Use this" },
  "conn.active": { zh: "当前", en: "active" },
  "conn.save": { zh: "保存", en: "Save" },
  "conn.cancel": { zh: "取消", en: "Cancel" },

  // common
  "common.save": { zh: "保存", en: "Save" },
  "common.cancel": { zh: "取消", en: "Cancel" },
  "common.delete": { zh: "删除", en: "Delete" },
  "common.confirm": { zh: "确认", en: "Confirm" },
  "common.loading": { zh: "加载中…", en: "Loading…" },
  "common.error": { zh: "出错了", en: "Error" },
  "common.success": { zh: "成功", en: "Success" },
  "common.undo": { zh: "撤销", en: "Undo" },
  "common.search": { zh: "搜索", en: "Search" },
  "common.prev": { zh: "上一页", en: "Prev" },
  "common.next": { zh: "下一页", en: "Next" },
  "common.refresh": { zh: "刷新", en: "Refresh" },

  // command palette
  "cmd.title": { zh: "命令", en: "Commands" },
  "cmd.placeholder": { zh: "输入命令或搜索站点…", en: "Type a command or search sites…" },
  "cmd.no_results": { zh: "无匹配", en: "No matches" },
  "cmd.go_overview": { zh: "前往总览", en: "Go to overview" },
  "cmd.go_sites": { zh: "前往站点列表", en: "Go to sites" },
  "cmd.go_logs": { zh: "前往日志", en: "Go to logs" },
  "cmd.go_settings": { zh: "前往设置", en: "Go to settings" },
  "cmd.toggle_theme": { zh: "切换主题", en: "Toggle theme" },
  "cmd.toggle_lang": { zh: "切换语言", en: "Toggle language" },
  "cmd.export": { zh: "导出 data.db", en: "Export data.db" },
} as const;

export type DictKey = keyof typeof dict;

function read(): Locale {
  if (typeof localStorage === "undefined") return "zh";
  const v = localStorage.getItem(KEY);
  return v === "en" || v === "zh" ? v : "zh";
}

const [locale, setLocaleSignal] = createSignal<Locale>(read());

export { locale };

export function setLocale(l: Locale) {
  setLocaleSignal(l);
  if (typeof localStorage !== "undefined") localStorage.setItem(KEY, l);
  if (typeof document !== "undefined") document.documentElement.lang = l === "zh" ? "zh-CN" : "en";
}

export function t(key: DictKey): string {
  return dict[key][locale()];
}

export function toggleLocale() {
  setLocale(locale() === "zh" ? "en" : "zh");
}
