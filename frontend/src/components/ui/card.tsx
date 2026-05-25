import { splitProps, type JSX, type ParentComponent } from "solid-js";
import { cn } from "~/lib/cn";

type DivProps = JSX.HTMLAttributes<HTMLDivElement>;

export const Card: ParentComponent<DivProps> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div class={cn("rounded-lg border border-border bg-card text-card-foreground shadow-sm", local.class)} {...rest}>
      {local.children}
    </div>
  );
};

export const CardHeader: ParentComponent<DivProps> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return <div class={cn("flex flex-col space-y-1.5 p-6", local.class)} {...rest}>{local.children}</div>;
};

export const CardTitle: ParentComponent<DivProps> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return <h3 class={cn("text-lg font-semibold leading-none tracking-tight", local.class)} {...rest}>{local.children}</h3>;
};

export const CardContent: ParentComponent<DivProps> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return <div class={cn("p-6 pt-0", local.class)} {...rest}>{local.children}</div>;
};
