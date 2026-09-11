import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

async function main() {
  console.log('🌱 Connecting to live database using Prisma adapter...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL nahi mili .env file mein!');
    process.exit(1);
  }

  // Driver adapter setup (jaise aapke baqi backend code mein hai)
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const hashedAdminPassword = await bcrypt.hash('admin123', 10);
  const hashedCashierPassword = await bcrypt.hash('cashier123', 10);

  // Admin Account
  await prisma.user.upsert({
    where: { email: 'admin@pharmacy.com' },
    update: { password: hashedAdminPassword },
    create: {
      email: 'admin@pharmacy.com',
      password: hashedAdminPassword,
      role: 'ADMIN',
      name: 'Admin'
    },
  });

  // Cashier Account
  await prisma.user.upsert({
    where: { email: 'cashier@pharmacy.com' },
    update: { password: hashedCashierPassword },
    create: {
      email: 'cashier@pharmacy.com',
      password: hashedCashierPassword,
      role: 'CASHIER',
      name: 'Cashier'
    },
  });

  console.log('✅ Admin aur Cashier accounts live database mein kamyabi se ban gaye hain!');
  
  await prisma.$disconnect();
  await pool.end();
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  });