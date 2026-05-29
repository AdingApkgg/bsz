import { Show, createEffect, createSignal, type Component } from "solid-js";
import { Undo2, X } from "lucide-solid";
import { Motion, Presence } from "solid-motionone";
import { currentUndo, runUndo, dismissUndo } from "~/lib/undo";
import { t } from "~/lib/i18n";

const UndoToast: Component = () => {
  const [progress, setProgress] = createSignal(0);

  createEffect(() => {
    const u = currentUndo();
    if (!u) {
      setProgress(0);
      return;
    }
    const total = u.expiresAt - Date.now();
    const start = Date.now();
    const tick = () => {
      if (!currentUndo()) return;
      const elapsed = Date.now() - start;
      setProgress(Math.min(100, (elapsed / total) * 100));
      if (elapsed < total) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  return (
    <Presence>
      <Show when={currentUndo()}>
        {(u) => (
          <Motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            class="-translate-x-1/2 fixed bottom-6 left-1/2 z-50"
          >
            <div class="overflow-hidden rounded-lg border border-border bg-card shadow-2xl">
              <div class="flex items-center gap-3 px-4 py-2.5">
                <span class="text-sm">{u().label}</span>
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  onClick={runUndo}
                >
                  <Undo2 class="size-3.5" />
                  {t("common.undo")}
                </button>
                <button
                  type="button"
                  class="text-muted-foreground transition-colors hover:text-foreground"
                  onClick={dismissUndo}
                  aria-label="dismiss"
                >
                  <X class="size-3.5" />
                </button>
              </div>
              <div class="h-0.5 bg-muted">
                <div class="h-full bg-primary transition-[width]" style={{ width: `${progress()}%` }} />
              </div>
            </div>
          </Motion.div>
        )}
      </Show>
    </Presence>
  );
};

export default UndoToast;
