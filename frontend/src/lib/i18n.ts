import { createSignal } from "solid-js";

export type Locale = "zh" | "en" | "ja";

const KEY = "bsz.locale";

const dict = {
  // navigation
  "nav.overview": { zh: "总览", en: "Overview", ja: "概要" },
  "nav.sites": { zh: "站点", en: "Sites", ja: "サイト" },
  "nav.logs": { zh: "日志", en: "Logs", ja: "ログ" },
  "nav.settings": { zh: "设置", en: "Settings", ja: "設定" },

  // top bar
  "top.search": { zh: "搜索 / 命令", en: "Search / commands", ja: "検索・コマンド" },
  "top.theme": { zh: "主题", en: "Theme", ja: "テーマ" },
  "top.language": { zh: "语言", en: "Language", ja: "言語" },
  "top.no_connection": { zh: "未选择连接", en: "No connection", ja: "接続なし" },
  "top.add_connection": { zh: "添加连接", en: "Add connection", ja: "接続を追加" },

  // theme
  "theme.system": { zh: "跟随系统", en: "System", ja: "システム" },
  "theme.light": { zh: "亮色", en: "Light", ja: "ライト" },
  "theme.dark": { zh: "暗色", en: "Dark", ja: "ダーク" },

  // welcome
  "welcome.title": { zh: "Busuanzi", en: "Busuanzi", ja: "Busuanzi" },
  "welcome.subtitle": {
    zh: "网站访客统计 · 自托管 · 单二进制",
    en: "Self-hosted visitor counter · single binary",
    ja: "セルフホスト型訪問カウンター・シングルバイナリ",
  },
  "welcome.no_conn_title": {
    zh: "添加第一个后端连接",
    en: "Add your first backend",
    ja: "最初のバックエンド接続を追加",
  },
  "welcome.no_conn_body": {
    zh: "前端纯静态，需要指向你的 busuanzi 后端地址。后端 ADMIN_TOKEN 设了之后才能管理数据。",
    en: "This is a static frontend — it needs to know where your backend is. Backend must have ADMIN_TOKEN set for admin features.",
    ja: "これは静的フロントエンドです — バックエンドのURLを指定する必要があります。管理機能にはバックエンドで ADMIN_TOKEN を設定してください。",
  },
  "welcome.continue": { zh: "进入控制台", en: "Open dashboard", ja: "ダッシュボードを開く" },

  // overview
  "overview.title": { zh: "总览", en: "Overview", ja: "概要" },
  "overview.sites": { zh: "站点", en: "Sites", ja: "サイト" },
  "overview.pages": { zh: "页面", en: "Pages", ja: "ページ" },
  "overview.total_pv": { zh: "总 PV", en: "Total PV", ja: "合計 PV" },
  "overview.total_uv": { zh: "总 UV", en: "Total UV", ja: "合計 UV" },
  "overview.top_sites": { zh: "Top 站点", en: "Top sites", ja: "トップサイト" },
  "overview.pv_share": { zh: "PV 分布", en: "PV share", ja: "PV シェア" },
  "overview.recent_activity": { zh: "最近活动", en: "Recent activity", ja: "最近のアクティビティ" },
  "overview.no_activity": { zh: "暂无日志", en: "No activity yet", ja: "アクティビティがありません" },

  // sites
  "sites.title": { zh: "站点", en: "Sites", ja: "サイト" },
  "sites.search_placeholder": { zh: "搜索站点…", en: "Filter sites…", ja: "サイトをフィルタ…" },
  "sites.col_site": { zh: "站点", en: "Site", ja: "サイト" },
  "sites.col_pv": { zh: "PV", en: "PV", ja: "PV" },
  "sites.col_uv": { zh: "UV", en: "UV", ja: "UV" },
  "sites.col_pages": { zh: "页面", en: "Pages", ja: "ページ" },
  "sites.empty": { zh: "暂无数据", en: "No data", ja: "データがありません" },
  "sites.batch_delete": { zh: "批量删除", en: "Batch delete", ja: "一括削除" },
  "sites.selected": { zh: "已选", en: "selected", ja: "選択中" },

  // site detail
  "site.back": { zh: "返回站点列表", en: "Back to sites", ja: "サイト一覧に戻る" },
  "site.edit_pv": { zh: "编辑 PV", en: "Edit PV", ja: "PV を編集" },
  "site.edit_uv": { zh: "编辑 UV", en: "Edit UV", ja: "UV を編集" },
  "site.rename": { zh: "重命名", en: "Rename", ja: "名前を変更" },
  "site.merge": { zh: "合并到…", en: "Merge into…", ja: "マージ先…" },
  "site.delete": { zh: "删除站点", en: "Delete site", ja: "サイトを削除" },
  "site.pages": { zh: "页面", en: "Pages", ja: "ページ" },
  "site.danger": { zh: "危险操作", en: "Danger zone", ja: "危険な操作" },
  "site.danger_hint": {
    zh: "重命名/合并/删除不可撤销（仅编辑 PV/UV 可 undo）",
    en: "Rename/merge/delete are irreversible (only PV/UV edits support undo)",
    ja: "名前変更・マージ・削除は元に戻せません（PV/UV 編集のみ undo 可）",
  },

  // logs
  "logs.title": { zh: "操作日志", en: "Activity log", ja: "アクティビティログ" },
  "logs.col_time": { zh: "时间", en: "Time", ja: "時刻" },
  "logs.col_action": { zh: "操作", en: "Action", ja: "操作" },
  "logs.col_detail": { zh: "详情", en: "Detail", ja: "詳細" },
  "logs.col_ip": { zh: "IP", en: "IP", ja: "IP" },
  "logs.empty": { zh: "暂无日志", en: "No logs", ja: "ログがありません" },
  "logs.filter_action": { zh: "全部操作", en: "All actions", ja: "すべての操作" },

  // settings
  "settings.title": { zh: "设置", en: "Settings", ja: "設定" },
  "settings.connections": { zh: "连接", en: "Connections", ja: "接続" },
  "settings.appearance": { zh: "外观", en: "Appearance", ja: "外観" },
  "settings.data": { zh: "数据", en: "Data", ja: "データ" },
  "settings.add": { zh: "新增", en: "Add", ja: "追加" },
  "settings.import_db": { zh: "导入 data.db", en: "Import data.db", ja: "data.db をインポート" },
  "settings.export_db": { zh: "导出 data.db", en: "Export data.db", ja: "data.db をエクスポート" },
  "settings.sitemap_sync": { zh: "Sitemap 同步", en: "Sitemap sync", ja: "サイトマップ同期" },

  // connection form
  "conn.name": { zh: "名称", en: "Name", ja: "名前" },
  "conn.base_url": { zh: "后端 URL", en: "Backend URL", ja: "バックエンド URL" },
  "conn.token": { zh: "Admin Token", en: "Admin token", ja: "管理トークン" },
  "conn.token_optional": {
    zh: "（可选，用于 admin API）",
    en: "(optional, for admin API)",
    ja: "（任意、管理 API 用）",
  },
  "conn.test": { zh: "测试", en: "Test", ja: "テスト" },
  "conn.verify_token": { zh: "验证 token", en: "Verify token", ja: "トークンを検証" },
  "conn.delete": { zh: "删除连接", en: "Delete", ja: "接続を削除" },
  "conn.activate": { zh: "切换到此连接", en: "Use this", ja: "これを使用" },
  "conn.active": { zh: "当前", en: "active", ja: "現在" },
  "conn.save": { zh: "保存", en: "Save", ja: "保存" },
  "conn.cancel": { zh: "取消", en: "Cancel", ja: "キャンセル" },

  // common
  "common.save": { zh: "保存", en: "Save", ja: "保存" },
  "common.cancel": { zh: "取消", en: "Cancel", ja: "キャンセル" },
  "common.delete": { zh: "删除", en: "Delete", ja: "削除" },
  "common.confirm": { zh: "确认", en: "Confirm", ja: "確認" },
  "common.loading": { zh: "加载中…", en: "Loading…", ja: "読み込み中…" },
  "common.error": { zh: "出错了", en: "Error", ja: "エラー" },
  "common.success": { zh: "成功", en: "Success", ja: "成功" },
  "common.undo": { zh: "撤销", en: "Undo", ja: "元に戻す" },
  "common.search": { zh: "搜索", en: "Search", ja: "検索" },
  "common.prev": { zh: "上一页", en: "Prev", ja: "前へ" },
  "common.next": { zh: "下一页", en: "Next", ja: "次へ" },
  "common.refresh": { zh: "刷新", en: "Refresh", ja: "更新" },

  // command palette
  "cmd.title": { zh: "命令", en: "Commands", ja: "コマンド" },
  "cmd.placeholder": {
    zh: "输入命令或搜索站点…",
    en: "Type a command or search sites…",
    ja: "コマンドを入力またはサイトを検索…",
  },
  "cmd.no_results": { zh: "无匹配", en: "No matches", ja: "該当なし" },
  "cmd.go_overview": { zh: "前往总览", en: "Go to overview", ja: "概要へ" },
  "cmd.go_sites": { zh: "前往站点列表", en: "Go to sites", ja: "サイト一覧へ" },
  "cmd.go_logs": { zh: "前往日志", en: "Go to logs", ja: "ログへ" },
  "cmd.go_settings": { zh: "前往设置", en: "Go to settings", ja: "設定へ" },
  "cmd.toggle_theme": { zh: "切换主题", en: "Toggle theme", ja: "テーマを切り替え" },
  "cmd.toggle_lang": { zh: "切换语言", en: "Toggle language", ja: "言語を切り替え" },
  "cmd.export": { zh: "导出 data.db", en: "Export data.db", ja: "data.db をエクスポート" },
} as const;

export type DictKey = keyof typeof dict;

const LOCALES: readonly Locale[] = ["zh", "en", "ja"] as const;

function read(): Locale {
  if (typeof localStorage === "undefined") return "zh";
  const v = localStorage.getItem(KEY);
  return LOCALES.includes(v as Locale) ? (v as Locale) : "zh";
}

const [locale, setLocaleSignal] = createSignal<Locale>(read());

export { locale };

const HTML_LANG: Record<Locale, string> = {
  zh: "zh-CN",
  en: "en",
  ja: "ja",
};

export function setLocale(l: Locale) {
  setLocaleSignal(l);
  if (typeof localStorage !== "undefined") localStorage.setItem(KEY, l);
  if (typeof document !== "undefined") document.documentElement.lang = HTML_LANG[l];
}

export function t(key: DictKey): string {
  return dict[key][locale()];
}

/** Cycle through locales: zh → en → ja → zh */
export function toggleLocale() {
  const cur = locale();
  const i = LOCALES.indexOf(cur);
  const next = LOCALES[(i + 1) % LOCALES.length] ?? "zh";
  setLocale(next);
}

/** Short label for compact UIs (top-bar button etc.) */
const SHORT_LABELS: Record<Locale, string> = { zh: "中", en: "EN", ja: "日" };
export function localeShortLabel(l: Locale = locale()): string {
  return SHORT_LABELS[l];
}

/** Full human label (settings page etc.) */
const FULL_LABELS: Record<Locale, string> = { zh: "中文", en: "English", ja: "日本語" };
export function localeFullLabel(l: Locale): string {
  return FULL_LABELS[l];
}

/** Ordered locale list for menus */
export const LOCALE_LIST = LOCALES;
