import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

async function main() {
  console.log('Starting simple test...');
  const prisma = new PrismaClient();
  await prisma.$connect();
  console.log('Connected!');
  await prisma.$disconnect();
}

main().catch(console.error);
