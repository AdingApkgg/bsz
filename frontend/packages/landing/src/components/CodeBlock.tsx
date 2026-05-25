import { createResource, type Component } from "solid-js";
import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import githubLight from "shiki/themes/github-light.mjs";
import githubDark from "shiki/themes/github-dark.mjs";
import javascript from "shiki/langs/javascript.mjs";

// Single highlighter shared across all CodeBlock instances. The web bundle
// would carry every language Shiki ships; we ship only what we render,
// and the JavaScript regex engine instead of the Oniguruma wasm.
let highlighterPromise: Promise<HighlighterCore> | null = null;
function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [githubLight, githubDark],
      langs: [javascript],
      engine: createJavaScriptRegexEngine(),
    });
  }
  return highlighterPromise;
}

type Props = { code: string; lang?: "javascript" };

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
  return (
    <div
      class="code-block overflow-x-auto rounded-md border border-border p-3 text-xs leading-relaxed"
      innerHTML={html() ?? `<pre class="shiki-fallback">${escapeHtml(props.code)}</pre>`}
    />
  );
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c);
}

export default CodeBlock;
