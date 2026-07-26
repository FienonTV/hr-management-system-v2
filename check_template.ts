import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
(async () => {
  const t = await p.documentTemplate.findFirst({
    where: { name: "Test-Bescheinigung" },
    select: { id: true, name: true, content: true, variables: true, isActive: true },
  });
  console.log(JSON.stringify(t, null, 2));
  await p.$disconnect();
})();
