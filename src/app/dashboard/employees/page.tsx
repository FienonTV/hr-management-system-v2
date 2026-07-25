import { redirect } from "next/navigation";

export default function EmployeesRedirect() {
  redirect("/dashboard/modules/employees");
}
