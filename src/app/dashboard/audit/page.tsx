import { redirect } from "next/navigation";

export default function AuditRedirect() {
  redirect("/dashboard/modules/audit");
}
