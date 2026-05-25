import { MetaProvider } from "@solidjs/meta";
import { Navigate, Route, Router } from "@solidjs/router";
import { Suspense, lazy, onMount, type ParentComponent } from "solid-js";
import { Toaster } from "@bsz/shared/components/ui/sonner";
import { locale, setLocale } from "~/lib/i18n";
import { initTheme } from "@bsz/shared/lib/theme";

// Eager — small and on every cold start
import IndexRedirect from "./routes/index";
import Welcome from "./routes/welcome";

// Lazy — only loaded once the user enters /app/*
const AppLayout = lazy(() => import("./routes/app"));
const Overview = lazy(() => import("./routes/app/overview"));
const SitesList = lazy(() => import("./routes/app/sites/index"));
const SiteDetail = lazy(() => import("./routes/app/sites/[siteKey]"));
const Logs = lazy(() => import("./routes/app/logs"));
const Settings = lazy(() => import("./routes/app/settings"));

const Root: ParentComponent = (props) => {
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
};

const RedirectToOverview = () => <Navigate href="/app/overview" />;

export default function App() {
  return (
    <Router root={Root}>
      <Route path="/" component={IndexRedirect} />
      <Route path="/welcome" component={Welcome} />
      <Route path="/app" component={AppLayout}>
        <Route path="/" component={RedirectToOverview} />
        <Route path="/overview" component={Overview} />
        <Route path="/sites" component={SitesList} />
        <Route path="/sites/:siteKey" component={SiteDetail} />
        <Route path="/logs" component={Logs} />
        <Route path="/settings" component={Settings} />
      </Route>
    </Router>
  );
}
