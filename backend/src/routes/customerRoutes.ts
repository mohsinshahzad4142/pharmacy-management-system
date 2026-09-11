import express, { Request, Response } from 'express';
import prisma from '../prisma';

const router = express.Router();

// 1. تمام گاہکوں کی لسٹ
router.get('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const customers = await prisma.customer.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: customers });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2. نیا گاہک بنانا (Address بھی شامل کر دیا گیا ہے)
router.post('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, phone, address } = req.body;
        const newCustomer = await prisma.customer.create({
            data: { name, phone, address }
        });
        res.json({ success: true, data: newCustomer });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. کسٹمر کی معلومات اپڈیٹ کرنا (Updated with console logging for debugging)
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const customerId = parseInt(req.params.id);
        const { name, phone, address } = req.body;

        console.log(`Updating customer ID ${customerId} with:`, { name, phone, address });

        const updatedCustomer = await prisma.customer.update({
            where: { id: customerId },
            data: { 
                name, 
                phone, 
                address: address || null // Agar address khali ho toh null bhej dein
            }
        });

        res.json({ success: true, data: updatedCustomer });
    } catch (error: any) {
        console.error("❌ Prisma Update Error Details:", error); // Yeh aapke backend terminal mein exact error dikhayega
        res.status(500).json({ success: false, message: error.message });
    }
});

// 4. کسٹمر کو ڈیلیٹ کرنا (DELETE Route)
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const customerId = parseInt(req.params.id);

        // پہلے اس کسٹمر کی تمام کھاتہ انٹریز ڈیلیٹ کریں گے تاکہ Database Constraint کا ایرر نہ آئے
        await prisma.customerLedger.deleteMany({
            where: { customerId }
        });

        // اب کسٹمر کو ڈیلیٹ کریں
        await prisma.customer.delete({
            where: { id: customerId }
        });

        res.json({ success: true, message: "Customer deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 5. کسٹمر کا کھاتہ دیکھنا
router.get('/:id/ledger', async (req: Request, res: Response): Promise<void> => {
    try {
        const customerId = parseInt(req.params.id);
        const ledger = await prisma.customerLedger.findMany({
            where: { customerId },
            orderBy: { date: 'desc' }
        });
        res.json({ success: true, data: ledger });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 6. کھاتے میں نئی انٹری
router.post('/:id/ledger', async (req: Request, res: Response): Promise<void> => {
    try {
        const customerId = parseInt(req.params.id);
        const { transactionType, amount, description } = req.body; 

        const ledgerEntry = await prisma.customerLedger.create({
            data: {
                customerId,
                transactionType,
                amount: parseFloat(amount),
                description
            }
        });

        const customer = await prisma.customer.findUnique({ where: { id: customerId } });
        if (!customer) {
             res.status(404).json({ success: false, message: "Customer not found" });
             return;
        }

        let newTotalDue = customer.totalDue;
        if (transactionType === 'credit') {
            newTotalDue += parseFloat(amount);
        } else if (transactionType === 'payment') {
            newTotalDue -= parseFloat(amount);
        }

        await prisma.customer.update({
            where: { id: customerId },
            data: { totalDue: newTotalDue }
        });

        res.json({ success: true, data: ledgerEntry, newTotalDue });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// پورے پیج میں صرف یہ ایک ہی ایکسپورٹ ہونا چاہیے (سب سے آخر میں)
export default router;