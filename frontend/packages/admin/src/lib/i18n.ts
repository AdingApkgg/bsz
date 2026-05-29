// Type-safe i18n built on @solid-primitives/i18n.
//
// Shape: `dict[locale][dot.notation.key] = string`. Strings can contain
// `{{var}}` placeholders interpolated by `resolveTemplate`. Missing keys fall
// back to the `zh` source dict, then to the key itself — so a typo is loud
// but doesn't blow up the UI.

import * as i18n from "@solid-primitives/i18n";
import { createSignal } from "solid-js";

const KEY = "bsz.locale";

const dict = {
  zh: {
    // navigation
    "nav.overview": "总览",
    "nav.sites": "站点",
    "nav.logs": "日志",
    "nav.settings": "设置",

    // top bar
    "top.search": "搜索 / 命令",
    "top.theme": "主题",
    "top.language": "语言",
    "top.no_connection": "未选择连接",
    "top.add_connection": "添加连接",

    // theme
    "theme.system": "跟随系统",
    "theme.light": "亮色",
    "theme.dark": "暗色",

    // welcome
    "welcome.title": "Busuanzi",
    "welcome.subtitle": "网站访客统计 · 自托管 · 单二进制",
    "welcome.no_conn_title": "添加第一个后端连接",
    "welcome.no_conn_body":
      "前端纯静态，需要指向你的 busuanzi 后端地址。后端 ADMIN_TOKEN 设了之后才能管理数据。",
    "welcome.continue": "进入控制台",
    "welcome.test_no_token": "可达（token 未填，admin 不可用）",
    "welcome.deploy_hint": "前端纯静态，可部署到 GitHub Pages / Cloudflare Pages / 任意静态托管。",
    "welcome.backend_docs": "后端文档",

    // overview
    "overview.title": "总览",
    "overview.sites": "站点",
    "overview.pages": "页面",
    "overview.total_pv": "总 PV",
    "overview.total_uv": "总 UV",
    "overview.top_sites": "Top 站点",
    "overview.pv_share": "PV 分布",
    "overview.recent_activity": "最近活动",
    "overview.no_activity": "暂无日志",
    "overview.other": "其他",
    "overview.no_admin_token": "当前连接未配置 admin token，无法查看统计数据。",

    // sites
    "sites.title": "站点",
    "sites.search_placeholder": "搜索站点…",
    "sites.col_site": "站点",
    "sites.col_pv": "PV",
    "sites.col_uv": "UV",
    "sites.col_pages": "页面",
    "sites.empty": "暂无数据",
    "sites.batch_delete": "批量删除",
    "sites.selected": "已选",

    // site detail
    "site.back": "返回站点列表",
    "site.edit_pv": "编辑 PV",
    "site.edit_uv": "编辑 UV",
    "site.rename": "重命名",
    "site.merge": "合并到…",
    "site.delete": "删除站点",
    "site.pages": "页面",
    "site.danger": "危险操作",
    "site.danger_hint": "重命名/合并/删除不可撤销（仅编辑 PV/UV 可 undo）",
    "site.new_key": "新域名",
    "site.merge_target": "目标站点",

    // logs
    "logs.title": "操作日志",
    "logs.col_time": "时间",
    "logs.col_action": "操作",
    "logs.col_detail": "详情",
    "logs.col_ip": "IP",
    "logs.empty": "暂无日志",
    "logs.filter_action": "全部操作",

    // settings
    "settings.title": "设置",
    "settings.connections": "连接",
    "settings.appearance": "外观",
    "settings.data": "数据",
    "settings.add": "新增",
    "settings.import_db": "导入 data.db",
    "settings.export_db": "导出 data.db",
    "settings.sitemap_sync": "Sitemap 同步",
    "settings.connections_hint": "管理你要连接的 busuanzi 后端。",
    "settings.no_connections": "暂无连接",
    "settings.no_admin_token_hint": "在当前连接配置 ADMIN_TOKEN 之后才能使用数据工具。",
    "settings.export_hint": "下载 data.db 快照",
    "settings.import_warn": "⚠ 将覆盖现有数据",
    "settings.import_btn": "导入",
    "settings.sync_hint": "从 sitemap 拉取 busuanzi.ibruce.info 历史数据（增量合并，不覆盖）。",
    "settings.sync_btn": "同步",
    "settings.parsing_xml": "正在解析上传的 XML…",
    "settings.found_urls": "发现 {{n}} 个 URL",
    "settings.fetching_sitemap": "正在获取 sitemap…",
    "settings.sync_error": "同步错误",
    "settings.connection_lost": "连接已断开",
    "settings.download": "下载",

    // connection form
    "conn.name": "名称",
    "conn.base_url": "后端 URL",
    "conn.token": "Admin Token",
    "conn.token_optional": "（可选，用于 admin API）",
    "conn.test": "测试",
    "conn.verify_token": "验证 token",
    "conn.delete": "删除连接",
    "conn.activate": "切换到此连接",
    "conn.active": "当前",
    "conn.save": "保存",
    "conn.cancel": "取消",
    "conn.test_ok": "可达",
    "conn.test_unreachable": "无法连接",
    "conn.test_token_empty": "token 为空",
    "conn.test_token_invalid": "token 无效",
    "conn.test_admin_not_mounted": "后端未启用 admin（ADMIN_TOKEN 为空？）",

    // common
    "common.save": "保存",
    "common.cancel": "取消",
    "common.delete": "删除",
    "common.confirm": "确认",
    "common.loading": "加载中…",
    "common.error": "出错了",
    "common.success": "成功",
    "common.undo": "撤销",
    "common.search": "搜索",
    "common.prev": "上一页",
    "common.next": "下一页",
    "common.refresh": "刷新",
    "common.required": "必填",
    "common.url_required": "请输入 URL",
    "common.file_required": "请选择文件",
    "common.url_or_file_required": "请输入 URL 或选择文件",
    "common.save_failed": "保存失败",
    "common.delete_failed": "删除失败",
    "common.rename_failed": "重命名失败",
    "common.merge_failed": "合并失败",
    "common.import_failed": "导入失败",
    "common.upload_failed": "上传失败",

    // log action labels
    "log.action.delete_site": "删除站点",
    "log.action.delete_page": "删除页面",
    "log.action.edit_site": "编辑站点",
    "log.action.edit_page": "编辑页面",
    "log.action.rename_site": "重命名",
    "log.action.merge_site": "合并站点",
    "log.action.import": "导入",
    "log.action.export": "导出",
    "log.action.batch_delete_sites": "批量删除站点",
    "log.action.batch_delete_pages": "批量删除页面",

    // command palette
    "cmd.title": "命令",
    "cmd.placeholder": "输入命令或搜索站点…",
    "cmd.no_results": "无匹配",
    "cmd.go_overview": "前往总览",
    "cmd.go_sites": "前往站点列表",
    "cmd.go_logs": "前往日志",
    "cmd.go_settings": "前往设置",
    "cmd.toggle_theme": "切换主题",
    "cmd.toggle_lang": "切换语言",
    "cmd.export": "导出 data.db",
  },
  en: {
    "nav.overview": "Overview",
    "nav.sites": "Sites",
    "nav.logs": "Logs",
    "nav.settings": "Settings",

    "top.search": "Search / commands",
    "top.theme": "Theme",
    "top.language": "Language",
    "top.no_connection": "No connection",
    "top.add_connection": "Add connection",

    "theme.system": "System",
    "theme.light": "Light",
    "theme.dark": "Dark",

    "welcome.title": "Busuanzi",
    "welcome.subtitle": "Self-hosted visitor counter · single binary",
    "welcome.no_conn_title": "Add your first backend",
    "welcome.no_conn_body":
      "This is a static frontend — it needs to know where your backend is. Backend must have ADMIN_TOKEN set for admin features.",
    "welcome.continue": "Open dashboard",
    "welcome.test_no_token": "Reachable (admin disabled without token)",
    "welcome.deploy_hint":
      "Pure static frontend — deploy to GitHub Pages, Cloudflare Pages, or any static host.",
    "welcome.backend_docs": "Backend docs",

    "overview.title": "Overview",
    "overview.sites": "Sites",
    "overview.pages": "Pages",
    "overview.total_pv": "Total PV",
    "overview.total_uv": "Total UV",
    "overview.top_sites": "Top sites",
    "overview.pv_share": "PV share",
    "overview.recent_activity": "Recent activity",
    "overview.no_activity": "No activity yet",
    "overview.other": "Other",
    "overview.no_admin_token": "This connection has no admin token — stats unavailable.",

    "sites.title": "Sites",
    "sites.search_placeholder": "Filter sites…",
    "sites.col_site": "Site",
    "sites.col_pv": "PV",
    "sites.col_uv": "UV",
    "sites.col_pages": "Pages",
    "sites.empty": "No data",
    "sites.batch_delete": "Batch delete",
    "sites.selected": "selected",

    "site.back": "Back to sites",
    "site.edit_pv": "Edit PV",
    "site.edit_uv": "Edit UV",
    "site.rename": "Rename",
    "site.merge": "Merge into…",
    "site.delete": "Delete site",
    "site.pages": "Pages",
    "site.danger": "Danger zone",
    "site.danger_hint": "Rename/merge/delete are irreversible (only PV/UV edits support undo)",
    "site.new_key": "New site key",
    "site.merge_target": "Target site",

    "logs.title": "Activity log",
    "logs.col_time": "Time",
    "logs.col_action": "Action",
    "logs.col_detail": "Detail",
    "logs.col_ip": "IP",
    "logs.empty": "No logs",
    "logs.filter_action": "All actions",

    "settings.title": "Settings",
    "settings.connections": "Connections",
    "settings.appearance": "Appearance",
    "settings.data": "Data",
    "settings.add": "Add",
    "settings.import_db": "Import data.db",
    "settings.export_db": "Export data.db",
    "settings.sitemap_sync": "Sitemap sync",
    "settings.connections_hint": "Manage which busuanzi backends you connect to.",
    "settings.no_connections": "No connections yet",
    "settings.no_admin_token_hint": "Configure ADMIN_TOKEN on the active connection to enable data tools.",
    "settings.export_hint": "Download a snapshot of data.db",
    "settings.import_warn": "⚠ Overwrites existing data",
    "settings.import_btn": "Import",
    "settings.sync_hint":
      "Pull historical stats from busuanzi.ibruce.info using a sitemap (incremental merge).",
    "settings.sync_btn": "Sync",
    "settings.parsing_xml": "Parsing uploaded XML…",
    "settings.found_urls": "Found {{n}} URLs",
    "settings.fetching_sitemap": "Fetching sitemap…",
    "settings.sync_error": "sync error",
    "settings.connection_lost": "connection lost",
    "settings.download": "Download",

    "conn.name": "Name",
    "conn.base_url": "Backend URL",
    "conn.token": "Admin token",
    "conn.token_optional": "(optional, for admin API)",
    "conn.test": "Test",
    "conn.verify_token": "Verify token",
    "conn.delete": "Delete",
    "conn.activate": "Use this",
    "conn.active": "active",
    "conn.save": "Save",
    "conn.cancel": "Cancel",
    "conn.test_ok": "Reachable",
    "conn.test_unreachable": "Unreachable",
    "conn.test_token_empty": "Token is empty",
    "conn.test_token_invalid": "Token is invalid",
    "conn.test_admin_not_mounted": "Admin disabled on backend (ADMIN_TOKEN empty?)",

    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.confirm": "Confirm",
    "common.loading": "Loading…",
    "common.error": "Error",
    "common.success": "Success",
    "common.undo": "Undo",
    "common.search": "Search",
    "common.prev": "Prev",
    "common.next": "Next",
    "common.refresh": "Refresh",
    "common.required": "Required",
    "common.url_required": "URL required",
    "common.file_required": "File required",
    "common.url_or_file_required": "URL or file required",
    "common.save_failed": "Save failed",
    "common.delete_failed": "Delete failed",
    "common.rename_failed": "Rename failed",
    "common.merge_failed": "Merge failed",
    "common.import_failed": "Import failed",
    "common.upload_failed": "Upload failed",

    "log.action.delete_site": "Delete site",
    "log.action.delete_page": "Delete page",
    "log.action.edit_site": "Edit site",
    "log.action.edit_page": "Edit page",
    "log.action.rename_site": "Rename",
    "log.action.merge_site": "Merge",
    "log.action.import": "Import",
    "log.action.export": "Export",
    "log.action.batch_delete_sites": "Batch delete sites",
    "log.action.batch_delete_pages": "Batch delete pages",

    "cmd.title": "Commands",
    "cmd.placeholder": "Type a command or search sites…",
    "cmd.no_results": "No matches",
    "cmd.go_overview": "Go to overview",
    "cmd.go_sites": "Go to sites",
    "cmd.go_logs": "Go to logs",
    "cmd.go_settings": "Go to settings",
    "cmd.toggle_theme": "Toggle theme",
    "cmd.toggle_lang": "Toggle language",
    "cmd.export": "Export data.db",
  },
  ja: {
    "nav.overview": "概要",
    "nav.sites": "サイト",
    "nav.logs": "ログ",
    "nav.settings": "設定",

    "top.search": "検索・コマンド",
    "top.theme": "テーマ",
    "top.language": "言語",
    "top.no_connection": "接続なし",
    "top.add_connection": "接続を追加",

    "theme.system": "システム",
    "theme.light": "ライト",
    "theme.dark": "ダーク",

    "welcome.title": "Busuanzi",
    "welcome.subtitle": "セルフホスト型訪問カウンター・シングルバイナリ",
    "welcome.no_conn_title": "最初のバックエンド接続を追加",
    "welcome.no_conn_body":
      "これは静的フロントエンドです — バックエンドのURLを指定する必要があります。管理機能にはバックエンドで ADMIN_TOKEN を設定してください。",
    "welcome.continue": "ダッシュボードを開く",
    "welcome.test_no_token": "到達可能（トークン未設定、管理機能無効）",
    "welcome.deploy_hint":
      "純粋な静的フロントエンド — GitHub Pages / Cloudflare Pages など任意の静的ホスティングへデプロイ可能。",
    "welcome.backend_docs": "バックエンドドキュメント",

    "overview.title": "概要",
    "overview.sites": "サイト",
    "overview.pages": "ページ",
    "overview.total_pv": "合計 PV",
    "overview.total_uv": "合計 UV",
    "overview.top_sites": "トップサイト",
    "overview.pv_share": "PV シェア",
    "overview.recent_activity": "最近のアクティビティ",
    "overview.no_activity": "アクティビティがありません",
    "overview.other": "その他",
    "overview.no_admin_token": "この接続には管理トークンが設定されていません — 統計を表示できません。",

    "sites.title": "サイト",
    "sites.search_placeholder": "サイトをフィルタ…",
    "sites.col_site": "サイト",
    "sites.col_pv": "PV",
    "sites.col_uv": "UV",
    "sites.col_pages": "ページ",
    "sites.empty": "データがありません",
    "sites.batch_delete": "一括削除",
    "sites.selected": "選択中",

    "site.back": "サイト一覧に戻る",
    "site.edit_pv": "PV を編集",
    "site.edit_uv": "UV を編集",
    "site.rename": "名前を変更",
    "site.merge": "マージ先…",
    "site.delete": "サイトを削除",
    "site.pages": "ページ",
    "site.danger": "危険な操作",
    "site.danger_hint": "名前変更・マージ・削除は元に戻せません（PV/UV 編集のみ undo 可）",
    "site.new_key": "新しいサイトキー",
    "site.merge_target": "マージ先サイト",

    "logs.title": "アクティビティログ",
    "logs.col_time": "時刻",
    "logs.col_action": "操作",
    "logs.col_detail": "詳細",
    "logs.col_ip": "IP",
    "logs.empty": "ログがありません",
    "logs.filter_action": "すべての操作",

    "settings.title": "設定",
    "settings.connections": "接続",
    "settings.appearance": "外観",
    "settings.data": "データ",
    "settings.add": "追加",
    "settings.import_db": "data.db をインポート",
    "settings.export_db": "data.db をエクスポート",
    "settings.sitemap_sync": "サイトマップ同期",
    "settings.connections_hint": "接続する busuanzi バックエンドを管理します。",
    "settings.no_connections": "接続がありません",
    "settings.no_admin_token_hint": "データツールを使うには、現在の接続に ADMIN_TOKEN を設定してください。",
    "settings.export_hint": "data.db のスナップショットをダウンロード",
    "settings.import_warn": "⚠ 既存データを上書きします",
    "settings.import_btn": "インポート",
    "settings.sync_hint":
      "sitemap から busuanzi.ibruce.info の履歴データを取得（増分マージ、上書きしない）。",
    "settings.sync_btn": "同期",
    "settings.parsing_xml": "アップロードされた XML を解析中…",
    "settings.found_urls": "{{n}} 件の URL を検出",
    "settings.fetching_sitemap": "sitemap を取得中…",
    "settings.sync_error": "同期エラー",
    "settings.connection_lost": "接続が切断されました",
    "settings.download": "ダウンロード",

    "conn.name": "名前",
    "conn.base_url": "バックエンド URL",
    "conn.token": "管理トークン",
    "conn.token_optional": "（任意、管理 API 用）",
    "conn.test": "テスト",
    "conn.verify_token": "トークンを検証",
    "conn.delete": "接続を削除",
    "conn.activate": "これを使用",
    "conn.active": "現在",
    "conn.save": "保存",
    "conn.cancel": "キャンセル",
    "conn.test_ok": "到達可能",
    "conn.test_unreachable": "到達不可",
    "conn.test_token_empty": "トークンが空です",
    "conn.test_token_invalid": "トークンが無効です",
    "conn.test_admin_not_mounted": "バックエンドで admin が無効です（ADMIN_TOKEN が空？）",

    "common.save": "保存",
    "common.cancel": "キャンセル",
    "common.delete": "削除",
    "common.confirm": "確認",
    "common.loading": "読み込み中…",
    "common.error": "エラー",
    "common.success": "成功",
    "common.undo": "元に戻す",
    "common.search": "検索",
    "common.prev": "前へ",
    "common.next": "次へ",
    "common.refresh": "更新",
    "common.required": "必須",
    "common.url_required": "URL を入力してください",
    "common.file_required": "ファイルを選択してください",
    "common.url_or_file_required": "URL またはファイルを指定してください",
    "common.save_failed": "保存に失敗しました",
    "common.delete_failed": "削除に失敗しました",
    "common.rename_failed": "名前変更に失敗しました",
    "common.merge_failed": "マージに失敗しました",
    "common.import_failed": "インポートに失敗しました",
    "common.upload_failed": "アップロードに失敗しました",

    "log.action.delete_site": "サイトを削除",
    "log.action.delete_page": "ページを削除",
    "log.action.edit_site": "サイトを編集",
    "log.action.edit_page": "ページを編集",
    "log.action.rename_site": "名前を変更",
    "log.action.merge_site": "マージ",
    "log.action.import": "インポート",
    "log.action.export": "エクスポート",
    "log.action.batch_delete_sites": "サイトを一括削除",
    "log.action.batch_delete_pages": "ページを一括削除",

    "cmd.title": "コマンド",
    "cmd.placeholder": "コマンドを入力またはサイトを検索…",
    "cmd.no_results": "該当なし",
    "cmd.go_overview": "概要へ",
    "cmd.go_sites": "サイト一覧へ",
    "cmd.go_logs": "ログへ",
    "cmd.go_settings": "設定へ",
    "cmd.toggle_theme": "テーマを切り替え",
    "cmd.toggle_lang": "言語を切り替え",
    "cmd.export": "data.db をエクスポート",
  },
} as const;

export type Locale = keyof typeof dict;
export type DictKey = keyof (typeof dict)["zh"];

export const LOCALE_LIST: readonly Locale[] = ["zh", "en", "ja"] as const;

function read(): Locale {
  if (typeof localStorage === "undefined") return "zh";
  const v = localStorage.getItem(KEY);
  return LOCALE_LIST.includes(v as Locale) ? (v as Locale) : "zh";
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

// Reactive translator. Solid's signal read inside the getter makes it
// re-evaluate whenever the active locale changes.
const primary = i18n.translator(() => dict[locale()], i18n.resolveTemplate);
const fallback = i18n.translator(() => dict.zh, i18n.resolveTemplate);

/**
 * Translate a key. Supports `{{var}}` interpolation:
 * `t("greeting", { name: "Ada" })` against `"hello {{name}}"`.
 * Missing keys fall back to the `zh` source, then to the key itself.
 */
export function t(key: DictKey, params?: Record<string, string | number>): string {
  // @solid-primitives/i18n's resolver returns `string | undefined`; fall through.
  return primary(key, params) ?? fallback(key, params) ?? (key as string);
}

/** Cycle through locales: zh → en → ja → zh */
export function toggleLocale() {
  const i = LOCALE_LIST.indexOf(locale());
  setLocale(LOCALE_LIST[(i + 1) % LOCALE_LIST.length] ?? "zh");
}

const SHORT_LABELS: Record<Locale, string> = {
  zh: "中",
  en: "EN",
  ja: "日",
};
export function localeShortLabel(l: Locale = locale()): string {
  return SHORT_LABELS[l];
}

const FULL_LABELS: Record<Locale, string> = {
  zh: "中文",
  en: "English",
  ja: "日本語",
};
export function localeFullLabel(l: Locale): string {
  return FULL_LABELS[l];
}
