"use client"; // Next.js میں کلائنٹ سائیڈ فیچرز کے لیے یہ لازمی ہے

import { useState, useEffect } from "react";
import axios from "axios";
import Link from "next/link";

// کسٹمر کا ٹائپ ڈیفائن کیا ہے (totalDue کے ساتھ)
interface Customer {
  id: number;
  name: string;
  phone?: string;
  address?: string;
  totalDue?: number;
  totalBalance?: number;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // نیا سٹیٹ سرچ بار کے لیے شامل کیا گیا ہے
  const [searchQuery, setSearchQuery] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: "", phone: "", address: "" });
  const [editingId, setEditingId] = useState<number | null>(null);

  // کسٹمرز کا ڈیٹا بیک اینڈ سے لانے کا فنکشن
  const fetchCustomers = async () => {
    try {
      const response = await axios.get("https://pharmacy-management-system-jcvq.vercel.app/api/customers");
      if (response.data.success || response.data.data) {
        setCustomers(response.data.data || response.data);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // نیا کسٹمر ایڈ یا اپڈیٹ کرنے کا فنکشن
  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        // Edit existing customer
        await axios.put(`https://pharmacy-management-system-jcvq.vercel.app/api/customers/${editingId}`, customerForm);
        alert("Customer updated successfully!");
      } else {
        // Add new customer
        await axios.post("https://pharmacy-management-system-jcvq.vercel.app/api/customers", customerForm);
        alert("Customer added successfully!");
      }

      setIsModalOpen(false);
      setCustomerForm({ name: "", phone: "", address: "" });
      setEditingId(null);
      fetchCustomers(); // لسٹ کو ریفریش کریں
    } catch (error: any) {
      console.error("Error saving customer:", error);
      alert(error.response?.data?.message || "Failed to save customer.");
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setCustomerForm({
      name: customer.name,
      phone: customer.phone || "",
      address: customer.address || ""
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this customer?")) {
      try {
        await axios.delete(`https://pharmacy-management-system-jcvq.vercel.app/api/customers/${id}`);
        fetchCustomers();
        alert("Customer deleted successfully!");
      } catch (error: any) {
        console.error("Error deleting customer:", error);
        alert(error.response?.data?.message || "Delete failed.");
      }
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setCustomerForm({ name: "", phone: "", address: "" });
    setIsModalOpen(true);
  };

  // کسٹمرز کو سرچ کی بنیاد پر فلٹر کرنے کا فنکشن (Name یا Phone سے)
  const filteredCustomers = customers.filter((customer) => {
    const searchLower = searchQuery.toLowerCase();
    const nameMatch = customer.name.toLowerCase().includes(searchLower);
    const phoneMatch = customer.phone ? customer.phone.includes(searchLower) : false;
    return nameMatch || phoneMatch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ہیڈر سیکشن */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Customer Ledger & Khata</h1>
          <p className="text-sm text-gray-500 mt-1">Manage customer profiles, balances, and credit records.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* سرچ بار */}
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          <div className="flex gap-3 shrink-0">
            <Link
              href="/"
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg shadow font-medium text-sm flex items-center transition"
            >
              ⬅ Dashboard
            </Link>
            <button
              onClick={openAddModal}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow font-medium text-sm flex items-center transition"
            >
              + Add New Customer
            </button>
          </div>
        </div>
      </div>

      {/* کسٹمرز کی لسٹ / ٹیبل */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full text-left border-collapse">
          <thead className="bg-gray-100 text-gray-600 text-sm">
            <tr>
              <th className="py-3 px-4 font-semibold">Customer Name</th>
              <th className="py-3 px-4 font-semibold">Phone Number</th>
              <th className="py-3 px-4 font-semibold">Address</th>
              <th className="py-3 px-4 font-semibold">Total Due / Balance (Rs)</th>
              <th className="py-3 px-4 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-500">Loading customers...</td>
              </tr>
            ) : filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-500">
                  {searchQuery ? "No customer found matching your search." : "No customers found."}
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => {
                // Check for totalDue from backend DB, fallback to totalBalance or 0
                const balance = customer.totalDue ?? customer.totalBalance ?? 0;
                return (
                  <tr key={customer.id} className="border-t hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-medium text-gray-800">{customer.name}</td>
                    <td className="py-3 px-4 text-gray-600">{customer.phone || "-"}</td>
                    <td className="py-3 px-4 text-gray-600">{customer.address || "-"}</td>
                    <td className={`py-3 px-4 font-bold ${balance > 0 ? "text-red-600" : balance < 0 ? "text-green-600" : "text-gray-700"}`}>
                      Rs. {balance}
                    </td>
                    <td className="py-3 px-4 text-center space-x-2">
                      <Link
                        href={`/customers/${customer.id}`}
                        className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-1 rounded font-medium text-xs transition inline-block"
                      >
                        View Ledger
                      </Link>
                      <button
                        onClick={() => handleEdit(customer)}
                        className="bg-amber-100 text-amber-700 hover:bg-amber-200 px-3 py-1 rounded font-medium text-xs transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(customer.id)}
                        className="bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1 rounded font-medium text-xs transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* کسٹمر ایڈ یا ایڈٹ کرنے کا ماڈل (Modal) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              {editingId ? "Edit Customer Details" : "Add New Customer"}
            </h2>
            <form onSubmit={handleCustomerSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-semibold mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="e.g. Ali Raza"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-semibold mb-1">Phone Number</label>
                <input
                  type="text"
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="e.g. 0300-1234567"
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-semibold mb-1">Address</label>
                <input
                  type="text"
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="e.g. Multan, Pakistan"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition"
                >
                  {editingId ? "Update Customer" : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}