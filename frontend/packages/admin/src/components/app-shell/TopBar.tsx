import { For, Show, createSignal, type Component } from "solid-js";
import { A } from "@solidjs/router";
import { ChevronDown, Search } from "lucide-solid";
import { Motion } from "solid-motionone";
import { activeConnection, connections, setActive } from "~/lib/connections";
import {
  LOCALE_LIST,
  locale,
  localeFullLabel,
  localeShortLabel,
  setLocale,
  t,
} from "~/lib/i18n";
import { Button } from "@bsz/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@bsz/shared/components/ui/dropdown-menu";

type Props = { onOpenCommand: () => void };

const TopBar: Component<Props> = (props) => {
  const active = () => activeConnection();
  return (
    <Motion.header
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      class="flex h-12 items-center gap-3 border-b border-border bg-background px-4"
    >
      <ConnectionMenu />
      <button
        type="button"
        class="flex h-8 max-w-md flex-1 items-center gap-2 rounded-md border border-border bg-card/60 px-3 text-xs text-muted-foreground transition-colors hover:bg-card"
        onClick={() => props.onOpenCommand()}
      >
        <Search class="size-3.5" />
        <span class="flex-1 text-left">{t("top.search")}</span>
        <kbd class="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
      </button>

      <LanguageMenu />

      <Show when={!active()}>
        <A href="/welcome">
          <Button size="sm" variant="outline" class="h-8">
            {t("top.add_connection")}
          </Button>
        </A>
      </Show>
    </Motion.header>
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
            <ChevronDown class="size-3 opacity-60" />
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

const LanguageMenu: Component = () => (
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

export default TopBar;
