import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const router = express.Router();

// 🔴 ERROR FIX: Yahan bhi adapter aur pool lazmi dena tha
const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 1. نیا خرچہ (Expense) ایڈ کرنے کی API
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, amount, description, date } = req.body;

    const newExpense = await prisma.expense.create({
      data: {
        title,
        amount: Number(amount),
        description: description || '',
        date: date ? new Date(date) : new Date(),
      },
    });

    res.status(201).json({ success: true, data: newExpense });
  } catch (error: any) {
    console.error('Error creating expense:', error);
    // 🔴 یہاں ہم نے اصل ایرر میسج فرنٹ اینڈ کو بھیج دیا ہے
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server Error',
      details: error.meta || error 
    });
  }
});
export default router;