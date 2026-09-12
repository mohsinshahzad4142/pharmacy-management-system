"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Expense {
  id: number;
  title: string;
  amount: number;
  date: string;
  description: string;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  
  // فارم کی اسٹیٹس
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null); // یہ بتائے گا کہ ہم کون سا خرچہ ایڈٹ کر رہے ہیں

  const getToken = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token");
    }
    return null;
  };

  const fetchExpenses = async () => {
    const token = getToken();
    try {
      const res = await fetch("https://pharmacy-management-system-jcvq.vercel.app/api/expenses", {
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          "Content-Type": "application/json"
        }
      });
      const text = await res.text(); 
      try {
        const data = JSON.parse(text);
        if (data.success) {
          setExpenses(data.data || []);
        }
      } catch (parseError) {
        console.error("⚠️ Backend did not return JSON. It returned:", text);
      }
    } catch (error) {
      console.error("Error fetching expenses:", error);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  // 🗑️ خرچہ ڈیلیٹ کرنے کا فنکشن
  const handleDelete = async (id: number) => {
    if (!window.confirm("کیا آپ واقعی اس خرچے کو ڈیلیٹ کرنا چاہتے ہیں؟")) return;
    
    const token = getToken();
    try {
      const res = await fetch(`https://pharmacy-management-system-jcvq.vercel.app/api/expenses/${id}`, {
        method: "DELETE",
        headers: { "Authorization": token ? `Bearer ${token}` : "" }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchExpenses(); // لسٹ اپڈیٹ کریں
      } else {
        alert("ڈیلیٹ کرنے میں مسئلہ آیا: " + data.error);
      }
    } catch (error) {
      console.error("Delete Error:", error);
      alert("سرور سے رابطہ نہیں ہو سکا۔");
    }
  };

  // ✏️ ایڈٹ بٹن کلک کرنے پر فارم میں ڈیٹا لانے کا فنکشن
  const handleEditClick = (exp: Expense) => {
    setEditingId(exp.id);
    setTitle(exp.title || "");
    setAmount(exp.amount.toString());
    setDescription(exp.description || "");
    
    // تاریخ کو فارم والے فارمیٹ (YYYY-MM-DD) میں سیٹ کرنا
    if (exp.date) {
      const formattedDate = new Date(exp.date).toISOString().split('T')[0];
      setDate(formattedDate);
    }
  };

  // ❌ ایڈٹ موڈ کو کینسل کرنا
  const cancelEdit = () => {
    setEditingId(null);
    setTitle("");
    setAmount("");
    setDescription("");
    setDate("");
  };

  // 💾 نیا خرچہ محفوظ کرنا یا پرانا اپڈیٹ کرنا
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const token = getToken();
    // اگر editingId موجود ہے تو PUT ریکوئسٹ ورنہ POST
    const url = editingId 
      ? `https://pharmacy-management-system-jcvq.vercel.app/api/expenses/${editingId}` 
      : "https://pharmacy-management-system-jcvq.vercel.app/api/expenses";
    const method = editingId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ 
          title, 
          amount: parseFloat(amount), 
          description, 
          date: new Date(date).toISOString() 
        }),
      });

      const text = await res.text();
      try {
        const data = JSON.parse(text);

        if (res.ok && data.success) {
          alert(editingId ? "خرچہ کامیابی سے اپڈیٹ ہو گیا!" : "خرچہ کامیابی سے محفوظ ہو گیا!");
          cancelEdit(); // فارم خالی کریں اور ایڈٹ موڈ ختم کریں
          fetchExpenses(); // لسٹ کو ریفریش کریں
        } else {
          alert("ایرر: " + (data.message || data.error || "ڈیٹا محفوظ نہیں ہو سکا"));
        }
      } catch (parseError) {
        console.error("⚠️ Backend did not return JSON:", text);
        alert("بیک اینڈ سے درست جواب نہیں ملا۔");
      }
    } catch (error) {
      console.error("Error saving expense:", error);
      alert("سرور سے رابطہ نہیں ہو سکا۔");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">💸 Expense Management</h1>
          <Link href="/" className="bg-gray-600 text-white px-4 py-2 rounded shadow hover:bg-gray-700">
            ← Back to Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* فارم */}
          <div className="bg-white p-6 rounded-lg shadow-md col-span-1 h-fit">
            <h2 className="text-xl font-bold mb-4 text-gray-700">
              {editingId ? "✏️ Edit Expense" : "➕ Add New Expense"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600">Expense Title</label>
                <input
                  type="text" required placeholder="e.g. Electricity Bill"
                  className="w-full mt-1 p-2 border rounded focus:ring-2 focus:ring-blue-400 outline-none"
                  value={title} onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600">Amount (Rs.)</label>
                <input
                  type="number" step="0.01" required placeholder="e.g. 5000"
                  className="w-full mt-1 p-2 border rounded focus:ring-2 focus:ring-blue-400 outline-none"
                  value={amount} onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600">Date</label>
                <input
                  type="date" required
                  className="w-full mt-1 p-2 border rounded focus:ring-2 focus:ring-blue-400 outline-none"
                  value={date} onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600">Description (Optional)</label>
                <textarea
                  placeholder="Additional details..."
                  className="w-full mt-1 p-2 border rounded focus:ring-2 focus:ring-blue-400 outline-none"
                  value={description} onChange={(e) => setDescription(e.target.value)}
                ></textarea>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit" disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 rounded shadow hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
                >
                  {loading ? "Saving..." : (editingId ? "Update Expense" : "Save Expense")}
                </button>
                
                {/* کینسل بٹن (صرف ایڈٹ موڈ میں نظر آئے گا) */}
                {editingId && (
                  <button
                    type="button" onClick={cancelEdit}
                    className="w-full bg-gray-400 text-white py-2 rounded shadow hover:bg-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* اخراجات کی لسٹ (Table) */}
          <div className="bg-white p-6 rounded-lg shadow-md col-span-2">
            <h2 className="text-xl font-bold mb-4 text-gray-700">Expense History</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 uppercase text-sm">
                    <th className="p-3 border-b">Date</th>
                    <th className="p-3 border-b">Title</th>
                    <th className="p-3 border-b">Description</th>
                    <th className="p-3 border-b text-right">Amount</th>
                    <th className="p-3 border-b text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.length > 0 ? (
                    expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-gray-50 border-b transition-colors">
                        <td className="p-3">{new Date(exp.date).toLocaleDateString()}</td>
                        <td className="p-3 font-medium text-gray-800">{exp.title}</td>
                        <td className="p-3 text-gray-500 text-sm">{exp.description || "-"}</td>
                        <td className="p-3 text-right font-bold text-red-600">Rs. {exp.amount}</td>
                        <td className="p-3 text-center space-x-3">
                          {/* ✏️ Edit Button */}
                          <button 
                            onClick={() => handleEditClick(exp)}
                            className="text-blue-500 hover:text-blue-700 font-medium"
                            title="Edit"
                          >
                            ✏️ Edit
                          </button>
                          {/* 🗑️ Delete Button */}
                          <button 
                            onClick={() => handleDelete(exp.id)}
                            className="text-red-500 hover:text-red-700 font-medium"
                            title="Delete"
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-gray-500">
                        No expenses found. Start adding some!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}