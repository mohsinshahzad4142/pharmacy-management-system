import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || "";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// یہ ہمارا مین Prisma کا کنکشن ہے جو پوری ایپ میں استعمال ہوگا
const prisma = new PrismaClient({ adapter });

export default prisma;