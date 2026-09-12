'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function PurchasesPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);

  // Supplier Form State
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  // Purchase Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<any[]>([
    { medicineId: '', quantity: '', purchasePrice: '' }
  ]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
    } else {
      setCurrentUser(JSON.parse(userData));
      fetchData(token);
    }
  }, [router]);

  const fetchData = async (tokenParam?: string) => {
    const token = tokenParam || localStorage.getItem('token');
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [supRes, purRes, medRes] = await Promise.all([
        axios.get('https://pharmacy-management-system-jcvq.vercel.app/api/suppliers', config),
        axios.get('https://pharmacy-management-system-jcvq.vercel.app/api/purchases', config),
        axios.get('https://pharmacy-management-system-jcvq.vercel.app/api/medicines', config)
      ]);

      if (supRes.data?.data) setSuppliers(supRes.data.data);
      else if (Array.isArray(supRes.data)) setSuppliers(supRes.data);

      if (purRes.data?.data) setPurchases(purRes.data.data);
      else if (Array.isArray(purRes.data)) setPurchases(purRes.data);

      if (medRes.data?.data) setMedicines(medRes.data.data);
      else if (Array.isArray(medRes.data)) setMedicines(medRes.data);

    } catch (error: any) {
      console.error('Error fetching purchases data:', error);
    }
  };

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      console.log('Submitting supplier:', supplierForm);
      const response = await axios.post('https://pharmacy-management-system-jcvq.vercel.app/api/suppliers', supplierForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Supplier success:', response.data);
      alert('Supplier added successfully!');
      setSupplierForm({ name: '', phone: '', email: '', address: '' });
      fetchData(token || undefined);
    } catch (error: any) {
      console.error('Error adding supplier details:', error.response?.data || error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Unknown error';
      alert('Error adding supplier: ' + errorMsg);
    }
  };

  const handleAddItem = () => {
    setPurchaseItems([...purchaseItems, { medicineId: '', quantity: '', purchasePrice: '' }]);
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const updated = [...purchaseItems];
    updated[index][field] = value;
    setPurchaseItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) return alert('Please select a supplier!');
    if (purchaseItems.length === 0 || !purchaseItems[0].medicineId) return alert('Please add at least one purchase item.');

    const token = localStorage.getItem('token');
    try {
      const payload = {
        supplierId: Number(selectedSupplierId),
        items: purchaseItems.map(item => ({
          medicineId: Number(item.medicineId),
          quantity: Number(item.quantity),
          purchasePrice: Number(item.purchasePrice || 0)
        }))
      };

      console.log('Submitting purchase:', payload);
      await axios.post('https://pharmacy-management-system-jcvq.vercel.app/api/purchases', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Purchase recorded and stock updated successfully!');
      setSelectedSupplierId('');
      setPurchaseItems([{ medicineId: '', quantity: '', purchasePrice: '' }]);
      fetchData(token || undefined);
    } catch (error: any) {
      console.error('Error recording purchase:', error.response?.data || error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Unknown error';
      alert('Error recording purchase: ' + errorMsg);
    }
  };

  return (
    <main className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📦 Supplier & Purchase Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage suppliers and stock-in purchase invoices.</p>
        </div>
        <a 
          href="/" 
          className="bg-gray-600 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-gray-700 transition"
        >
          ← Back to Dashboard
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Add Supplier Form */}
        <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-blue-600">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Add New Supplier</h2>
          <form onSubmit={handleSupplierSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Supplier Name / Company</label>
              <input
                type="text"
                placeholder="e.g. MediCorp Pharma"
                value={supplierForm.name}
                onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                className="border p-2 rounded w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Phone Number</label>
              <input
                type="text"
                placeholder="e.g. 0300-1234567"
                value={supplierForm.phone}
                onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Email (Optional)</label>
              <input
                type="email"
                placeholder="e.g. contact@medicorp.com"
                value={supplierForm.email}
                onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Address</label>
              <input
                type="text"
                placeholder="e.g. Lahore, Pakistan"
                value={supplierForm.address}
                onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                className="border p-2 rounded w-full"
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-blue-600 text-white p-2 rounded font-semibold hover:bg-blue-700 transition"
            >
              Save Supplier
            </button>
          </form>
        </div>

        {/* Suppliers List Table */}
        <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-green-600">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Registered Suppliers ({suppliers.length})</h2>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b bg-gray-100">
                  <th className="p-2 text-gray-600">Name</th>
                  <th className="p-2 text-gray-600">Phone</th>
                  <th className="p-2 text-gray-600">Address</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.length > 0 ? (
                  suppliers.map((sup: any) => (
                    <tr key={sup.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{sup.name}</td>
                      <td className="p-2 text-gray-600">{sup.phone || '-'}</td>
                      <td className="p-2 text-gray-600">{sup.address || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-gray-500">No suppliers added yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* New Purchase Invoice (Stock In) Section */}
      <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-purple-600 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">New Purchase Invoice (Stock In)</h2>
        <form onSubmit={handlePurchaseSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Select Supplier</label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="border p-2 rounded w-full bg-white"
                required
              >
                <option value="">-- Choose Supplier --</option>
                {suppliers.map((sup: any) => (
                  <option key={sup.id} value={sup.id}>{sup.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-600 mb-2">Purchase Items</label>
            {purchaseItems.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3 items-center bg-gray-50 p-3 rounded">
                <select
                  value={item.medicineId}
                  onChange={(e) => handleItemChange(index, 'medicineId', e.target.value)}
                  className="border p-2 rounded bg-white md:col-span-2"
                  required
                >
                  <option value="">-- Choose Medicine --</option>
                  {medicines.map((med: any) => (
                    <option key={med.id} value={med.id}>
                      {med.name} (Stock: {med.stock})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Quantity"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                  className="border p-2 rounded"
                  min="1"
                  required
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Cost Price (Opt)"
                    value={item.purchasePrice}
                    onChange={(e) => handleItemChange(index, 'purchasePrice', e.target.value)}
                    className="border p-2 rounded w-full"
                  />
                  {purchaseItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 transition"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddItem}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm font-semibold hover:bg-gray-300 transition mt-2"
            >
              + Add Another Item
            </button>
          </div>

          <button
            type="submit"
            className="w-full bg-purple-600 text-white p-3 rounded font-semibold hover:bg-purple-700 transition mt-4"
          >
            Complete Purchase & Update Stock
          </button>
        </form>
      </div>

      {/* Purchase History */}
      <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-indigo-600">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Purchase History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b bg-gray-100">
                <th className="p-3 text-gray-600">Purchase ID</th>
                <th className="p-3 text-gray-600">Supplier</th>
                <th className="p-3 text-gray-600">Date</th>
                <th className="p-3 text-gray-600">Items Count</th>
              </tr>
            </thead>
            <tbody>
              {purchases.length > 0 ? (
                purchases.map((pur: any) => (
                  <tr key={pur.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">#{pur.id}</td>
                    <td className="p-3 text-gray-600">{pur.supplier?.name || 'N/A'}</td>
                    <td className="p-3 text-gray-600">{new Date(pur.createdAt || Date.now()).toLocaleString()}</td>
                    <td className="p-3 text-gray-600">{pur.items?.length || 0} items</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-gray-500">No purchase invoices recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}