'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';

export default function CustomerLedgerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id;

  const [customer, setCustomer] = useState<any>(null);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Transaction Form States
  const [transForm, setTransForm] = useState({
    transactionType: 'credit', // 'credit' (Udhaar) ya 'payment' (Wapsi / Payment Received)
    amount: '',
    description: ''
  });

  const fetchData = async () => {
    try {
      // 1. Fetch all customers to find specific customer's details & totalDue
      const custRes = await axios.get('https://pharmacy-management-system-jcvq.vercel.app/api/customers');
      if (custRes.data?.data) {
        const found = custRes.data.data.find((c: any) => c.id === Number(customerId));
        setCustomer(found);
      }

      // 2. Fetch ledger history
      const ledgerRes = await axios.get(`https://pharmacy-management-system-jcvq.vercel.app/api/customers/${customerId}/ledger`);
      if (ledgerRes.data?.data) {
        setLedgerEntries(ledgerRes.data.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) {
      fetchData();
    }
  }, [customerId]);

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`https://pharmacy-management-system-jcvq.vercel.app/api/customers/${customerId}/ledger`, {
        transactionType: transForm.transactionType,
        amount: Number(transForm.amount),
        description: transForm.description
      });

      alert('Transaction added successfully!');
      setTransForm({ transactionType: 'credit', amount: '', description: '' });
      fetchData(); // Refresh data and total due balance
    } catch (error: any) {
      console.error('Error saving transaction:', error);
      alert(error.response?.data?.message || 'Failed to save transaction.');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-600">Loading ledger details...</div>;
  }

  return (
    <main className="p-8 max-w-5xl mx-auto bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{customer?.name || 'Customer'} - Ledger</h1>
          <p className="text-sm text-gray-500">Phone: {customer?.phone || 'N/A'} | Address: {customer?.address || 'N/A'}</p>
        </div>
        <Link href="/customers" className="bg-gray-600 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-gray-700 transition">
          ⬅ Back to Customers
        </Link>
      </div>

      {/* Summary Card */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6 flex justify-between items-center border-l-4 border-blue-600">
        <div>
          <h2 className="text-gray-600 text-sm font-semibold">Total Remaining Balance (Due)</h2>
          <p className={`text-3xl font-bold mt-1 ${customer?.totalDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
            Rs. {customer?.totalDue ?? 0}
          </p>
        </div>
      </div>

      {/* Add Transaction Form */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6 border">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Add New Transaction</h3>
        <form onSubmit={handleTransactionSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={transForm.transactionType}
            onChange={(e) => setTransForm({ ...transForm, transactionType: e.target.value })}
            className="border p-2 rounded text-sm bg-white text-gray-700"
          >
            <option value="credit">Udhaar / Credit (Increase Due)</option>
            <option value="payment">Payment Received / Cash (Decrease Due)</option>
          </select>

          <input
            type="number"
            placeholder="Amount (Rs.)"
            value={transForm.amount}
            onChange={(e) => setTransForm({ ...transForm, amount: e.target.value })}
            className="border p-2 rounded text-sm text-gray-700"
            required
            min="1"
          />

          <input
            type="text"
            placeholder="Description / Note (Optional)"
            value={transForm.description}
            onChange={(e) => setTransForm({ ...transForm, description: e.target.value })}
            className="border p-2 rounded text-sm text-gray-700"
          />

          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm font-semibold transition">
            Save Transaction
          </button>
        </form>
      </div>

      {/* Ledger Table History */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Transaction History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-gray-100 text-sm text-gray-600">
                <th className="p-3">Date</th>
                <th className="p-3">Type</th>
                <th className="p-3">Description</th>
                <th className="p-3">Amount</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {ledgerEntries.length > 0 ? (
                ledgerEntries.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-gray-600">{new Date(item.date || item.createdAt).toLocaleDateString()}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        item.transactionType === 'payment' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {item.transactionType === 'payment' ? 'Payment Received' : 'Udhaar / Credit'}
                      </span>
                    </td>
                    <td className="p-3 text-gray-600">{item.description || '-'}</td>
                    <td className={`p-3 font-bold ${item.transactionType === 'payment' ? 'text-green-600' : 'text-red-600'}`}>
                      Rs. {item.amount}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-gray-500">No transactions recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}