import { A, useLocation } from "@solidjs/router";
import { type Component, For } from "solid-js";
import { Activity, Globe, LayoutGrid, Settings as SettingsIcon, type LucideProps } from "lucide-solid";
import { Motion } from "solid-motionone";
import { cn } from "@bsz/shared/lib/utils";
import { t } from "~/lib/i18n";

type IconComponent = Component<LucideProps>;
type Item = { href: string; labelKey: Parameters<typeof t>[0]; icon: IconComponent };

const items: Item[] = [
  { href: "/app/overview", labelKey: "nav.overview", icon: LayoutGrid },
  { href: "/app/sites", labelKey: "nav.sites", icon: Globe },
  { href: "/app/logs", labelKey: "nav.logs", icon: Activity },
  { href: "/app/settings", labelKey: "nav.settings", icon: SettingsIcon },
];

const Sidebar: Component = () => {
  const loc = useLocation();
  const isActive = (href: string) => loc.pathname === href || loc.pathname.startsWith(`${href}/`);
  return (
    <aside class="flex h-full w-56 flex-col border-r border-border bg-card/40 px-3 py-4 lt-md:hidden">
      <div class="mb-5 flex items-center gap-2 px-2">
        <div class="flex size-7 items-center justify-center rounded-md bg-primary/15 text-primary">
          <svg viewBox="0 0 24 24" fill="currentColor" class="size-4">
            <path d="M3 12l9-9 9 9-9 9-9-9zm9-6.5L5.5 12 12 18.5 18.5 12 12 5.5z" />
          </svg>
        </div>
        <div class="text-sm font-semibold tracking-tight">Busuanzi</div>
      </div>
      <nav class="flex flex-1 flex-col gap-0.5">
        <For each={items}>
          {(item, i) => (
            <Motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.04 * i(), duration: 0.2 }}
            >
              <A
                href={item.href}
                class={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive(item.href) && "bg-accent font-medium text-accent-foreground",
                )}
              >
                <item.icon class="size-4 opacity-80" />
                <span>{t(item.labelKey)}</span>
              </A>
            </Motion.div>
          )}
        </For>
      </nav>
      <div class="mt-auto px-2 text-[10px] text-muted-foreground/70">
        v0.1.0 ·{" "}
        <a href="https://github.com/AdingApkgg/bsz" rel="noopener" class="hover:text-foreground">
          GitHub
        </a>
      </div>
    </aside>
  );
};

export default Sidebar;
