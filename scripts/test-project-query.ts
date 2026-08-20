import { prisma } from "@/lib/db/prisma";

async function main() {
  try {
    const result = await prisma.projectCustomValue.findMany({ take: 5 });
    console.log("Direct OK", result.length);
  } catch (err: any) {
    console.error("Direct FAIL", err.message);
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      return tx.projectCustomValue.findMany({ take: 5 });
    });
    console.log("Transaction OK", result.length);
  } catch (err: any) {
    console.error("Transaction FAIL", err.message);
  }

  await prisma.$disconnect();
}

main();
