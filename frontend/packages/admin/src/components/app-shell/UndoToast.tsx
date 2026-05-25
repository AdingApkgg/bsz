import { Show, createEffect, createSignal, type Component } from "solid-js";
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
    <Show when={currentUndo()}>
      {(u) => (
        <div class="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-slide-up">
          <div class="overflow-hidden rounded-lg border border-border bg-card shadow-2xl">
            <div class="flex items-center gap-3 px-4 py-2.5">
              <span class="text-sm">{u().label}</span>
              <button
                type="button"
                class="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                onClick={runUndo}
              >
                {t("common.undo")}
              </button>
              <button
                type="button"
                class="text-xs text-muted-foreground hover:text-foreground"
                onClick={dismissUndo}
                aria-label="dismiss"
              >
                ✕
              </button>
            </div>
            <div class="h-0.5 bg-muted">
              <div class="h-full bg-primary transition-[width]" style={{ width: `${progress()}%` }} />
            </div>
          </div>
        </div>
      )}
    </Show>
  );
};

export default UndoToast;
