import { guardModule } from "@/lib/actions/moduleGuard";
import Client from "./Client";

export default async function Page() {
  await guardModule("timeTracking", "timeTracking:read");
  return <Client />;
}
