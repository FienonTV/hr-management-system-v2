import { redirect } from "next/navigation";

export default function RolesNewRedirect() {
  redirect("/dashboard/modules/roles/new");
}
