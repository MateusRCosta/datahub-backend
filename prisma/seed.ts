import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { seedAdmin } from './seeds/seed-admin';

const prisma = new PrismaClient({
  adapter: new PrismaPg(
    new Pool({
      connectionString: process.env.DATABASE_URL,
    }),
  ),
});

async function main() {
  console.log('🌱 Iniciando seeds...');

  await seedAdmin(prisma);

  console.log('🌱 Seeds finalizadas com sucesso');
}

main()
  .catch((error) => {
    console.error('❌ Erro ao executar seeds:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
