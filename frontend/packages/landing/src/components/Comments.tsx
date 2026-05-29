import { createEffect, createSignal, onCleanup, onMount, type Component } from "solid-js";
import Artalk from "artalk";
// Locale dict is shipped as a CJS `export = locale`, so the .d.ts declares
// no default export. Namespace-import + unwrap `.default` (bundler-injected
// for CJS interop) lands the actual translation object.
import * as jaLocaleMod from "artalk/i18n/ja";
const jaLocale = (jaLocaleMod as { default?: typeof jaLocaleMod }).default ?? jaLocaleMod;
import "artalk/Artalk.css";
import { Card, CardContent } from "@bsz/shared/components/ui/card";
import { locale, type Locale } from "../i18n";
import { t } from "../i18n";

// Artalk widget — only mounted when VITE_ARTALK_SERVER is set. The Artalk
// JS + CSS are bundled (via the `artalk` npm package) into this module's
// chunk, which Solid's `lazy()` keeps out of the main bundle until
// COMMENTS_ENABLED is true at render time.
const ARTALK_SERVER = import.meta.env.VITE_ARTALK_SERVER;
const ARTALK_SITE_NAME = import.meta.env.VITE_ARTALK_SITE_NAME ?? "Busuanzi";

// Map the 3 landing locales to Artalk's `locale` arg. zh-CN + en are
// built into Artalk; ja is shipped as a side-loadable bundle that we
// statically import above and pass by reference.
const ARTALK_LOCALE: Record<Locale, string | typeof jaLocale> = {
  zh: "zh-CN",
  en: "en",
  ja: jaLocale,
};

const Comments: Component = () => {
  let host!: HTMLDivElement;
  const [failed, setFailed] = createSignal(false);
  let instance: Artalk | undefined;
  let themeObserver: MutationObserver | undefined;
  const isDark = () => document.documentElement.classList.contains("dark");

  onMount(() => {
    if (!ARTALK_SERVER) return;
    try {
      // Theme sync: hand dark/light directly to Artalk's `darkMode` conf —
      // its built-in DarkMode plugin then toggles `.atk-dark-mode` on both
      // the host AND the sidebar layer wrapper (the layer also keys its
      // palette off that class). We watch `html.dark` so OS preference
      // flips push through `instance.update({ darkMode })`.
      const themeObserver_ = new MutationObserver(() => instance?.update?.({ darkMode: isDark() }));
      themeObserver_.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
      themeObserver = themeObserver_;
      // Locale sync: `update({ locale })` only re-renders the editor; the
      // list pane (sort tabs, empty state, "load more") keeps the strings
      // baked in at construction time. Destroy + reinit on every change so
      // every pane reflects the new locale. Minor cost: comments refetch
      // from the server. Acceptable for a low-traffic landing page.
      //
      // `useBackendConf: true` (default) keeps the admin-pushed config —
      // emoticons, gravatar, plugin URLs, vote settings, etc. — flowing in.
      // `remoteConfModifier` is Artalk's hook that runs AFTER the backend
      // conf fetch and BEFORE it's applied; we use it to put our locale +
      // darkMode back on top so admin-pushed `locale: zh-CN` and the
      // unrecognised `darkMode: "inherit"` don't override us.
      createEffect(() => {
        const wantedLocale = ARTALK_LOCALE[locale()];
        const wantedDark = isDark();
        instance?.destroy?.();
        instance = Artalk.init({
          el: host,
          // Pin to the deploy's canonical origin so /, /en, /ja all share
          // one thread (locale variants are content-equivalent). Prefer
          // VITE_SITE_URL — `.env.production` sets it to the live origin,
          // and dev preview uses it to mirror prod's comment thread.
          // Falls back to `location.origin` if unset.
          pageKey: `${import.meta.env.VITE_SITE_URL || location.origin}/`,
          site: ARTALK_SITE_NAME,
          server: ARTALK_SERVER,
          locale: wantedLocale,
          darkMode: wantedDark,
          remoteConfModifier: (conf) => {
            const c = conf as { locale?: typeof wantedLocale; darkMode?: boolean };
            c.locale = wantedLocale;
            c.darkMode = wantedDark;
          },
        });
        // Artalk skips its initial `fetch({offset:0})` when `remoteConfModifier`
        // is set (it assumes the caller will trigger the first load). Call
        // reload() ourselves so the comment count + empty state render.
        instance.reload();
      });
    } catch {
      setFailed(true);
    }
  });

  onCleanup(() => {
    instance?.destroy?.();
    themeObserver?.disconnect();
  });

  if (failed()) return null;
  return (
    <Card id="comments" class="mb-6 scroll-mt-8">
      <CardContent class="p-6">
        <h2 class="mb-3 font-semibold text-lg">{t("comments_title")}</h2>
        <div ref={host} />
      </CardContent>
    </Card>
  );
};

export const COMMENTS_ENABLED = Boolean(ARTALK_SERVER);
export default Comments;
