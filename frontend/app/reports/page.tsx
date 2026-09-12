'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

export default function ReportsPage() {
  const router = useRouter();
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [chartData, setChartData] = useState([]);
  const [chartFilter, setChartFilter] = useState('7days');

  useEffect(() => {
    fetchReportSummary();
  }, []);

  useEffect(() => {
    fetchChartData();
  }, [chartFilter]);

  const fetchReportSummary = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get('https://pharmacy-management-system-jcvq.vercel.app/api/reports/summary', config);
      
      if (res.data?.success) {
        setReportData(res.data.data);
      } else {
        setErrorMsg('Failed to load report summary.');
      }
    } catch (error: any) {
      console.error('Error fetching summary:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.clear();
        router.push('/login');
      } else {
        setErrorMsg('Server connection error. Is backend running?');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`https://pharmacy-management-system-jcvq.vercel.app/api/reports/chart?filter=${chartFilter}`, config);
      
      if (res.data?.success) {
        setChartData(res.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching chart data:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.clear();
        router.push('/login');
      }
    }
  };

  const totalSales = reportData?.totalSalesRevenue || 0;
  const totalPurchases = reportData?.totalPurchasesCost || 0;
  const totalExpenses = reportData?.totalExpenses || 0;
  const grossProfit = totalSales - totalPurchases;
  const netProfitVal = grossProfit - totalExpenses;

  // 📗 Excel ڈاؤنلوڈ کرنے کا فنکشن
  const exportToExcel = () => {
    const summaryData = [
      { Category: "Total Sales Revenue", Amount: totalSales },
      { Category: "Total Purchases Cost", Amount: totalPurchases },
      { Category: "Total Shop Expenses", Amount: totalExpenses },
      { Category: "Net Final Profit / Loss", Amount: netProfitVal },
      { Category: "Total Stock Value", Amount: reportData?.totalInventoryValue || 0 },
    ];

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Financial Summary");

    if (chartData.length > 0) {
      const wsChart = XLSX.utils.json_to_sheet(chartData);
      XLSX.utils.book_append_sheet(wb, wsChart, "Trend Data");
    }

    XLSX.writeFile(wb, "Pharmacy_Financial_Report.xlsx");
  };

  // 📕 بلٹ ان کلین PDF ڈاؤنلوڈ کرنے کا فنکشن
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // ہیڈر
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(33, 37, 41);
    doc.text("Pharmacy Financial Report", 14, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(108, 117, 125);
    doc.text(`Generated On: ${new Date().toLocaleDateString()}`, 14, 28);

    // لکیر
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 34, 196, 34);

    // ڈیٹا کی لسٹ
    doc.setFontSize(12);
    doc.setTextColor(33, 37, 41);
    
    let startY = 45;
    const items = [
      { label: "Total Sales Revenue:", value: `Rs. ${totalSales.toLocaleString()}` },
      { label: "Total Purchases Cost:", value: `Rs. ${totalPurchases.toLocaleString()}` },
      { label: "Total Shop Expenses:", value: `Rs. ${totalExpenses.toLocaleString()}` },
      { label: "Net Final Profit / Loss:", value: `Rs. ${netProfitVal.toLocaleString()}` },
      { label: "Total Stock / Inventory Value:", value: `Rs. ${reportData?.totalInventoryValue?.toLocaleString() || 0}` },
    ];

    items.forEach((item, index) => {
      doc.setFont("helvetica", "bold");
      doc.text(item.label, 14, startY + (index * 12));
      doc.setFont("helvetica", "normal");
      doc.text(item.value, 110, startY + (index * 12));
    });

    // نیچے نوٹ
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("Pharmacy Management System - Official Report", 14, 120);

    doc.save("Pharmacy_Financial_Report.pdf");
  };

  if (loading) {
    return <div className="p-12 text-center text-xl font-semibold text-blue-600">Loading Financial Reports... ⏳</div>;
  }

  if (errorMsg) {
    return (
      <div className="p-12 text-center text-red-600 font-bold">
        <p>⚠️ {errorMsg}</p>
        <button onClick={fetchReportSummary} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded">Try Again</button>
      </div>
    );
  }

  return (
    <main className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      
      {/* 🔝 ہیڈر اور ایکشن بٹنز */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white p-6 rounded-lg shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📊 Financial Reports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of your pharmacy sales, purchases, expenses, and true profit.</p>
        </div>
        
        <div className="flex gap-3 mt-4 md:mt-0">
          <button 
            onClick={exportToExcel}
            className="bg-green-600 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-green-700 transition flex items-center gap-2 shadow"
          >
            📗 Export Excel
          </button>
          <button 
            onClick={exportToPDF}
            className="bg-red-600 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-red-700 transition flex items-center gap-2 shadow"
          >
            📕 Download PDF
          </button>
          <a href="/" className="bg-gray-600 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-gray-700 transition flex items-center shadow">
            ← Back
          </a>
        </div>
      </div>

      {/* 💳 Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
          <p className="text-sm font-medium text-gray-500">Total Sales Revenue</p>
          <h3 className="text-2xl font-bold text-gray-800 mt-2">Rs. {totalSales.toLocaleString()}</h3>
          <span className="text-xs text-green-600 font-semibold mt-1 inline-block">{reportData?.totalSalesTransactions || 0} Transactions</span>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
          <p className="text-sm font-medium text-gray-500">Total Purchases Cost</p>
          <h3 className="text-2xl font-bold text-gray-800 mt-2">Rs. {totalPurchases.toLocaleString()}</h3>
          <span className="text-xs text-blue-600 font-semibold mt-1 inline-block">{reportData?.totalPurchaseInvoices || 0} Invoices</span>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-orange-500">
          <p className="text-sm font-medium text-gray-500">Total Shop Expenses</p>
          <h3 className="text-2xl font-bold text-gray-800 mt-2">Rs. {totalExpenses.toLocaleString()}</h3>
          <span className="text-xs text-orange-600 font-semibold mt-1 inline-block">Bills, Salaries, Maintenance</span>
        </div>

        <div className={`p-6 rounded-lg shadow-md border-l-4 ${netProfitVal >= 0 ? 'bg-green-50 border-green-600' : 'bg-red-50 border-red-600'}`}>
          <p className="text-sm font-medium text-gray-700">Net Final Profit / Loss</p>
          <h3 className={`text-3xl font-bold mt-2 ${netProfitVal >= 0 ? 'text-green-700' : 'text-red-700'}`}>Rs. {netProfitVal.toLocaleString()}</h3>
          <span className="text-xs text-gray-600 mt-1 inline-block">(Sales - Purchases - Expenses)</span>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-indigo-500 lg:col-span-2">
          <p className="text-sm font-medium text-gray-500">Total Stock / Inventory Value</p>
          <h3 className="text-2xl font-bold text-gray-800 mt-2">Rs. {reportData?.totalInventoryValue?.toLocaleString() || 0}</h3>
          <span className="text-xs text-indigo-600 font-semibold mt-1 inline-block">{reportData?.totalMedicinesCount || 0} Unique Medicines</span>
        </div>
      </div>

      {/* 📈 Graphs & Charts */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">📊 Sales vs Expenses Trend</h2>
          
          <div className="flex space-x-2 mt-4 sm:mt-0 bg-gray-100 p-1 rounded-md">
            <button 
              onClick={() => setChartFilter('7days')}
              className={`px-4 py-1.5 text-sm font-medium rounded ${chartFilter === '7days' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Last 7 Days
            </button>
            <button 
              onClick={() => setChartFilter('30days')}
              className={`px-4 py-1.5 text-sm font-medium rounded ${chartFilter === '30days' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Last 30 Days
            </button>
            <button 
              onClick={() => setChartFilter('12months')}
              className={`px-4 py-1.5 text-sm font-medium rounded ${chartFilter === '12months' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              This Year
            </button>
          </div>
        </div>

        <div className="h-80 w-full mt-4">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400">No data available for this period.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="sales" name="Sales Revenue" fill="#22C55E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="purchases" name="Purchases" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#F97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      
    </main>
  );
}