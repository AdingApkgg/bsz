import { createSignal, Show, type Component } from "solid-js";
import { cn } from "~/lib/cn";

type Toast = { id: number; msg: string; type: "info" | "error" | "success" };

const [toasts, setToasts] = createSignal<Toast[]>([]);
let counter = 0;

export function toast(msg: string, type: Toast["type"] = "info") {
  const id = ++counter;
  setToasts((prev) => [...prev, { id, msg, type }]);
  setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2500);
}

export const Toaster: Component = () => {
  return (
    <div class="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts().map((t) => (
        <Show when={t}>
          <div
            class={cn(
              "animate-slide-up rounded-md border bg-card px-4 py-2.5 text-sm shadow-lg",
              t.type === "error" && "border-destructive text-destructive",
              t.type === "success" && "border-primary text-primary",
              t.type === "info" && "border-border text-foreground",
            )}
          >
            {t.msg}
          </div>
        </Show>
      ))}
    </div>
  );
};
