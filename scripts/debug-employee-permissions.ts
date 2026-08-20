import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Find simon user
  const user = await prisma.user.findFirst({
    where: { email: "simonwidansk@outlook.de" },
    include: { tenant: true, employee: true },
  });
  if (!user) {
    console.log("User not found");
    return;
  }
  console.log("User:", user.id, user.email, "employeeId:", user.employeeId, "tenant:", user.tenantId);

  // Try the same query getEmployees does
  const employees = await prisma.employee.findMany({
    where: {
      tenantId: user.tenantId,
      userAccount: { id: user.id },
    },
    include: { userAccount: true },
  });
  console.log("Employees found with userAccount filter:", employees.length);
  if (employees.length > 0) {
    console.log(employees[0].id, employees[0].firstName, employees[0].lastName);
  }

  // Try with direct employeeId
  const byId = await prisma.employee.findUnique({
    where: { id: user.employeeId ?? "x" },
  });
  console.log("Employee by id:", byId ? `${byId.id} ${byId.firstName} ${byId.lastName}` : "not found");

  // Try without relation filter
  const all = await prisma.employee.findMany({
    where: { tenantId: user.tenantId },
    include: { userAccount: true },
  });
  console.log("All employees in tenant:", all.length);
  for (const e of all.slice(0, 3)) {
    console.log(" -", e.id, e.firstName, e.lastName, "userId:", e.userAccount?.id);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
