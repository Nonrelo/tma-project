import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const telegramId = process.env.INITIAL_ADMIN_TELEGRAM_ID;
  if (!telegramId) {
    console.log('No INITIAL_ADMIN_TELEGRAM_ID set, skipping seed');
    return;
  }

  const admin = await prisma.admin.upsert({
    where: { telegramId },
    update: {},
    create: { telegramId },
  });

  console.log(`✅ Admin created: ${admin.telegramId}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
