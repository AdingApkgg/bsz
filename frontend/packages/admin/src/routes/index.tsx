import { Navigate } from "@solidjs/router";
import { activeConnection } from "~/lib/connections";

export default function Index() {
  return <Navigate href={activeConnection() ? "/app/overview" : "/welcome"} />;
}
