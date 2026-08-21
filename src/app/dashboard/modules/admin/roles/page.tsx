import { guardModule } from "@/lib/actions/moduleGuard";
import { redirect } from "next/navigation";

export default function AdminRolesPage() {
  redirect("/dashboard/modules/roles");
}
