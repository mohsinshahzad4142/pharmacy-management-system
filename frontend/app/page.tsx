'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';

export default function Home() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [medicines, setMedicines] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [catForm, setCatForm] = useState({ name: '', description: '' });
  const [medForm, setMedForm] = useState({ name: '', genericName: '', categoryId: '', price: '', stock: '', expiryDate: '', barcode: '' });
  const [cart, setCart] = useState<any[]>([]);
  const [selectedMedId, setSelectedMedId] = useState('');
  const [quantity, setQuantity] = useState('1');

  // Barcode Scanner Input State
  const [barcodeInput, setBarcodeInput] = useState('');

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');

  // Receipt Modal states
  const [showReceipt, setShowReceipt] = useState(false);
  const [latestSale, setLatestSale] = useState<any>(null);

  // Check authentication on load
  useEffect(() => {
    setIsMounted(true);
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
    } else {
      try {
        setCurrentUser(JSON.parse(userData));
      } catch (e) {
        console.error('Failed to parse user data', e);
      }
      fetchData(token);
    }
  }, [router]);

  const fetchData = async (tokenParam?: string) => {
    const token = tokenParam || localStorage.getItem('token');
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [medRes, catRes, salesRes] = await Promise.all([
        axios.get('https://pharmacy-management-system-jcvq.vercel.app/api/medicines', config),
        axios.get('https://pharmacy-management-system-jcvq.vercel.app/api/categories', config),
        axios.get('https://pharmacy-management-system-jcvq.vercel.app/api/sales', config)
      ]);

      if (medRes.data?.data) setMedicines(medRes.data.data);
      if (catRes.data?.data) setCategories(catRes.data.data);
      if (salesRes.data?.data) setSales(salesRes.data.data);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.clear();
        router.push('/login');
      }
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  // Instant Barcode Scan Logic - Auto-adds to Cart
  const processBarcodeScan = (scannedCode: string) => {
    const code = scannedCode.trim();
    if (!code) return;

    const foundMed = medicines.find(
      (m) => m.barcode && String(m.barcode).trim().toLowerCase() === code.toLowerCase()
    );

    if (foundMed) {
      const qty = Number(quantity) > 0 ? Number(quantity) : 1;
      if (foundMed.stock < qty) {
        alert(`Insufficient stock for ${foundMed.name}! Only ${foundMed.stock} left.`);
        setBarcodeInput('');
        return;
      }

      setCart((prevCart) => {
        const existingIndex = prevCart.findIndex((item) => item.medicineId === foundMed.id);
        if (existingIndex > -1) {
          const updatedCart = [...prevCart];
          const newQty = updatedCart[existingIndex].quantity + qty;
          if (foundMed.stock < newQty) {
            alert(`Stock limit exceeded for ${foundMed.name}.`);
            return prevCart;
          }
          updatedCart[existingIndex].quantity = newQty;
          return updatedCart;
        } else {
          return [...prevCart, { medicineId: foundMed.id, name: foundMed.name, price: foundMed.price, quantity: qty }];
        }
      });

      setBarcodeInput('');
    }
  };

  const handleBarcodeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setBarcodeInput(val);

    const exactMatch = medicines.find(
      (m) => m.barcode && String(m.barcode).trim().toLowerCase() === val.trim().toLowerCase()
    );

    if (exactMatch) {
      processBarcodeScan(val);
    }
  };

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      processBarcodeScan(barcodeInput);
    }
  };

  // Prevent hydration mismatch
  if (!isMounted) {
    return null;
  }

  const isAdmin = currentUser?.role?.toLowerCase() === 'admin' || currentUser?.role?.toLowerCase() === 'superadmin';

  // Alerts
  const lowStockMedicines = medicines.filter(m => m.stock <= 20);
  const today = new Date();
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(today.getDate() + 30);

  const expiringMedicines = medicines.filter(m => {
    if (!m.expiryDate) return false;
    const expDate = new Date(m.expiryDate);
    return expDate <= thirtyDaysLater;
  });

  const getSaleTotal = (sale: any) => {
    if (!sale) return 0;
    
    // Yahan hum ne sale.totalPrice add kar diya hai
    const amt = sale.totalPrice || sale.totalAmount || sale.total || sale.amount || 0;
    if (Number(amt) > 0) return Number(amt);

    const itemsList = sale.items || [];
    if (Array.isArray(itemsList) && itemsList.length > 0) {
      return itemsList.reduce((sum: number, item: any) => {
        const price = Number(item.price || item.unitPrice || item.medicine?.price || 0);
        const qty = Number(item.quantity || item.qty || 0);
        return sum + (price * qty);
      }, 0);
    }
    return 0;
  };

  const totalRevenue = sales.reduce((sum, sale) => sum + getSaleTotal(sale), 0);

  // Filtered medicines
  const filteredMedicines = medicines.filter(med => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      (med.name && med.name.toLowerCase().includes(searchLower)) || 
      (med.genericName && med.genericName.toLowerCase().includes(searchLower)) ||
      (med.barcode && String(med.barcode).toLowerCase().includes(searchLower));
    
    const matchesCategory = selectedCategoryFilter === '' || String(med.categoryId) === String(selectedCategoryFilter);
    
    return matchesSearch && matchesCategory;
  });

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      await axios.post('https://pharmacy-management-system-jcvq.vercel.app/api/categories', catForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCatForm({ name: '', description: '' });
      fetchData();
      alert('Category added successfully!');
    } catch (error: any) {
      console.error('Error adding category:', error);
      alert(error.response?.data?.message || 'Failed to add category');
    }
  };

  const handleMedicineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const finalBarcode = medForm.barcode.trim() || 'BC-' + Math.floor(10000000 + Math.random() * 90000000);
      const payload = {
        name: medForm.name,
        genericName: medForm.genericName,
        price: Number(medForm.price),
        stock: Number(medForm.stock),
        categoryId: Number(medForm.categoryId),
        expiryDate: medForm.expiryDate,
        barcode: finalBarcode
      };
      const config = { headers: { Authorization: `Bearer ${token}` } };

      if (editingId) {
        await axios.put(`https://pharmacy-management-system-jcvq.vercel.app/api/medicines/${editingId}`, payload, config);
        alert('Medicine updated!');
        setEditingId(null);
      } else {
        await axios.post('https://pharmacy-management-system-jcvq.vercel.app/api/medicines', payload, config);
        alert('Medicine added to inventory!');
      }

      setMedForm({ name: '', genericName: '', categoryId: '', price: '', stock: '', expiryDate: '', barcode: '' });
      fetchData();
    } catch (error: any) {
      console.error('Error saving medicine:', error);
      alert(error.response?.data?.message || 'Failed to save medicine');
    }
  };

  // Excel / CSV Bulk Import Handler (Updated)
  const handleBulkCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n');
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      let successCount = 0;
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const values = line.split(',').map(v => v.trim());
        
        // Date ko safe format (YYYY-MM-DD) mein convert karna
        let rawDate = values[4];
        let formattedDate = new Date().toISOString().split('T')[0];
        if (rawDate) {
          const parsed = new Date(rawDate);
          if (!isNaN(parsed.getTime())) {
            formattedDate = parsed.toISOString().split('T')[0];
          }
        }

        const medData = {
          name: values[0] || '',
          genericName: values[1] || '',
          price: Number(values[2]) || 0,
          stock: Number(values[3]) || 0,
          expiryDate: formattedDate,
          barcode: values[5] && values[5] !== '' ? values[5] : 'BC-' + Math.floor(10000000 + Math.random() * 90000000),
          categoryId: Number(values[6]) || (categories[0]?.id || 1)
        };

        if (medData.name && medData.price > 0) {
          try {
            await axios.post('https://pharmacy-management-system-jcvq.vercel.app/api/medicines', medData, config);
            successCount++;
          } catch (err: any) {
            // Yahan JSON.stringify lagane se object saaf text ki shakal mein print hoga
            console.error('Failed to import row:', medData, JSON.stringify(err.response?.data || err.message));
          }
        }
      }
      alert(`Successfully imported ${successCount} medicines from CSV!`);
      fetchData();
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleDelete = async (id: number) => {
    if (!isAdmin) {
      return alert('Access Denied: Only Admins can delete medicines.');
    }
    if (confirm('Are you sure you want to delete this medicine?')) {
      const token = localStorage.getItem('token');
      try {
        await axios.delete(`https://pharmacy-management-system-jcvq.vercel.app/api/medicines/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchData();
        alert('Medicine deleted successfully!');
      } catch (error: any) {
        console.error('Error deleting:', error);
        alert(error.response?.data?.message || 'Delete failed.');
      }
    }
  };

  const handleEdit = (med: any) => {
    if (!isAdmin) {
      return alert('Access Denied: Only Admins can edit medicines.');
    }
    setEditingId(med.id);
    setMedForm({
      name: med.name || '',
      genericName: med.genericName || '',
      categoryId: med.categoryId ? med.categoryId.toString() : '',
      price: med.price ? med.price.toString() : '',
      stock: med.stock ? med.stock.toString() : '',
      expiryDate: med.expiryDate ? med.expiryDate.split('T')[0] : '',
      barcode: med.barcode || ''
    });
    
    document.getElementById('add-medicine-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const addToCart = () => {
    if (!selectedMedId) return alert('Please select a medicine!');
    const medicine = medicines.find((m) => m.id === Number(selectedMedId));
    if (!medicine) return;

    const qty = Number(quantity);
    if (qty <= 0) return alert('Invalid quantity.');
    if (medicine.stock < qty) return alert(`Insufficient stock! Only ${medicine.stock} left.`);

    const existingIndex = cart.findIndex((item) => item.medicineId === medicine.id);
    if (existingIndex > -1) {
      const updatedCart = [...cart];
      const newQty = updatedCart[existingIndex].quantity + qty;
      if (medicine.stock < newQty) return alert('Stock limit exceeded.');
      updatedCart[existingIndex].quantity = newQty;
      setCart(updatedCart);
    } else {
      setCart([...cart, { medicineId: medicine.id, name: medicine.name, price: medicine.price, quantity: qty }]);
    }
    setSelectedMedId('');
    setQuantity('1');
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return alert('Cart is empty!');
    const token = localStorage.getItem('token');
    try {
      const response = await axios.post('https://pharmacy-management-system-jcvq.vercel.app/api/sales', {
        items: cart.map((item) => ({ medicineId: item.medicineId, quantity: item.quantity }))
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const createdSale = response.data?.data || {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        items: [...cart],
        totalAmount: totalBill
      };

      setLatestSale(createdSale);
      setShowReceipt(true);
      setCart([]);
      fetchData();
    } catch (error: any) {
      console.error('Checkout error:', error);
      alert(error.response?.data?.message || 'Checkout failed.');
    }
  };

  const totalBill = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <main className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      
      {/* 1. TOP HEADER */}
      <div className="mb-4 bg-white p-4 rounded-lg shadow-sm border-l-4 border-indigo-600">
        <h1 className="text-3xl font-bold text-gray-800">Pharmacy Management Dashboard</h1>
        {currentUser && (
          <p className="text-sm text-gray-500 mt-1">
            Welcome, <span className="font-semibold text-gray-700">{currentUser.name}</span> | Role: <span className="font-semibold text-indigo-600 uppercase">{currentUser.role}</span>
          </p>
        )}
      </div>

      {/* 2. NAVIGATION MENU */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-wrap gap-4 items-center justify-between border-b-2 border-gray-100">
        <div className="flex flex-wrap gap-3 items-center">
          <a href="#pos-billing" className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded text-sm font-semibold hover:bg-emerald-200 transition">
            🛒 POS Billing
          </a>
          <a href="/reports" className="bg-blue-100 text-blue-800 px-4 py-2 rounded text-sm font-semibold hover:bg-blue-200 transition">
            📊 Financial Reports
          </a>
          <a href="/purchases" className="bg-purple-100 text-purple-800 px-4 py-2 rounded text-sm font-semibold hover:bg-purple-200 transition">
            📦 Purchases & Suppliers
          </a>
          <a href="/expenses" className="bg-rose-100 text-rose-800 px-4 py-2 rounded text-sm font-semibold hover:bg-rose-200 transition">
            💸 Expenses
          </a>
          
          <Link 
            href="/customers" 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg shadow font-medium text-center flex items-center justify-center gap-2 transition"
          >
            👥 Ledger
          </Link>

          {isAdmin && (
            <a href="#add-medicine-section" className="bg-amber-100 text-amber-800 px-4 py-2 rounded text-sm font-semibold hover:bg-amber-200 transition">
              ➕ Add Medicine
            </a>
          )}
        </div>

        {/* Sahi aur Mehfooz Logout Button */}
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-5 py-2 rounded text-sm font-semibold hover:bg-red-700 transition shadow-sm"
        >
          🚪 Logout
        </button>
      </div>

      {/* Alerts */}
      {(lowStockMedicines.length > 0 || expiringMedicines.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {lowStockMedicines.length > 0 && (
            <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500 shadow">
              <h3 className="font-bold text-red-700 text-lg">⚠️ Low Stock Alerts</h3>
              <ul className="text-red-600 text-sm mt-2">
                {lowStockMedicines.map((m: any) => (
                  <li key={m.id}>• {m.name} - Only {m.stock} units left!</li>
                ))}
              </ul>
            </div>
          )}
          {expiringMedicines.length > 0 && (
            <div className="bg-amber-50 p-4 rounded-lg border-l-4 border-amber-500 shadow">
              <h3 className="font-bold text-amber-700 text-lg">⏳ Expiring Soon</h3>
              <ul className="text-amber-600 text-sm mt-2">
                {expiringMedicines.map((m: any) => (
                  <li key={m.id}>• {m.name} - Expires on: {new Date(m.expiryDate).toLocaleDateString()}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Categories & Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {isAdmin ? (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Add New Category</h2>
            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Category Name (e.g. Syrups)"
                value={catForm.name}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                className="border p-2 rounded w-full"
                required
              />
              <input
                type="text"
                placeholder="Description (Optional)"
                value={catForm.description}
                onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                className="border p-2 rounded w-full"
              />
              <button type="submit" className="w-full bg-green-600 text-white p-2 rounded font-semibold hover:bg-green-700 transition">
                Add Category
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-center text-gray-500">
            <p>🔒 Category addition is restricted to Administrators.</p>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow-md flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2 text-gray-700">System Overview</h2>
            <p className="text-gray-600 mb-4">Manage inventory, process point-of-sale bills, and monitor real-time stock levels.</p>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xl font-bold text-blue-600">{medicines.length}</p>
              <p className="text-xs text-gray-600">Medicines</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-xl font-bold text-green-600">{categories.length}</p>
              <p className="text-xs text-gray-600">Categories</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <p className="text-xl font-bold text-purple-600">{sales.length}</p>
              <p className="text-xs text-gray-600">Sales</p>
            </div>
            <div className="bg-indigo-50 p-3 rounded-lg">
              <p className="text-xl font-bold text-indigo-600">Rs. {totalRevenue}</p>
              <p className="text-xs text-gray-600">Revenue</p>
            </div>
          </div>
        </div>
      </div>

      {/* POS Billing Section */}
      <div id="pos-billing" className="bg-white p-6 rounded-lg shadow-md mb-8 border-l-4 border-emerald-600 scroll-mt-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Point of Sale (POS) Billing</h2>
        
        <div className="mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
          <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wide mb-1">
            ⚡ Quick Barcode Scanner (Auto-adds to bill on scan)
          </label>
          <input
            type="text"
            placeholder="Scan barcode here..."
            value={barcodeInput}
            onChange={handleBarcodeInputChange}
            onKeyDown={handleBarcodeKeyDown}
            className="w-full border-2 border-emerald-400 p-2 rounded text-base focus:outline-none focus:border-emerald-600 bg-white"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <select
            value={selectedMedId}
            onChange={(e) => setSelectedMedId(e.target.value)}
            className="border p-2 rounded bg-white md:col-span-2"
          >
            <option value="">Select Medicine by Name or Generic Name</option>
            {medicines.map((med: any) => (
              <option key={med.id} value={med.id}>
                {med.name} {med.genericName ? `(${med.genericName})` : ''} - Rs. {med.price} [Stock: {med.stock}] {med.barcode ? `| Barcode: ${med.barcode}` : ''}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="border p-2 rounded"
            min="1"
          />
          <button
            type="button"
            onClick={addToCart}
            className="bg-emerald-600 text-white p-2 rounded font-semibold hover:bg-emerald-700 transition"
          >
            Add to Bill
          </button>
        </div>

        {cart.length > 0 && (
          <div className="mt-4">
            <table className="w-full text-left border-collapse mb-4">
              <thead>
                <tr className="border-b bg-gray-100">
                  <th className="p-2 text-gray-600">Medicine</th>
                  <th className="p-2 text-gray-600">Price</th>
                  <th className="p-2 text-gray-600">Quantity</th>
                  <th className="p-2 text-gray-600">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-2">{item.name}</td>
                    <td className="p-2">Rs. {item.price}</td>
                    <td className="p-2">{item.quantity}</td>
                    <td className="p-2 font-medium">Rs. {item.price * item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between items-center bg-gray-50 p-4 rounded">
              <span className="text-xl font-bold text-gray-700">Total Bill: Rs. {totalBill}</span>
              <button
                onClick={handleCheckout}
                className="bg-indigo-600 text-white px-6 py-2 rounded font-semibold hover:bg-indigo-700 transition"
              >
                Complete Sale & Print Bill
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sales History */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8 border-l-4 border-purple-600">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Sales History & Transactions</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-gray-100">
                <th className="p-3 text-gray-600">Sale ID</th>
                <th className="p-3 text-gray-600">Date & Time</th>
                <th className="p-3 text-gray-600">Items Count</th>
                <th className="p-3 text-gray-600">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(sales) && sales.length > 0 ? (
                sales.map((sale: any) => {
                  const saleAmount = getSaleTotal(sale);
                  return (
                    <tr key={sale.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">#{sale.id}</td>
                      <td className="p-3 text-gray-600">{new Date(sale.createdAt).toLocaleString()}</td>
                      <td className="p-3 text-gray-600">
  {(sale.items || sale.saleItems || sale.SaleItem || sale.details || []).length} items
</td>
                      <td className="p-3 font-semibold text-purple-600">Rs. {saleAmount}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-gray-500">No sales recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Medicine Form with Barcode Generator & Excel Import */}
      {isAdmin && (
        <div id="add-medicine-section" className="bg-white p-6 rounded-lg shadow-md mb-8 border-l-4 border-blue-600 scroll-mt-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h2 className="text-xl font-semibold text-gray-700">
              {editingId ? 'Edit Medicine Details' : 'Add New Medicine'}
            </h2>
            
            {!editingId && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 flex flex-col gap-1 w-full md:w-auto">
                <label className="text-xs font-bold text-blue-800 uppercase">📁 Bulk Import (CSV / Excel)</label>
                <input 
                  type="file" 
                  accept=".csv, .txt" 
                  onChange={handleBulkCsvUpload}
                  className="text-xs text-gray-600 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                />
                <span className="text-[10px] text-gray-500">Format: Name, Generic, Price, Stock, Expiry, Barcode, CatID</span>
              </div>
            )}
          </div>

          <form onSubmit={handleMedicineSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Medicine Name (e.g. Panadol)"
              value={medForm.name}
              onChange={(e) => setMedForm({ ...medForm, name: e.target.value })}
              className="border p-2 rounded"
              required
            />
            <input
              type="text"
              placeholder="Generic Name (e.g. Paracetamol)"
              value={medForm.genericName}
              onChange={(e) => setMedForm({ ...medForm, genericName: e.target.value })}
              className="border p-2 rounded"
              required
            />
            
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Barcode (Auto if empty)"
                value={medForm.barcode}
                onChange={(e) => setMedForm({ ...medForm, barcode: e.target.value })}
                className="border p-2 rounded flex-1 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setMedForm({ ...medForm, barcode: 'BC-' + Math.floor(10000000 + Math.random() * 90000000) })}
                className="bg-gray-700 text-white px-3 py-2 rounded text-xs font-semibold hover:bg-gray-800 transition"
              >
                ⚡ Generate
              </button>
            </div>

            <select
              value={medForm.categoryId}
              onChange={(e) => setMedForm({ ...medForm, categoryId: e.target.value })}
              className="border p-2 rounded bg-white"
              required
            >
              <option value="">Select Category</option>
              {categories.map((cat: any) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Price (Rs.)"
              value={medForm.price}
              onChange={(e) => setMedForm({ ...medForm, price: e.target.value })}
              className="border p-2 rounded"
              required
            />
            <input
              type="number"
              placeholder="Stock Units"
              value={medForm.stock}
              onChange={(e) => setMedForm({ ...medForm, stock: e.target.value })}
              className="border p-2 rounded"
              required
            />
            <input
              type="date"
              value={medForm.expiryDate}
              onChange={(e) => setMedForm({ ...medForm, expiryDate: e.target.value })}
              className="border p-2 rounded"
              required
            />
            <div className="md:col-span-3 flex gap-4">
              <button type="submit" className="flex-1 bg-blue-600 text-white p-2 rounded font-semibold hover:bg-blue-700 transition">
                {editingId ? 'Update Medicine' : 'Add Medicine to Inventory'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setMedForm({ name: '', genericName: '', categoryId: '', price: '', stock: '', expiryDate: '', barcode: '' });
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded font-semibold hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}
{/* ================= MEDICINES LIST TABLE ================= */}
<div className="mt-8 bg-white p-6 rounded-lg shadow-md border">
  <div className="flex justify-between items-center mb-4">
    <h2 className="text-xl font-bold">📦 Inventory: All Medicines</h2>
    <span className="text-sm text-gray-500">Total: {medicines ? medicines.length : 0} items</span>
  </div>
  
  <div className="overflow-x-auto">
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-gray-100 border-b text-sm text-gray-700">
          <th className="p-3">Medicine Name</th>
          <th className="p-3">Generic</th>
          <th className="p-3">Price</th>
          <th className="p-3">Stock</th>
          <th className="p-3">Barcode</th>
          <th className="p-3 text-center">Actions</th>
        </tr>
      </thead>
      <tbody>
        {medicines && medicines.length > 0 ? (
          medicines.map((med) => (
            <tr key={med.id || med._id} className="border-b hover:bg-gray-50 text-sm">
              <td className="p-3 font-semibold text-gray-800">{med.name}</td>
              <td className="p-3 text-gray-600">{med.genericName || '-'}</td>
              <td className="p-3 font-medium text-gray-800">Rs. {med.price}</td>
              <td className="p-3">
                <span className={`px-2 py-1 rounded text-xs font-bold ${med.stock < 15 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {med.stock} units
                </span>
              </td>
              <td className="p-3 text-gray-600">{med.barcode || '-'}</td>
              <td className="p-3">
                <div className="flex items-center justify-center gap-3">
                  {/* Edit Button - using existing handleEdit function */}
                  <button 
                    onClick={() => handleEdit(med)}
                    className="text-blue-600 hover:text-blue-800 font-semibold text-xs bg-blue-50 px-2.5 py-1.5 rounded transition"
                  >
                    Edit
                  </button>
                  
                  {/* Delete Button - using existing handleDelete function */}
                  <button 
                    onClick={() => handleDelete(med.id || med._id)}
                    className="text-red-600 hover:text-red-800 font-semibold text-xs bg-red-50 px-2.5 py-1.5 rounded transition"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={6} className="text-center p-6 text-gray-500">
              No medicines found in inventory.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
</div>
{/* ======================================================== */}
{/* ======================================================== */}
{/* ======================================================== */}
      {/* ================= SECURITY & MAINTENANCE SECTION (Sahi Jagah Par) ================= */}
      <div className="bg-white p-6 rounded-lg shadow-md mt-8 border-l-4 border-gray-700">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">🛡️ Security & System Maintenance</h2>
            <p className="text-sm text-gray-500">System ki activity monitor karein aur database ka backup download karein.</p>
          </div>
          
          {/* Backup Download Button */}
          <button
            onClick={async () => {
              try {
                const token = localStorage.getItem('token');
                const response = await axios.get('https://pharmacy-management-system-jcvq.vercel.app/api/system/backup', {
                  headers: { Authorization: `Bearer ${token}` },
                  responseType: 'blob',
                });
                
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `pharmacy-backup-${new Date().toISOString().split('T')[0]}.json`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                alert("Backup successfully download ho gaya hai!");
              } catch (err) {
                alert("Backup download karne mein nakami hui.");
              }
            }}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition flex items-center gap-2"
          >
            📥 Download Database Backup
          </button>
        </div>

        {/* Audit Logs Table */}
        <h3 className="text-lg font-semibold text-gray-700 mb-3">📋 System Audit Logs (Recent Activity)</h3>
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 border-b text-gray-600">
                <th className="p-3">Time</th>
                <th className="p-3">User Email</th>
                <th className="p-3">Action</th>
                <th className="p-3">Details</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-3 text-gray-500">2026-08-28 18:30</td>
                <td className="p-3 font-medium text-gray-800">admin@pharmacy.com</td>
                <td className="p-3"><span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">DELETE</span></td>
                <td className="p-3 text-gray-600">Deleted medicine ID: 12</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </main>
  );
}