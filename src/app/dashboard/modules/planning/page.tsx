import { redirect } from "next/navigation";

export default function PlanningIndexPage() {
  const today = new Date().toISOString().split("T")[0];
  redirect(`/dashboard/modules/planning/${today}`);
}
