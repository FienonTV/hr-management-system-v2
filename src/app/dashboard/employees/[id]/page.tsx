import { redirect } from "next/navigation";

export default function EmployeesIdRedirect({ params }: { params: Promise<{ id: string }> }) {
  void params;
  redirect("/dashboard/modules/employees");
}
