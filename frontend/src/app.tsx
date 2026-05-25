import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { MetaProvider } from "@solidjs/meta";
import { Suspense, onMount } from "solid-js";
import { Toaster } from "~/components/ui/sonner";
import { initTheme } from "~/lib/theme";
import { setLocale, locale } from "~/lib/i18n";
import "./app.css";

export default function App() {
  return (
    <Router
      root={(props) => {
        onMount(() => {
          initTheme();
          setLocale(locale());
        });
        return (
          <MetaProvider>
            <Suspense>{props.children}</Suspense>
            <Toaster position="bottom-right" />
          </MetaProvider>
        );
      }}
    >
      <FileRoutes />
    </Router>
  );
}
