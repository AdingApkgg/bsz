import { createResource, createSignal, For, Show, onCleanup, onMount, type Component } from "solid-js";
import { useNavigate } from "@solidjs/router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@bsz/shared/components/ui/command";
import { LOCALE_LIST, locale, localeFullLabel, setLocale, t } from "~/lib/i18n";
import { activeConnection, connections, setActive } from "~/lib/connections";
import { api, type SiteKey, exportDownloadUrl } from "~/lib/api";

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

const CommandPalette: Component<Props> = (props) => {
  const navigate = useNavigate();

  // Fetch sites lazily when palette opens
  const [sites] = createResource(
    () => (props.open && activeConnection()?.token ? "load" : null),
    async () => {
      try {
        const r = await api.get<SiteKey[]>("/keys?count=500");
        return r.data ?? [];
      } catch {
        return [];
      }
    },
  );

  function go(path: string) {
    props.onOpenChange(false);
    navigate(path);
  }

  return (
    <CommandDialog open={props.open} onOpenChange={props.onOpenChange}>
      <CommandInput placeholder={t("cmd.placeholder")} />
      <CommandList>
        <CommandEmpty>{t("cmd.no_results")}</CommandEmpty>

        <CommandGroup heading={t("nav.overview")}>
          <CommandItem onSelect={() => go("/app/overview")}>{t("cmd.go_overview")}</CommandItem>
          <CommandItem onSelect={() => go("/app/sites")}>{t("cmd.go_sites")}</CommandItem>
          <CommandItem onSelect={() => go("/app/logs")}>{t("cmd.go_logs")}</CommandItem>
          <CommandItem onSelect={() => go("/app/settings")}>{t("cmd.go_settings")}</CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t("top.language")}>
          <For each={LOCALE_LIST}>
            {(v) => (
              <CommandItem
                onSelect={() => {
                  setLocale(v);
                  props.onOpenChange(false);
                }}
              >
                <span class="flex-1">{localeFullLabel(v)}</span>
                <Show when={locale() === v}>
                  <span class="text-primary">●</span>
                </Show>
              </CommandItem>
            )}
          </For>
        </CommandGroup>

        <Show when={connections().length > 1}>
          <CommandSeparator />
          <CommandGroup heading={t("settings.connections")}>
            <For each={connections()}>
              {(c) => (
                <CommandItem
                  onSelect={() => {
                    setActive(c.id);
                    props.onOpenChange(false);
                  }}
                >
                  <span class="flex-1">{c.name}</span>
                  <Show when={c.id === activeConnection()?.id}>
                    <span class="text-primary">●</span>
                  </Show>
                </CommandItem>
              )}
            </For>
          </CommandGroup>
        </Show>

        <Show when={activeConnection()?.token}>
          <CommandSeparator />
          <CommandGroup heading={t("settings.data")}>
            <CommandItem
              onSelect={() => {
                window.location.href = exportDownloadUrl();
                props.onOpenChange(false);
              }}
            >
              {t("cmd.export")}
            </CommandItem>
          </CommandGroup>
        </Show>

        <Show when={(sites()?.length ?? 0) > 0}>
          <CommandSeparator />
          <CommandGroup heading={t("sites.title")}>
            <For each={sites() ?? []}>
              {(site) => (
                <CommandItem
                  value={site.site_key}
                  onSelect={() => go(`/app/sites/${encodeURIComponent(site.site_key)}`)}
                >
                  <span class="flex-1 font-mono">{site.site_key}</span>
                  <span class="text-xs text-muted-foreground tabular-nums">
                    {site.site_pv.toLocaleString()} PV
                  </span>
                </CommandItem>
              )}
            </For>
          </CommandGroup>
        </Show>
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;

export function useCommandHotkey() {
  const [open, setOpen] = createSignal(false);
  onMount(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    onCleanup(() => window.removeEventListener("keydown", onKey));
  });
  return [open, setOpen] as const;
}
