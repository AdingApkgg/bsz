import { For, Show, createSignal, type Component } from "solid-js";
import { activeConnection, connections, setActive } from "~/lib/connections";
import {
  type DictKey,
  LOCALE_LIST,
  locale,
  localeFullLabel,
  localeShortLabel,
  setLocale,
  t,
} from "~/lib/i18n";
import { theme, setTheme, type Theme } from "@bsz/shared/lib/theme";
import { Button } from "@bsz/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@bsz/shared/components/ui/dropdown-menu";
import { A } from "@solidjs/router";

type Props = { onOpenCommand: () => void };

const TopBar: Component<Props> = (props) => {
  const active = () => activeConnection();
  return (
    <header class="flex h-12 items-center gap-3 border-b border-border bg-background px-4">
      <ConnectionMenu />
      <button
        type="button"
        class="flex h-8 flex-1 max-w-md items-center gap-2 rounded-md border border-border bg-card/60 px-3 text-xs text-muted-foreground transition-colors hover:bg-card"
        onClick={() => props.onOpenCommand()}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="size-3.5">
          <circle cx="11" cy="11" r="7" />
          <path d="m16.65 16.65 4 4" stroke-linecap="round" />
        </svg>
        <span class="flex-1 text-left">{t("top.search")}</span>
        <kbd class="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
      </button>

      <ThemeMenu />
      <LanguageMenu />

      <Show when={!active()}>
        <A href="/welcome">
          <Button size="sm" variant="outline" class="h-8">
            {t("top.add_connection")}
          </Button>
        </A>
      </Show>
    </header>
  );
};

const ConnectionMenu: Component = () => {
  const active = () => activeConnection();
  const [open, setOpen] = createSignal(false);
  return (
    <DropdownMenu open={open()} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        // biome-ignore lint/suspicious/noExplicitAny: Kobalte polymorphic `as` prop
        as={(p: any) => (
          <button
            {...p}
            class="flex h-8 items-center gap-2 rounded-md border border-border bg-card/60 px-3 text-xs transition-colors hover:bg-card"
          >
            <span class="inline-block size-2 rounded-full bg-primary" />
            <span class="max-w-[160px] truncate">{active()?.name ?? t("top.no_connection")}</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="size-3 opacity-60"
            >
              <path d="m6 9 6 6 6-6" stroke-linecap="round" />
            </svg>
          </button>
        )}
      />
      <DropdownMenuContent class="w-60">
        <DropdownMenuLabel class="text-xs text-muted-foreground">
          {t("settings.connections")}
        </DropdownMenuLabel>
        <For each={connections()}>
          {(c) => (
            <DropdownMenuItem onSelect={() => setActive(c.id)} class="flex items-center justify-between">
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm">{c.name}</div>
                <div class="truncate font-mono text-[10px] text-muted-foreground">{c.baseUrl}</div>
              </div>
              <Show when={c.id === active()?.id}>
                <span class="ml-2 text-xs text-primary">●</span>
              </Show>
            </DropdownMenuItem>
          )}
        </For>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => window.location.assign("/welcome")}>
          + {t("top.add_connection")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => window.location.assign("/app/settings")}>
          {t("settings.connections")}…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const LanguageMenu: Component = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        // biome-ignore lint/suspicious/noExplicitAny: Kobalte polymorphic `as` prop
        as={(p: any) => (
          <Button {...p} size="sm" variant="ghost" class="h-8 px-2.5 text-xs" title={t("top.language")}>
            {localeShortLabel()}
          </Button>
        )}
      />
      <DropdownMenuContent class="w-36">
        <For each={LOCALE_LIST}>
          {(v) => (
            <DropdownMenuItem onSelect={() => setLocale(v)} class="flex items-center justify-between">
              <span>{localeFullLabel(v)}</span>
              <Show when={locale() === v}>
                <span class="text-primary">●</span>
              </Show>
            </DropdownMenuItem>
          )}
        </For>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const ThemeMenu: Component = () => {
  const labels: Record<Theme, DictKey> = {
    system: "theme.system",
    light: "theme.light",
    dark: "theme.dark",
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        // biome-ignore lint/suspicious/noExplicitAny: Kobalte polymorphic `as` prop
        as={(p: any) => (
          <Button {...p} size="sm" variant="ghost" class="h-8 w-8 p-0" title={t("top.theme")}>
            <Show when={theme() === "dark"} fallback={<SunIcon />}>
              <MoonIcon />
            </Show>
          </Button>
        )}
      />
      <DropdownMenuContent class="w-40">
        <For each={["system", "light", "dark"] as Theme[]}>
          {(v) => (
            <DropdownMenuItem onSelect={() => setTheme(v)}>
              <span class="flex-1">{t(labels[v])}</span>
              <Show when={theme() === v}>
                <span class="text-primary">●</span>
              </Show>
            </DropdownMenuItem>
          )}
        </For>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="size-4">
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
        stroke-linecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="size-4">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default TopBar;
