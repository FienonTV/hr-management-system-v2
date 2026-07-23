import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('admin123', 12);
  console.log('Hashed password:', password);

  const foundUser = await prisma.user.findFirst({
    where: { email: 'admin@example.com' }
  });

  if (foundUser) {
    await prisma.user.update({
      where: { id: foundUser.id },
      data: { passwordHash: password },
    });
    console.log('User updated successfully');
  } else {
    console.error('User admin@example.com not found');
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
