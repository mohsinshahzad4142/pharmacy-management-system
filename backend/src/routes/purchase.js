const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. GET all suppliers
router.get('/suppliers', async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany();
    res.json({ success: true, data: suppliers });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. POST add new supplier
router.post('/suppliers', async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;
    const supplier = await prisma.supplier.create({
      data: { name, phone, email, address }
    });
    res.json({ success: true, message: 'Supplier added successfully!', data: supplier });
  } catch (error) {
    console.error('Error adding supplier:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. GET all purchases history
router.get('/purchases', async (req, res) => {
  try {
    const purchases = await prisma.purchase.findMany({
      include: {
        supplier: true,
        items: {
          include: { medicine: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: purchases });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. POST create purchase order & Auto-Update Medicine Stock
router.post('/purchases', async (req, res) => {
  try {
    const { supplierId, items } = req.body; 
    // items format: [{ medicineId: 1, quantity: 50, costPrice: 20 }]

    if (!supplierId || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Supplier and items are required.' });
    }

    let totalAmount = 0;
    items.forEach(item => {
      totalAmount += Number(item.quantity) * Number(item.costPrice);
    });

    // Prisma Transaction (Taqayyad/Atomic operation)
    const result = await prisma.$transaction(async (prisma) => {
      // Create Purchase record & items
      const purchase = await prisma.purchase.create({
        data: {
          supplierId: Number(supplierId),
          totalAmount,
          items: {
            create: items.map(item => ({
              medicineId: Number(item.medicineId),
              quantity: Number(item.quantity),
              costPrice: Number(item.costPrice)
            }))
          }
        },
        include: { items: true }
      });

      // Auto-update stock for each medicine in inventory
      for (const item of items) {
        await prisma.medicine.update({
          where: { id: Number(item.medicineId) },
          data: {
            stock: {
              increment: Number(item.quantity)
            }
          }
        });
      }

      return purchase;
    });

    res.json({ success: true, message: 'Purchase recorded and stock updated successfully!', data: result });
  } catch (error) {
    console.error('Error creating purchase:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;