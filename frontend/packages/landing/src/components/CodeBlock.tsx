import { Show, createResource, createSignal, type Component } from "solid-js";
import { Check, Copy } from "lucide-solid";
import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import githubLight from "shiki/themes/github-light.mjs";
import githubDark from "shiki/themes/github-dark.mjs";
import javascript from "shiki/langs/javascript.mjs";
import json from "shiki/langs/json.mjs";

// Single highlighter shared across all CodeBlock instances. The web bundle
// would carry every language Shiki ships; we ship only what we render,
// and the JavaScript regex engine instead of the Oniguruma wasm.
let highlighterPromise: Promise<HighlighterCore> | null = null;
function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [githubLight, githubDark],
      langs: [javascript, json],
      engine: createJavaScriptRegexEngine(),
    });
  }
  return highlighterPromise;
}

type Props = { code: string; lang?: "javascript" | "json" };

const CodeBlock: Component<Props> = (props) => {
  const [html] = createResource(
    () => props.code,
    async (code) => {
      const hl = await getHighlighter();
      return hl.codeToHtml(code, {
        lang: props.lang ?? "javascript",
        themes: { light: "github-light", dark: "github-dark" },
        defaultColor: false,
      });
    },
  );
  const [copied, setCopied] = createSignal(false);
  let resetTimer: ReturnType<typeof setTimeout> | undefined;
  const onCopy = async () => {
    // navigator.clipboard requires a secure context (HTTPS or localhost).
    // The deploy ships over HTTPS, dev runs on localhost — both fine.
    try {
      await navigator.clipboard.writeText(props.code);
      setCopied(true);
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked (iframe permissions etc.) — silently no-op */
    }
  };
  return (
    <div class="group relative">
      <div
        class="code-block overflow-x-auto rounded-md border border-border p-3 text-xs leading-relaxed"
        innerHTML={html() ?? `<pre class="shiki-fallback">${escapeHtml(props.code)}</pre>`}
      />
      <button
        type="button"
        onClick={onCopy}
        aria-label={copied() ? "Copied" : "Copy code"}
        class="absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded-md border border-border bg-background/80 text-muted-foreground opacity-0 backdrop-blur transition hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
      >
        <Show when={copied()} fallback={<Copy class="size-3.5" />}>
          <Check class="size-3.5 text-primary" />
        </Show>
      </button>
    </div>
  );
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c);
}

export default CodeBlock;
