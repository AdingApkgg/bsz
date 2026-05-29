import { createSignal } from "solid-js";

export type UndoEntry = {
  id: number;
  label: string;
  undo: () => Promise<void>;
  expiresAt: number;
};

const UNDO_WINDOW_MS = 6000;

const [entry, setEntry] = createSignal<UndoEntry | null>(null);
let counter = 0;
let timer: ReturnType<typeof setTimeout> | null = null;

export { entry as currentUndo };

export function offerUndo(label: string, undo: () => Promise<void>) {
  if (timer) clearTimeout(timer);
  const id = ++counter;
  setEntry({ id, label, undo, expiresAt: Date.now() + UNDO_WINDOW_MS });
  timer = setTimeout(() => {
    if (entry()?.id === id) setEntry(null);
  }, UNDO_WINDOW_MS);
}

export async function runUndo() {
  const e = entry();
  if (!e) return;
  setEntry(null);
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  await e.undo();
}

export function dismissUndo() {
  setEntry(null);
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}
