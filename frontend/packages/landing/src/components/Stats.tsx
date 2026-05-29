import { createResource, Show, type Component } from "solid-js";
import { Motion } from "solid-motionone";
import { Card } from "@bsz/shared/components/ui/card";
import { t } from "../i18n";

// Renders the live PV/UV/page-PV strip at the top of the page. Only mounted
// when VITE_DEMO_API is set, so forks/templates don't accidentally point at
// a stranger's backend.
const DEMO_API = import.meta.env.VITE_DEMO_API;

type ApiResponse = { success: boolean; data: { site_pv: number; site_uv: number; page_pv: number } };

async function fetchStats(): Promise<ApiResponse["data"] | null> {
  if (!DEMO_API) return null;
  try {
    const res = await fetch(`${DEMO_API}/api`, {
      method: "POST",
      credentials: "include",
      headers: { "x-bsz-referer": location.href },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as ApiResponse;
    return body.success ? body.data : null;
  } catch {
    return null;
  }
}

const StatBox: Component<{ label: string; value: number | undefined }> = (props) => (
  <Card class="flex flex-col items-center justify-center gap-1 px-4 py-5">
    <div class="font-semibold text-2xl text-primary tabular-nums">
      <Show when={props.value !== undefined} fallback={<span class="text-muted-foreground">…</span>}>
        {(props.value ?? 0).toLocaleString()}
      </Show>
    </div>
    <div class="text-muted-foreground text-xs">{props.label}</div>
  </Card>
);

const Stats: Component = () => {
  const [data] = createResource(fetchStats);
  // fetchStats() swallows errors and resolves null — when the backend is
  // unreachable we hide the strip rather than render zeros.
  return (
    <Show when={!data.loading && data() !== null}>
      <Motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        class="mb-6 grid grid-cols-3 gap-3"
      >
        <StatBox label={t("stats_site_pv")} value={data()?.site_pv} />
        <StatBox label={t("stats_site_uv")} value={data()?.site_uv} />
        <StatBox label={t("stats_page_pv")} value={data()?.page_pv} />
      </Motion.div>
    </Show>
  );
};

export const STATS_ENABLED = Boolean(DEMO_API);
export default Stats;
