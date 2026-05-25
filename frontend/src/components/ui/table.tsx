import { splitProps, type JSX, type ParentComponent } from "solid-js";
import { cn } from "~/lib/cn";

export const Table: ParentComponent<JSX.HTMLAttributes<HTMLTableElement>> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div class="w-full overflow-auto">
      <table class={cn("w-full caption-bottom text-sm", local.class)} {...rest}>
        {local.children}
      </table>
    </div>
  );
};

export const THead: ParentComponent<JSX.HTMLAttributes<HTMLTableSectionElement>> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return <thead class={cn("[&_tr]:border-b", local.class)} {...rest}>{local.children}</thead>;
};

export const TBody: ParentComponent<JSX.HTMLAttributes<HTMLTableSectionElement>> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return <tbody class={cn("[&_tr:last-child]:border-0", local.class)} {...rest}>{local.children}</tbody>;
};

export const Tr: ParentComponent<JSX.HTMLAttributes<HTMLTableRowElement>> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <tr class={cn("border-b border-border transition-colors hover:bg-secondary/30", local.class)} {...rest}>
      {local.children}
    </tr>
  );
};

export const Th: ParentComponent<JSX.ThHTMLAttributes<HTMLTableCellElement>> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <th
      class={cn(
        "h-10 px-4 text-left align-middle text-xs font-medium uppercase tracking-wider text-muted-foreground",
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </th>
  );
};

export const Td: ParentComponent<JSX.TdHTMLAttributes<HTMLTableCellElement>> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return <td class={cn("p-4 align-middle", local.class)} {...rest}>{local.children}</td>;
};
