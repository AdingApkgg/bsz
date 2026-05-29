// Tiny i18n for the landing page — separate dict from admin (much smaller).
// Same factory pattern via @solid-primitives/i18n? No — landing's strings are
// few enough that a plain dict lookup is simpler than pulling in another dep.
//
// Source of truth for the active locale is the URL path: `/` is zh (the
// project's primary audience), each other locale lives at `/<code>`. The
// LanguageButton navigates between them; an effect in <LocaleSync/> mirrors
// the URL into the signal below so plain `t()` callers stay reactive.

import { createSignal } from "solid-js";

export type Locale = "zh" | "en" | "ja";

const dict = {
  zh: {
    brand: "不蒜子.rs",
    meta_title: "不蒜子 · 自托管的网站访客计数器",
    meta_description:
      "不蒜子是一个简洁的网站访客统计服务，零依赖、单一二进制、兼容原版 busuanzi。支持 site_pv、site_uv、page_pv 统计与 RESTful API。",
    subtitle: "网站访客统计 · 自托管 · 单二进制",
    features_title: "特性",
    features: [
      "零外部依赖",
      "单一二进制",
      "SQLite 持久化",
      "内存级性能",
      "兼容原版 busuanzi",
      "可插拔控制台",
    ],
    api_title: "API",
    api_post: "统计并返回 PV/UV",
    api_get: "仅获取（不计数）",
    api_put: "仅上报（不返回）",
    api_ping: "健康检查",
    api_header_hint: "请求头",
    api_header_text: "需带 x-bsz-referer 为当前页 URL",
    api_cookie_hint: "访客识别",
    api_cookie_text: "Cookie busuanziId，跟原版兼容",
    stats_site_pv: "站点访问 (PV)",
    stats_site_uv: "站点访客 (UV)",
    stats_page_pv: "本页访问",
    stats_loading: "加载中…",
    comments_title: "评论",
    response_title: "响应格式",
    response_hint: "POST /api 与 GET /api 都返回如下结构：",
    response_field_site_pv: "站点总访问量",
    response_field_site_uv: "站点独立访客数",
    response_field_page_pv: "当前页面访问量",
    quickstart_title: "快速接入",
    quickstart_hint: "几行代码即可为网站加上访客统计：",
    quickstart_step1: "发送请求",
    quickstart_step1_text: "向后端 /api 发 POST 请求，带 credentials: \"include\" 与 x-bsz-referer 头。",
    quickstart_step2: "解析响应",
    quickstart_step2_text: "await res.json() 取出 { success, data: { site_pv, site_uv, page_pv } }。",
    quickstart_step3: "展示数据",
    quickstart_step3_text: "把 data.site_pv 等字段写入页面对应的 DOM 元素。",
    example_title: "完整示例",
    example_hint: "复制到 HTML 页面，把 URL 替换成你的后端：",
    get_title: "仅获取（不计数）",
    get_hint: "用 GET 只读取计数，不增加 PV/UV — 适合仪表盘场景：",
    put_title: "静默上报",
    put_hint: "用 PUT 只提交访问记录、不返回 body — 适合无需展示的场景：",
    code_label: "示例代码",
    footer_tagline: "Powered by Rust · Frontend by Solid",
  },
  en: {
    brand: "bsz.rs",
    meta_title: "Busuanzi · self-hosted visitor counter",
    meta_description:
      "Self-hosted visitor counter. Zero deps, single binary, SQLite persistence, drop-in for the original busuanzi script. Exposes a simple POST/GET/PUT /api for site_pv, site_uv, and page_pv.",
    subtitle: "Self-hosted visitor counter · single binary",
    features_title: "Features",
    features: [
      "Zero deps",
      "Single binary",
      "SQLite persistence",
      "In-memory speed",
      "Drop-in for busuanzi",
      "Pluggable dashboard",
    ],
    api_title: "API",
    api_post: "Count + return PV/UV",
    api_get: "Read only (no count)",
    api_put: "Write only (no body)",
    api_ping: "Health check",
    api_header_hint: "Headers",
    api_header_text: "Send `x-bsz-referer` with the page URL",
    api_cookie_hint: "Visitor id",
    api_cookie_text: "Cookie `busuanziId`, compatible with original",
    stats_site_pv: "Site views (PV)",
    stats_site_uv: "Site visitors (UV)",
    stats_page_pv: "This page",
    stats_loading: "Loading…",
    comments_title: "Comments",
    response_title: "Response shape",
    response_hint: "Both POST /api and GET /api return this structure:",
    response_field_site_pv: "Total site page views",
    response_field_site_uv: "Unique site visitors",
    response_field_page_pv: "Views for the current page",
    quickstart_title: "Quick start",
    quickstart_hint: "Add visitor stats to your site in a few lines:",
    quickstart_step1: "Send the request",
    quickstart_step1_text: "POST to your backend /api with credentials: \"include\" and an x-bsz-referer header.",
    quickstart_step2: "Parse the response",
    quickstart_step2_text: "await res.json() to read { success, data: { site_pv, site_uv, page_pv } }.",
    quickstart_step3: "Render",
    quickstart_step3_text: "Write data.site_pv (and friends) into your DOM where you want the counts shown.",
    example_title: "Full example",
    example_hint: "Paste into your HTML, swap the URL for your backend:",
    get_title: "Read only (no counting)",
    get_hint: "Use GET to read counts without incrementing — ideal for dashboards:",
    put_title: "Silent submit",
    put_hint: "Use PUT to record a hit without reading the response body:",
    code_label: "Snippet",
    footer_tagline: "Powered by Rust · Frontend by Solid",
  },
  ja: {
    brand: "bsz.rs",
    meta_title: "Busuanzi · セルフホスト型訪問カウンター",
    meta_description:
      "セルフホスト型の訪問カウンター。外部依存ゼロ、シングルバイナリ、SQLite 永続化、本家 busuanzi 互換。site_pv / site_uv / page_pv をシンプルな POST/GET/PUT /api で取得できます。",
    subtitle: "セルフホスト型訪問カウンター・シングルバイナリ",
    features_title: "特徴",
    features: [
      "外部依存ゼロ",
      "シングルバイナリ",
      "SQLite 永続化",
      "メモリ速度",
      "busuanzi 互換",
      "プラガブルなダッシュボード",
    ],
    api_title: "API",
    api_post: "カウント + PV/UV を返す",
    api_get: "取得のみ（カウントなし）",
    api_put: "送信のみ（返却なし）",
    api_ping: "ヘルスチェック",
    api_header_hint: "ヘッダー",
    api_header_text: "現在のページ URL を `x-bsz-referer` で送る",
    api_cookie_hint: "訪問者ID",
    api_cookie_text: "Cookie `busuanziId` — 本家互換",
    stats_site_pv: "サイト PV",
    stats_site_uv: "サイト UV",
    stats_page_pv: "ページ PV",
    stats_loading: "読み込み中…",
    comments_title: "コメント",
    response_title: "レスポンス形式",
    response_hint: "POST /api と GET /api は次の形を返します：",
    response_field_site_pv: "サイト全体の PV",
    response_field_site_uv: "サイト全体の UV",
    response_field_page_pv: "現在ページの PV",
    quickstart_title: "クイックスタート",
    quickstart_hint: "数行で訪問統計を追加できます：",
    quickstart_step1: "リクエスト送信",
    quickstart_step1_text: "バックエンドの /api に POST。credentials: \"include\" と x-bsz-referer ヘッダー必須。",
    quickstart_step2: "レスポンス解析",
    quickstart_step2_text: "await res.json() で { success, data: { site_pv, site_uv, page_pv } } を取得。",
    quickstart_step3: "表示",
    quickstart_step3_text: "data.site_pv などを表示したい DOM 要素に書き込みます。",
    example_title: "完全な例",
    example_hint: "HTML に貼り付け、URL をあなたのバックエンドに差し替えてください：",
    get_title: "取得のみ（カウントなし）",
    get_hint: "GET でカウントを増やさず取得 — ダッシュボード向け：",
    put_title: "サイレント送信",
    put_hint: "PUT で本文を返さずアクセス記録のみ送信：",
    code_label: "サンプル",
    footer_tagline: "Powered by Rust · Frontend by Solid",
  },
} as const;

export type DictKey = keyof (typeof dict)["zh"];
export const LOCALE_LIST: readonly Locale[] = ["zh", "en", "ja"] as const;

const HTML_LANG: Record<Locale, string> = {
  zh: "zh-CN",
  en: "en",
  ja: "ja",
};

// Open Graph wants underscore-separated language_REGION codes.
const OG_LOCALE: Record<Locale, string> = {
  zh: "zh_CN",
  en: "en_US",
  ja: "ja_JP",
};

// First path segment → locale. `/` (or anything unrecognised) is zh.
export function parseLocaleFromPath(pathname: string): Locale {
  const seg = pathname.replace(/^\/+|\/+$/g, "").split("/")[0] ?? "";
  return LOCALE_LIST.includes(seg as Locale) ? (seg as Locale) : "zh";
}

// Locale → URL path. zh is the apex (`/`), every other locale gets `/<code>`.
export function localePath(l: Locale): string {
  return l === "zh" ? "/" : `/${l}`;
}

// Initial value matches the URL the user landed on, so SSR-less hydration
// doesn't flash zh strings while we wait for the router to mount.
const initialLocale =
  typeof location === "undefined" ? "zh" : parseLocaleFromPath(location.pathname);
const [locale, setLocaleSignal] = createSignal<Locale>(initialLocale);
export { locale };

// Called by <LocaleSync/> inside the router whenever the path changes.
export function syncLocale(l: Locale) {
  setLocaleSignal(l);
  if (typeof document === "undefined") return;
  document.documentElement.lang = HTML_LANG[l];
  updateLocalizedHead(l);
}

// Reactive head management: canonical, og:url, og:locale, and full
// hreflang link set update on every locale switch. Tags we own carry
// `data-bsz-i18n` so we can blow them away cleanly before re-emitting.
function updateLocalizedHead(active: Locale) {
  const origin = location.origin;
  const url = `${origin}${localePath(active)}`;
  const title = dict[active].meta_title;
  const description = dict[active].meta_description;

  // <title> isn't a meta — set it directly.
  document.title = title;

  upsertMeta("canonical", "rel", "link", "href", url);
  upsertMeta("description", "name", "meta", "content", description);
  upsertMeta("og:url", "property", "meta", "content", url);
  upsertMeta("og:locale", "property", "meta", "content", OG_LOCALE[active]);
  upsertMeta("og:title", "property", "meta", "content", title);
  upsertMeta("og:description", "property", "meta", "content", description);
  upsertMeta("twitter:title", "name", "meta", "content", title);
  upsertMeta("twitter:description", "name", "meta", "content", description);

  // Wipe previous batch — both our hreflang links and the og:locale:alternate
  // metas we generated last time, plus any static og:locale:alternate
  // baked into index.html so we don't end up with duplicates.
  for (const el of document.querySelectorAll<HTMLElement>(
    '[data-bsz-i18n], meta[property="og:locale:alternate"]',
  )) {
    el.remove();
  }

  // hreflang link per locale + x-default → apex (zh).
  for (const l of LOCALE_LIST) {
    appendLink({ rel: "alternate", hreflang: HTML_LANG[l], href: `${origin}${localePath(l)}` });
  }
  appendLink({ rel: "alternate", hreflang: "x-default", href: `${origin}/` });

  // og:locale:alternate for every locale except the active one.
  for (const l of LOCALE_LIST) {
    if (l === active) continue;
    appendMeta({ property: "og:locale:alternate", content: OG_LOCALE[l] });
  }

  // HowTo structured data — gives AI assistants (Perplexity, ChatGPT
  // Search, Google AI Overviews) a parseable recipe for the 3-step
  // quickstart so they can cite each step verbatim.
  appendJsonLd({
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: dict[active].quickstart_title,
    description: dict[active].quickstart_hint,
    inLanguage: HTML_LANG[active],
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: dict[active].quickstart_step1,
        text: dict[active].quickstart_step1_text,
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: dict[active].quickstart_step2,
        text: dict[active].quickstart_step2_text,
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: dict[active].quickstart_step3,
        text: dict[active].quickstart_step3_text,
      },
    ],
  });
}

function appendJsonLd(payload: Record<string, unknown>) {
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.dataset.bszI18n = "1";
  script.textContent = JSON.stringify(payload);
  document.head.appendChild(script);
}

function upsertMeta(
  matchVal: string,
  matchAttr: "rel" | "property" | "name",
  tag: "link" | "meta",
  setAttr: "href" | "content",
  value: string,
) {
  const selector = `${tag}[${matchAttr}="${matchVal}"]`;
  let el = document.querySelector<HTMLLinkElement | HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement(tag) as HTMLLinkElement | HTMLMetaElement;
    el.setAttribute(matchAttr, matchVal);
    document.head.appendChild(el);
  }
  el.setAttribute(setAttr, value);
}

function appendLink(attrs: { rel: string; hreflang: string; href: string }) {
  const link = document.createElement("link");
  link.setAttribute("rel", attrs.rel);
  link.setAttribute("hreflang", attrs.hreflang);
  link.setAttribute("href", attrs.href);
  link.dataset.bszI18n = "1";
  document.head.appendChild(link);
}

function appendMeta(attrs: { property: string; content: string }) {
  const meta = document.createElement("meta");
  meta.setAttribute("property", attrs.property);
  meta.setAttribute("content", attrs.content);
  meta.dataset.bszI18n = "1";
  document.head.appendChild(meta);
}

export function t<K extends DictKey>(key: K): (typeof dict)["zh"][K] {
  return (dict[locale()][key] ?? dict.zh[key]) as (typeof dict)["zh"][K];
}

const SHORT: Record<Locale, string> = {
  zh: "中",
  en: "EN",
  ja: "日",
};
const FULL: Record<Locale, string> = {
  zh: "中文",
  en: "English",
  ja: "日本語",
};
export const localeShortLabel = (l: Locale = locale()) => SHORT[l];
export const localeFullLabel = (l: Locale) => FULL[l];
