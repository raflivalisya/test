'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [adminPassword, setAdminPassword] = useState('admin123');

  // State Navigasi Tab ('orders', 'inventory', atau 'finance')
  const [activeTab, setActiveTab] = useState('orders');

  // State Data Pesanan & Produk
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search Pesanan
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // State Modal Catatan Pesanan
  const [editingOrder, setEditingOrder] = useState(null);
  const [noteInput, setNoteInput] = useState('');

  // State Modal Print Invoice
  const [invoiceOrder, setInvoiceOrder] = useState(null);

  // State Modal Password Admin
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // State Fitur Keuangan (Expenses / Pengeluaran Operational)
  const [expenses, setExpenses] = useState([
    { id: 1, title: 'Pembelian Stok Bahan & Pita', amount: 450000, category: 'Modal/HPP', date: '2026-03-01' },
    { id: 2, title: 'Bensin & Operasional Kurir', amount: 120000, category: 'Operasional', date: '2026-03-02' }
  ]);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Operasional');

  useEffect(() => {
    const savedPass = localStorage.getItem('admin_password');
    if (savedPass) {
      setAdminPassword(savedPass);
    } else if (process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setAdminPassword(process.env.NEXT_PUBLIC_ADMIN_PASSWORD);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === adminPassword) {
      setIsAuthenticated(true);
      fetchOrders();
      fetchProducts();
    } else {
      alert('Password salah!');
      setPasswordInput('');
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setOrders(data);
    setLoading(false);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('id', { ascending: true });

    if (!error && data) setProducts(data);
  };

  // Update Stok Langsung
  const handleUpdateStock = async (id, newStock) => {
    const stockVal = Math.max(0, Number(newStock));
    const { error } = await supabase
      .from('products')
      .update({ stock: stockVal })
      .eq('id', id);

    if (error) {
      alert(`Gagal memperbarui stok: ${error.message}`);
    } else {
      alert('Stok berhasil diperbarui!');
      fetchProducts();
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'lunas' ? 'pending' : 'lunas';
    await supabase.from('orders').update({ status: nextStatus }).eq('id', id);
    fetchOrders();
  };

  const handleDeleteOrder = async (id, customerName) => {
    if (!window.confirm(`Hapus pesanan #${id} atas nama "${customerName}"?`)) return;
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (!error) fetchOrders();
  };

  const handleSaveNote = async () => {
    if (!editingOrder) return;
    await supabase
      .from('orders')
      .update({ notes: noteInput })
      .eq('id', editingOrder.id);

    setEditingOrder(null);
    fetchOrders();
  };

  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!expenseTitle || !expenseAmount) return;

    const newExp = {
      id: Date.now(),
      title: expenseTitle,
      amount: Number(expenseAmount),
      category: expenseCategory,
      date: new Date().toISOString().split('T')[0],
    };

    setExpenses([newExp, ...expenses]);
    setExpenseTitle('');
    setExpenseAmount('');
    alert('Pengeluaran berhasil dicatat!');
  };

  const handleDeleteExpense = (id) => {
    if (!window.confirm('Hapus catatan pengeluaran ini?')) return;
    setExpenses(expenses.filter((item) => item.id !== id));
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer_phone?.includes(searchQuery) ||
      o.id?.toString().includes(searchQuery);

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'lunas'
        ? o.status === 'lunas'
        : o.status === 'pending';

    return matchesSearch && matchesStatus;
  });

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (!newPassword.trim()) return;
    localStorage.setItem('admin_password', newPassword);
    setAdminPassword(newPassword);
    alert('Password admin berhasil diperbarui!');
    setNewPassword('');
    setShowPasswordModal(false);
  };

  // KETENTUAN DAN KALKULASI KEUANGAN
  const totalGrossRevenue = orders.reduce((sum, item) => sum + Number(item.total_price || 0), 0);
  const totalPaidRevenue = orders
    .filter((item) => item.status === 'lunas')
    .reduce((sum, item) => sum + Number(item.total_price || 0), 0);
  const totalPendingRevenue = orders
    .filter((item) => item.status === 'pending')
    .reduce((sum, item) => sum + Number(item.total_price || 0), 0);

  const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const netProfit = totalPaidRevenue - totalExpenses;
  const averageOrderValue = orders.length > 0 ? totalGrossRevenue / orders.length : 0;

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-slate-900">Login Admin</h1>
            <p className="mt-1 text-xs text-slate-500">Masukkan password untuk masuk dashboard.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              required
              placeholder="Masukkan password..."
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-700 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
            >
              Masuk Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-800 sm:p-10">
      <div className="mx-auto max-w-7xl">
        {/* Header Admin */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Dashboard Admin Parcel</h1>
            <p className="mt-1 text-sm text-slate-500">Kelola pesanan, invoice, stok, dan laporan keuangan usaha.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              🔑 Password
            </button>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200"
            >
              🚪 Keluar
            </button>
          </div>
        </div>

        {/* Tab Navigasi Admin */}
        <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition ${
              activeTab === 'orders'
                ? 'bg-emerald-700 text-white shadow'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            📋 Pesanan Masuk ({orders.length})
          </button>

          <button
            onClick={() => {
              setActiveTab('inventory');
              fetchProducts();
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition ${
              activeTab === 'inventory'
                ? 'bg-emerald-700 text-white shadow'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            📦 Kelola Stok Produk ({products.length})
          </button>

          <button
            onClick={() => setActiveTab('finance')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition ${
              activeTab === 'finance'
                ? 'bg-emerald-700 text-white shadow'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            💰 Keuangan & Arus Kas
          </button>
        </div>

        {/* TAB 1: DAFTAR PESANAN */}
        {activeTab === 'orders' && (
          <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <input
                type="text"
                placeholder="Cari nama, WA, atau ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm sm:w-72 focus:border-emerald-600 focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                    statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setStatusFilter('lunas')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                    statusFilter === 'lunas' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Lunas
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                    statusFilter === 'pending' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Pending
                </button>
              </div>
            </div>

            {/* Tabel Pesanan */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b">
                  <tr>
                    <th className="px-5 py-4">ID</th>
                    <th className="px-5 py-4">Pelanggan</th>
                    <th className="px-5 py-4">Pesanan / Detail</th>
                    <th className="px-5 py-4">Catatan</th>
                    <th className="px-5 py-4">Total</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-8 text-center text-slate-400">
                        Memuat data pesanan...
                      </td>
                    </tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-8 text-center text-slate-400">
                        Tidak ada pesanan ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-5 py-4 font-mono font-bold text-slate-900">#{item.id}</td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">{item.customer_name}</div>
                          <div className="text-xs text-slate-400">{item.customer_phone}</div>
                        </td>
                        <td className="px-5 py-4 text-xs font-medium max-w-xs">{item.items}</td>
                        <td className="px-5 py-4 text-xs italic text-slate-500">
                          {item.notes || '-'}
                        </td>
                        <td className="px-5 py-4 font-bold text-slate-900">
                          Rp {Number(item.total_price).toLocaleString('id-ID')}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              item.status === 'lunas'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex justify-center gap-1.5">
                            <button
                              onClick={() => toggleStatus(item.id, item.status)}
                              title="Ubah Status Pembayaran"
                              className="rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs text-white font-semibold hover:bg-emerald-800"
                            >
                              {item.status === 'lunas' ? 'Set Pending' : 'Set Lunas'}
                            </button>
                            <button
                              onClick={() => {
                                setEditingOrder(item);
                                setNoteInput(item.notes || '');
                              }}
                              title="Edit Catatan Pesanan"
                              className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs text-blue-700 font-semibold border border-blue-200 hover:bg-blue-100"
                            >
                              📝 Catatan
                            </button>
                            <button
                              onClick={() => setInvoiceOrder(item)}
                              title="Cetak Invoice Pesanan"
                              className="rounded-lg bg-purple-50 px-2.5 py-1.5 text-xs text-purple-700 font-semibold border border-purple-200 hover:bg-purple-100"
                            >
                              🧾 Invoice
                            </button>
                            <button
                              onClick={() => handleDeleteOrder(item.id, item.customer_name)}
                              title="Hapus Pesanan"
                              className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700 border border-rose-200 hover:bg-rose-100"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: KELOLA STOK PRODUK */}
        {activeTab === 'inventory' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Manajemen Stok Parcel</h2>
            <p className="text-xs text-slate-500 mb-6">Ubah persediaan parcel. Jika stok = 0, produk otomatis bertanda "Stok Habis" di halaman depan.</p>

            <div className="grid gap-4 sm:grid-cols-2">
              {products.map((prod) => (
                <div key={prod.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <img src={prod.image} alt={prod.name} className="h-16 w-16 rounded-lg object-cover" />
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{prod.name}</h4>
                      <p className="text-xs font-bold text-emerald-700">Rp {Number(prod.price).toLocaleString('id-ID')}</p>
                      <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                        prod.stock > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {prod.stock > 0 ? `Tersedia ${prod.stock} Pcs` : 'STOK HABIS'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Jumlah Stok</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        defaultValue={prod.stock}
                        id={`stock-input-${prod.id}`}
                        className="w-20 rounded-lg border border-slate-300 p-1.5 text-center text-sm font-bold focus:border-emerald-600 focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          const val = document.getElementById(`stock-input-${prod.id}`).value;
                          handleUpdateStock(prod.id, val);
                        }}
                        className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 shadow"
                      >
                        Simpan
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: KEUANGAN & ANALITIK PROFESIONAL */}
        {activeTab === 'finance' && (
          <div className="space-y-6">
            {/* Header Laporan */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Laporan & Analisis Keuangan</h2>
                <p className="text-xs text-slate-500">Ringkasan transaksi pendapatan, biaya operasional, dan kalkulasi estimasi laba.</p>
              </div>
              <button
                onClick={() => window.print()}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                🖨️ Cetak Laporan Keuangan
              </button>
            </div>

            {/* Matrix Kartu KPI Keuangan */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase text-slate-400">Total Omset Masuk</p>
                <h3 className="text-2xl font-black text-slate-900 mt-2">
                  Rp {totalGrossRevenue.toLocaleString('id-ID')}
                </h3>
                <p className="text-[10px] text-slate-500 mt-1">Gabungan pesanan Lunas & Pending</p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
                <p className="text-xs font-bold uppercase text-emerald-700">Kas Diterima (Lunas)</p>
                <h3 className="text-2xl font-black text-emerald-800 mt-2">
                  Rp {totalPaidRevenue.toLocaleString('id-ID')}
                </h3>
                <p className="text-[10px] text-emerald-600 mt-1">Pendapatan bersih yang terverifikasi</p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
                <p className="text-xs font-bold uppercase text-amber-700">Potensi Piutang (Pending)</p>
                <h3 className="text-2xl font-black text-amber-800 mt-2">
                  Rp {totalPendingRevenue.toLocaleString('id-ID')}
                </h3>
                <p className="text-[10px] text-amber-600 mt-1">Pesanan belum menyelesaikan pembayaran</p>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 shadow-sm">
                <p className="text-xs font-bold uppercase text-blue-700">Laba Bersih Estimasi</p>
                <h3 className="text-2xl font-black text-blue-800 mt-2">
                  Rp {netProfit.toLocaleString('id-ID')}
                </h3>
                <p className="text-[10px] text-blue-600 mt-1">Dihitung dari (Kas Lunas - Operational)</p>
              </div>
            </div>

            {/* Statistik Tambahan */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Box Rata-Rata & Performa */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-sm border-b pb-3">Statistik Penjualan</h3>
                <div>
                  <p className="text-xs text-slate-400">Total Volume Pesanan</p>
                  <p className="text-lg font-bold text-slate-800">{orders.length} Transaksi</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Rata-Rata Nilai Transaksi (AOV)</p>
                  <p className="text-lg font-bold text-emerald-700">
                    Rp {Math.round(averageOrderValue).toLocaleString('id-ID')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Total Beban Operasional</p>
                  <p className="text-lg font-bold text-rose-600">
                    Rp {totalExpenses.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              {/* Form Input Pengeluaran Ops */}
              <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-bold text-slate-900 text-sm mb-1">Catat Beban / Pengeluaran Toko</h3>
                <p className="text-xs text-slate-500 mb-4">Tambahkan biaya operasional seperti bahan baku, kurir, atau iklan untuk menghitung laba bersih tepat.</p>

                <form onSubmit={handleAddExpense} className="grid gap-3 sm:grid-cols-4">
                  <input
                    type="text"
                    required
                    placeholder="Nama pengeluaran..."
                    value={expenseTitle}
                    onChange={(e) => setExpenseTitle(e.target.value)}
                    className="rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-600 focus:outline-none sm:col-span-2"
                  />
                  <input
                    type="number"
                    required
                    placeholder="Nominal (Rp)..."
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-600 focus:outline-none"
                  />
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-600 focus:outline-none"
                  >
                    <option value="Modal/HPP">Modal / HPP</option>
                    <option value="Operasional">Operasional</option>
                    <option value="Pemasaran">Pemasaran</option>
                  </select>
                  <button
                    type="submit"
                    className="sm:col-span-4 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
                  >
                    + Tambahkan Catatan Biaya
                  </button>
                </form>

                {/* List Pengeluaran */}
                <div className="mt-6 border-t pt-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Daftar Pengeluaran Terdaftar</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {expenses.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Belum ada catatan pengeluaran.</p>
                    ) : (
                      expenses.map((exp) => (
                        <div key={exp.id} className="flex items-center justify-between text-xs p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                          <div>
                            <span className="font-bold text-slate-800">{exp.title}</span>
                            <span className="ml-2 px-2 py-0.5 rounded bg-slate-200 text-[10px] text-slate-600">{exp.category}</span>
                            <span className="ml-2 text-[10px] text-slate-400">{exp.date}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-rose-600">- Rp {exp.amount.toLocaleString('id-ID')}</span>
                            <button
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="text-slate-400 hover:text-rose-600 font-bold"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 1: EDIT CATATAN PESANAN */}
        {editingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Catatan Pesanan #{editingOrder.id}</h3>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Tambahan / Instruksi</label>
                <textarea
                  rows="4"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Ketik catatan khusus pesanan di sini..."
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-emerald-600 focus:outline-none"
                ></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditingOrder(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveNote}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                >
                  Simpan Catatan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: CETAK INVOICE / FAKTUR PEMESANAN */}
        {invoiceOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-4 border-b pb-3">
                <h3 className="text-lg font-bold text-slate-900">Preview Invoice Resmi</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.print()}
                    className="rounded-xl bg-purple-700 px-4 py-2 text-xs font-bold text-white hover:bg-purple-800"
                  >
                    🖨️ Cetak Invoice
                  </button>
                  <button
                    onClick={() => setInvoiceOrder(null)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Tutup
                  </button>
                </div>
              </div>

              {/* Tampilan Invoice Siap Print */}
              <div className="rounded-2xl border border-slate-300 p-6 bg-white space-y-6">
                <div className="flex justify-between items-start border-b pb-4">
                  <div>
                    <h1 className="text-2xl font-black text-emerald-800 tracking-wide">PARCEL STORE</h1>
                    <p className="text-xs text-slate-500 mt-0.5">Layanan Hampers & Gift Eksklusif</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-slate-900">INVOICE</span>
                    <p className="text-xs font-mono font-bold text-slate-500 mt-0.5">#{invoiceOrder.id}</p>
                    <p className="text-[10px] text-slate-400">
                      Tgl: {new Date(invoiceOrder.created_at).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Ditujukan Kepada:</p>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">{invoiceOrder.customer_name}</p>
                    <p className="text-slate-600">{invoiceOrder.customer_phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Status Pembayaran:</p>
                    <span
                      className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-black uppercase ${
                        invoiceOrder.status === 'lunas'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {invoiceOrder.status}
                    </span>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Deskripsi Produk</th>
                        <th className="p-3 text-right">Total Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-3 font-medium text-slate-800">{invoiceOrder.items}</td>
                        <td className="p-3 text-right font-bold text-slate-900">
                          Rp {Number(invoiceOrder.total_price).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {invoiceOrder.notes && (
                  <div className="rounded-xl bg-slate-50 p-3 text-xs border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Catatan / Ucapan:</p>
                    <p className="italic text-slate-700 mt-1">"{invoiceOrder.notes}"</p>
                  </div>
                )}

                <div className="flex justify-between items-center border-t pt-4">
                  <p className="text-xs text-slate-500 italic">Terima kasih telah berbelanja di Parcel Store.</p>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-500 uppercase">Total Tagihan</p>
                    <p className="text-xl font-black text-emerald-700">
                      Rp {Number(invoiceOrder.total_price).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: UBAH PASSWORD */}
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Ubah Password Admin</h3>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <input
                  type="password"
                  required
                  placeholder="Masukkan password baru..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                  >
                    Simpan Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
