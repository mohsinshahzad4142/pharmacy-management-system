import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

import customerRoutes from './routes/customerRoutes';

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'pharmacy_super_secret_key_2026';

// ==========================================
// 📁 PRISMA DATABASE CONNECTION
// ==========================================
const connectionString = process.env.DATABASE_URL || "";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Bulk import ke liye limit barha di

app.use('/api/customers', customerRoutes);

app.get('/', (req: Request, res: Response) => {
  res.json({ message: "Welcome to the Pharmacy Management System API!", status: "Healthy" });
});

// ==========================================
// 🛡️ AUTHENTICATION & RBAC MIDDLEWARE
// ==========================================
interface AuthenticatedRequest extends Request {
  user?: { userId: number; email: string; role: string };
}

const verifyToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; 

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token missing or invalid' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Token is invalid or expired' });
    }
    req.user = user;
    next();
  });
};

const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role?.trim().toLowerCase();
    const normalizedAllowed = allowedRoles.map(r => r.trim().toLowerCase());

    if (!req.user || !userRole || !normalizedAllowed.includes(userRole)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied: Aap ke paas is action ki ijazat nahi hai.' 
      });
    }
    next();
  };
};

// ==========================================
// 🚀 AUTHENTICATION API ROUTES
// ==========================================
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: 'All fields are required' });

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ success: false, message: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: role || 'Cashier' }
    });

    res.status(201).json({ success: true, message: 'User registered successfully', data: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ success: true, message: 'Login successful', token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 🚀 CATEGORY API ROUTES
// ==========================================
app.post('/api/categories', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Category name is required" });
    
    const newCategory = await prisma.category.create({ data: { name, description: description || "" } });
    res.status(201).json({ success: true, message: "Category created successfully", data: newCategory });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message, error: error.message });
  }
});

app.get('/api/categories', verifyToken, async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany();
    res.status(200).json({ success: true, data: categories });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 🚀 MEDICINE API ROUTES
// ==========================================
app.post('/api/medicines', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, genericName, price, stock, categoryId, expiryDate, barcode } = req.body;
    const finalBarcode = barcode && barcode.trim() !== "" ? barcode : `MED-${Date.now()}`;

    const newMedicine = await prisma.medicine.create({
      data: { 
        name, genericName, barcode: finalBarcode,
        price: Number(price), stock: Number(stock), 
        categoryId: Number(categoryId), expiryDate: new Date(expiryDate)
      }
    });

    await prisma.auditLog.create({
      data: { userEmail: req.user?.email || 'Admin', action: 'CREATE', details: `Created medicine: ${newMedicine.name}` }
    });

    res.status(201).json({ success: true, data: newMedicine });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message, message: error.message });
  }
});

app.get('/api/medicines', verifyToken, async (req: Request, res: Response) => {
  try {
    const medicines = await prisma.medicine.findMany({ include: { category: true } });
    res.status(200).json({ success: true, data: medicines });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// ==========================================
// 🚀 CREATE SALE ROUTE (Updated)
// ==========================================
app.post('/api/sales', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { items } = req.body; // Frontend se items aate hain [{ medicineId, quantity }]
    
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty!" });
    }

    let totalPrice = 0;
    const saleItemsData = [];

    // Har item ki price check kar ke total amount calculate karein aur stock kam karein
    for (const item of items) {
      const medicine = await prisma.medicine.findUnique({ 
        where: { id: Number(item.medicineId) } 
      });

      if (!medicine) {
        return res.status(404).json({ success: false, message: `Medicine not found!` });
      }

      if (medicine.stock < item.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${medicine.name}` });
      }

      const itemTotal = medicine.price * item.quantity;
      totalPrice += itemTotal;

      // SaleItem ke liye data prepare karein
      saleItemsData.push({
        medicineId: medicine.id,
        quantity: Number(item.quantity),
        price: medicine.price
      });

      // Stock ko update (kam) karein
      await prisma.medicine.update({
        where: { id: medicine.id },
        data: { stock: medicine.stock - Number(item.quantity) }
      });
    }

    // Sale aur uske SaleItems aik sath database mein save karein
    const newSale = await prisma.sale.create({
      data: {
        totalPrice: totalPrice,
        items: {
          create: saleItemsData
        }
      },
      include: {
        items: {
          include: { medicine: true }
        }
      }
    });

    // Audit Log
    try {
      const userEmailStr = req.user?.email || (typeof req.user === 'string' ? req.user : 'Admin');
      await prisma.auditLog.create({
        data: { 
          userEmail: String(userEmailStr), 
          action: 'CREATE_SALE', 
          details: `Completed Sale ID: ${newSale.id} with Total: Rs. ${totalPrice}` 
        }
      });
    } catch (err) {
      console.error("Audit log error:", err);
    }

    res.status(201).json({ success: true, data: newSale });
  } catch (error: any) {
    console.error("Sale error:", error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ==========================================
// 🚀 DELETE MEDICINE ROUTE (Updated)
// ==========================================
app.delete('/api/medicines/:id', verifyToken, requireRole(['Admin', 'Super Admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // 1. Pehle medicine delete karein
    await prisma.medicine.delete({ where: { id: Number(id) } });

    // 2. Audit log ko safe try-catch mein rakhein taake agar yeh fail ho toh main request kharab na ho
    try {
      const userEmailStr = req.user?.email || (typeof req.user === 'string' ? req.user : 'Admin');
      await prisma.auditLog.create({
        data: { 
          userEmail: String(userEmailStr), 
          action: 'DELETE', 
          details: `Deleted medicine ID: ${id}` 
        }
      });
    } catch (auditErr) {
      console.error("Audit log error (ignored):", auditErr);
    }

    // 3. Success response bhejin
    res.status(200).json({ success: true, message: "Medicine deleted successfully!" });
  } catch (error: any) {
    console.error("Delete medicine error:", error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ==========================================
// 📥 BULK IMPORT MEDICINES (FIXED)
// ==========================================
app.post('/api/medicines/bulk', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { medicines } = req.body;
    if (!Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({ success: false, message: 'کوئی درست ڈیٹا موصول نہیں ہوا!' });
    }

    const uniqueCatIds = [...new Set(medicines.map((med: any) => parseInt(med.CatID) || 1))];

    for (const catId of uniqueCatIds) {
      await prisma.category.upsert({
        where: { id: catId },
        update: {},
        create: { id: catId, name: `Category ${catId}` }
      });
    }

    const createdMedicines = await prisma.medicine.createMany({
      data: medicines.map((med: any) => ({
        name: med.Name,               
        genericName: med.Generic,         
        price: parseFloat(med.Price) || 0,
        stock: parseInt(med.Stock) || 0,
        expiryDate: new Date(med.Expiry), 
        barcode: (med.Barcode && med.Barcode.trim() !== "") ? med.Barcode : `MED-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        categoryId: parseInt(med.CatID) || 1,
      })),
      skipDuplicates: true,
    });

    await prisma.auditLog.create({
      data: { userEmail: req.user?.email || 'Admin', action: 'IMPORT', details: `Imported ${createdMedicines.count} medicines via CSV` }
    });

    return res.status(200).json({
      success: true, 
      message: `کامیابی سے ${createdMedicines.count} دوائیاں ڈیٹا بیس میں محفوظ کر دی گئی ہیں!`,
      count: createdMedicines.count
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'ڈیٹا بیس میں سیو کرتے وقت مسئلہ آیا: ' + error.message, error: error.message });
  }
});

// ==========================================
// 🚀 SALES / BILLING (POS) API ROUTES
// ==========================================
app.post('/api/sales', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { items } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ success: false, error: "Sale mein item hona lazmi hai." });

    let totalPrice = 0;
    const validatedItems = [];

    for (const item of items) {
      const medicine = await prisma.medicine.findUnique({ where: { id: Number(item.medicineId) } });
      if (!medicine) return res.status(404).json({ success: false, error: `Medicine ID ${item.medicineId} nahi mili.` });
      if (medicine.stock < item.quantity) return res.status(400).json({ success: false, error: `Stock na-kaafi hai!` });

      totalPrice += medicine.price * item.quantity;
      validatedItems.push({ medicineId: medicine.id, quantity: item.quantity, price: medicine.price });
    }

    const newSale = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: { totalPrice, items: { create: validatedItems } },
        include: { items: { include: { medicine: true } } }
      });

      for (const vi of validatedItems) {
        await tx.medicine.update({ where: { id: vi.medicineId }, data: { stock: { decrement: vi.quantity } } });
      }
      return sale;
    });

    res.status(201).json({ success: true, message: "Sale mukammal ho gai!", data: newSale });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ==========================================
// 🚀 GET ALL SALES ROUTE (Sales History)
// ==========================================
app.get('/api/sales', verifyToken, async (req: Request, res: Response) => {
  try {
    const sales = await prisma.sale.findMany({
  orderBy: { createdAt: 'desc' }, // Agar pehle se hai toh rehne dein
  include: {
    items: true // <-- YEH LINE MISSING THI JIS KI WAJAH SE 0 ITEMS AA RAHA THA!
  }
});

    res.status(200).json({ success: true, data: sales });
  } catch (error: any) {
    console.error("Get sales error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 🚀 SUPPLIER & PURCHASE API ROUTES
// ==========================================
app.get('/api/suppliers', verifyToken, async (req: Request, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany();
    res.status(200).json({ success: true, data: suppliers });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/suppliers', verifyToken, async (req: Request, res: Response) => {
  try {
    const { name, phone, email, address } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Supplier name is required' });
    const supplier = await prisma.supplier.create({ data: { name, phone, email, address } });
    res.status(201).json({ success: true, message: 'Supplier added!', data: supplier });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/purchases', verifyToken, async (req: Request, res: Response) => {
  try {
    const purchases = await prisma.purchase.findMany({ include: { supplier: true, items: { include: { medicine: true } } }, orderBy: { createdAt: 'desc' } });
    res.status(200).json({ success: true, data: purchases });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/purchases', verifyToken, async (req: Request, res: Response) => {
  try {
    const { supplierId, items } = req.body;
    if (!supplierId || !items || items.length === 0) return res.status(400).json({ success: false, message: 'Data incomplete' });

    let totalAmount = items.reduce((sum: number, item: any) => sum + (Number(item.quantity) * Number(item.costPrice)), 0);

    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          supplierId: Number(supplierId), totalAmount,
          items: { create: items.map((i: any) => ({ medicineId: Number(i.medicineId), quantity: Number(i.quantity), costPrice: Number(i.costPrice) })) }
        },
        include: { items: true }
      });

      for (const item of items) {
        await tx.medicine.update({ where: { id: Number(item.medicineId) }, data: { stock: { increment: Number(item.quantity) } } });
      }
      return purchase;
    });

    res.status(201).json({ success: true, message: 'Purchase recorded!', data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ==========================================
// 🚀 EXPENSES API ROUTES
// ==========================================
app.post('/api/expenses', verifyToken, async (req: Request, res: Response) => {
  try {
    const { title, amount, date, description } = req.body;
    if (!title || !amount || !date) return res.status(400).json({ success: false, message: 'Fields required' });
    const newExpense = await prisma.expense.create({ data: { title, amount: Number(amount), date: new Date(date), description: description || "" } });
    res.status(201).json({ success: true, message: 'Expense added', data: newExpense });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/expenses', verifyToken, async (req: Request, res: Response) => {
  try {
    const expenses = await prisma.expense.findMany({ orderBy: { date: 'desc' } });
    res.status(200).json({ success: true, data: expenses });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/expenses/:id', verifyToken, async (req: Request, res: Response) => {
  try {
    await prisma.expense.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true, message: 'Expense deleted successfully!' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to delete expense' });
  }
});

app.put('/api/expenses/:id', verifyToken, async (req: Request, res: Response) => {
  try {
    const { description, amount, date } = req.body;
    const updatedExpense = await prisma.expense.update({
      where: { id: Number(req.params.id) },
      data: { description, amount: Number(amount), ...(date && { date: new Date(date) }) }
    });
    res.json({ success: true, data: updatedExpense });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to update' });
  }
});

// ==========================================
// 🚀 REPORTS, ANALYTICS & DASHBOARD ALERTS
// ==========================================
app.get('/api/alerts', verifyToken, async (req: Request, res: Response) => {
  try {
    const lowStock = await prisma.medicine.findMany({ where: { stock: { lte: 20 } } });
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    const expiringSoon = await prisma.medicine.findMany({ where: { expiryDate: { lte: nextMonth } } });

    res.status(200).json({ success: true, alerts: { lowStockCount: lowStock.length, expiringCount: expiringSoon.length, lowStock, expiringSoon } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/reports/summary', verifyToken, async (req: Request, res: Response) => {
  try {
    const sales = await prisma.sale.findMany({ include: { items: true } });
    const purchases = await prisma.purchase.findMany({ include: { items: true } });
    const medicines = await prisma.medicine.findMany();
    const expenses = await prisma.expense.findMany();

    const netProfit = sales.reduce((a, s) => a + s.totalPrice, 0) - purchases.reduce((a, p) => a + p.totalAmount, 0) - expenses.reduce((a, e) => a + e.amount, 0);

    res.status(200).json({
      success: true,
      data: {
        totalSalesRevenue: sales.reduce((a, s) => a + s.totalPrice, 0),
        totalSalesTransactions: sales.length,
        totalPurchasesCost: purchases.reduce((a, p) => a + p.totalAmount, 0),
        totalPurchaseInvoices: purchases.length,
        totalInventoryValue: medicines.reduce((a, m) => a + (m.price * m.stock), 0),
        totalMedicinesCount: medicines.length,
        totalExpenses: expenses.reduce((a, e) => a + e.amount, 0),
        netProfit
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/reports/chart', verifyToken, async (req: Request, res: Response) => {
  try {
    const filter = (req.query.filter as string) || '7days';
    const startDate = new Date();
    if (filter === '7days') startDate.setDate(startDate.getDate() - 7);
    else if (filter === '30days') startDate.setDate(startDate.getDate() - 30);
    else if (filter === '12months') startDate.setFullYear(startDate.getFullYear() - 1);

    const [sales, purchases, expenses] = await Promise.all([
      prisma.sale.findMany({ where: { createdAt: { gte: startDate } } }),
      prisma.purchase.findMany({ where: { createdAt: { gte: startDate } } }),
      prisma.expense.findMany({ where: { date: { gte: startDate } } })
    ]);

    const mergedData: any = {};
    const formatDate = (dateObj: any) => filter === '12months' ? `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}` : dateObj.toISOString().split('T')[0];

    sales.forEach(s => { const d = formatDate(s.createdAt); mergedData[d] = mergedData[d] || { date: d, sales: 0, purchases: 0, expenses: 0 }; mergedData[d].sales += Number(s.totalPrice || 0); });
    purchases.forEach(p => { const d = formatDate(p.createdAt); mergedData[d] = mergedData[d] || { date: d, sales: 0, purchases: 0, expenses: 0 }; mergedData[d].purchases += Number(p.totalAmount || 0); });
    expenses.forEach(e => { const d = formatDate(e.date); mergedData[d] = mergedData[d] || { date: d, sales: 0, purchases: 0, expenses: 0 }; mergedData[d].expenses += Number(e.amount || 0); });

    res.json({ success: true, data: Object.values(mergedData).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 📊 AUDIT LOGS & BACKUP ROUTES
// ==========================================
app.get('/api/audit-logs', verifyToken, requireRole(['Admin', 'Super Admin', 'ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
    res.status(200).json({ success: true, data: logs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/system/backup', verifyToken, requireRole(['Admin', 'Super Admin', 'ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const medicines = await prisma.medicine.findMany({ include: { category: true } });
    const categories = await prisma.category.findMany();
    const auditLogs = await prisma.auditLog.findMany();

    const backupData = {
      appName: "Smart Clinic & Pharmacy ERP Backup",
      version: "1.0",
      generatedAt: new Date().toISOString(),
      stats: { totalMedicines: medicines.length, totalCategories: categories.length },
      medicines, categories, auditLogs
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=pharmacy-backup-${Date.now()}.json`);
    res.status(200).send(JSON.stringify(backupData, null, 2));
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
// ==========================================
// 🚀 SAFE REPORTS & ANALYTICS ROUTES
// ==========================================
app.get('/api/reports/summary', verifyToken, async (req: Request, res: Response) => {
  try {
    const sales = await prisma.sale.findMany({ include: { items: true } });
    const medicines = await prisma.medicine.findMany();
    const categories = await prisma.category.findMany();

    const totalSalesRevenue = sales.reduce((a, s) => a + (s.totalPrice || 0), 0);
    const totalInventoryValue = medicines.reduce((a, m) => a + (Number(m.price) * Number(m.stock)), 0);

    res.status(200).json({
      success: true,
      data: {
        totalSalesRevenue,
        totalSalesTransactions: sales.length,
        totalPurchasesCost: 0,
        totalPurchaseInvoices: 0,
        totalInventoryValue,
        totalMedicinesCount: medicines.length,
        totalCategoriesCount: categories.length,
        totalExpenses: 0,
        netProfit: totalSalesRevenue
      }
    });
  } catch (error: any) {
    console.error("Reports summary error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/reports/chart', verifyToken, async (req: Request, res: Response) => {
  try {
    const filter = (req.query.filter as string) || '7days';
    const startDate = new Date();
    if (filter === '7days') startDate.setDate(startDate.getDate() - 7);
    else if (filter === '30days') startDate.setDate(startDate.getDate() - 30);
    else if (filter === '12months') startDate.setFullYear(startDate.getFullYear() - 1);

    const sales = await prisma.sale.findMany({ 
      where: { createdAt: { gte: startDate } } 
    });

    const mergedData: any = {};
    const formatDate = (dateObj: any) => filter === '12months' ? `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}` : new Date(dateObj).toISOString().split('T')[0];

    sales.forEach(s => { 
      const d = formatDate(s.createdAt); 
      mergedData[d] = mergedData[d] || { date: d, sales: 0, purchases: 0, expenses: 0 }; 
      mergedData[d].sales += Number(s.totalPrice || 0); 
    });

    res.json({ 
      success: true, 
      data: Object.values(mergedData).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()) 
    });
  } catch (error: any) {
    console.error("Reports chart error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// ==========================================
// SERVER STARTUP
import express from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

// Safe initialization with error catching
let prisma: PrismaClient | null = null;
let initError: string = '';

try {
  prisma = new PrismaClient();
} catch (err: any) {
  initError = err.message;
  console.error("Prisma Client Init Error:", err);
}

// Root Diagnostic Route (Ab yeh 500 error ki bajaye bataye ga ke masla kya hai)
app.get("/", async (req, res) => {
  let dbStatus = "Connected successfully";
  
  try {
    if (!prisma) {
      throw new Error("Prisma client failed to initialize: " + initError);
    }
    // Test database query
    await prisma.$queryRaw`SELECT 1`;
  } catch (err: any) {
    dbStatus = "Database Connection Error: " + err.message;
  }

  res.json({
    status: "diagnostics",
    message: "Pharmacy Management API backend is responding!",
    databaseStatus: dbStatus,
    environmentChecks: {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasJwtSecret: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV || "not set"
    }
  });
});

// Vercel Serverless Export
module.exports = app;