import { redirect } from "next/navigation";

export default function EmployeesNewRedirect() {
  redirect("/dashboard/modules/employees/new");
}
