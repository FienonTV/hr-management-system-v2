import { redirect } from "next/navigation";
import { guardModule } from "@/lib/actions/moduleGuard";

export default async function PlanningIndexPage() {
  await guardModule("planning");
  const today = new Date().toISOString().split("T")[0];
  redirect(`/dashboard/modules/planning/${today}`);
}
