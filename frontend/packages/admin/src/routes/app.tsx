import { Show, type ParentComponent } from "solid-js";
import { Navigate } from "@solidjs/router";
import { Motion } from "solid-motionone";
import Sidebar from "~/components/app-shell/Sidebar";
import TopBar from "~/components/app-shell/TopBar";
import CommandPalette, { useCommandHotkey } from "~/components/app-shell/CommandPalette";
import UndoToast from "~/components/app-shell/UndoToast";
import { activeConnection } from "~/lib/connections";

const AppLayout: ParentComponent = (props) => {
  const [cmdOpen, setCmdOpen] = useCommandHotkey();

  return (
    <Show when={activeConnection()} fallback={<Navigate href="/welcome" />}>
      <div class="flex h-screen bg-background">
        <Sidebar />
        <div class="flex flex-1 flex-col overflow-hidden">
          <TopBar onOpenCommand={() => setCmdOpen(true)} />
          <Motion.main
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            class="flex-1 overflow-y-auto"
          >
            {props.children}
          </Motion.main>
        </div>
        <CommandPalette open={cmdOpen()} onOpenChange={setCmdOpen} />
        <UndoToast />
      </div>
    </Show>
  );
};

export default AppLayout;
