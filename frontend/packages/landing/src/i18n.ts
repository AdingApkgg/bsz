// Tiny i18n for the landing page — separate dict from admin (much smaller).
// Same factory pattern via @solid-primitives/i18n? No — landing's strings are
// few enough that a plain dict lookup is simpler than pulling in another dep.

import { createSignal } from "solid-js";

export type Locale = "zh" | "en" | "ja" | "ko" | "es" | "fr" | "de";

const KEY = "bsz.locale";

const dict = {
  zh: {
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
    example_title: "完整示例",
    example_hint: "复制到 HTML 页面，把 URL 替换成你的后端：",
    code_label: "示例代码",
    footer_tagline: "Powered by Rust · Frontend by Solid",
  },
  en: {
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
    example_title: "Full example",
    example_hint: "Paste into your HTML, swap the URL for your backend:",
    code_label: "Snippet",
    footer_tagline: "Powered by Rust · Frontend by Solid",
  },
  ja: {
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
    example_title: "完全な例",
    example_hint: "HTML に貼り付け、URL をあなたのバックエンドに差し替えてください：",
    code_label: "サンプル",
    footer_tagline: "Powered by Rust · Frontend by Solid",
  },
  ko: {
    subtitle: "셀프 호스팅 방문자 카운터 · 싱글 바이너리",
    features_title: "특징",
    features: [
      "외부 의존성 없음",
      "싱글 바이너리",
      "SQLite 영속화",
      "메모리 속도",
      "busuanzi 호환",
      "플러그형 대시보드",
    ],
    api_title: "API",
    api_post: "카운트 + PV/UV 반환",
    api_get: "조회만 (카운트 안 함)",
    api_put: "전송만 (반환 없음)",
    api_ping: "헬스 체크",
    api_header_hint: "헤더",
    api_header_text: "현재 페이지 URL을 `x-bsz-referer`로 전송",
    api_cookie_hint: "방문자 ID",
    api_cookie_text: "Cookie `busuanziId` — 원본 호환",
    example_title: "전체 예시",
    example_hint: "HTML에 붙여 넣고 URL을 백엔드 주소로 바꾸세요:",
    code_label: "예시 코드",
    footer_tagline: "Powered by Rust · Frontend by Solid",
  },
  es: {
    subtitle: "Contador de visitas autoalojado · binario único",
    features_title: "Características",
    features: [
      "Cero dependencias",
      "Binario único",
      "Persistencia SQLite",
      "Velocidad en memoria",
      "Compatible con busuanzi",
      "Dashboard intercambiable",
    ],
    api_title: "API",
    api_post: "Cuenta + devuelve PV/UV",
    api_get: "Solo lectura (sin contar)",
    api_put: "Solo escritura (sin cuerpo)",
    api_ping: "Health check",
    api_header_hint: "Cabeceras",
    api_header_text: "Envía `x-bsz-referer` con la URL de la página",
    api_cookie_hint: "ID de visitante",
    api_cookie_text: "Cookie `busuanziId`, compatible con el original",
    example_title: "Ejemplo completo",
    example_hint: "Pega en tu HTML y cambia la URL por tu backend:",
    code_label: "Fragmento",
    footer_tagline: "Powered by Rust · Frontend by Solid",
  },
  fr: {
    subtitle: "Compteur de visites auto-hébergé · binaire unique",
    features_title: "Caractéristiques",
    features: [
      "Zéro dépendance",
      "Binaire unique",
      "Persistance SQLite",
      "Vitesse en mémoire",
      "Compatible busuanzi",
      "Tableau de bord interchangeable",
    ],
    api_title: "API",
    api_post: "Compte + renvoie PV/UV",
    api_get: "Lecture seule (pas de comptage)",
    api_put: "Écriture seule (pas de corps)",
    api_ping: "Healthcheck",
    api_header_hint: "En-têtes",
    api_header_text: "Envoyer `x-bsz-referer` avec l'URL de la page",
    api_cookie_hint: "ID visiteur",
    api_cookie_text: "Cookie `busuanziId`, compatible avec l'original",
    example_title: "Exemple complet",
    example_hint: "Collez dans votre HTML, remplacez l'URL par votre backend :",
    code_label: "Extrait",
    footer_tagline: "Powered by Rust · Frontend by Solid",
  },
  de: {
    subtitle: "Selbstgehosteter Besucherzähler · Einzelbinary",
    features_title: "Merkmale",
    features: [
      "Keine externen Abhängigkeiten",
      "Einzelbinary",
      "SQLite-Persistenz",
      "Speichergeschwindigkeit",
      "busuanzi-kompatibel",
      "Austauschbares Dashboard",
    ],
    api_title: "API",
    api_post: "Zählen + PV/UV zurückgeben",
    api_get: "Nur lesen (kein Zählen)",
    api_put: "Nur schreiben (kein Body)",
    api_ping: "Health-Check",
    api_header_hint: "Header",
    api_header_text: "`x-bsz-referer` mit der Seiten-URL senden",
    api_cookie_hint: "Besucher-ID",
    api_cookie_text: "Cookie `busuanziId`, kompatibel zum Original",
    example_title: "Vollständiges Beispiel",
    example_hint: "In dein HTML einfügen und die URL auf dein Backend ändern:",
    code_label: "Snippet",
    footer_tagline: "Powered by Rust · Frontend by Solid",
  },
} as const;

export type DictKey = keyof (typeof dict)["zh"];
export const LOCALE_LIST: readonly Locale[] = ["zh", "en", "ja", "ko", "es", "fr", "de"] as const;

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
  ko: "ko",
  es: "es",
  fr: "fr",
  de: "de",
};

export function setLocale(l: Locale) {
  setLocaleSignal(l);
  if (typeof localStorage !== "undefined") localStorage.setItem(KEY, l);
  if (typeof document !== "undefined") document.documentElement.lang = HTML_LANG[l];
}

export function t<K extends DictKey>(key: K): (typeof dict)["zh"][K] {
  return (dict[locale()][key] ?? dict.zh[key]) as (typeof dict)["zh"][K];
}

const SHORT: Record<Locale, string> = {
  zh: "中",
  en: "EN",
  ja: "日",
  ko: "한",
  es: "ES",
  fr: "FR",
  de: "DE",
};
const FULL: Record<Locale, string> = {
  zh: "中文",
  en: "English",
  ja: "日本語",
  ko: "한국어",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
};
export const localeShortLabel = (l: Locale = locale()) => SHORT[l];
export const localeFullLabel = (l: Locale) => FULL[l];
