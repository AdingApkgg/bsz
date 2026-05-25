import { onCleanup, onMount, type JSX, type ParentComponent } from "solid-js";

type Props = {
  title: string;
  onClose: () => void;
  width?: "sm" | "md" | "lg";
  children: JSX.Element;
};

const Modal: ParentComponent<Props> = (props) => {
  const widthClass = () =>
    props.width === "lg" ? "max-w-[720px]" : props.width === "sm" ? "max-w-[360px]" : "max-w-[480px]";

  onMount(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && props.onClose();
    window.addEventListener("keydown", onKey);
    onCleanup(() => window.removeEventListener("keydown", onKey));
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    onCleanup(() => { document.body.style.overflow = original; });
  });

  return (
    <div
      class="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => e.target === e.currentTarget && props.onClose()}
    >
      <div class={`w-full ${widthClass()} animate-slide-up rounded-lg border border-border bg-card shadow-xl`}>
        <div class="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 class="text-base font-medium">{props.title}</h3>
          <button
            type="button"
            class="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            onClick={props.onClose}
            aria-label="关闭"
          >
            ✕
          </button>
        </div>
        <div class="p-5">{props.children}</div>
      </div>
    </div>
  );
};

export default Modal;
