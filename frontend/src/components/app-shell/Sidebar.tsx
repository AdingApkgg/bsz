import { A, useLocation } from "@solidjs/router";
import { type Component, type JSX, For } from "solid-js";
import { cn } from "~/lib/utils";
import { t } from "~/lib/i18n";

type Item = { href: string; labelKey: Parameters<typeof t>[0]; icon: JSX.Element };

const items: Item[] = [
  {
    href: "/app/overview",
    labelKey: "nav.overview",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="size-4">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/app/sites",
    labelKey: "nav.sites",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="size-4">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
      </svg>
    ),
  },
  {
    href: "/app/logs",
    labelKey: "nav.logs",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="size-4">
        <path d="M4 5h16M4 12h16M4 19h10" stroke-linecap="round" />
      </svg>
    ),
  },
  {
    href: "/app/settings",
    labelKey: "nav.settings",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="size-4">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
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
          {(item) => (
            <A
              href={item.href}
              class={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                isActive(item.href) && "bg-accent text-accent-foreground font-medium",
              )}
            >
              <span class="opacity-80">{item.icon}</span>
              <span>{t(item.labelKey)}</span>
            </A>
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
