import { redirect } from "next/navigation";

export default function RolesIdRedirect({ params }: { params: Promise<{ id: string }> }) {
  void params;
  redirect("/dashboard/modules/roles");
}
